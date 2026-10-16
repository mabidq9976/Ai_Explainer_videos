import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { CP, Fill, usePop } from "./shared";

export const StatCounter: React.FC<CP<{ value: number; label: string; source?: string; prefix?: string; suffix?: string; at?: number }>> = ({ value, label, source, prefix = "", suffix = "", at, box }) => {
  const frame = useCurrentFrame();
  const s0 = at !== undefined ? Math.round(at * 30) : 4; // counts up from its word when `at` is set
  const v = interpolate(frame, [s0, s0 + 30], [0, value], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const decimals = Number.isInteger(value) ? 0 : 1;
  const pop = usePop(0);
  const labelIn = usePop(18);
  const n = `${prefix}${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  return (
    <Fill>
      <div style={{ fontSize: Math.min(box.w * 0.3, (box.w * 0.9) / Math.max(2, n.length) * 1.7), fontWeight: 900, letterSpacing: -6, transform: `scale(${0.7 + pop * 0.3})`, color: theme.ink }}>{n}</div>
      <div style={{ width: 160, height: 12, background: theme.accent, borderRadius: 6, margin: "16px 0 28px", transform: `scaleX(${labelIn})` }} />
      <div style={{ fontSize: 58, fontWeight: 700, textAlign: "center", maxWidth: box.w * 0.85, lineHeight: 1.2, opacity: labelIn }}>{label}</div>
      {source && <div style={{ marginTop: 22, fontSize: 32, fontWeight: 500, color: theme.muted, opacity: labelIn }}>Source: {source}</div>}
    </Fill>
  );
};
