import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Icon } from "./Icon";
import { CP, usePop } from "./shared";

/** A settings switch flipping on (e.g. "Monetization"), optional icon above. */
export const Toggle: React.FC<CP<{ label: string; icon?: string; on?: boolean }>> = ({ label, icon, on = true, box }) => {
  const frame = useCurrentFrame();
  const pop = usePop(icon ? 6 : 0);
  const iconPop = usePop(0);
  const flip = interpolate(frame, [16, 24], [on ? 0 : 1, on ? 1 : 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const tw = 150, th = 84;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 46, fontFamily: theme.font }}>
      {icon && <div style={{ transform: `scale(${iconPop})` }}><Icon spec={icon} size={130} /></div>}
      <div style={{ display: "flex", alignItems: "center", gap: 36, padding: "34px 50px", border: `4px solid ${theme.line}`, borderRadius: 26, background: theme.card, transform: `scale(${pop})`, boxShadow: "0 6px 24px rgba(0,0,0,.06)", maxWidth: box.w * 0.9 }}>
        <div style={{ width: tw, height: th, borderRadius: th, background: flip > 0.5 ? "#34C759" : "#D9D9D9", position: "relative", flex: "none" }}>
          <div style={{ position: "absolute", top: 7, left: 7 + flip * (tw - th), width: th - 14, height: th - 14, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,.25)" }} />
        </div>
        <div style={{ fontSize: 62, fontWeight: 700 }}>{label}</div>
      </div>
    </div>
  );
};
