import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { CP, Card, Fill, usePop } from "./shared";

/** Classic blue links fade out while an AI answer card types itself in. */
export const SerpVsAiAnswer: React.FC<CP<{ query: string; answer: string; links?: string[] }>> = ({ query, answer, links, box }) => {
  const frame = useCurrentFrame();
  const results = links?.length ? links : ["The Ultimate Guide to ...", "10 Tips You Need to Know", "What Experts Say About ..."];
  const fade = interpolate(frame, [26, 40], [1, 0.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const card = usePop(30);
  const chars = Math.floor(interpolate(frame, [38, 38 + answer.length * 0.9], [0, answer.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const w = box.w * 0.88;
  return (
    <Fill style={{ justifyContent: "flex-start", paddingTop: box.h * 0.04, gap: 26 }}>
      <Card style={{ width: w, padding: "22px 34px", display: "flex", alignItems: "center", gap: 22, borderRadius: 999, boxShadow: "none" }}>
        <svg width={44} height={44} viewBox="0 0 24 24"><circle cx={10} cy={10} r={6.5} fill="none" stroke={theme.ink} strokeWidth={2.6} /><path d="M15 15 L21 21" stroke={theme.ink} strokeWidth={2.6} strokeLinecap="round" /></svg>
        <div style={{ fontSize: 40, fontWeight: 600 }}>{query}</div>
      </Card>
      <div style={{ width: w, opacity: fade }}>
        {results.slice(0, 3).map((r, i) => {
          const p = usePop(4 + i * 5);
          return (
            <div key={i} style={{ margin: "14px 8px", opacity: p }}>
              <div style={{ fontSize: 24, color: theme.muted }}>www.example{i + 1}.com</div>
              <div style={{ fontSize: 38, color: theme.link, fontWeight: 600, textDecoration: "underline" }}>{r}</div>
            </div>
          );
        })}
      </div>
      <Card style={{ width: w, padding: "30px 36px", position: "absolute", top: box.h * 0.36, opacity: card, transform: `translateY(${(1 - card) * 120}px)`, background: "#FFF6E0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
          <span style={{ color: theme.accent, fontSize: 40 }}>✦</span> AI answer
        </div>
        <div style={{ fontSize: 42, fontWeight: 600, lineHeight: 1.3, minHeight: 120 }}>
          {answer.slice(0, chars)}
          <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>▍</span>
        </div>
      </Card>
    </Fill>
  );
};
