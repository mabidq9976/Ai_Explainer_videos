/**
 * Runs Rhubarb on voice.wav (with the script as dialog text) and writes episodes/<slug>/mouth.json:
 *   { fps, shapes, cues: [{ frame, shape }] }   — one entry per mouth change, held ≥ 2 frames.
 * Extended shapes (G, H, X) are only requested if the avatar actually has them.
 */
import fs from "node:fs";
import path from "node:path";
import { ep, readJson, requireSlug, isMain, CACHE, writeJson } from "./lib/paths.ts";
import { rhubarbPath } from "./lib/env.ts";
import { run, log } from "./lib/run.ts";
import { track } from "./lib/status.ts";
import { inspectAvatar } from "./lib/avatar.ts";

const FPS = 30;
const MIN_HOLD = 2;

export async function lipsync(slug: string) {
  const bin = rhubarbPath();
  if (!bin) throw new Error("Rhubarb not found — run `npm run setup:tools`.");
  const meta = readJson(ep(slug, "audio", "voice.meta.json"));
  const tmp = path.join(CACHE, "tmp");
  fs.mkdirSync(tmp, { recursive: true });
  const dialog = path.join(tmp, `${slug}-dialog.txt`);
  fs.writeFileSync(dialog, (meta.blocks as { text: string }[]).map((b) => b.text).join("\n"));

  const optional = inspectAvatar().optional;
  const ext = ["G", "H", "X"].filter((s) => optional.find((g) => g.id === `mouth-${s}`)?.ok).join("");
  const out = path.join(tmp, `${slug}-rhubarb.json`);
  log(`Rhubarb (extended shapes: ${ext || "none"})…`);
  await run(bin, ["-f", "json", "--dialogFile", dialog, "--extendedShapes", ext, "-o", out, ep(slug, "audio", "voice.wav")], { quiet: true });
  const raw = readJson(out).mouthCues as { start: number; end: number; value: string }[];

  // Frame-quantize and enforce a minimum hold so fast speech doesn't flicker.
  const cues: { frame: number; shape: string }[] = [];
  for (const c of raw) {
    const frame = Math.round(c.start * FPS);
    const prev = cues[cues.length - 1];
    if (prev && prev.shape === c.value) continue;
    if (prev && frame - prev.frame < MIN_HOLD) {
      // Too short: let the new shape replace the previous one only if the previous held long enough before it.
      const before = cues[cues.length - 2];
      if (before && prev.frame - before.frame >= MIN_HOLD) { prev.shape = c.value; continue; }
      continue;
    }
    cues.push({ frame, shape: c.value });
  }
  writeJson(ep(slug, "mouth.json"), { fps: FPS, shapes: ["A", "B", "C", "D", "E", "F", ...ext.split("")], cues });
  log(`mouth.json: ${cues.length} cues`);
}

if (isMain(import.meta.url)) {
  const slug = requireSlug();
  await track(slug, "lipsync", () => lipsync(slug)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
