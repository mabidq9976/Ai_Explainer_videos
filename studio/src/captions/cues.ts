/**
 * Subtitle cues the way an editor sets them: phrase by phrase, at most two balanced lines,
 * breaks at punctuation, no stranded one-word lines, and every cue on screen long enough to read.
 * Pure (no Remotion) — shared by the renderer and scripts/subtitles.ts (.srt / .vtt).
 */
export type CueWord = { text: string; start: number; end: number; scene: string; emphasis?: boolean };
export type Cue = { start: number; end: number; words: CueWord[]; lines: CueWord[][] };

const len = (ws: CueWord[]) => ws.map((w) => w.text).join(" ").length;

/** Split a phrase into ≤ 2 lines, as even as possible, preferring a break after punctuation. */
export function balance(ws: CueWord[], maxLine: number): CueWord[][] {
  if (len(ws) <= maxLine) return [ws];
  let best = 1, score = Infinity;
  for (let i = 1; i < ws.length; i++) {
    const a = len(ws.slice(0, i)), b = len(ws.slice(i));
    if (a > maxLine * 1.15 || b > maxLine * 1.15) continue;
    const punct = /[,;:]$/.test(ws[i - 1].text) ? -4 : 0;
    const orphan = i === 1 || i === ws.length - 1 ? 8 : 0; // avoid one-word lines
    const s = Math.abs(a - b) + punct + orphan;
    if (s < score) { score = s; best = i; }
  }
  return [ws.slice(0, best), ws.slice(best)];
}

export function makeCues(words: CueWord[], opts: { maxLine?: number; maxLines?: number; minDur?: number } = {}): Cue[] {
  const maxLine = opts.maxLine ?? 26, maxChars = maxLine * (opts.maxLines ?? 2), minDur = opts.minDur ?? 0.8;
  const out: Cue[] = [];
  let cur: CueWord[] = [];
  const flush = () => {
    if (!cur.length) return;
    out.push({ start: cur[0].start, end: Math.max(cur[cur.length - 1].end, cur[0].start + minDur), words: cur, lines: balance(cur, maxLine) });
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const next = len([...cur, w]);
    // Allow a little overflow rather than strand the last 1–2 words of a sentence.
    const tail = words.slice(i, i + 3).findIndex((x) => /[.!?]$/.test(x.text));
    const tailLen = tail >= 0 ? len(words.slice(i, i + tail + 1)) : Infinity;
    const allowLong = tail >= 0 && tail <= 1 && len(cur) + 1 + tailLen <= maxChars + 8;
    if (cur.length && (w.scene !== prev?.scene || w.start - prev.end > 0.45 || (next > maxChars && !allowLong))) flush();
    cur.push(w);
    if (/[.!?]$/.test(w.text) && len(cur) >= 12) flush();
  });
  flush();
  for (let i = 0; i < out.length - 1; i++) out[i].end = Math.min(out[i].end + 0.25, out[i + 1].start);
  return out;
}
