import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "./theme";

/** Week-1 sanity check: a blank 1080×1920 render with a moving bar. */
export const TestCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: theme.paper, alignItems: "center", justifyContent: "center", fontFamily: theme.font }}>
      <div style={{ fontSize: 90, fontWeight: 900, color: theme.ink }}>AI Director Studio</div>
      <div style={{ fontSize: 40, color: theme.muted, marginTop: 12 }}>1080 × 1920 · 30 fps · frame {frame}</div>
      <div style={{ marginTop: 50, width: interpolate(frame, [0, 89], [0, 700]), height: 16, borderRadius: 8, background: theme.accent }} />
    </AbsoluteFill>
  );
};
