import { Easing, interpolate } from "remotion";
import type { AvatarEvent, Layout } from "./types";
import { W, H } from "./theme";
import { eventAt } from "./timeline";

export type Rect = { x: number; y: number; w: number; h: number };
export type Position = "left" | "center" | "right";

/**
 * Three layouts, tuned to the reference style (white page, visual up top, small narrator below):
 *  full   — avatar large and centred, visual compact above it
 *  corner — avatar small near the bottom (left / center / right), visual owns the upper frame
 *  hidden — visual only, voice continues
 * Everything sits above y≈1640 so Reels/Shorts UI never covers it.
 */
const AV = 360;
const cornerX: Record<Position, number> = { left: 50, center: (W - AV) / 2, right: W - AV - 50 };

export function zones(layout: Layout, position: Position = "left") {
  switch (layout) {
    case "full":
      return { visual: { x: 0, y: 110, w: W, h: 700 }, captionY: 860, avatar: { x: 165, y: 900, w: 750, h: 750 } };
    case "hidden":
      return { visual: { x: 0, y: 140, w: W, h: 1380 }, captionY: 1560, avatar: { x: cornerX[position], y: H + 80, w: AV, h: AV } };
    default:
      return { visual: { x: 0, y: 140, w: W, h: 1060 }, captionY: 1122, avatar: { x: cornerX[position], y: 1200, w: AV, h: AV } };
  }
}

const MOVE = 20; // frames to glide to a new spot
const TURN = 10; // frames to turn around when the facing changes

const mix = (a: Rect, b: Rect, t: number): Rect => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t });

/**
 * Avatar rect at a frame. Moving between positions is a smooth glide with a tiny lift (no hop),
 * `move` (0..1..0) drives a slight lean, and `facing` turns smoothly through 0 when mirroring.
 */
export function layoutAt(frame: number, events: AvatarEvent[], flipWhenRight = false) {
  const { cur, prev } = eventAt(events, frame);
  const raw = interpolate(frame - cur.frame, [0, MOVE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const t = Easing.inOut(Easing.cubic)(raw);
  const a = zones(prev.layout, prev.position), b = zones(cur.layout, cur.position);
  const rect = mix(a.avatar, b.avatar, t);
  const moved = (prev.position !== cur.position || prev.layout !== cur.layout) && raw < 1;
  const move = moved ? Math.sin(raw * Math.PI) : 0;
  const face = (p: string) => (flipWhenRight && p === "right" ? -1 : 1);
  const turn = Easing.inOut(Easing.cubic)(interpolate(frame - cur.frame, [0, TURN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const facing = face(prev.position) + (face(cur.position) - face(prev.position)) * turn;
  return {
    avatar: { ...rect, y: rect.y - move * 12 },
    captionY: a.captionY + (b.captionY - a.captionY) * t,
    cur,
    move: move * Math.sign(b.avatar.x - a.avatar.x || 0),
    // never fully edge-on: a 0.15 minimum keeps the figure visible mid-turn
    facing: Math.sign(facing || 1) * Math.max(0.15, Math.abs(facing)),
  };
}
