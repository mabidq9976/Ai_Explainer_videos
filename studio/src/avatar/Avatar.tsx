import React, { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { AvatarEvent, MouthFile, Word } from "../types";
import { eventAt } from "../timeline";
import { blinkFrames, defaultPivots, mouthAt, prepareSvg } from "./rig";
import { speechEnergy } from "./motion";

const FADE = 10; // frames to crossfade between poses
const ARM_EASE = 8;

type Props = {
  svg: string;
  pivots?: Record<string, [number, number]>;
  /** gesture → pose name to use when that gesture has no art of its own (from rig.json). */
  aliases?: Record<string, string>;
  events: AvatarEvent[];
  /** 0..1 while the narrator glides to a new position (smooth bump), for a slight lean. */
  move?: number;
  mouth: MouthFile | null;
  words: Word[];
  totalFrames: number;
};

/**
 * The layered avatar. All motion is CSS on named SVG groups, computed from the frame:
 *  - lip sync (Rhubarb mouths), seeded blinks, brows from the expression
 *  - poses (`pose-*`) and arm variants crossfade only when they actually change — no pops
 *  - the head stays still with the body (head motion was tried and removed: it read as shaky)
 *  - breathing on the body, a slow sway and a lean while moving on the whole figure
 */
export const Avatar: React.FC<Props> = ({ svg, pivots, aliases = {}, events, mouth, words, totalFrames, move = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rig = useMemo(() => prepareSvg(svg), [svg]);
  const blinks = useMemo(() => blinkFrames(totalFrames, fps), [totalFrames, fps]);
  const piv = { ...defaultPivots(rig.w, rig.h), ...(pivots ?? {}) };
  const has = (n: string) => rig.names.has(n);
  const rest = has("mouth-X") ? "X" : "A";
  const t = frame / fps;

  // ---- which pose is showing, and since when (only real changes count) ----
  const poseFor = (g?: string) => (!g ? "base" : has(`pose-${g}`) ? g : aliases[g] && has(`pose-${aliases[g]}`) ? aliases[g] : "base");
  const { cur, index } = eventAt(events, frame);
  const key = poseFor(cur?.gesture);
  let since = cur?.frame ?? 0;
  let prevKey = key;
  for (let i = index - 1; i >= 0; i--) {
    const k = poseFor(events[i].gesture);
    if (k !== key) { prevKey = k; break; }
    since = events[i].frame;
  }
  const fade = interpolate(frame - since, [0, FADE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const fading = prevKey !== key && fade < 1;

  // ---- face ----
  let shape = mouthAt(frame, fps, mouth, words, rest);
  if (!has(`mouth-${shape}`)) shape = { G: "B", H: "C", X: "A" }[shape] ?? "A";
  const eyesClosed = blinks.some((b) => frame >= b && frame < b + 4) && has("eyes-closed");
  const expr = cur?.expression ?? "neutral";
  const brow = has(`brows-${expr}`) ? expr : "neutral";

  // ---- motion ----
  const energy = speechEnergy(t, words);
  const breath = 1 + Math.sin((t * Math.PI * 2) / 3.8) * 0.01;

  // ---- arm variants (for avatars drawn with separate arms; crossfade only on change) ----
  const armCss = (["left", "right"] as const).map((side) => {
    const variant = (g?: string) => (g && has(`arm-${side}-${g}`) ? g : g === "wave" && has(`arm-${side}-open-palm`) ? "open-palm" : "rest");
    const now = variant(cur?.gesture);
    let armSince = cur?.frame ?? 0, before = now;
    for (let i = index - 1; i >= 0; i--) { const v = variant(events[i].gesture); if (v !== now) { before = v; break; } armSince = events[i].frame; }
    const e = interpolate(frame - armSince, [0, ARM_EASE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    const [px, py] = piv[`arm-${side}`];
    const talk = Math.sin(t * Math.PI * 2 * 0.9 + (side === "left" ? 0 : 1.3)) * 2.2 * energy;
    const wave = cur?.gesture === "wave" && now !== "rest" ? Math.sin(t * Math.PI * 2 * 1.4) * 9 : 0;
    const swing = (1 - e) * (side === "left" ? 8 : -8) + (side === "left" ? talk : -talk) + wave;
    const origin = `transform-box:view-box;transform-origin:${px}px ${py}px;`;
    let css = `.av [data-rig^="arm-${side}-"]{display:none}`;
    css += `.av [data-rig="arm-${side}-${now}"]{display:inline;opacity:${before === now ? 1 : e};${origin}transform:rotate(${swing}deg)}`;
    if (before !== now && e < 1) css += `.av [data-rig="arm-${side}-${before}"]{display:inline;opacity:${1 - e};${origin}}`;
    return css;
  }).join("\n");

  // ---- pose visibility: current pose, plus the previous one while crossfading ----
  const show = (k: string) => (k === key ? (fading ? fade : 1) : fading && k === prevKey ? 1 - fade : 0);
  const settle = (k: string) => (k === key && fading ? (1 - fade) * 5 : 0); // incoming pose settles down 5 units
  const baseSel = `.av [data-rig="body"],.av [data-rig="head"],.av [data-rig="arm-left"],.av [data-rig="arm-right"]`;
  const poseNames = [...rig.names].filter((n) => n.startsWith("pose-")).map((n) => n.slice(5));
  const visCss = [
    show("base") > 0 ? `${baseSel}{display:inline;opacity:${show("base").toFixed(3)}}` : `${baseSel}{display:none}`,
    `.av [data-rig^="pose-"]{display:none}`,
    ...poseNames.filter((p) => show(p) > 0).map((p) =>
      `.av [data-rig="pose-${p}"]{display:inline;opacity:${show(p).toFixed(3)};transform-box:fill-box;transform-origin:50% 100%;transform:translateY(${settle(p).toFixed(2)}px) scale(${breath.toFixed(4)})}`),
  ].join("\n");

  const css = `
.av svg{overflow:visible}
.av [data-rig^="mouth-"]{display:none}
.av [data-rig="mouth-${shape}"]{display:inline}
.av [data-rig^="eyes-open"]{display:${eyesClosed ? "none" : "inline"}}
.av [data-rig^="eyes-closed"]{display:${eyesClosed ? "inline" : "none"}}
.av [data-rig^="brows-"]{display:none}
.av [data-rig="brows-${brow}"]{display:inline}
.av [data-rig="body"]{transform-box:fill-box;transform-origin:50% 100%;transform:scale(${breath.toFixed(4)})}
${armCss}
${visCss}`;

  const sway = Math.sin((t * Math.PI * 2) / 5.2) * 0.7 + move * 3;
  const shift = Math.sin((t * Math.PI * 2) / 7.3) * 3;
  return (
    <div className="av" style={{ width: "100%", height: "100%", transformOrigin: "50% 100%", transform: `rotate(${sway.toFixed(2)}deg) translateX(${shift.toFixed(2)}px)` }}>
      <style>{css}</style>
      <div style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: rig.markup }} />
    </div>
  );
};
