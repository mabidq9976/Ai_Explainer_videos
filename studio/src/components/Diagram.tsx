import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Icon } from "./Icon";
import type { CP } from "./shared";

type Node = { icon?: string; query?: string; label?: string; sub?: string; at?: number };
type Props = {
  layout?: "row" | "plus" | "column" | "tree" | "grid";
  root?: Node;
  nodes: Node[];
  connector?: "arrow" | "curve" | "dotted" | "none";
  brace?: string | boolean;
  title?: string;
  assets?: Record<string, string>;
};

/**
 * The workhorse explainer graphic from the reference style: icons/logos/stickers with labels,
 * joined by thin arrows, curves, "+" signs or a brace, building in one by one.
 * Node images: give a node `query` and fetch-assets downloads it (key nodes.<i>, root).
 */
export const Diagram: React.FC<CP<Props>> = ({ layout = "row", root, nodes = [], connector = "curve", brace, title, assets = {}, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = nodes.length;
  const at = (node: Node | undefined, i: number) => Math.round((node?.at ?? (root ? 0.5 : 0) + i * 0.55) * fps);
  const pop = (d: number) => spring({ frame: frame - d, fps, config: { damping: 13, mass: 0.55 } });
  const titleH = title ? 120 : 0;

  // Positions (centre of each node's icon) in box coordinates.
  const W = box.w, H = box.h - titleH;
  const big = n <= 2 ? 230 : n === 3 ? 190 : 150;
  let pts: { x: number; y: number }[] = [];
  let rootPt: { x: number; y: number } | null = null;
  if (layout === "column") pts = nodes.map((_, i) => ({ x: W / 2, y: (H / (n + 1)) * (i + 1) }));
  else if (layout === "grid") pts = nodes.map((_, i) => ({ x: W * (i % 2 ? 0.72 : 0.28), y: H * (0.22 + Math.floor(i / 2) * (0.6 / Math.max(1, Math.ceil(n / 2) - 1 || 1))) }));
  else if (layout === "tree") {
    rootPt = { x: W / 2, y: H * 0.2 };
    pts = nodes.map((_, i) => ({ x: (W / (n + 1)) * (i + 1), y: H * 0.68 }));
  } else pts = nodes.map((_, i) => ({ x: (W / (n + 1)) * (i + 1), y: H * 0.45 }));
  const size = layout === "column" ? Math.min(big, H / (n * 1.9)) : layout === "tree" ? Math.min(big, W / (n * 1.7)) : Math.min(big, W / (n * (layout === "plus" ? 2.1 : 1.6)));

  const NodeView = ({ node, p, d, k }: { node: Node; p: { x: number; y: number }; d: number; k: string }) => {
    const s = pop(d);
    const src = node.query ? assets[k] : undefined;
    return (
      <div style={{ position: "absolute", left: p.x, top: p.y, transform: `translate(-50%, -${size / 2}px) scale(${s})`, opacity: Math.min(1, s * 1.5), display: "flex", flexDirection: "column", alignItems: "center", width: Math.max(size * 1.6, 260) }}>
        <div style={{ height: size, display: "grid", placeItems: "center" }}>
          {src || node.icon ? <Icon spec={node.icon} src={src} size={size} /> : <Icon spec={`emoji:${"📦"}`} size={size} />}
        </div>
        {node.label && <div style={{ marginTop: 18, fontFamily: theme.font, fontWeight: 700, fontSize: Math.max(34, size * 0.22), textAlign: "center", lineHeight: 1.15 }}>{node.label}</div>}
        {node.sub && <div style={{ marginTop: 4, fontFamily: theme.font, fontWeight: 500, fontSize: Math.max(24, size * 0.15), color: theme.muted, textAlign: "center" }}>{node.sub}</div>}
      </div>
    );
  };

  // Connectors
  const draw = (d: number) => interpolate(frame, [d, d + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const paths: { d: string; t: number; dotted: boolean }[] = [];
  const dotted = connector === "dotted";
  if (connector !== "none") {
    if (layout === "tree" && rootPt) {
      nodes.forEach((node, i) => {
        const a = { x: rootPt!.x, y: rootPt!.y + size * 0.5 + (root?.label ? Math.max(34, size * 0.22) + 40 : 20) }, b = { x: pts[i].x, y: pts[i].y - size * 0.62 };
        const cx = (a.x + b.x) / 2 + (b.x - a.x) * 0.15, cy = a.y + (b.y - a.y) * 0.1;
        paths.push({ d: `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`, t: draw(at(node, i) - 8), dotted });
      });
    } else if (layout === "column") {
      for (let i = 0; i < n - 1; i++) paths.push({ d: `M${pts[i].x},${pts[i].y + size * 0.85} L${pts[i + 1].x},${pts[i + 1].y - size * 0.62}`, t: draw(at(nodes[i + 1], i + 1) - 8), dotted });
    } else if (layout === "row") {
      for (let i = 0; i < n - 1; i++) {
        const a = { x: pts[i].x + size * 0.62, y: pts[i].y }, b = { x: pts[i + 1].x - size * 0.62, y: pts[i + 1].y };
        const mid = connector === "curve" ? ` Q${(a.x + b.x) / 2},${a.y - size * 0.5} ` : " L";
        paths.push({ d: `M${a.x},${a.y}${mid}${b.x},${b.y}`, t: draw(at(nodes[i + 1], i + 1) - 8), dotted });
      }
    }
  }
  const lastAt = at(nodes[n - 1], n - 1);
  const braceT = draw(lastAt + 6);
  const labelBlock = nodes.some((x) => x.label) ? Math.max(34, size * 0.22) * 1.3 + 24 + (nodes.some((x) => x.sub) ? 40 : 0) : 0;
  const braceY = (pts[0]?.y ?? 0) + size * 0.5 + labelBlock + 40;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {title && <div style={{ position: "absolute", top: 20, width: "100%", textAlign: "center", fontFamily: theme.font, fontWeight: 800, fontSize: 64, opacity: pop(0) }}>{title}</div>}
      <div style={{ position: "absolute", left: 0, top: titleH, width: W, height: H }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M1,1 L9,5 L1,9" fill="none" stroke={theme.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill="none" stroke={theme.ink} strokeWidth={4} strokeLinecap="round" pathLength={1}
              strokeDasharray={p.dotted ? "0.02 0.025" : "1 1"} strokeDashoffset={p.dotted ? 0 : 1 - p.t} opacity={p.dotted ? p.t : p.t > 0 ? 1 : 0}
              markerEnd={p.t > 0.9 ? "url(#arrowhead)" : undefined} />
          ))}
          {brace && n > 1 && (
            <path d={`M${pts[0].x - size * 0.3},${braceY - 24} Q${pts[0].x - size * 0.3},${braceY} ${pts[0].x},${braceY} L${W / 2 - 24},${braceY} Q${W / 2},${braceY} ${W / 2},${braceY + 24} Q${W / 2},${braceY} ${W / 2 + 24},${braceY} L${pts[n - 1].x},${braceY} Q${pts[n - 1].x + size * 0.3},${braceY} ${pts[n - 1].x + size * 0.3},${braceY - 24}`}
              fill="none" stroke={theme.muted} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - braceT} />
          )}
        </svg>
        {layout === "plus" && nodes.slice(1).map((node, i) => {
          const s = pop(at(node, i + 1) - 6);
          return <div key={i} style={{ position: "absolute", left: (pts[i].x + pts[i + 1].x) / 2, top: pts[0].y, transform: `translate(-50%,-50%) scale(${s})`, fontFamily: theme.font, fontSize: size * 0.45, fontWeight: 500 }}>+</div>;
        })}
        {root && rootPt && <NodeView node={root} p={rootPt} d={0} k="root" />}
        {nodes.map((node, i) => <NodeView key={i} node={node} p={pts[i]} d={at(node, i)} k={`nodes.${i}`} />)}
        {typeof brace === "string" && <div style={{ position: "absolute", top: braceY + 50, width: "100%", textAlign: "center", fontFamily: theme.font, fontWeight: 800, fontSize: 52, opacity: braceT }}>{brace}</div>}
      </div>
    </div>
  );
};
