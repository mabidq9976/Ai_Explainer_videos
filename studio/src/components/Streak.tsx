import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import type { CP } from "./shared";

/**
 * A habit streak: a row of steps (weeks, days) that tick orange one after another from `at`, the line between
 * them filling as they go — "every week", "every day", consistency. Optional `label` above the row.
 */
export const Streak: React.FC<CP<{ labels?: string[]; label?: string; at?: number }>> = ({ labels = ["Wk 1", "Wk 2", "Wk 3", "Wk 4"], label, at, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = labels.slice(0, 7);
  const n = Math.max(1, list.length);
  const start = typeof at === "number" ? Math.round(at * fps) : 10;
  const STEP = 5;
  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.85 } });
  const rowW = Math.min(box.w * 0.9, 900);
  const size = Math.min(96, (rowW / n) * 0.62, box.h * 0.5);
  const gap = (rowW - size * n) / Math.max(1, n - 1);
  const tick = (i: number) => interpolate(frame, [start + i * STEP, start + i * STEP + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, fontFamily: theme.font, color: theme.ink, opacity: enter, transform: `translateY(${(1 - enter) * 20}px)` }}>
      {label && <div style={{ fontSize: 36, fontWeight: 800 }}>{label}</div>}
      <div style={{ position: "relative", width: rowW, height: size }}>
        {list.slice(1).map((_, k) => {
          const x0 = k * (size + gap) + size, w = gap;
          return (
            <div key={k} style={{ position: "absolute", left: x0 + 6, top: size / 2 - 3, width: w - 12, height: 6, borderRadius: 3, background: theme.line, overflow: "hidden" }}>
              <div style={{ width: `${tick(k + 1) * 100}%`, height: "100%", background: theme.accent }} />
            </div>
          );
        })}
        {list.map((l, i) => {
          const t = tick(i);
          const pop = spring({ frame: frame - start - i * STEP, fps, config: { damping: 12, mass: 0.6 } });
          return (
            <div key={i} style={{ position: "absolute", left: i * (size + gap), top: 0, width: size, height: size }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `4px solid ${theme.line}`, background: "#FFFFFF", boxSizing: "border-box" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: theme.accent, transform: `scale(${t > 0 ? pop : 0})`, display: "grid", placeItems: "center", boxShadow: t > 0 ? "0 4px 12px rgba(255,90,31,0.35)" : "none" }}>
                <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} /></svg>
              </div>
              <div style={{ position: "absolute", top: size + 10, left: "50%", transform: "translateX(-50%)", fontSize: 26, fontWeight: 700, color: t > 0.5 ? theme.ink : theme.muted, whiteSpace: "nowrap" }}>{l}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
