import type { Word } from "../types";

/** How much the narrator is talking right now (0..1), smoothed so gestures don't jitter. */
export function speechEnergy(t: number, words: Word[]) {
  let e = 0;
  for (const w of words) {
    if (w.start > t + 0.3) break;
    const d = t < w.start ? w.start - t : t > w.end ? t - w.end : 0;
    e = Math.max(e, Math.max(0, 1 - d / 0.3));
  }
  return smooth(e);
}

export const smooth = (u: number) => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
};
