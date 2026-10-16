import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Word } from "./types";
import { theme, W } from "./theme";

type Chunk = { words: Word[]; start: number; end: number };

/** Two to four words at a time; break on scene change, punctuation or a pause. */
export function chunkWords(words: Word[]): Chunk[] {
  const out: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) out.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (cur.length && (w.scene !== prev?.scene || (prev && w.start - prev.end > 0.35) || cur.length >= 4)) flush();
    cur.push(w);
    if (/[.,!?;:]$/.test(w.text) && cur.length >= 2) flush();
  });
  flush();
  for (let i = 0; i < out.length - 1; i++) out[i].end = Math.min(out[i + 1].start, out[i].end + 0.4);
  return out;
}

export const Captions: React.FC<{ words: Word[]; y: number; onImage: boolean }> = ({ words, y, onImage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chunks = useMemo(() => chunkWords(words), [words]);
  const t = frame / fps;
  const c = chunks.find((x) => t >= x.start && t < x.end);
  if (!c) return null;
  const pop = spring({ frame: frame - Math.round(c.start * fps), fps, config: { damping: 15, mass: 0.5 } });
  return (
    <div style={{ position: "absolute", left: 0, width: W, top: y, transform: `translateY(-50%) scale(${0.85 + pop * 0.15})`, display: "flex", justifyContent: "center", zIndex: 30 }}>
      <div style={{
        fontFamily: theme.font, fontWeight: 900, fontSize: 76, lineHeight: 1.1, letterSpacing: -1, textAlign: "center", maxWidth: W * 0.88, color: theme.ink,
        ...(onImage ? { background: theme.paper, border: `${theme.stroke}px solid ${theme.ink}`, borderRadius: 24, padding: "10px 30px" } : {}),
      }}>
        {c.words.map((w, i) => {
          const active = t >= w.start;
          return (
            <span key={i} style={{ marginRight: i < c.words.length - 1 ? "0.25em" : 0, opacity: active ? 1 : 0.35, background: w.emphasis ? theme.marker : "transparent", padding: w.emphasis ? "0 0.12em" : 0, borderRadius: 10 }}>
              {w.text.replace(/[,;:]$/, "")}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- keyword pop-ups

export type Pop = { text: string; start: number; end: number; scene: string };
const nw = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Find each scene's pop phrases (scene.pop, else its emphasis words) in the spoken words.
 * A pop shows from its first word until ~0.9 s after its last word, or until the next pop.
 */
export function findPops(scenes: { id: string; pop?: string[]; emphasis?: string[] }[], words: Word[]): Pop[] {
  const out: Pop[] = [];
  for (const sc of scenes) {
    const ws = words.filter((w) => w.scene === sc.id);
    for (const phrase of sc.pop ?? sc.emphasis ?? []) {
      const t = phrase.split(/\s+/).map(nw).filter(Boolean);
      let i = ws.findIndex((_, k) => t.every((x, j) => ws[k + j] && nw(ws[k + j].text) === x));
      if (i < 0) i = ws.findIndex((_, k) => t.every((x, j) => ws[k + j] && nw(ws[k + j].text).startsWith(x)));
      if (i < 0) continue;
      const last = ws[i + t.length - 1];
      out.push({ text: phrase.replace(/[.,!?;:]+$/, ""), start: ws[i].start, end: last.end + 0.9, scene: sc.id });
    }
  }
  out.sort((a, b) => a.start - b.start);
  for (let i = 0; i < out.length - 1; i++) out[i].end = Math.min(out[i].end, out[i + 1].start - 0.02);
  return out;
}

/** One big word or phrase at a time, popping in beside the narrator as it's spoken. */
export const KeywordPops: React.FC<{ pops: Pop[]; x: number; y: number; maxW: number }> = ({ pops, x, y, maxW }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const i = pops.findIndex((p) => t >= p.start - 0.04 && t < p.end);
  if (i < 0) return null;
  const p = pops[i];
  const local = frame - Math.round((p.start - 0.04) * fps);
  const inS = spring({ frame: local, fps, config: { damping: 9, mass: 0.5, stiffness: 180 } }); // a little overshoot
  const outF = Math.round(p.end * fps) - frame;
  const out = Math.min(1, Math.max(0, outF / 4));
  const tilt = i % 2 ? 3 : -3;
  const size = Math.max(64, Math.min(124, (maxW / Math.max(4, p.text.length)) * 1.7));
  return (
    <div style={{ position: "absolute", left: x - maxW / 2, top: y, width: maxW, transform: `translateY(-50%) scale(${inS * out}) rotate(${tilt}deg)`, display: "flex", justifyContent: "center", zIndex: 30, pointerEvents: "none" }}>
      <span style={{ fontFamily: theme.font, fontWeight: 900, fontSize: size, lineHeight: 1.05, letterSpacing: -1.5, color: theme.ink, background: theme.marker, padding: "4px 22px 8px", borderRadius: 18, textAlign: "center", boxShadow: `6px 6px 0 ${theme.ink}`, border: `5px solid ${theme.ink}` }}>
        {p.text}
      </span>
    </div>
  );
};
