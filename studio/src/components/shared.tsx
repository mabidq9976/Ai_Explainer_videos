import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export type Box = { w: number; h: number };
export type CP<T> = T & { box: Box };

/** Rough font size so `text` fills `w` across at most `lines` lines. */
export const fitSize = (text: string, w: number, lines: number, max: number, min = 40) => {
  const chars = Math.max(6, text.length);
  const perLine = chars / lines;
  return Math.max(min, Math.min(max, (w / perLine) * 1.75));
};

export const usePop = (delay = 0, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.6 } });
};

export type CardLook = "brutal" | "soft" | "line" | "chat";

/** Episode-wide card style (scene.json `cardStyle`); a component's `look` prop overrides it. */
export const CardStyleContext = React.createContext<CardLook>(theme.cardStyle);
export const useCardLook = (override?: CardLook) => override ?? React.useContext(CardStyleContext);

export const CARD: Record<CardLook, React.CSSProperties> = {
  // Bold and flat: thick ink border, hard offset shadow (the original look).
  brutal: { background: theme.card, border: `${theme.stroke}px solid ${theme.ink}`, borderRadius: theme.radius, boxShadow: `10px 10px 0 ${theme.ink}` },
  // Modern app UI: hairline border, rounded, soft layered shadow.
  soft: { background: "#FFFFFF", border: "1.5px solid #E7E4DC", borderRadius: 30, boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 18px 44px rgba(0,0,0,0.10)" },
  // Editorial: clean ink outline, no shadow.
  line: { background: "#FFFFFF", border: `3px solid ${theme.ink}`, borderRadius: 22, boxShadow: "none" },
  // Chat-app bubble: no border, light grey fill.
  chat: { background: "#F2F1EE", border: "none", borderRadius: 34, boxShadow: "none" },
};

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; look?: CardLook }> = ({ children, style, look }) => {
  const l = useCardLook(look);
  return <div style={{ ...CARD[l], ...style }}>{children}</div>;
};

/** Yellow marker highlight that sweeps in behind a word. */
export const Marker: React.FC<{ children: React.ReactNode; progress: number; color?: string }> = ({ children, progress, color = theme.marker }) => (
  <span style={{ position: "relative", display: "inline-block" }}>
    <span
      style={{
        position: "absolute",
        left: "-0.08em",
        right: "-0.08em",
        top: "0.18em",
        bottom: "0.06em",
        background: color,
        transformOrigin: "left center",
        transform: `scaleX(${Math.max(0, Math.min(1, progress))})`,
        borderRadius: 6,
        zIndex: 0,
      }}
    />
    <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
  </span>
);

export const Fill: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: theme.font, color: theme.ink, ...style }}>
    {children}
  </div>
);
