/**
 * Writes platform subtitle files from the whisper word timings (no burned-in text):
 *   episodes/<slug>/out/captions.srt  (YouTube, X)   ·   captions.vtt  (web / blog players)
 * Cues: ≤ 2 balanced lines of ≤ 32 characters, break at sentence ends, scene changes and pauses. Runs after the timing step.
 * Usage: npm run subtitles <slug>
 */
import fs from "node:fs";
import { ep, readJson, requireSlug, isMain } from "./lib/paths.ts";
import { log } from "./lib/run.ts";
import { makeCues, type CueWord } from "../studio/src/captions/cues.ts";

// Same cue logic as the burned-in subtitles (studio/src/captions/cues.ts), so platform captions match the video.
export function cues(words: CueWord[]) {
  return makeCues(words, { maxLine: 32 }).map((c) => ({ start: c.start, end: c.end, text: c.lines.map((l) => l.map((w) => w.text).join(" ")).join("\n") }));
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
