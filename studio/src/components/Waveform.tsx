import React from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import type { CP } from "./shared";

/** Gradient audio bars pulsing (voices, podcasts, sound). From the reference: orange → pink bars. */
export const Waveform: React.FC<CP<{ bars?: number; from?: string; to?: string }>> = ({ bars = 36, from = "#FF8A00", to = "#E5177B", box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const bw = (box.w * 0.8) / bars;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: bw * 0.35 }}>
      {Array.from({ length: bars }, (_, i) => {
        const env = Math.sin((i / (bars - 1)) * Math.PI);
        const h = (0.18 + env * 0.8 * (0.45 + 0.55 * Math.abs(Math.sin(t * 6 + i * 0.9 + random(`w${i}`) * 6)))) * box.h * 0.8;
        const c = i / (bars - 1);
        return <div key={i} style={{ width: bw * 0.65, height: h, borderRadius: bw, background: `color-mix(in srgb, ${from} ${(1 - c) * 100}%, ${to})` }} />;
      })}
    </div>
  );
};
