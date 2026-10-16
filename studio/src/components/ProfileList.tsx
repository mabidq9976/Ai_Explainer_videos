import React from "react";
import { theme } from "../theme";
import { Icon } from "./Icon";
import { CP, usePop } from "./shared";

type Item = { icon?: string; query?: string; title: string; sub?: string; at?: number };

/** Header icon + cards appearing one by one (channels, accounts, tools, niches). */
export const ProfileList: React.FC<CP<{ header?: string; items: Item[]; assets?: Record<string, string> }>> = ({ header, items = [], assets = {}, box }) => {
  const headPop = usePop(0);
  const cardH = Math.min(150, (box.h * 0.75) / Math.max(1, items.length));
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, fontFamily: theme.font }}>
      {header && <div style={{ transform: `scale(${headPop})`, marginBottom: 10 }}><Icon spec={header} size={110} /></div>}
      {items.slice(0, 6).map((it, i) => {
        const p = usePop(typeof it.at === "number" ? Math.round(it.at * 30) - 4 : 8 + i * 12);
        const src = it.query ? assets[`items.${i}`] : undefined;
        return (
          <div key={i} style={{ width: Math.min(box.w * 0.78, 760), height: cardH, display: "flex", alignItems: "center", gap: 28, padding: "0 30px", border: `4px solid ${theme.line}`, borderRadius: 22, background: theme.card, boxShadow: "0 6px 20px rgba(0,0,0,.06)", opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
            <div style={{ width: cardH * 0.66, height: cardH * 0.66, borderRadius: "50%", overflow: "hidden", border: `4px solid ${theme.accent}`, display: "grid", placeItems: "center", flex: "none", background: theme.paper }}>
              {src || it.icon ? <Icon spec={it.icon} src={src} size={cardH * 0.5} /> : <div style={{ fontWeight: 900, fontSize: cardH * 0.3 }}>{it.title[0]}</div>}
            </div>
            <div>
              <div style={{ fontSize: Math.min(50, cardH * 0.34), fontWeight: 800 }}>{it.title}</div>
              {it.sub && <div style={{ fontSize: Math.min(32, cardH * 0.22), color: theme.muted, fontWeight: 500 }}>{it.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
