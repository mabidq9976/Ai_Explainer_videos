import React from "react";
import { Img, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from "remotion";
import { theme } from "../theme";
import { CP, Card, Fill, usePop } from "./shared";

/** Footage or a screenshot inside a browser window. `src` is a path inside the episode folder (assets/...). */
export const BrowserFrame: React.FC<CP<{ src?: string; url: string; title?: string }>> = ({ src, url, title, box }) => {
  const frame = useCurrentFrame();
  const pop = usePop(0);
  const w = box.w * 0.9;
  const h = Math.min(box.h * 0.86, w * 1.15);
  const isVideo = src && /\.(mp4|mov|webm)$/i.test(src);
  const scroll = interpolate(frame, [10, 150], [0, -120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Fill>
      <Card style={{ width: w, height: h, overflow: "hidden", padding: 0, transform: `scale(${0.88 + pop * 0.12})`, opacity: pop, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 24px", borderBottom: `${theme.stroke}px solid ${theme.ink}`, background: theme.paper }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 22, height: 22, borderRadius: 11, background: c, border: `3px solid ${theme.ink}` }} />)}
          <div style={{ flex: 1, marginLeft: 12, background: theme.card, border: `3px solid ${theme.ink}`, borderRadius: 999, padding: "8px 22px", fontSize: 28, fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap" }}>{url}</div>
        </div>
        <div style={{ flex: 1, position: "relative", overflow: "hidden", background: theme.card }}>
          {src ? (
            isVideo ? <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <Img src={staticFile(src)} style={{ width: "100%", transform: `translateY(${scroll}px)` }} />
          ) : (
            <div style={{ padding: 40, transform: `translateY(${scroll}px)` }}>
              {title && <div style={{ fontSize: 54, fontWeight: 900, marginBottom: 30, lineHeight: 1.1 }}>{title}</div>}
              {[0.95, 0.8, 0.9, 0.6, 0.85, 0.7, 0.92, 0.5].map((x, i) => <div key={i} style={{ height: 24, width: `${x * 100}%`, background: theme.line, borderRadius: 12, margin: "22px 0" }} />)}
            </div>
          )}
        </div>
      </Card>
    </Fill>
  );
};
