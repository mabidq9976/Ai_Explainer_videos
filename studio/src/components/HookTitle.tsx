import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { CP, Fill, Marker, fitSize, usePop } from "./shared";

/** Kinetic hook text: words pop in one by one, emphasis words get a marker sweep. */
export const HookTitle: React.FC<CP<{ text: string; emphasis?: string[] }>> = ({ text, emphasis = [], box }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/);
  const emph = emphasis.flatMap((e) => e.toLowerCase().split(/\s+/));
  const size = fitSize(text, box.w * 0.86, 4, 150);
  return (
    <Fill style={{ padding: box.w * 0.07 }}>
      <div style={{ fontSize: size, fontWeight: 900, lineHeight: 1.08, letterSpacing: -2, textAlign: "center" }}>
        {words.map((w, i) => {
          const d = i * 3;
          const pop = usePop(d, 12);
          const isEmph = emph.includes(w.toLowerCase().replace(/[^a-z0-9#≠]/g, ""));
          const mark = interpolate(frame, [d + 6, d + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <span key={i} style={{ display: "inline-block", marginRight: "0.25em", transform: `translateY(${(1 - pop) * 40}px) scale(${0.8 + pop * 0.2})`, opacity: pop }}>
              {isEmph ? <Marker progress={mark}>{w}</Marker> : w}
            </span>
          );
        })}
      </div>
      <div style={{ marginTop: 40, width: interpolate(frame, [words.length * 3, words.length * 3 + 12], [0, 220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), height: 14, background: theme.accent, borderRadius: 7 }} />
    </Fill>
  );
};
