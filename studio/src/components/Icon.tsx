import React from "react";
import { Img, staticFile } from "remotion";
import * as simple from "simple-icons";
import { theme } from "../theme";

/**
 * One icon spec string, used by Diagram, ProfileList, Toggle and DeviceFrame:
 *   "logo:youtube"   brand logo tile (any simple-icons slug: instagram, x, google, openai, tiktok…)
 *   "emoji:🎓"       emoji sticker
 *   "line:users"     outline icon from the small built-in set below
 *   "assets/..."     an image/clip file inside the episode folder (assets/manual/logo-*.png → rounded app tile)
 *   "text:+10M"      big bold text in place of an icon
 */
const bySlug: Record<string, { path: string; hex: string }> = {};
for (const v of Object.values(simple) as any[]) if (v && v.slug) bySlug[v.slug] = { path: v.path, hex: v.hex };

// 24×24 stroke icons (hand-drawn feel comes from round caps + the ink colour).
const LINE: Record<string, string> = {
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c.8-4 3.8-6 8-6s7.2 2 8 6",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 21 21",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  doc: "M6 2h8l5 5v15H6zM14 2v5h5M9 13h7M9 17h7",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2c2.8 3 2.8 17 0 20M12 2c-2.8 3-2.8 17 0 20",
  lock: "M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11",
  check: "M4 12.5 9.5 18 20 6",
  cross: "M5 5l14 14M19 5 5 19",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  star: "m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  money: "M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9v.01M18 15v.01",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  phone: "M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 19h2",
  laptop: "M4 5h16v11H4zM2 19h20",
  robot: "M5 8h14v11H5zM12 4v4M9 13v.01M15 13v.01M9 16h6M2 12v3M22 12v3",
  heart: "M12 20s-8-4.6-8-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.8C20 15.4 12 20 12 20z",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};

export const iconExists = (spec: string) => {
  const [kind, val] = spec.split(/:(.*)/s);
  if (kind === "logo") return !!bySlug[val];
  if (kind === "line") return !!LINE[val];
  return true;
};

export const Icon: React.FC<{ spec?: string; src?: string; size: number }> = ({ spec, src, size }) => {
  if (src) return <Img src={staticFile(src)} style={{ maxWidth: size * 1.5, maxHeight: size, objectFit: "contain", borderRadius: 8 }} />;
  if (!spec) return null;
  // Saved brand icons (assets/manual/logo-*) get the same rounded app-tile shape as `logo:` tiles.
  if (spec.startsWith("assets/") && /\/logo-[^/]+$/.test(spec))
    return <Img src={staticFile(spec)} style={{ width: size, height: size, objectFit: "cover", borderRadius: size * 0.24 }} />;
  if (spec.startsWith("assets/")) return <Img src={staticFile(spec)} style={{ maxWidth: size * 1.5, maxHeight: size, objectFit: "contain", borderRadius: 8 }} />;
  const [kind, val] = spec.split(/:(.*)/s);
  if (kind === "emoji") return <div style={{ fontSize: size * 0.82, lineHeight: 1, height: size, display: "grid", placeItems: "center" }}>{val}</div>;
  if (kind === "text") return <div style={{ fontFamily: theme.font, fontSize: size * 0.42, fontWeight: 900, lineHeight: 1.05, textAlign: "center", height: size, display: "grid", placeItems: "center" }}>{val}</div>;
  if (kind === "line" && LINE[val])
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={theme.ink} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d={LINE[val]} />
      </svg>
    );
  if (kind === "logo" && bySlug[val]) {
    const { path, hex } = bySlug[val];
    const bg = val === "instagram" ? "linear-gradient(45deg,#FEDA75 0%,#FA7E1E 25%,#D62976 50%,#962FBF 75%,#4F5BD5 100%)" : `#${hex}`;
    const light = parseInt(hex.slice(0, 2), 16) * 0.3 + parseInt(hex.slice(2, 4), 16) * 0.59 + parseInt(hex.slice(4, 6), 16) * 0.11 > 200;
    return (
      <div style={{ width: size, height: size, borderRadius: size * 0.24, background: bg, display: "grid", placeItems: "center", boxShadow: light ? `inset 0 0 0 3px ${theme.line}` : "none" }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24"><path d={path} fill={light ? theme.ink : "#fff"} /></svg>
      </div>
    );
  }
  // Unknown logo / icon: a neutral letter tile so a render never shows an error.
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.24, background: theme.ink, color: "#fff", display: "grid", placeItems: "center", fontFamily: theme.font, fontWeight: 900, fontSize: size * 0.5 }}>
      {(val ?? spec).slice(0, 1).toUpperCase()}
    </div>
  );
};
