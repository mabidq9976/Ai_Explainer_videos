import React from "react";
import { Img, Loop, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { BoardElement, ManifestEntry } from "./types";
import { theme, W, H } from "./theme";
import { Icon } from "./components/Icon";
import { registry } from "./components/registry";

/** A board element with its timing resolved to absolute frames and its scene id (for asset lookup). */
export type PlacedElement = BoardElement & { scene: string; inF: number; outF: number };

const TEXT_PX = { sm: 38, md: 52, lg: 70, xl: 96 } as const;
const px = (pctX: number) => (pctX / 100) * W;
const py = (pctY: number) => (pctY / 100) * H;

type Box = { cx: number; cy: number; w: number; h: number };

/** Estimated on-screen box of an element (frame px) — used for arrows and badges. */
export function boxOf(el: PlacedElement, manifest: Record<string, ManifestEntry>): Box {
  const cx = px(el.x ?? 50), cy = py(el.y ?? 30);
  if (el.kind === "text") {
    const size = TEXT_PX[el.size ?? "md"];
    const maxW = px(el.w ?? 88);
    const textW = Math.min(maxW, (el.text ?? "").length * size * 0.52);
    const lines = Math.max(1, Math.ceil(((el.text ?? "").length * size * 0.52) / maxW)) + ((el.text ?? "").match(/\n/g)?.length ?? 0);
    return { cx, cy, w: textW, h: lines * size * 1.2 };
  }
  if (el.kind === "icon") {
    const w = px(el.w ?? 14);
    return { cx, cy, w, h: w + (el.label ? 70 : 0) };
  }
  if (el.kind === "component") return { cx, cy, w: px(el.w ?? 84), h: py(el.h ?? 26) };
  // image
  const m = manifest[`${el.scene}.${el.id}`];
  const aspect = m?.width && m?.height ? m.width / m.height : el.frame === "phone" ? 0.5 : el.frame === "circle" ? 1 : 16 / 10;
  const w = px(el.w ?? 50);
  const h = el.h ? py(el.h) : w / aspect;
  return { cx, cy, w, h: h + (el.label ? 80 : 0) };
}

function useEnter(el: PlacedElement, local: number) {
  const { fps } = useVideoConfig();
  const f = local - el.inF;
  const out = interpolate(local, [el.outF - 6, el.outF], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = spring({ frame: f, fps, config: { damping: 18, mass: 0.85 } }); // calm settle, little bounce
  const lin = interpolate(f, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  switch (el.enter ?? (el.kind === "text" ? "fade" : "pop")) {
    case "none": return { opacity: out, transform: "" };
    case "fade": return { opacity: lin * out, transform: `translateY(${(1 - lin) * 12}px)` };
    case "slide": return { opacity: lin * out, transform: `translateY(${(1 - s) * 60}px)` };
    default: return { opacity: Math.min(1, s * 1.4) * out, transform: `scale(${0.55 + s * 0.45})` };
  }
}

const Media: React.FC<{ file: string; isVideo: boolean; fit: "cover" | "contain"; duration?: number }> = ({ file, isVideo, fit, duration }) => {
  const { fps } = useVideoConfig();
  const style: React.CSSProperties = { width: "100%", height: "100%", objectFit: fit, display: "block" };
  if (!isVideo) return <Img src={staticFile(file)} style={style} />;
  const v = <OffthreadVideo src={staticFile(file)} muted style={style} />;
  return duration ? <Loop durationInFrames={Math.max(1, Math.floor(duration * fps))}>{v}</Loop> : v;
};

const ElementView: React.FC<{ el: PlacedElement; local: number; offset: number; manifest: Record<string, ManifestEntry>; all: PlacedElement[] }> = ({ el, local, offset, manifest, all }) => {
  const anim = useEnter(el, local);
  if (local < el.inF || local > el.outF) return null;
  const b = boxOf(el, manifest);
  const base: React.CSSProperties = { position: "absolute", left: b.cx - b.w / 2, top: b.cy - b.h / 2, width: b.w, opacity: anim.opacity, transform: anim.transform, transformOrigin: "center", fontFamily: theme.font, color: el.color ?? theme.ink };

  if (el.kind === "text") {
    const size = TEXT_PX[el.size ?? "md"];
    const typed = el.enter === "type" ? Math.floor(interpolate(local - el.inF, [0, Math.max(6, (el.text ?? "").length * 1.2)], [0, (el.text ?? "").length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) : undefined;
    return <div style={{ ...base, width: px(el.w ?? 88), left: b.cx - px(el.w ?? 88) / 2, fontSize: size, fontWeight: el.weight ?? 500, lineHeight: 1.2, textAlign: el.align ?? "center", whiteSpace: "pre-line" }}>{typed !== undefined ? (el.text ?? "").slice(0, typed) : el.text}</div>;
  }

  if (el.kind === "icon") {
    const w = px(el.w ?? 14);
    return (
      <div style={{ ...base, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Icon spec={el.icon} size={w} />
        {el.label && <div style={{ marginTop: 14, fontSize: 40, fontWeight: 500, textAlign: "center", lineHeight: 1.15, whiteSpace: "pre-line" }}>{el.label}</div>}
      </div>
    );
  }

  if (el.kind === "component") {
    const C = el.name ? registry[el.name] : undefined;
    const box = { w: b.w, h: b.h };
    // Its own clock: frame 0 = the moment it appears, so its internal timing (and word cues) line up.
    return <div style={{ ...base, height: b.h }}><Sequence from={el.inF - offset} layout="none">{C ? <C {...(el.props ?? {})} box={box} /> : <div style={{ color: theme.accent }}>Unknown component {el.name}</div>}</Sequence></div>;
  }

  if (el.kind === "badge") {
    const target = all.find((x) => x.id === el.on);
    const tb = target ? boxOf(target, manifest) : b;
    const size = Math.max(110, Math.min(170, tb.w * 0.28));
    const spikes = 14;
    const pts = Array.from({ length: spikes * 2 }, (_, i) => {
      const r = i % 2 ? size * 0.4 : size * 0.5, a = (i / (spikes * 2)) * Math.PI * 2;
      return `${size / 2 + Math.cos(a) * r},${size / 2 + Math.sin(a) * r}`;
    }).join(" ");
    return (
      <div style={{ position: "absolute", left: tb.cx - tb.w / 2 - size * 0.35, top: tb.cy - tb.h / 2 - size * 0.4, width: size, height: size, opacity: anim.opacity, transform: `${anim.transform} rotate(-14deg)`, zIndex: 5 }}>
        <svg width={size} height={size}><polygon points={pts} fill="#E53935" /></svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", fontFamily: theme.font, fontWeight: 900, fontSize: size * 0.24, letterSpacing: 1 }}>{el.text ?? "FREE"}</div>
      </div>
    );
  }

  // image (photo / video / screenshot / logo from the web)
  const key = `${el.scene}.${el.id}`;
  const m = manifest[key];
  const file = el.src ?? m?.file;
  const isVideo = !!file && (/\.(mp4|mov|webm)$/i.test(file) || m?.kind === "video");
  const imgH = b.h - (el.label ? 80 : 0);
  const frame = el.frame ?? "plain";
  const frameStyle: React.CSSProperties =
    frame === "card" ? { border: `${theme.stroke}px solid ${theme.ink}`, borderRadius: 22, boxShadow: `10px 10px 0 ${theme.ink}` }
    : frame === "rounded" ? { borderRadius: 22 }
    : frame === "circle" ? { borderRadius: "50%" }
    : frame === "phone" ? { border: `14px solid ${theme.ink}`, borderRadius: b.w * 0.16 }
    : frame === "laptop" ? { border: `14px solid ${theme.ink}`, borderRadius: 16 }
    : {};
  return (
    <div style={{ ...base, height: b.h }}>
      <div style={{ width: b.w, height: imgH, overflow: "hidden", position: "relative", background: file ? "transparent" : "#F1EFEA", ...frameStyle }}>
        {file ? <Media file={file} isVideo={isVideo} fit={frame === "cutout" ? "contain" : "cover"} duration={m?.duration} />
          : el.icon ? <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><Icon spec={el.icon} size={Math.min(b.w, imgH) * 0.6} /></div>
          : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", padding: 20, textAlign: "center", fontSize: 30, color: theme.muted }}>🖼 {el.query ?? el.url ?? "image"}</div>}
      </div>
      {frame === "laptop" && <div style={{ width: b.w * 1.12, marginLeft: -b.w * 0.06, height: 22, background: theme.ink, borderRadius: "0 0 18px 18px" }} />}
      {el.label && <div style={{ marginTop: 16, fontSize: 40, fontWeight: 500, textAlign: "center", lineHeight: 1.15, whiteSpace: "pre-line" }}>{el.label}</div>}
    </div>
  );
};

/** Arrows between elements (or % coordinates), drawn on when they enter. */
const Arrow: React.FC<{ el: PlacedElement; local: number; manifest: Record<string, ManifestEntry>; all: PlacedElement[] }> = ({ el, local, manifest, all }) => {
  if (local < el.inF || local > el.outF) return null;
  const point = (ref: string | [number, number] | undefined, other: { x: number; y: number }, isEnd: boolean) => {
    if (Array.isArray(ref)) return { x: px(ref[0]), y: py(ref[1]) };
    const t = all.find((e) => e.id === ref);
    if (!t) return { x: W / 2, y: H / 2 };
    const b = boxOf(t, manifest);
    const dx = other.x - b.cx, dy = other.y - b.cy;
    const gap = 18;
    if (Math.abs(dy) * 1.2 > Math.abs(dx)) return { x: b.cx + Math.max(-b.w / 2, Math.min(b.w / 2, dx * 0.4)), y: b.cy + (dy > 0 ? b.h / 2 + gap : -b.h / 2 - gap) };
    return { x: b.cx + (dx > 0 ? b.w / 2 + gap : -b.w / 2 - gap), y: b.cy + (isEnd ? 0 : 0) };
  };
  const centre = (ref: string | [number, number] | undefined) => {
    if (Array.isArray(ref)) return { x: px(ref[0]), y: py(ref[1]) };
    const t = all.find((e) => e.id === ref);
    return t ? { x: boxOf(t, manifest).cx, y: boxOf(t, manifest).cy } : { x: W / 2, y: H / 2 };
  };
  const a = point(el.from, centre(el.to), false);
  const b = point(el.to, centre(el.from), true);
  const style = el.style ?? "straight";
  const bend = el.bend ?? (style === "straight" ? 0 : 0.3);
  const mx = (a.x + b.x) / 2 - (b.y - a.y) * bend, my = (a.y + b.y) / 2 + (b.x - a.x) * bend;
  const d = `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`;
  const t = interpolate(local - el.inF, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(local, [el.outF - 6, el.outF], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ang = Math.atan2(b.y - my, b.x - mx);
  const head = 22;
  const h1 = `${b.x - head * Math.cos(ang - 0.5)},${b.y - head * Math.sin(ang - 0.5)}`;
  const h2 = `${b.x - head * Math.cos(ang + 0.5)},${b.y - head * Math.sin(ang + 0.5)}`;
  const id = `m-${el.scene}-${el.id}`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: out, overflow: "visible" }}>
      <defs><mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}><path d={d} stroke="#fff" strokeWidth={30} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} /></mask></defs>
      <path d={d} fill="none" stroke={theme.ink} strokeWidth={style === "dotted" ? 5 : 4} strokeLinecap="round" strokeDasharray={style === "dotted" ? "2 14" : undefined} mask={`url(#${id})`} />
      {t > 0.95 && <path d={`M${h1} L${b.x},${b.y} L${h2}`} fill="none" stroke={theme.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
};

/**
 * Renders one board chain (a scene plus any following scenes with `continue: true`).
 * Element frames are absolute; `offset` is the chain's start frame (this Sequence's frame 0).
 */
export const Board: React.FC<{ elements: PlacedElement[]; offset: number; manifest: Record<string, ManifestEntry> }> = ({ elements, offset, manifest }) => {
  const local = useCurrentFrame() + offset;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {elements.filter((e) => e.kind === "arrow").map((el) => <Arrow key={`${el.scene}.${el.id}`} el={el} local={local} manifest={manifest} all={elements} />)}
      {elements.filter((e) => e.kind !== "arrow").map((el) => <ElementView key={`${el.scene}.${el.id}`} el={el} local={local} offset={offset} manifest={manifest} all={elements} />)}
    </div>
  );
};
