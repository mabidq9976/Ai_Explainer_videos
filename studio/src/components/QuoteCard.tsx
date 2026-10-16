import React from "react";
import { theme } from "../theme";
import { CP, Card, Fill, fitSize, usePop } from "./shared";

export const QuoteCard: React.FC<CP<{ text: string; source: string }>> = ({ text, source, box }) => {
  const pop = usePop(0);
  const src = usePop(14);
  return (
    <Fill>
      <Card style={{ width: box.w * 0.84, padding: "70px 64px 56px", transform: `rotate(${(1 - pop) * -4}deg) scale(${0.85 + pop * 0.15})`, opacity: pop, position: "relative" }}>
        <div style={{ position: "absolute", top: -70, left: 40, fontSize: 220, fontWeight: 900, color: theme.accent, lineHeight: 1 }}>“</div>
        <div style={{ fontSize: fitSize(text, box.w * 0.7, 5, 70, 40), fontWeight: 700, lineHeight: 1.25 }}>{text}</div>
        <div style={{ marginTop: 34, fontSize: 36, fontWeight: 600, color: theme.muted, opacity: src }}>— {source}</div>
      </Card>
    </Fill>
  );
};
