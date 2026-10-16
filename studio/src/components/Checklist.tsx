import React from "react";
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import type { CP, CardLook } from "./shared";

type Item = string | { text: string; at?: number };

const INK = "#111111", MUTED = "#A3A09A";
/** Earliest frame a step may activate (its row slides in at 6 + 4·i). Shared with the ding cue in Sound.tsx. */
export const CHECK_MIN = (i: number) => 14 + i * 4;

/** A sketched square: each corner nudged a little and the stroke overshooting where it closes — like the avatar's line art. */
function sketchBox(seed: string, s: number) {
  const j = (k: string, amt = 2.4) => (random(`${seed}-${k}`) - 0.5) * 2 * amt;
  const p = [
    [6 + j("ax"), 7 + j("ay")], [52 + j("bx"), 5 + j("by")], [54 + j("cx"), 52 + j("cy")], [5 + j("dx"), 54 + j("dy")],
  ];
  // Slightly bowed sides (quadratic curves) and an overshoot past the start corner.
  const mid = (a: number[], b: number[], k: string) => [(a[0] + b[0]) / 2 + j(k + "mx", 1.6), (a[1] + b[1]) / 2 + j(k + "my", 1.6)];
  const [a, b, c, d] = p;
  const m1 = mid(a, b, "1"), m2 = mid(b, c, "2"), m3 = mid(c, d, "3"), m4 = mid(d, a, "4");
  const end = [a[0] + 3 + j("ex", 1), a[1] - 1 + j("ey", 1)];
  const sc = (q: number[]) => `${(q[0] * s).toFixed(1)},${(q[1] * s).toFixed(1)}`;
  return `M${sc(a)} Q${sc(m1)} ${sc(b)} Q${sc(m2)} ${sc(c)} Q${sc(m3)} ${sc(d)} Q${sc(m4)} ${sc(end)}`;
}

/** A loose doodle tick that swoops out past the box's top-right corner. */
function sketchCheck(seed: string, s: number) {
  const j = (k: string, amt = 2) => (random(`${seed}-c-${k}`) - 0.5) * 2 * amt;
  const pts = [[13 + j("1"), 31 + j("2")], [22 + j("3"), 41 + j("4")], [27 + j("5"), 46 + j("6")], [44 + j("7"), 18 + j("8")], [66 + j("9"), -6 + j("10")]];
  const sc = (q: number[]) => `${(q[0] * s).toFixed(1)},${(q[1] * s).toFixed(1)}`;
  return `M${sc(pts[0])} Q${sc(pts[1])} ${sc(pts[2])} Q${sc(pts[3])} ${sc(pts[4])}`;
}

/**
 * Hand-drawn checklist: clean rows in the house font, each with a sketched black box and a doodle check in the same
 * line weight as the narrator. The whole list previews in grey; each item turns ink and gets its check drawn on its
 * spoken word (`at`). Timing per item: activates at its word − 8 frames, the check draws 6–14 frames later.
 */
export const Checklist: React.FC<CP<{ items: Item[]; title?: string; look?: CardLook }>> = ({ items = [], title, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = items.slice(0, 7).map((raw, i) => {
    const text = typeof raw === "string" ? raw : raw.text;
    const cue = typeof raw === "object" && typeof raw.at === "number" ? Math.round(raw.at * fps) - 8 : null;
    const d = Math.max(cue ?? 10 + i * 14, CHECK_MIN(i)); // never before its row has appeared
    return { text, d };
  });
  const W = Math.min(box.w * 0.82, 820);
  const s = W / 820;
  const BOX = 60 * s;
  const titleIn = spring({ frame, fps, config: { damping: 18 } });

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: theme.font }}>
      <div style={{ width: W }}>
        {title && (
          <div style={{ fontSize: 56 * s, fontWeight: 800, letterSpacing: -1, color: INK, marginBottom: 34 * s, opacity: titleIn, transform: `translateY(${(1 - titleIn) * 16}px)` }}>{title}</div>
        )}
        {list.map((it, i) => {
          const appear = spring({ frame: frame - (6 + i * 4), fps, config: { damping: 18 } });
          const on = interpolate(frame, [it.d, it.d + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const draw = interpolate(frame, [it.d + 6, it.d + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const seed = `${i}-${it.text}`;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 30 * s, margin: `${18 * s}px 0`, opacity: appear, transform: `translateX(${(1 - appear) * -24}px)` }}>
              <svg width={BOX * 1.25} height={BOX * 1.25} viewBox={`${-4 * s} ${-12 * s} ${74 * s} ${74 * s}`} style={{ flex: "none", overflow: "visible" }}>
                <path d={sketchBox(seed, s)} fill="none" stroke={on > 0.5 ? INK : MUTED} strokeWidth={5 * s} strokeLinecap="round" strokeLinejoin="round" />
                <path d={sketchCheck(seed, s)} fill="none" stroke={INK} strokeWidth={7.5 * s} strokeLinecap="round" strokeLinejoin="round"
                  pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} opacity={draw > 0 ? 1 : 0} />
              </svg>
              <div style={{ fontSize: 50 * s, fontWeight: 700, lineHeight: 1.15, color: on > 0.5 ? INK : MUTED, letterSpacing: -0.5 }}>{it.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
