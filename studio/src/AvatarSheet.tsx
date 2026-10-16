import React, { useMemo } from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { prepareSvg } from "./avatar/rig";
import { theme } from "./theme";

/** QA sheet for the avatar rig: every pose × mouth, plus blink and brow states. Render with `npm run avatar:sheet`. */
type Props = { svg: string | null };
const COLS = 9, CELL = 240;

const Cell: React.FC<{ markup: string; pose: string | null; mouth: string; eyes: string; brows: string; label: string; i: number }> = ({ markup, pose, mouth, eyes, brows, label, i }) => {
  const c = `.s${i}`;
  const css = `${c} [data-rig^="mouth-"],${c} [data-rig^="eyes-"],${c} [data-rig^="brows-"],${c} [data-rig^="pose-"]{display:none}
${c} [data-rig="mouth-${mouth}"],${c} [data-rig="eyes-${eyes}"],${c} [data-rig="brows-${brows}"]{display:inline}
${pose ? `${c} [data-rig="pose-${pose}"]{display:inline}${c} [data-rig="body"],${c} [data-rig="head"],${c} [data-rig^="arm-"]{display:none}` : ""}
${c} svg{overflow:visible}`;
  return (
    <div className={`s${i}`} style={{ width: CELL, height: CELL, position: "relative", border: "1px solid #eee", boxSizing: "border-box" }}>
      <style>{css}</style>
      <div style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: markup }} />
      <div style={{ position: "absolute", left: 6, top: 4, fontFamily: theme.font, fontSize: 18, fontWeight: 800, color: "#d32" }}>{label}</div>
    </div>
  );
};

export const AvatarSheet: React.FC<Props> = ({ svg }) => {
  const rig = useMemo(() => (svg ? prepareSvg(svg) : null), [svg]);
  if (!rig) return <AbsoluteFill style={{ background: "#fff" }}>No avatar</AbsoluteFill>;
  const poses = [null, ...[...rig.names].filter((n) => n.startsWith("pose-")).map((n) => n.slice(5))];
  const cells: Omit<React.ComponentProps<typeof Cell>, "markup" | "i">[] = [];
  for (const p of poses) for (const m of "ABCDEFGHX") cells.push({ pose: p, mouth: m, eyes: "open", brows: "neutral", label: `${p ?? "rest"} ${m}` });
  for (const p of poses) {
    cells.push({ pose: p, mouth: "X", eyes: "closed", brows: "neutral", label: `${p ?? "rest"} blink` });
    cells.push({ pose: p, mouth: "X", eyes: "open", brows: "raised", label: "raised" });
    cells.push({ pose: p, mouth: "X", eyes: "open", brows: "frown", label: "frown" });
  }
  return (
    <AbsoluteFill style={{ background: "#fff", display: "flex", flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start", width: COLS * CELL }}>
      {cells.map((c, i) => <Cell key={i} i={i} markup={rig.markup} {...c} />)}
    </AbsoluteFill>
  );
};

export const loadAvatarSheet = async (): Promise<Props> => {
  const res = await fetch(staticFile("_render/avatar.svg")).catch(() => null);
  return { svg: res && res.ok ? await res.text() : null };
};
export const SHEET_W = COLS * CELL;
export const SHEET_H = 8 * CELL;
