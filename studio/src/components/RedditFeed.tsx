import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CP } from "./shared";

type Post = { sub: string; title: string; age?: string; flair?: string; at?: number };

const SANS = '"IBM Plex Sans", "Noto Sans", -apple-system, "Helvetica Neue", Arial, sans-serif';
const SUB_COLORS = ["#FF4500", "#0079D3", "#46D160", "#FFB000", "#7193FF", "#FF585B"];
const subColor = (s: string) => SUB_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % SUB_COLORS.length];

const Snoo: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="10" fill="#FF4500" />
    <path fill="#fff" d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.12 2.14.45a1 1 0 1 0 .13-.61L10.88 4a.31.31 0 0 0-.37.24l-.73 3.47a7.14 7.14 0 0 0-3.9 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .74-1.33zM6.67 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.81 2.75a3.84 3.84 0 0 1-2.47.77 3.84 3.84 0 0 1-2.47-.77.27.27 0 0 1 .38-.38A3.27 3.27 0 0 0 10 14a3.28 3.28 0 0 0 2.09-.61.28.28 0 1 1 .39.4zm-.18-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1.01 1.04z" />
  </svg>
);

const Pill: React.FC<{ children: React.ReactNode; s: number }> = ({ children, s }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 * s, height: 40 * s, padding: `0 ${14 * s}px`, borderRadius: 999, background: "#F1F3F4", color: "#2A3C42", fontSize: 21 * s, fontWeight: 600 }}>{children}</div>
);
const Up = ({ s }: { s: number }) => <svg width={20 * s} height={20 * s} viewBox="0 0 20 20"><path d="M10 3 3 11h4v6h6v-6h4z" fill="none" stroke="#2A3C42" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
const Down = ({ s }: { s: number }) => <svg width={20 * s} height={20 * s} viewBox="0 0 20 20"><path d="M10 17 3 9h4V3h6v6h4z" fill="none" stroke="#2A3C42" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
const Bubble = ({ s }: { s: number }) => <svg width={20 * s} height={20 * s} viewBox="0 0 20 20"><path d="M4 4h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" fill="none" stroke="#2A3C42" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
const Share = ({ s }: { s: number }) => <svg width={20 * s} height={20 * s} viewBox="0 0 20 20"><path d="M11 4l6 6-6 6v-3.5C7 12.5 4.5 14 3 17c.5-4.5 3-8 8-8.5z" fill="none" stroke="#2A3C42" strokeWidth="1.6" strokeLinejoin="round" /></svg>;

/**
 * Real-looking Reddit post cards stacking in like a feed (newest pushes the stack down), each on its spoken word
 * (`at`). Shows subreddit, age, title and the action row — no vote or comment counts, so nothing is made up.
 */
export const RedditFeed: React.FC<CP<{ posts: Post[] }>> = ({ posts = [], box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = posts.slice(0, 4);
  const cardW = Math.min(box.w * 0.86, 900);
  const s = cardW / 900;
  const starts = list.map((p, i) => (typeof p.at === "number" ? Math.round(p.at * fps) - 4 : 8 + i * 16));
  const header = spring({ frame, fps, config: { damping: 16 } });
  const CARD_H = 215 * s, GAP = 22 * s;

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: SANS }}>
      {/* Reddit header */}
      <div style={{ position: "absolute", top: box.h * 0.04, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, opacity: header, transform: `translateY(${(1 - header) * 16}px)` }}>
        <Snoo size={58 * s} />
        <div style={{ fontSize: 46 * s, fontWeight: 800, color: "#1A1A1B", letterSpacing: -0.5 }}>reddit</div>
      </div>
      {list.map((p, i) => {
        const inP = spring({ frame: frame - starts[i], fps, config: { damping: 18, mass: 0.85 } });
        // Each later card that has arrived pushes this one down by one slot (feed behaviour, newest on top).
        const later = list.filter((_, k) => k > i && frame >= starts[k]).map((_, k) => spring({ frame: frame - starts[i + 1 + k], fps, config: { damping: 18, mass: 0.85 } })).reduce((a, b) => a + b, 0);
        const y = box.h * 0.16 + later * (CARD_H + GAP);
        const color = subColor(p.sub);
        return (
          <div key={i} style={{
            position: "absolute", left: (box.w - cardW) / 2, top: y, width: cardW, minHeight: CARD_H, boxSizing: "border-box",
            background: "#FFFFFF", border: "1px solid #E5E7EA", borderRadius: 22 * s, padding: `${20 * s}px ${26 * s}px`,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.07)",
            opacity: Math.min(1, inP * 1.4) * interpolate(later, [1.5, 2.6], [1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `translateY(${(1 - inP) * -40}px) scale(${0.96 + inP * 0.04})`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 * s, fontSize: 22 * s, color: "#576F76" }}>
              <div style={{ width: 34 * s, height: 34 * s, borderRadius: "50%", background: color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15 * s }}>r/</div>
              <span style={{ color: "#1A1A1B", fontWeight: 700 }}>{p.sub}</span>
              <span>· {p.age ?? "5h"}</span>
              {p.flair && <span style={{ marginLeft: 6 * s, background: "#EDEFF1", color: "#1A1A1B", borderRadius: 999, padding: `${2 * s}px ${10 * s}px`, fontSize: 18 * s, fontWeight: 600 }}>{p.flair}</span>}
            </div>
            <div style={{ marginTop: 12 * s, fontSize: 38 * s, lineHeight: 1.22, fontWeight: 700, color: "#1A1A1B" }}>{p.title}</div>
            <div style={{ display: "flex", gap: 12 * s, marginTop: 16 * s }}>
              <Pill s={s}><Up s={s} /><span>Vote</span><Down s={s} /></Pill>
              <Pill s={s}><Bubble s={s} /><span>Comments</span></Pill>
              <Pill s={s}><Share s={s} /><span>Share</span></Pill>
            </div>
          </div>
        );
      })}
    </div>
  );
};
