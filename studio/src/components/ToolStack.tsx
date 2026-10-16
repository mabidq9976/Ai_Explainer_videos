import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Icon } from "./Icon";
import { CARD, CP, useCardLook, type CardLook } from "./shared";

type Mark = "check" | "skip" | "plus";
type Item = { name: string; sub?: string; icon?: string; tag?: string; at?: number; mark?: Mark; markAt?: number };
type Props = { title?: string; items: Item[]; stamp?: string; stampAt?: number; still?: boolean; look?: CardLook };

const SPRING = { damping: 18, mass: 0.85 };

/** Logo in a square app tile: official icon files sit on white, `logo:` tiles as-is, anything else on paper. */
const Tile: React.FC<{ spec?: string; name: string; size: number }> = ({ spec, name, size }) => {
  const frame: React.CSSProperties = { width: size, height: size, borderRadius: size * 0.24, flex: "none", display: "grid", placeItems: "center", overflow: "hidden" };
  if (spec?.startsWith("assets/"))
    return <div style={{ ...frame, background: "#FFFFFF", boxShadow: `inset 0 0 0 2px ${theme.line}` }}><Img src={staticFile(spec)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>;
  if (spec?.startsWith("logo:")) return <div style={frame}><Icon spec={spec} size={size} /></div>;
  if (spec) return <div style={{ ...frame, background: "#FFFFFF", boxShadow: `inset 0 0 0 2px ${theme.line}` }}><Icon spec={spec} size={size * 0.62} /></div>;
  return <div style={{ ...frame, background: theme.ink, color: "#fff", fontFamily: theme.font, fontWeight: 900, fontSize: size * 0.48 }}>{name.slice(0, 1).toUpperCase()}</div>;
};

/**
 * A stack of app cards (tools, plans, options), each with its logo tile, name and one-line role, arriving on its
 * spoken word (`at`). Each card can carry a `mark` on `markAt` (default: just after it arrives): `check` (picked),
 * `skip` (greys out and gets struck through) or `plus` (an add-on, outlined in the accent). An optional `stamp`
 * ("LATER", "SKIP") slams over the stack on `stampAt`. `still: true` shows the cards already in place (a follow-up
 * beat on the same stack).
 */
export const ToolStack: React.FC<CP<Props>> = ({ title, items = [], stamp, stampAt, still, look, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useCardLook(look);
  const list = items.slice(0, 5);
  const n = Math.max(1, list.length);
  const titleH = title ? 76 : 0;
  const GAP = 22;
  const ch = Math.min(168, (box.h - titleH - GAP * (n - 1)) / n);
  const cardW = Math.min(box.w * 0.9, 900);
  const tile = ch * 0.6;

  const starts = list.map((it, i) => (still ? -60 : typeof it.at === "number" ? Math.round(it.at * fps) - 4 : 8 + i * 12));
  const markFrames = list.map((it, i) => (typeof it.markAt === "number" ? Math.round(it.markAt * fps) : starts[i] + 12));
  const stampF = typeof stampAt === "number" ? Math.round(stampAt * fps) : Math.max(...markFrames) + 6;
  const titleIn = still ? 1 : spring({ frame, fps, config: SPRING });
  const stampIn = stamp ? spring({ frame: frame - stampF, fps, config: { damping: 14, mass: 0.7 } }) : 0;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: GAP, fontFamily: theme.font, color: theme.ink }}>
      {title && (
        <div style={{ height: titleH - GAP, display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: theme.muted, opacity: titleIn, transform: `translateY(${(1 - titleIn) * 12}px)` }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: theme.accent }} />
          {title}
        </div>
      )}
      {list.map((it, i) => {
        const inP = spring({ frame: frame - starts[i], fps, config: SPRING });
        const m = it.mark ? interpolate(frame, [markFrames[i], markFrames[i] + 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
        const mPop = it.mark ? spring({ frame: frame - markFrames[i], fps, config: { damping: 13, mass: 0.6 } }) : 0;
        const skip = it.mark === "skip" ? m : 0;
        const plus = it.mark === "plus" ? m : 0;
        return (
          <div key={i} style={{
            ...CARD[L], position: "relative", width: cardW, height: ch, boxSizing: "border-box", flex: "none",
            display: "flex", alignItems: "center", gap: ch * 0.18, padding: `0 ${ch * 0.2}px`,
            ...(L === "chat" ? { background: plus > 0 ? "#FFF3EC" : "#F2F1EE" } : {}),
            outline: plus > 0 ? `${3 * plus}px solid ${theme.accent}` : "none", outlineOffset: -1,
            opacity: Math.min(1, inP * 1.4) * (1 - skip * 0.5),
            filter: skip > 0 ? `grayscale(${skip})` : undefined,
            transform: `translateY(${(1 - inP) * 36}px) scale(${0.96 + inP * 0.04})`,
          }}>
            <Tile spec={it.icon} name={it.name} size={tile} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ position: "relative", display: "inline-block", fontSize: Math.min(48, ch * 0.3), fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}>
                {it.name}
                {skip > 0 && <div style={{ position: "absolute", left: -6, top: "54%", height: 5, width: `calc(${skip * 100}% + 12px)`, background: theme.ink, borderRadius: 3 }} />}
              </div>
              {it.sub && <div style={{ marginTop: 6, fontSize: Math.min(29, ch * 0.18), fontWeight: 500, color: theme.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.sub}</div>}
            </div>
            {it.tag && !it.mark && (
              <div style={{ flex: "none", fontSize: 24, fontWeight: 700, padding: "8px 18px", borderRadius: 999, background: L === "chat" ? "#FFFFFF" : "#F2F1EE", color: theme.ink }}>{it.tag}</div>
            )}
            {it.mark && (
              <div style={{ flex: "none", transform: `scale(${mPop})`, opacity: Math.min(1, mPop * 1.5) }}>
                {it.mark === "plus" ? (
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2, padding: "10px 20px", borderRadius: 999, background: theme.accent, color: "#fff" }}>+ ADD</div>
                ) : (
                  <div style={{ width: ch * 0.4, height: ch * 0.4, borderRadius: "50%", background: it.mark === "check" ? theme.accent : theme.ink, display: "grid", placeItems: "center", boxShadow: it.mark === "check" ? "0 4px 12px rgba(255,90,31,0.35)" : "none" }}>
                    <svg width={ch * 0.22} height={ch * 0.22} viewBox="0 0 24 24">
                      <path d={it.mark === "check" ? "M5 12.5 10 17.5 19 7" : "M6 6 18 18M18 6 6 18"} fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {stamp && stampIn > 0 && (
        <div style={{ position: "absolute", left: "50%", top: `calc(50% + ${titleH / 2}px)`, transform: `translate(-50%, -50%) rotate(-8deg) scale(${2 - stampIn})`, opacity: Math.min(1, stampIn * 1.3), padding: "14px 34px", border: `7px solid ${theme.accent}`, borderRadius: 18, background: "rgba(255,255,255,0.92)", color: theme.accent, fontSize: 76, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {stamp}
        </div>
      )}
    </div>
  );
};
