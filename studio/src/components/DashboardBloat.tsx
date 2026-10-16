import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Icon } from "./Icon";
import type { CP } from "./shared";

type Props = { growAt?: number; pickAt?: number; pickLabel?: string; pickSub?: string; pickIcon?: string };

const SPRING = { damping: 18, mass: 0.85 };
const G1 = "#E6E2D8", G2 = "#CFCBC1", G3 = "#9A978F";
type Rect = { x: number; y: number; w: number; h: number };

/** One abstract analytics widget (KPI, line, bars, donut or table) drawn in greys, sized to its rect. */
const Widget: React.FC<{ kind: number; r: Rect; hot: boolean }> = ({ kind, r, hot }) => {
  const pad = Math.min(r.w, r.h) * 0.14;
  const iw = r.w - pad * 2, ih = r.h - pad * 2;
  const accent = hot ? theme.accent : G3;
  let body: React.ReactNode;
  if (kind === 0) body = (
    <>
      <rect x={0} y={0} width={iw * 0.4} height={ih * 0.14} rx={ih * 0.07} fill={G1} />
      <rect x={0} y={ih * 0.32} width={iw * 0.7} height={ih * 0.3} rx={ih * 0.08} fill={hot ? theme.ink : G2} />
      <rect x={0} y={ih * 0.78} width={iw * 0.5} height={ih * 0.12} rx={ih * 0.06} fill={G1} />
    </>
  );
  else if (kind === 1) {
    const ys = [0.7, 0.55, 0.62, 0.35, 0.42, 0.18, 0.25];
    body = <polyline points={ys.map((y, i) => `${(i / (ys.length - 1)) * iw},${y * ih}`).join(" ")} fill="none" stroke={accent} strokeWidth={Math.max(3, ih * 0.04)} strokeLinecap="round" strokeLinejoin="round" />;
  } else if (kind === 2) {
    const hs = [0.4, 0.7, 0.5, 0.9, 0.6];
    body = <>{hs.map((h, i) => <rect key={i} x={(i / hs.length) * iw + iw * 0.03} y={ih * (1 - h)} width={iw / hs.length - iw * 0.06} height={ih * h} rx={4} fill={i === 3 ? accent : G2} />)}</>;
  } else if (kind === 3) {
    const rr = Math.min(iw, ih) * 0.38, c = 2 * Math.PI * rr;
    body = (
      <g transform={`translate(${iw / 2} ${ih / 2})`}>
        <circle r={rr} fill="none" stroke={G1} strokeWidth={rr * 0.42} />
        <circle r={rr} fill="none" stroke={accent} strokeWidth={rr * 0.42} strokeDasharray={`${c * 0.62} ${c}`} transform="rotate(-90)" />
      </g>
    );
  } else body = <>{[0, 1, 2, 3].map((i) => <rect key={i} x={0} y={(i / 4) * ih + ih * 0.06} width={iw * (i % 2 ? 0.8 : 0.95)} height={ih * 0.11} rx={ih * 0.05} fill={i === 0 ? G2 : G1} />)}</>;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, background: "#FFFFFF", borderRadius: 16, boxShadow: `inset 0 0 0 2px ${G1}` }}>
      <svg width={r.w} height={r.h} style={{ position: "absolute", inset: 0 }}><g transform={`translate(${pad} ${pad})`}>{body}</g></svg>
    </div>
  );
};

/**
 * "Don't buy a bigger dashboard": a tidy analytics window that bloats on `growAt` (bigger window, widgets
 * multiply, alert dots pop), then on `pickAt` the clutter collapses into one clean card with a check —
 * `pickLabel` / `pickSub` / `pickIcon`. Generic greys only; no real product UI.
 */
