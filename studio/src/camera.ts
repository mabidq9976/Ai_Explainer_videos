import { Easing, interpolate } from "remotion";
import type { Block, Word } from "./types";
import { resolveAt } from "./timeline";

const PUSH = 0.035; // slow push-in across a shot
const PUNCH = 0.06; // gentle zoom on a key word
const IN = 7, HOLD = 10, OUT = 24; // punch timing in frames

export type Shot = { start: number; end: number };

/** Punch-in frames: each scene's `punch` words, resolved to when they're spoken. */
export function punchFrames(blocks: Block[], scenes: { id: string; punch?: string[] }[], words: Word[]) {
  const out: number[] = [];
  for (const sc of scenes) {
    const b = blocks.find((x) => x.id === sc.id);
    if (!b) continue;
    for (const w of sc.punch ?? []) out.push(resolveAt(w, b, words) + 3);
  }
  return out.sort((a, b) => a - b);
}

/**
 * Camera scale at a frame: a slow push across the current shot (a board chain or one scene — it resets on
 * a hard cut, never mid-shot) plus a quick punch-in on chosen words.
 */
export function cameraScale(frame: number, shots: Shot[], punches: number[]) {
  const shot = shots.find((s) => frame >= s.start && frame < s.end);
  const push = shot ? interpolate(frame, [shot.start, shot.end], [0, PUSH], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  let punch = 0;
  for (const p of punches) {
    const d = frame - p;
    if (d < 0 || d > IN + HOLD + OUT) continue;
    const v = d < IN ? Easing.out(Easing.cubic)(d / IN) : d < IN + HOLD ? 1 : 1 - Easing.inOut(Easing.cubic)((d - IN - HOLD) / OUT);
    punch = Math.max(punch, v);
  }
  return 1 + push + punch * PUNCH;
}
