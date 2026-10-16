import { random } from "remotion";
import type { MouthFile, Word } from "../types";

/** Normalize editor-mangled ids (Illustrator "mouth-A_1_", Figma "mouth-A-2") back to rig names. */
export const rigName = (id: string) => id.replace(/_\d+_$/, "").replace(/(-|_)\d+$/, "").trim();

/** Parse the SVG once: tag every named group with data-rig, make it scale to its box. */
export function prepareSvg(svg: string) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  const names = new Set<string>();
  root.querySelectorAll("[id]").forEach((el) => {
    const name = rigName(el.getAttribute("id")!);
    // Case-insensitive match against rig names, preserving canonical casing for mouths (mouth-A).
    const canon = name.replace(/^mouth-([a-hx])$/i, (_, s) => `mouth-${s.toUpperCase()}`).replace(/^(?!mouth-)(.*)$/, (m) => m.toLowerCase());
    el.setAttribute("data-rig", canon);
    names.add(canon);
    // A layer hidden in the editor exports as display:none / visibility:hidden, which would beat the rig's CSS.
    // The rig decides visibility, so drop those.
    el.removeAttribute("display");
    el.removeAttribute("visibility");
    const style = el.getAttribute("style");
    if (style) el.setAttribute("style", style.replace(/(^|;)\s*(display|visibility)\s*:[^;]*/gi, ""));
  });
  const vb = root.getAttribute("viewBox") ?? `0 0 ${parseFloat(root.getAttribute("width") ?? "1080")} ${parseFloat(root.getAttribute("height") ?? "1080")}`;
  root.setAttribute("viewBox", vb);
  root.removeAttribute("width");
  root.removeAttribute("height");
  root.setAttribute("width", "100%");
  root.setAttribute("height", "100%");
  root.setAttribute("preserveAspectRatio", "xMidYMax meet");
  const [, , w, h] = vb.split(/[\s,]+/).map(Number);
  return { markup: new XMLSerializer().serializeToString(root), names, w, h };
}

export function defaultPivots(w: number, h: number): Record<string, [number, number]> {
  return {
    head: [w * 0.5, h * 0.6],
    body: [w * 0.5, h],
    "arm-left": [w * 0.36, h * 0.67],
    "arm-right": [w * 0.64, h * 0.67],
  };
}

/** Mouth shape at a frame: Rhubarb cues if we have them, otherwise a plausible flap from word timings. */
export function mouthAt(frame: number, fps: number, mouth: MouthFile | null, words: Word[], rest: string): string {
  if (mouth && mouth.cues.length) {
    let lo = 0, hi = mouth.cues.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (mouth.cues[mid].frame <= frame) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    const s = ans >= 0 ? mouth.cues[ans].shape : rest;
    return s === "X" ? rest : s;
  }
  const t = frame / fps;
  const w = words.find((x) => t >= x.start && t < x.end);
  if (!w) return rest;
  const cycle = ["C", "B", "D", "E", "B", "F", "C", "A"];
  return cycle[Math.floor(frame / 3 + w.text.length) % cycle.length];
}

/** Seeded blinks every 2–6 s, 4 frames long — identical on every render. */
export function blinkFrames(totalFrames: number, fps: number) {
  const out: number[] = [];
  let f = Math.round(fps * 1.2);
  let i = 0;
  while (f < totalFrames) {
    out.push(f);
    f += Math.round(fps * (2 + random(`blink-${i++}`) * 4));
  }
  return out;
}
