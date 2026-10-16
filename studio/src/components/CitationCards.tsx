import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { CP, Card, Fill, usePop } from "./shared";

/** Source cards stack in; one gets highlighted as the cited source. */
export const CitationCards: React.FC<CP<{ sources: string[]; cited?: number }>> = ({ sources = [], cited = 0, box }) => {
  const frame = useCurrentFrame();
  const list = sources.slice(0, 5);
  const hl = interpolate(frame, [list.length * 6 + 10, list.length * 6 + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardH = Math.min(170, (box.h * 0.82) / Math.max(1, list.length));
  return (
    <Fill>
      {list.map((s, i) => {
        const p = usePop(i * 6);
        const isCited = i === cited;
        const domain = s.replace(/^https?:\/\//, "").split("/")[0];
        return (
          <Card key={i} style={{
            width: box.w * 0.82, height: cardH - 22, margin: "11px 0", padding: "0 34px", display: "flex", alignItems: "center", gap: 24,
            opacity: isCited ? p : p * (1 - hl * 0.55),
            transform: `translateY(${(1 - p) * 80}px) scale(${isCited ? 1 + hl * 0.06 : 1})`,
            borderColor: isCited && hl > 0 ? theme.accent : theme.ink,
            boxShadow: `10px 10px 0 ${isCited && hl > 0 ? theme.accent : theme.ink}`,
            position: "relative", zIndex: isCited ? 2 : 1,
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: theme.line, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 34, flex: "none" }}>{domain[0]?.toUpperCase()}</div>
            <div style={{ fontSize: 40, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{domain}</div>
            {isCited && <div style={{ marginLeft: "auto", background: theme.accent, color: "#fff", fontWeight: 800, fontSize: 30, padding: "8px 20px", borderRadius: 999, opacity: hl, transform: `scale(${0.6 + hl * 0.4})` }}>CITED</div>}
          </Card>
        );
      })}
    </Fill>
  );
};
