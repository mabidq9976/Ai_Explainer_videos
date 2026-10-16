import React, { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { HEADLINE, SUBTITLE } from "./fonts";
import { LOOK, TAG_BG, type CaptionPreset } from "./config";
import { makeCues, type CueWord } from "./cues";
import { W } from "../theme";

const ease = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
const stroke = (w: number, c: string): React.CSSProperties => (c === "transparent" || w <= 0 ? {} : { WebkitTextStroke: `${w}px ${c}`, paintOrder: "stroke fill", strokeLinejoin: "round" });

// ---------------------------------------------------------------- title (hook headline)

export const TITLE_TOP = 64;
const TITLE_W = 960;

/** Break the headline into 1–3 balanced lines and pick the biggest size that fits. Anton caps ≈ 0.5em per char. */
export function titleLayout(text: string) {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  let best = { lines: [text.toUpperCase()], size: 60 };
  for (let n = 1; n <= 3; n++) {
    const target = words.join(" ").length / n;
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if (cur && (cur + " " + w).length > target * 1.15 && lines.length < n - 1) { lines.push(cur); cur = w; }
      else cur = cur ? `${cur} ${w}` : w;
    }
    lines.push(cur);
    const longest = Math.max(...lines.map((l) => l.length));
    const size = Math.min(150, TITLE_W / (longest * 0.5));
    if (size > best.size + 4 || (n === 1 && size >= 120)) best = { lines, size };
  }
  return { ...best, height: best.lines.length * best.size * 0.98 };
}

/** Headline stacked at the top: each line slides up out of a mask, holds, then lifts away. */
export const TitleCard: React.FC<{ text: string; from: number; to: number; preset: CaptionPreset }> = ({ text, from, to, preset }) => {
  const frame = useCurrentFrame();
  const L = LOOK[preset];
  const { lines, size } = useMemo(() => titleLayout(text), [text]);
  if (frame < from || frame > to) return null;
  const out = interpolate(frame, [to - 8, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  return (
    <div style={{ position: "absolute", top: TITLE_TOP, left: (W - TITLE_W) / 2, width: TITLE_W, zIndex: 40, opacity: 1 - out, transform: `translateY(${-out * 30}px)` }}>
      {lines.map((l, i) => {
        const p = ease(frame - from, i * 3, i * 3 + 9);
        return (
          <div key={i} style={{ overflow: "hidden", height: size * 0.98, lineHeight: `${size * 0.98}px`, textAlign: "center" }}>
            <div style={{ fontFamily: HEADLINE, fontSize: size, color: L.titleFill, letterSpacing: 0.5, textShadow: L.titleShadow, ...stroke(size * L.titleStrokeK, L.titleStroke), transform: `translateY(${(1 - p) * 105}%)` }}>{l}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- fact tag

export type Tag = { text: string; start: number; end: number };

/** Condensed caps on an orange bar — wipes in from the left, holds, wipes out to the right. */
export const FactTag: React.FC<{ tags: Tag[]; top: number; preset: CaptionPreset }> = ({ tags, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const tag = tags.find((x) => t >= x.start && t < x.end);
  if (!tag) return null;
  const f0 = Math.round(tag.start * fps), f1 = Math.round(tag.end * fps);
  const inP = ease(frame - f0, 0, 7);
  const outP = interpolate(frame, [f1 - 6, f1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const size = Math.min(76, (W * 0.84) / Math.max(8, tag.text.length * 0.5));
  return (
    <div style={{ position: "absolute", top, left: 0, width: W, display: "flex", justifyContent: "center", zIndex: 41 }}>
      <div style={{ position: "relative", padding: `${size * 0.1}px ${size * 0.32}px ${size * 0.06}px`, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: TAG_BG, transformOrigin: outP > 0 ? "right center" : "left center", transform: `scaleX(${outP > 0 ? 1 - outP : inP})` }} />
        <div style={{ position: "relative", fontFamily: HEADLINE, fontSize: size, lineHeight: 1.12, color: "#fff", letterSpacing: 0.5, whiteSpace: "nowrap", opacity: ease(frame - f0, 3, 8) * (1 - outP) }}>{tag.text.toUpperCase()}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- subtitles

/** Lower-third subtitles: one phrase at a time, ≤ 2 balanced lines, a soft rise in, emphasis words in the accent colour. */
export const Subtitles: React.FC<{ words: CueWord[]; y: number; preset: CaptionPreset }> = ({ words, y, preset }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const boxed = preset === "boxed";
  // Boxed captions are one short line (2–4 words); the others are up to two balanced lines.
  const cues = useMemo(() => makeCues(words, boxed ? { maxLine: 17, maxLines: 1, minDur: 0.5 } : {}), [words, boxed]);
  const t = frame / fps;
  const cue = cues.find((c) => t >= c.start && t < c.end);
  if (!cue) return null;
  const L = LOOK[preset];
  const f0 = Math.round(cue.start * fps), f1 = Math.round(cue.end * fps);
  const inP = ease(frame - f0, 0, boxed ? 4 : 5);
  const next = cues[cues.indexOf(cue) + 1];
  const gapAfter = !next || next.start - cue.end > 0.1;
  const outP = gapAfter ? interpolate(frame, [f1 - 4, f1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  if (boxed) {
    const text = cue.words;
    return (
      <div style={{ position: "absolute", left: 0, width: W, top: y, display: "flex", justifyContent: "center", zIndex: 40, transform: `translateY(-50%) scale(${0.96 + inP * 0.04})`, opacity: inP * (1 - outP) }}>
        <div style={{ background: (L as any).box, borderRadius: 14, padding: "10px 22px 12px", fontFamily: SUBTITLE, fontWeight: 700, fontSize: 44, lineHeight: 1.15, color: L.fill, whiteSpace: "nowrap", letterSpacing: -0.3 }}>
          {text.map((w, k) => (
            <span key={k} style={{ color: w.emphasis ? L.emphasis : L.fill }}>{k === text.length - 1 ? w.text.replace(/[.,;:]+$/, "") : w.text}{k < text.length - 1 ? " " : ""}</span>
          ))}
        </div>
      </div>
    );
  }

  const size = 56;
  return (
    <div style={{ position: "absolute", left: 60, width: W - 120, top: y, transform: `translateY(-50%) translateY(${(1 - inP) * 10}px)`, opacity: inP * (1 - outP), zIndex: 40, textAlign: "center" }}>
      {cue.lines.map((line, i) => (
        <div key={i} style={{ fontFamily: SUBTITLE, fontWeight: 800, fontSize: size, lineHeight: 1.18, color: L.fill, textShadow: L.shadow, ...stroke(L.strokeW, L.stroke) }}>
          {line.map((w, k) => (
            <span key={k} style={{ color: w.emphasis ? L.emphasis : L.fill }}>{w.text}{k < line.length - 1 ? " " : ""}</span>
          ))}
        </div>
      ))}
    </div>
  );
};
