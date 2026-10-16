import React from "react";
import { Img, Loop, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Block, ManifestEntry, Visual } from "./types";
import { zones, type Rect } from "./layout";
import { registry } from "./components/registry";
import { theme, W, H } from "./theme";

const Missing: React.FC<{ name: string }> = ({ name }) => (
  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: theme.font, fontSize: 40, color: theme.accent }}>Unknown component: {name}</div>
);

const Label: React.FC<{ text: string; delay?: number }> = ({ text, delay = 8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 16 } });
  return (
    <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: 60, lineHeight: 1.15, textAlign: "center", color: theme.ink, padding: "0 70px", opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>{text}</div>
  );
};

function Media({ entry, style, durationInFrames }: { entry: ManifestEntry; style: React.CSSProperties; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (entry.kind === "photo") {
    const zoom = interpolate(frame, [0, durationInFrames], [1, 1.08]);
    return <Img src={staticFile(entry.file!)} style={{ ...style, objectFit: "cover", transform: `scale(${zoom})` }} />;
  }
  const clip = entry.duration ? Math.floor(entry.duration * fps) : 0;
  const video = <OffthreadVideo src={staticFile(entry.file!)} muted style={{ ...style, objectFit: "cover" }} />;
  return clip > 0 && clip < durationInFrames ? <Loop durationInFrames={clip}>{video}</Loop> : video;
}

/** Files fetched for this scene's component props (e.g. Diagram nodes with a `query`), keyed n0, n1… */
const assetsFor = (id: string, m: Record<string, ManifestEntry>) =>
  Object.fromEntries(Object.entries(m).filter(([k, e]) => k.startsWith(`${id}.`) && e.file).map(([k, e]) => [k.slice(id.length + 1), e.file!]));

/** One block's visual inside its layout zone: a catalog component, a 3D scene or stock media. */
export const VisualLayer: React.FC<{ block: Block; manifest: Record<string, ManifestEntry> }> = ({ block, manifest }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = block.visual;
  if (!v) return null;
  const zone: Rect = zones(block.layout, block.position).visual;
  const dur = block.endFrame - block.startFrame;
  const enter = spring({ frame, fps, config: { damping: 15, mass: 0.6 } });

  const place = (r: Rect, children: React.ReactNode) => (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, opacity: enter, transform: `scale(${0.94 + enter * 0.06})` }}>{children}</div>
  );

  if (v.type === "component" || v.type === "three") {
    const C = registry[v.name];
    const labelH = v.label ? 190 : 0;
    const box = { w: zone.w, h: zone.h - labelH };
    return place(zone, (
      <>
        <div style={{ position: "absolute", left: 0, top: 0, width: box.w, height: box.h }}>{C ? <C {...(v.props ?? {})} box={box} assets={assetsFor(block.id, manifest)} /> : <Missing name={v.name} />}</div>
        {v.label && <div style={{ position: "absolute", left: 0, right: 0, top: box.h + 10 }}><Label text={v.label} /></div>}
      </>
    ));
  }

  // Stock
  const sv = v as Extract<Visual, { type: "stock" }>;
  const entry = manifest[block.id];
  if (!entry?.file) {
    const C = registry[sv.fallback];
    const props = sv.fallbackProps ?? { words: sv.query.split(/\s+/).filter((w: string) => w.length > 2).slice(0, 6) };
    return place(zone, C ? <C {...props} box={{ w: zone.w, h: zone.h }} /> : <Missing name={sv.fallback} />);
  }
  const frameStyle = sv.frame ?? "card";
  if (frameStyle === "full") {
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, opacity: enter }}>
        <Media entry={entry} durationInFrames={dur} style={{ width: "100%", height: "100%" }} />
      </div>
    );
  }
  // Card / cutout: fit the media's aspect inside the zone, label underneath.
  const labelH = sv.label ? 210 : 0;
  const maxW = zone.w * 0.86, maxH = zone.h - labelH - 30;
  const aspect = entry.width && entry.height ? entry.width / entry.height : 4 / 3;
  let w = maxW, h = w / aspect;
  if (h > maxH) { h = maxH; w = h * aspect; }
  const cutout = frameStyle === "cutout";
  const float = cutout ? Math.sin((frame / fps) * 1.5) * 8 : 0;
  return place(zone, (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36 }}>
      <div style={{
        width: w, height: h, overflow: "hidden", position: "relative", transform: `translateY(${float}px) rotate(${cutout ? 0 : (1 - enter) * -2}deg)`,
        ...(cutout ? {} : { border: `${theme.stroke}px solid ${theme.ink}`, borderRadius: theme.radius, boxShadow: `12px 12px 0 ${theme.ink}`, background: theme.card }),
      }}>
        <Media entry={entry} durationInFrames={dur} style={{ width: "100%", height: "100%", ...(cutout ? { objectFit: "contain" } : {}) }} />
      </div>
      {sv.label && <Label text={sv.label} />}
    </div>
  ));
};
