import React from "react";
import { AbsoluteFill } from "remotion";
import { SerpVsAiAnswer } from "./components/SerpVsAiAnswer";
import type { CardLook } from "./components/shared";
import { theme } from "./theme";

/** Side-by-side of the card designs on the AI-answer graphic. `npx remotion still … CardSheet --frame=120` */
const LOOKS: CardLook[] = ["brutal", "soft", "line", "chat"];
export const CardSheet: React.FC = () => (
  <AbsoluteFill style={{ background: theme.paper, flexDirection: "row" }}>
    {LOOKS.map((l) => (
      <div key={l} style={{ position: "relative", width: 1080, height: 1100, borderRight: "2px solid #eee" }}>
        <div style={{ position: "absolute", top: 20, left: 0, right: 0, textAlign: "center", fontFamily: theme.font, fontSize: 44, fontWeight: 900, color: theme.accent, zIndex: 2 }}>{l}</div>
        <div style={{ position: "absolute", top: 100, left: 0, width: 1080, height: 1000 }}>
          <SerpVsAiAnswer look={l} box={{ w: 1080, h: 1000 }} query="how do ai engines pick sources" answer="They quote pages that answer in the first two sentences." sources={["yourblog.com", "docs.google.com"]} />
        </div>
      </div>
    ))}
  </AbsoluteFill>
);
