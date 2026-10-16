/**
 * Word timings via a local whisper.cpp pass, aligned to the script's own words.
 * Writes episodes/<slug>/audio/timing.json:
 *   { duration, words: [{ text, start, end, scene, emphasis }], scenes: [{ id, start, end }] }
 * Captions use the script's spelling (GEO), not what whisper heard ("G E O").
 */
import fs from "node:fs";
import path from "node:path";
import { ep, readJson, requireSlug, isMain, CACHE, writeJson } from "./lib/paths.ts";
import { whisperPath, whisperModel } from "./lib/env.ts";
import { run, log } from "./lib/run.ts";
import { normWord, words as splitWords, type SceneFile } from "./lib/text.ts";
import { track } from "./lib/status.ts";
import { writeSubtitles } from "./subtitles.ts";

type Heard = { w: string; start: number; end: number };

async function transcribe(wav: string): Promise<Heard[]> {
  const bin = whisperPath();
  if (!bin) throw new Error("whisper-cli not found — run `npm run setup:tools`.");
  const model = whisperModel();
  if (!fs.existsSync(model)) throw new Error(`Whisper model missing at ${model} — run \`npm run setup:tools\`.`);
  const tmp = path.join(CACHE, "tmp");
  fs.mkdirSync(tmp, { recursive: true });
  const wav16 = path.join(tmp, "whisper-16k.wav");
  await run("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav16], { quiet: true });
  const base = path.join(tmp, "whisper-out");
  // -ml 1 + -sow gives one word per segment with its own timestamps.
  await run(bin, ["-m", model, "-f", wav16, "-ml", "1", "-sow", "-oj", "-of", base, "-np"], { quiet: true });
  const json = readJson(`${base}.json`);
  const heard: Heard[] = [];
  for (const seg of json.transcription ?? []) {
    const w = String(seg.text ?? "").trim();
    if (!w || /^\[.*\]$/.test(w)) continue;
    heard.push({ w, start: seg.offsets.from / 1000, end: seg.offsets.to / 1000 });
  }
  return heard;
}

/** LCS alignment of script words to heard words; unmatched script words are interpolated. */
function align(script: string[], heard: Heard[], duration: number) {
  const a = script.map(normWord);
  const b = heard.map((h) => normWord(h.w));
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] && a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const times: ({ start: number; end: number } | null)[] = new Array(n).fill(null);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] && a[i] === b[j]) { times[i] = { start: heard[j].start, end: heard[j].end }; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  // Interpolate gaps between known anchors.
  let k = 0;
  while (k < n) {
    if (times[k]) { k++; continue; }
    let e = k;
    while (e < n && !times[e]) e++;
    const from = k > 0 ? times[k - 1]!.end : 0;
    const to = e < n ? times[e]!.start : duration;
    const step = Math.max(0.05, (to - from) / (e - k));
    for (let x = k; x < e; x++) times[x] = { start: from + step * (x - k), end: from + step * (x - k + 1) };
    k = e;
  }
  const matched = dp[0][0];
  return { times: times as { start: number; end: number }[], matched };
}

export async function timing(slug: string) {
  const scene = readJson<SceneFile>(ep(slug, "scene.json"));
  const meta = readJson(ep(slug, "audio", "voice.meta.json"));
  const wav = ep(slug, "audio", "voice.wav");
  const duration: number = meta.duration;
  const heard = await transcribe(wav);

  const emphasisBy: Record<string, string[]> = Object.fromEntries(
    scene.scenes.map((s) => [s.id, (s.emphasis ?? []).flatMap((e) => splitWords(e).map(normWord))]),
  );
  const script: { text: string; scene: string }[] = [];
  for (const b of meta.blocks as { id: string; text: string }[]) for (const w of splitWords(b.text)) script.push({ text: w, scene: b.id });

  const { times, matched } = align(script.map((s) => s.text), heard, duration);
  const words = script.map((s, idx) => ({
    text: s.text,
    scene: s.scene,
    start: +times[idx].start.toFixed(3),
    end: +times[idx].end.toFixed(3),
    emphasis: (emphasisBy[s.scene] ?? []).includes(normWord(s.text)),
  }));

  const ids = (meta.blocks as { id: string }[]).map((b) => b.id);
  const scenes = ids.map((id, n) => {
    const ws = words.filter((w) => w.scene === id);
    return { id, start: n === 0 ? 0 : ws[0]?.start ?? 0, end: ws[ws.length - 1]?.end ?? 0 };
  });
  // Scenes butt up against each other: each ends where the next starts; the last runs to the end.
  for (let n = 0; n < scenes.length - 1; n++) scenes[n].end = scenes[n + 1].start;
  scenes[scenes.length - 1].end = duration;

  writeJson(ep(slug, "audio", "timing.json"), { duration, words, scenes, matchedRatio: +(matched / script.length).toFixed(2) });
  log(`timing.json: ${words.length} words, ${Math.round((matched / script.length) * 100)}% matched by whisper`);
  writeSubtitles(slug);
}

if (isMain(import.meta.url)) {
  const slug = requireSlug();
  await track(slug, "timing", () => timing(slug)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
