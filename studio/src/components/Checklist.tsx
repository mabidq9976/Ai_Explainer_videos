import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { CP, Card, useCardLook, type CardLook } from "./shared";

type Item = string | { text: string; at?: number };

const MUTED = "#9A978F", TRACK = "#E4E0D7";
/** Earliest frame a step may activate (its row slides in at 6 + 4·i). Shared with the ding cue in Sound.tsx. */
export const CHECK_MIN = (i: number) => 14 + i * 4;

/**
 * A stepper-style checklist on a card (follows the episode's card style). All steps show from the start in grey —
 * a preview of what's coming — then each one lights up, gets a soft highlight sweep and an orange check on its
 * spoken word (`at`), while the track and progress bar fill. The counter turns into "✓ Done" at the end.
 * Timing per item: activates at its word − 8 frames, checks 6–14 frames later (the ding sound uses the same).
 */
export const Checklist: React.FC<CP<{ items: Item[]; title?: string; look?: CardLook }>> = ({ items = [], title, look, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useCardLook(look);
  const list = items.slice(0, 6).map((raw, i) => {
    const text = typeof raw === "string" ? raw : raw.text;
    const cue = typeof raw === "object" && typeof raw.at === "number" ? Math.round(raw.at * fps) - 8 : null;
    const d = Math.max(cue ?? 10 + i * 14, CHECK_MIN(i)); // never before its row has appeared
    return { text, d, tick: interpolate(frame, [d + 6, d + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }) };
  });
  const done = list.filter((x) => x.tick >= 1).length;
  const progress = list.reduce((a, x) => a + x.tick, 0) / Math.max(1, list.length);
  const allDone = done === list.length && list.length > 0;

  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.7 } });
  const cardW = Math.min(box.w * 0.88, 880);
  const s = cardW / 880;
  const ROW = 104 * s, CIRCLE = 62 * s;
  const doneChip = interpolate(frame, [Math.max(...list.map((x) => x.d)) + 16, Math.max(...list.map((x) => x.d)) + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: theme.font }}>
      <Card look={L} style={{ width: cardW, padding: `${40 * s}px ${44 * s}px ${36 * s}px`, boxSizing: "border-box", opacity: enter, transform: `translateY(${(1 - enter) * 30}px) scale(${0.97 + enter * 0.03})`, ...(L === "brutal" ? {} : {}) }}>
        {/* Header: title + counter, then the progress bar. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 * s }}>
          {title && <div style={{ fontSize: 50 * s, fontWeight: 800, letterSpacing: -1, color: theme.ink, lineHeight: 1.1 }}>{title}</div>}
          <div style={{ position: "relative", height: 48 * s, minWidth: 112 * s, flex: "none" }}>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", borderRadius: 999, background: L === "chat" ? "#FFFFFF" : "#F1EEE7", fontSize: 26 * s, fontWeight: 800, color: theme.ink, opacity: 1 - doneChip }}>
              {done}/{list.length}
            </div>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", borderRadius: 999, background: theme.accent, color: "#fff", fontSize: 24 * s, fontWeight: 800, opacity: doneChip, transform: `scale(${0.8 + doneChip * 0.2})` }}>
              ✓ Done
            </div>
          </div>
        </div>
        <div style={{ height: 8 * s, borderRadius: 4 * s, background: L === "chat" ? "#E2DFD8" : TRACK, margin: `${22 * s}px 0 ${18 * s}px`, overflow: "hidden" }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 4 * s, background: theme.accent }} />
        </div>

        {/* Steps */}
        {list.map((it, i) => {
          const appear = spring({ frame: frame - (6 + i * 4), fps, config: { damping: 18 } }); // the list previews early
          const active = interpolate(frame, [it.d, it.d + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const sweep = interpolate(frame, [it.d, it.d + 8, it.d + 30, it.d + 44], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const next = list[i + 1];
          return (
            <div key={i} style={{ position: "relative", height: ROW, display: "flex", alignItems: "center", gap: 26 * s, opacity: appear, transform: `translateY(${(1 - appear) * 14}px)` }}>
              {/* Highlight sweep behind the row being spoken */}
              <div style={{ position: "absolute", left: -18 * s, right: -18 * s, top: 8 * s, bottom: 8 * s, borderRadius: 18 * s, background: "rgba(255,90,31,0.09)", transformOrigin: "left center", transform: `scaleX(${sweep})`, opacity: sweep }} />
              {/* Track to the next step */}
              {next && (
                <div style={{ position: "absolute", left: CIRCLE / 2 - 2 * s, top: ROW / 2 + CIRCLE / 2, width: 4 * s, height: ROW - CIRCLE, background: TRACK, borderRadius: 2 * s, overflow: "hidden" }}>
                  <div style={{ width: "100%", height: `${next.tick * 100}%`, background: theme.accent }} />
                </div>
              )}
              {/* Number → check */}
              <div style={{ position: "relative", width: CIRCLE, height: CIRCLE, flex: "none" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#FFFFFF", border: `${3 * s}px solid ${active > 0.5 ? theme.accent : "#D6D2C8"}`, display: "grid", placeItems: "center", fontSize: 28 * s, fontWeight: 800, color: active > 0.5 ? theme.accent : MUTED, boxSizing: "border-box" }}>{i + 1}</div>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: theme.accent, transform: `scale(${it.tick})`, display: "grid", placeItems: "center", boxShadow: it.tick > 0 ? "0 4px 12px rgba(255,90,31,0.35)" : "none" }}>
                  <svg width={CIRCLE * 0.55} height={CIRCLE * 0.55} viewBox="0 0 24 24">
                    <path d="M5 12.5 10 17.5 19 7" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - interpolate(it.tick, [0.3, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
                  </svg>
                </div>
              </div>
              <div style={{ position: "relative", fontSize: 44 * s, fontWeight: 700, lineHeight: 1.15, color: active > 0.5 ? theme.ink : MUTED, transition: "none" }}>{it.text}</div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};
