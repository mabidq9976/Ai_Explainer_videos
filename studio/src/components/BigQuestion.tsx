import React from "react";
import { CP, Fill, fitSize, usePop } from "./shared";

/** Podus-style: one big plain line of black type on paper. */
export const BigQuestion: React.FC<CP<{ text: string }>> = ({ text, box }) => {
  const pop = usePop(0, 18);
  return (
    <Fill style={{ padding: box.w * 0.08 }}>
      <div style={{ fontSize: fitSize(text, box.w * 0.84, 3, 120), fontWeight: 700, lineHeight: 1.15, textAlign: "center", opacity: pop, transform: `translateY(${(1 - pop) * 30}px)` }}>{text}</div>
    </Fill>
  );
};
