/**
 * Writes platform subtitle files from the whisper word timings (no burned-in text):
 *   episodes/<slug>/out/captions.srt  (YouTube, X)   ·   captions.vtt  (web / blog players)
 * Cues: ≤ 42 characters, break at sentence ends, scene changes and pauses. Runs after the timing step.
 * Usage: npm run subtitles <slug>
 */
import fs from "node:fs";
import { ep, readJson, requireSlug, isMain } from "./lib/paths.ts";
import { log } from "./lib/run.ts";

type W = { text: string; start: number; end: number; scene: string };
const MAX_CHARS = 42;

export function cues(words: W[]) {
  const out: { start: number; end: number; text: string }[] = [];
  let cur: W[] = [];
  const flush = () => {
    if (!cur.length) return;
    out.push({ start: cur[0].start, end: Math.max(cur[cur.length - 1].end, cur[0].start + 0.8), text: cur.map((w) => w.text).join(" ") });
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const len = cur.map((x) => x.text).join(" ").length + w.text.length + 1;
    // Don't strand 1–2 words: if the sentence ends within the next two words, allow a slightly longer line.
    const tailToEnd = words.slice(i, i + 3).findIndex((x) => /[.!?]$/.test(x.text));
    const tailLen = tailToEnd >= 0 ? words.slice(i, i + tailToEnd + 1).map((x) => x.text).join(" ").length : Infinity;
    const allowLong = tailToEnd >= 0 && tailToEnd <= 1 && len - w.text.length + tailLen <= 56;
    if (cur.length && (w.scene !== prev?.scene || w.start - prev.end > 0.4 || (len > MAX_CHARS && !allowLong))) flush();
    cur.push(w);
    if (/[.!?]$/.test(w.text)) flush();
  });
  flush();
  for (let i = 0; i < out.length - 1; i++) out[i].end = Math.min(out[i].end, out[i + 1].start - 0.01);
  return out;
}

const ts = (s: number, sep: string) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`;
};

export function writeSubtitles(slug: string) {
  const timing = readJson(ep(slug, "audio", "timing.json"));
  const c = cues(timing.words);
  fs.mkdirSync(ep(slug, "out"), { recursive: true });
  fs.writeFileSync(ep(slug, "out", "captions.srt"), c.map((x, i) => `${i + 1}\n${ts(x.start, ",")} --> ${ts(x.end, ",")}\n${x.text}\n`).join("\n"));
  fs.writeFileSync(ep(slug, "out", "captions.vtt"), "WEBVTT\n\n" + c.map((x) => `${ts(x.start, ".")} --> ${ts(x.end, ".")}\n${x.text}\n`).join("\n"));
  log(`subtitles: ${c.length} cues → out/captions.srt, out/captions.vtt`);
}

if (isMain(import.meta.url)) writeSubtitles(requireSlug());
