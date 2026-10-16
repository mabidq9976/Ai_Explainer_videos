import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { CP, Fill, usePop } from "./shared";

type Item = string | { text: string; at?: number };

/** Items tick in one by one — on their spoken word when an item has `at` (a word, resolved to seconds). */
export const Checklist: React.FC<CP<{ items: Item[]; title?: string }>> = ({ items = [], title, box }) => {
  const frame = useCurrentFrame();
  const gap = 12;
  return (
    <Fill style={{ alignItems: "stretch", padding: `0 ${box.w * 0.09}px` }}>
      {title && <div style={{ fontSize: 64, fontWeight: 900, marginBottom: 36, letterSpacing: -1 }}>{title}</div>}
      {items.map((raw, i) => {
        const it = typeof raw === "string" ? raw : raw.text;
        const cue = typeof raw === "object" && typeof raw.at === "number" ? Math.round(raw.at * 30) - 8 : null;
        const d = cue ?? 6 + i * gap;
        const pop = usePop(d);
        const tick = interpolate(frame, [d + 6, d + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 30, margin: "16px 0", opacity: pop, transform: `translateX(${(1 - pop) * -60}px)` }}>
            <svg width={84} height={84} viewBox="0 0 84 84" style={{ flex: "none" }}>
              <rect x={5} y={5} width={74} height={74} rx={18} fill={tick > 0.5 ? theme.marker : theme.card} stroke={theme.ink} strokeWidth={theme.stroke} />
              <path d="M22 44 L37 58 L63 28" fill="none" stroke={theme.ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={70} strokeDashoffset={70 * (1 - tick)} />
            </svg>
            <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.15 }}>{it}</div>
          </div>
        );
      })}
    </Fill>
  );
};
