import type { Block, Word, AvatarEvent } from "./types";
import { FPS } from "./theme";

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Resolve an `at` / `until` value to an absolute frame:
 *  number  → seconds after the scene starts
 *  string  → the moment that word/phrase is spoken in this scene ("Characters", "free 3D models")
 *  "start" / undefined → scene start;  "end" → scene end
 */
export function resolveAt(at: number | string | undefined, block: Block, words: Word[], fallbackFrame?: number): number {
  if (at === undefined || at === "start") return fallbackFrame ?? block.startFrame;
  if (at === "end") return block.endFrame;
  if (typeof at === "number") return block.startFrame + Math.round(at * FPS);
  const target = at.split(/\s+/).map(norm).filter(Boolean);
  const ws = words.filter((w) => w.scene === block.id);
  // Exact words first ("Step" ≠ "steps"); fall back to prefixes ("quot" → "quote") only if nothing matches exactly.
  for (const exact of [true, false]) {
    for (let i = 0; i < ws.length; i++) {
      if (target.every((t, k) => ws[i + k] && (exact ? norm(ws[i + k].text) === t : norm(ws[i + k].text).startsWith(t)))) {
        return Math.max(block.startFrame, Math.round(ws[i].start * FPS) - 3); // land just before the word
      }
    }
  }
  return fallbackFrame ?? block.startFrame;
}

/** Narrator events: each scene's avatar state at its start, then its word-timed beats. */
const MIN_HOLD = 24; // frames (0.8 s): a gesture/pose must stay at least this long, or the change is dropped

export function avatarEvents(blocks: Block[], words: Word[]): AvatarEvent[] {
  const ev: (AvatarEvent & { start?: boolean })[] = [];
  for (const b of blocks) {
    let state: AvatarEvent & { start?: boolean } = { frame: b.startFrame, gesture: b.gesture, expression: b.expression, position: b.position, layout: b.layout, start: true };
    ev.push(state);
    const beats = [...b.beats].map((bt) => ({ bt, f: resolveAt(bt.at, b, words) })).sort((x, y) => x.f - y.f);
    for (const { bt, f } of beats) {
      state = { ...state, start: false, frame: Math.min(Math.max(f, b.startFrame + 1), b.endFrame - 1), ...(bt.gesture && { gesture: bt.gesture }), ...(bt.expression && { expression: bt.expression }), ...(bt.position && { position: bt.position }), ...(bt.layout && { layout: bt.layout }) };
      ev.push(state);
    }
  }
  ev.sort((a, b) => a.frame - b.frame);
  // Smooth out rapid changes: a beat too close to the previous change is dropped; a scene start too close to a
  // beat replaces that beat. Events that change nothing are merged away.
  const out: AvatarEvent[] = [];
  for (const e of ev) {
    const last = out[out.length - 1];
    if (last && e.gesture === last.gesture && e.expression === last.expression && e.position === last.position && e.layout === last.layout) continue;
    if (last && e.frame - last.frame < MIN_HOLD) {
      if (!e.start) continue;
      if (out.length > 1 && !(last as any).start) out.pop();
    }
    out.push(e);
  }
  return out.map(({ start: _s, ...rest }: any) => rest);
}

export function eventAt(events: AvatarEvent[], frame: number) {
  let i = 0;
  for (let k = 0; k < events.length; k++) if (events[k].frame <= frame) i = k;
  return { cur: events[i], prev: events[i - 1] ?? events[i], index: i };
}

const AT_KEYS = /^(at|cardAt|typeAt|citedAt|flipAt|markAt|stampAt|growAt|pickAt)$/;

/**
 * Let a graphic's own animation follow the voice: any `at` / `cardAt` / `typeAt` / `citedAt` / `flipAt` inside a
 * component's props may name a spoken word; it becomes seconds after the component appears (`originFrame`).
 * Numbers stay as they are (already seconds from the component's start).
 */
export function resolveProps<T>(props: T, block: Block, words: Word[], originFrame: number): T {
  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== "object") return v;
    const out: any = {};
    for (const [k, x] of Object.entries(v)) {
      out[k] = AT_KEYS.test(k) && typeof x === "string" ? Math.max(0, (resolveAt(x, block, words) - originFrame) / FPS) : walk(x);
    }
    return out;
  };
  return walk(props);
}