export const DashboardBloat: React.FC<CP<Props>> = ({ growAt, pickAt, pickLabel = "The right one", pickSub, pickIcon, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gF = Math.round((growAt ?? 0.6) * fps);
  const pF = Math.round((pickAt ?? 2.4) * fps);
  const enter = spring({ frame, fps, config: SPRING });
  const grow = spring({ frame: frame - gF, fps, config: { damping: 20, mass: 1 } });
  const pick = spring({ frame: frame - pF, fps, config: SPRING });
  const out = interpolate(frame, [pF - 2, pF + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Window grows from a small tidy panel to a crowded full-width one.
  const ww = interpolate(grow, [0, 1], [box.w * 0.62, box.w * 0.94]);
  const wh = interpolate(grow, [0, 1], [box.h * 0.5, box.h * 0.9]);
  const BAR = 58, P = 20;
  const inner = { w: ww - P * 2, h: wh - BAR - P * 1.5 };
  const cell = (cols: number, rows: number, i: number): Rect => {
    const g = 14, cw = (inner.w - g * (cols - 1)) / cols, rh = (inner.h - g * (rows - 1)) / rows;
    return { x: P + (i % cols) * (cw + g), y: BAR + Math.floor(i / cols) * (rh + g), w: cw, h: rh };
  };
  const lerp = (a: Rect, b: Rect, t: number): Rect => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t });
  const N = 12;

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: theme.font, color: theme.ink }}>
      {/* The dashboard */}
      <div style={{
        position: "absolute", left: "50%", top: "50%", width: ww, height: wh, borderRadius: 26, background: "#F7F6F3",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05), 0 18px 44px rgba(0,0,0,0.12)", border: `1.5px solid ${G1}`, overflow: "hidden",
        opacity: Math.min(1, enter * 1.4) * (1 - out), transform: `translate(-50%, -50%) translateY(${(1 - enter) * 40}px) scale(${1 - out * 0.25})`,
      }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BAR - 10, display: "flex", alignItems: "center", gap: 10, padding: "0 22px", borderBottom: `1.5px solid ${G1}`, background: "#FFFFFF" }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}
          <div style={{ marginLeft: 16, width: 180, height: 16, borderRadius: 8, background: G1 }} />
          <div style={{ marginLeft: "auto", width: 90 + grow * 120, height: 16, borderRadius: 8, background: G1 }} />
        </div>
        {Array.from({ length: N }, (_, i) => {
          const a = i < 4 ? cell(2, 2, i) : cell(2, 2, 3);
          const b = cell(3, 4, i);
          const show = i < 4 ? 1 : spring({ frame: frame - gF - 2 - (i - 4) * 2, fps, config: { damping: 16, mass: 0.6 } });
          if (show <= 0.001) return null;
          const r = lerp(a, b, grow);
          const alert = i % 3 === 1 ? spring({ frame: frame - gF - 14 - i * 2, fps, config: { damping: 12, mass: 0.5 } }) : 0;
          return (
            <div key={i} style={{ opacity: Math.min(1, show * 1.5) }}>
              <Widget kind={i % 5} r={r} hot={i === 1 || i === 7} />
              {alert > 0 && <div style={{ position: "absolute", left: r.x + r.w - 18, top: r.y - 8, width: 28, height: 28, borderRadius: 14, background: "#E5484D", color: "#fff", fontSize: 18, fontWeight: 900, display: "grid", placeItems: "center", transform: `scale(${alert})` }}>!</div>}
            </div>
          );
        })}
      </div>

      {/* The right one */}
      {pick > 0.001 && (
        <div style={{
          position: "absolute", left: "50%", top: "50%", width: Math.min(box.w * 0.84, 820), boxSizing: "border-box", padding: "38px 40px",
          display: "flex", alignItems: "center", gap: 30, background: "#FFFFFF", borderRadius: 34, border: `3px solid ${theme.accent}`,
          boxShadow: "0 2px 4px rgba(0,0,0,0.05), 0 22px 50px rgba(255,90,31,0.18)",
          opacity: Math.min(1, pick * 1.4), transform: `translate(-50%, -50%) translateY(${(1 - pick) * 40}px) scale(${0.9 + pick * 0.1})`,
        }}>
          <div style={{ width: 120, height: 120, borderRadius: 30, background: "#FFF3EC", display: "grid", placeItems: "center", flex: "none" }}>
            <Icon spec={pickIcon ?? "line:chart"} size={78} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: -1, lineHeight: 1.05 }}>{pickLabel}</div>
            {pickSub && <div style={{ marginTop: 8, fontSize: 30, fontWeight: 500, color: theme.muted }}>{pickSub}</div>}
          </div>
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: theme.accent, display: "grid", placeItems: "center", flex: "none", transform: `scale(${spring({ frame: frame - pF - 6, fps, config: { damping: 12, mass: 0.6 } })})` }}>
            <svg width={42} height={42} viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      )}
    </div>
  );
};
