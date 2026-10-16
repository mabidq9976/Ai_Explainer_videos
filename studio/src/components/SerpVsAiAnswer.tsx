import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { CP, Card, Fill, usePop, useCardLook, type CardLook } from "./shared";

type Props = { query: string; answer: string; links?: string[]; sources?: string[]; label?: string; look?: CardLook; cardAt?: number; typeAt?: number };

/** Classic blue links fade out while an AI answer card types itself in. `look` picks the card design. */
export const SerpVsAiAnswer: React.FC<CP<Props>> = ({ query, answer, links, sources, label = "AI answer", look, cardAt, typeAt, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useCardLook(look);
  const results = links?.length ? links : ["The Ultimate Guide to ...", "10 Tips You Need to Know", "What Experts Say About ..."];
  // Word cues (seconds after this graphic appears): when the answer card arrives and when it starts typing.
  const cardF = cardAt !== undefined ? Math.round(cardAt * fps) : 30;
  const fade = interpolate(frame, [cardF - 4, cardF + 10], [1, 0.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const card = usePop(cardF);
  // Chat look shows "typing…" dots first, then the text streams in.
  const typeFrom = typeAt !== undefined ? Math.round(typeAt * fps) : cardF + (L === "chat" ? 22 : 8);
  const typeEnd = typeFrom + answer.length * 1.3;
  const chars = Math.floor(interpolate(frame, [typeFrom, typeEnd], [0, answer.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const done = frame > typeEnd + 4;
  const chips = sources?.length ? sources : ["yourblog.com", "docs.example.com"];
  const w = box.w * 0.88;

  const caret = L === "brutal"
    ? <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>▍</span>
    : L === "chat" ? null
    : <span style={{ display: "inline-block", width: 3, height: "0.95em", marginLeft: 3, verticalAlign: "-0.12em", background: L === "line" ? theme.ink : theme.accent, opacity: frame % 16 < 8 ? 1 : 0 }} />;

  const header = {
    brutal: (
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
        <span style={{ color: theme.accent, fontSize: 40 }}>✦</span> {label}
      </div>
    ),
    soft: (
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: `linear-gradient(135deg, ${theme.accent}, #FF9A5C)`, color: "#fff", display: "grid", placeItems: "center", fontSize: 26 }}>✦</div>
        <div style={{ fontSize: 30, fontWeight: 700 }}>{label}</div>
        <div style={{ marginLeft: "auto", fontSize: 24, fontWeight: 600, color: theme.muted }}>{chips.length} sources</div>
      </div>
    ),
    line: (
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: theme.accent, marginBottom: 14 }}>{label}</div>
    ),
    chat: (
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div style={{ width: 50, height: 50, borderRadius: "50%", background: theme.ink, color: "#fff", display: "grid", placeItems: "center", fontSize: 26 }}>✦</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: theme.ink }}>{label}</div>
      </div>
    ),
  }[L];

  const dots = L === "chat" && frame < typeFrom && frame > cardF ? (
    <div style={{ display: "flex", gap: 10, padding: "14px 4px" }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: theme.muted, opacity: 0.35 + 0.65 * Math.max(0, Math.sin(((frame - i * 4) / fps) * Math.PI * 3)) }} />)}
    </div>
  ) : null;

  const chipIn = spring({ frame: frame - Math.round(typeEnd) - 4, fps, config: { damping: 16 } });
  const searchStyle: React.CSSProperties = L === "chat"
    ? { background: "#F2F1EE", border: "none" }
    : L === "soft" ? { boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 10px 24px rgba(0,0,0,0.07)" } : { boxShadow: "none" };

  return (
    <Fill style={{ justifyContent: "flex-start", paddingTop: box.h * 0.04, gap: 26 }}>
      <Card look={L} style={{ width: w, padding: "22px 34px", display: "flex", alignItems: "center", gap: 22, borderRadius: 999, ...searchStyle }}>
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
      <Card look={L} style={{
        width: w, padding: L === "line" ? "30px 36px 30px 40px" : "30px 36px", position: "absolute", top: box.h * 0.36, opacity: card,
        transform: `translateY(${(1 - card) * 120}px)`,
        ...(L === "brutal" ? { background: "#FFF6E0" } : {}),
        ...(L === "line" ? { borderLeft: `12px solid ${theme.accent}` } : {}),
        ...(L === "chat" ? { borderTopLeftRadius: 10 } : {}),
      }}>
        {header}
        {dots}
        <div style={{ fontSize: 42, fontWeight: L === "line" ? 500 : 600, lineHeight: 1.3, minHeight: dots ? 0 : 120, color: theme.ink }}>
          {frame >= typeFrom && answer.slice(0, chars)}
          {frame >= typeFrom && !done && caret}
        </div>
        {(L === "soft" || L === "chat") && done && (
          <div style={{ display: "flex", gap: 12, marginTop: 20, opacity: chipIn, transform: `translateY(${(1 - chipIn) * 10}px)` }}>
            {chips.slice(0, 3).map((c) => (
              <div key={c} style={{ fontSize: 24, fontWeight: 600, padding: "8px 16px", borderRadius: 999, background: L === "chat" ? "#fff" : "#F4F2EC", color: theme.ink, border: L === "chat" ? "none" : "1.5px solid #E7E4DC" }}>{c}</div>
            ))}
          </div>
        )}
      </Card>
    </Fill>
  );
};
