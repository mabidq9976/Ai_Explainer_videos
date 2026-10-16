import React from "react";
import { Img, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from "remotion";
import { theme } from "../theme";
import { Icon } from "./Icon";
import { CP, usePop } from "./shared";

type Props = { device?: "phone" | "laptop"; src?: string; query?: string; kind?: "video" | "photo"; label?: string; side?: string; sideLabel?: string; assets?: Record<string, string> };

/**
 * A phone or laptop with a clip / screenshot inside, optionally a sticker + big text beside it
 * (reference: phone with a clip + Instagram logo + "+10M Views").
 * Media: `src` (assets/...) or `query` (fetch-assets fills key "media").
 */
export const DeviceFrame: React.FC<CP<Props>> = ({ device = "phone", src, query, label, side, sideLabel, assets = {}, box }) => {
  const frame = useCurrentFrame();
  const pop = usePop(0);
  const sidePop = usePop(10);
  const file = src ?? (query ? assets.media : undefined);
  const isVideo = file && /\.(mp4|mov|webm)$/i.test(file);
  const hasSide = !!(side || sideLabel);
  const phoneH = Math.min(box.h * 0.82, 820), phoneW = phoneH * 0.5;
  const lapW = Math.min(box.w * 0.86, 900), lapH = lapW * 0.62;
  const screen = (
    <div style={{ position: "absolute", inset: 0, background: "#f2f2f2", display: "grid", placeItems: "center", overflow: "hidden" }}>
      {file ? (isVideo ? <OffthreadVideo src={staticFile(file)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Img src={staticFile(file)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${interpolate(frame, [0, 120], [1, 1.06])})` }} />)
        : <div style={{ fontFamily: theme.font, fontSize: 34, color: theme.muted, textAlign: "center", padding: 20 }}>{label ?? ""}</div>}
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ transform: `scale(${0.85 + pop * 0.15})`, opacity: pop }}>
        {device === "phone" ? (
          <div style={{ width: phoneW, height: phoneH, borderRadius: phoneW * 0.16, border: `14px solid ${theme.ink}`, position: "relative", overflow: "hidden", background: "#fff" }}>
            {screen}
            <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: phoneW * 0.32, height: 26, borderRadius: 13, background: theme.ink }} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: lapW, height: lapH, border: `16px solid ${theme.ink}`, borderRadius: 22, position: "relative", overflow: "hidden" }}>{screen}</div>
            <div style={{ width: lapW * 1.14, height: 30, background: theme.ink, borderRadius: "0 0 26px 26px" }} />
          </div>
        )}
        {label && file && <div style={{ marginTop: 26, textAlign: "center", fontFamily: theme.font, fontWeight: 700, fontSize: 48 }}>{label}</div>}
      </div>
      {hasSide && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30, opacity: sidePop, transform: `translateX(${(1 - sidePop) * 40}px)` }}>
          {side && <Icon spec={side} size={140} />}
          {sideLabel && <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 64, lineHeight: 1.1, textAlign: "center", whiteSpace: "pre-line" }}>{sideLabel}</div>}
        </div>
      )}
    </div>
  );
};
