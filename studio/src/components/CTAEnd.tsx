import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { CP, Fill, fitSize, usePop } from "./shared";

/** Follow card. The avatar layer waves during the CTA block. */
export const CTAEnd: React.FC<CP<{ text?: string; handle?: string }>> = ({ text = "Follow for more", handle = "@thewebguy", box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = usePop(0);
  const btn = usePop(10);
  const pulse = 1 + Math.sin((frame / fps) * Math.PI * 2 * 1.2) * 0.04;
  return (
    <Fill style={{ gap: 40, padding: box.w * 0.08 }}>
      <div style={{ fontSize: fitSize(text, box.w * 0.84, 3, 104), fontWeight: 900, lineHeight: 1.08, textAlign: "center", letterSpacing: -1.5, opacity: pop, transform: `translateY(${(1 - pop) * 40}px)` }}>{text}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 22, transform: `scale(${btn * pulse})` }}>
        <div style={{ background: theme.accent, color: "#fff", fontSize: 54, fontWeight: 900, padding: "22px 64px", borderRadius: 999, border: `${theme.stroke}px solid ${theme.ink}`, boxShadow: `8px 8px 0 ${theme.ink}` }}>Follow</div>
      </div>
      <div style={{ fontSize: 40, fontWeight: 700, color: theme.muted, opacity: btn }}>{handle}</div>
    </Fill>
  );
};
