import React from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { CP, Fill, usePop } from "./shared";

/** Floating terms, one pulsing. The default fallback for any visual. */
export const KeywordCloud: React.FC<CP<{ words: string[]; focus?: string }>> = ({ words = [], focus, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const list = words.length ? words.slice(0, 9) : ["search", "answer", "source"];
  const f = focus ?? list[0];
  const cols = 3;
  return (
    <Fill>
      {list.map((w, i) => {
        const isFocus = w === f;
        const row = Math.floor(i / cols), col = i % cols;
        const rows = Math.ceil(list.length / cols);
        const x = ((col + 0.5) / cols) * box.w + (random(`kx${i}`) - 0.5) * box.w * 0.12;
        const y = ((row + 0.5) / rows) * box.h * 0.9 + box.h * 0.05 + (random(`ky${i}`) - 0.5) * 60;
        const pop = usePop(i * 3);
        const float = Math.sin(t * 1.4 + i) * 10;
        const pulse = isFocus ? 1 + Math.sin(t * Math.PI * 2 * 0.9) * 0.06 : 1;
        return (
          <div key={i} style={{
            position: "absolute", left: isFocus ? box.w / 2 : x, top: isFocus ? box.h / 2 : y,
            transform: `translate(-50%, -50%) translateY(${float}px) scale(${pop * pulse})`,
            fontSize: isFocus ? 92 : 46, fontWeight: isFocus ? 900 : 700,
            color: isFocus ? theme.ink : theme.muted,
            background: isFocus ? theme.marker : "transparent",
            border: isFocus ? `${theme.stroke}px solid ${theme.ink}` : "none",
            padding: isFocus ? "10px 34px" : 0, borderRadius: 999, whiteSpace: "nowrap", zIndex: isFocus ? 2 : 1,
          }}>{w}</div>
        );
      })}
    </Fill>
  );
};
