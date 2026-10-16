import type { Block, Word } from "../types";
import { resolveAt } from "../timeline";
import { FPS } from "../theme";
import type { Tag } from "./Layers";

const nw = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const HOLD = 1.8; // seconds a tag stays up by default

/**
 * Fact tags from each scene: an explicit `tag: { text, at, until? }` (text can differ from the spoken words —
 * "71% OF EARTH IS OCEAN"), or the older `pop` phrases (shown as spoken). One at a time; the next one cuts it short.
 */
export function buildTags(scenes: { id: string; tag?: { text: string; at?: string | number; until?: string | number }; pop?: string[] }[], blocks: Block[], words: Word[]): Tag[] {
  const out: Tag[] = [];
  for (const sc of scenes) {
    const b = blocks.find((x) => x.id === sc.id);
    if (!b) continue;
    if (sc.tag?.text) {
      const start = resolveAt(sc.tag.at, b, words) / FPS;
      const end = sc.tag.until !== undefined ? resolveAt(sc.tag.until, b, words) / FPS : start + HOLD;
      out.push({ text: sc.tag.text, start, end });
      continue;
    }
    const ws = words.filter((w) => w.scene === sc.id);
    for (const phrase of sc.pop ?? []) {
      const t = phrase.split(/\s+/).map(nw).filter(Boolean);
      let i = ws.findIndex((_, k) => t.every((x, j) => ws[k + j] && nw(ws[k + j].text) === x));
      if (i < 0) i = ws.findIndex((_, k) => t.every((x, j) => ws[k + j] && nw(ws[k + j].text).startsWith(x)));
      if (i < 0) continue;
      out.push({ text: phrase.replace(/[.,!?;:]+$/, ""), start: ws[i].start - 0.05, end: ws[i].start + HOLD });
    }
  }
  out.sort((a, b) => a.start - b.start);
  for (let i = 0; i < out.length - 1; i++) out[i].end = Math.min(out[i].end, out[i + 1].start - 0.05);
  return out;
}

/** The headline window: from the start until the end of the scene named in `until` (default: the hook scene), or N seconds. */
export function titleWindow(until: string | number | undefined, blocks: Block[]) {
  if (typeof until === "number") return { from: 0, to: Math.round(until * FPS) };
  const b = blocks.find((x) => x.id === (until ?? blocks[0]?.id)) ?? blocks[0];
  return { from: 0, to: b ? b.endFrame : 0 };
}
