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
  // Whisper often writes numbers as digits ("3 steps", "Step 1"); compare them as words.
  const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const asWord = (w: string) => { const n = normWord(w); return /^\d+$/.test(n) && +n < NUM.length ? NUM[+n] : n; };
  const a = script.map(asWord);
  const b = heard.map((h) => asWord(h.w));
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

/** 10 ms loudness envelope of a 16-bit PCM WAV (0..1, normalised to the loudest frame). */
function envelope(wavFile: string) {
  const buf = fs.readFileSync(wavFile);
  let off = 12, data = -1, size = 0, rate = 24000, channels = 1;
  while (off < buf.length - 8) {
    const id = buf.toString("ascii", off, off + 4), len = buf.readUInt32LE(off + 4);
    if (id === "fmt ") { channels = buf.readUInt16LE(off + 10); rate = buf.readUInt32LE(off + 12); }
    if (id === "data") { data = off + 8; size = len; break; }
    off += 8 + len + (len % 2);
  }
  if (data < 0) return { env: [] as number[], step: 0.01 };
  const win = Math.round(rate * 0.01) * channels;
  const n = Math.floor(Math.min(size, buf.length - data) / 2);
  const env: number[] = [];
  for (let i = 0; i < n; i += win) {
    let sum = 0;
    for (let k = i; k < Math.min(n, i + win); k++) { const v = buf.readInt16LE(data + k * 2); sum += v * v; }
    env.push(Math.sqrt(sum / win));
  }
  const max = Math.max(...env, 1);
  return { env: env.map((e) => e / max), step: 0.01 };
}

/**
 * Whisper marks a word that follows a pause as starting *inside* the pause, so visuals timed to it land early.
 * Snap every word to the waveform: a start in silence moves forward to where speech begins; an end in silence
 * moves back to where speech stops. Never past the word's own span.
 */
function snapToSpeech(words: { start: number; end: number }[], wavFile: string) {
  const { env, step } = envelope(wavFile);
  if (!env.length) return 0;
  const SIL = 0.05; // fraction of peak loudness counted as silence
  const at = (t: number) => env[Math.min(env.length - 1, Math.max(0, Math.round(t / step)))] ?? 0;
  let moved = 0;
  for (const w of words) {
    if (at(w.start) < SIL) {
      let t = w.start;
      while (t < w.end - 0.04 && at(t) < SIL) t += step;
      if (t < w.end - 0.04) { w.start = +t.toFixed(3); moved++; }
    }
    if (at(w.end - step) < SIL) {
      let t = w.end;
      while (t > w.start + 0.06 && at(t - step) < SIL) t -= step;
      w.end = +t.toFixed(3);
    }
  }
  return moved;
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

  const snapped = snapToSpeech(words, wav);
  const ids = (meta.blocks as { id: string }[]).map((b) => b.id);
  const scenes = ids.map((id, n) => {
    const ws = words.filter((w) => w.scene === id);
    return { id, start: n === 0 ? 0 : ws[0]?.start ?? 0, end: ws[ws.length - 1]?.end ?? 0 };
  });
  // Scenes butt up against each other: each ends where the next starts; the last runs to the end.
  for (let n = 0; n < scenes.length - 1; n++) scenes[n].end = scenes[n + 1].start;
  scenes[scenes.length - 1].end = duration;

  writeJson(ep(slug, "audio", "timing.json"), { duration, words, scenes, matchedRatio: +(matched / script.length).toFixed(2), snapped });
  log(`timing.json: ${words.length} words, ${Math.round((matched / script.length) * 100)}% matched by whisper, ${snapped} starts snapped to the waveform`);
  writeSubtitles(slug);
}

if (isMain(import.meta.url)) {
  const slug = requireSlug();
  await track(slug, "timing", () => timing(slug)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
