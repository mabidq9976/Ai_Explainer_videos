import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import type { CP } from "../components/shared";

const GOOGLE = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];

/** Google's four-colour "G". */
const GoogleG: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const Mic: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
    <path fill="#34A853" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
  </svg>
);

/**
 * A Google search bar in perspective: it tilts up into place, hovers over a soft shadow while small Google-coloured
 * 3D shapes drift behind it, types the query (search operators like `site:` highlighted), then "presses" enter.
 * `typeAt`: the spoken word that starts the typing.
 */
export const SearchBar3D: React.FC<CP<{ query: string; typeAt?: number }>> = ({ query, typeAt, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Entrance: rise and tilt up into a gentle 3D angle, then a slow hover.
  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.9 } });
  const tiltX = interpolate(enter, [0, 1], [58, 12]) + Math.sin(t * 1.1) * 1.5;
  const yaw = Math.sin(t * 0.7) * 5;
  const lift = interpolate(enter, [0, 1], [90, 0]) + Math.sin(t * 1.3) * 6;

  // Typing on its word; operator part (site:…) shown as a highlighted chip.
  const t0 = typeAt !== undefined ? Math.round(typeAt * fps) : 18;
  const tEnd = t0 + query.length * 2.0;
  const chars = Math.floor(interpolate(frame, [t0, tEnd], [0, query.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const typed = query.slice(0, chars);
  const opAt = query.search(/\b\w+:/);
  const plain = opAt >= 0 ? typed.slice(0, opAt) : typed;
  const op = opAt >= 0 ? typed.slice(opAt) : "";
  const done = frame > tEnd + 4;
  const press = interpolate(frame, [tEnd + 6, tEnd + 10, tEnd + 18], [1, 0.975, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });

  const W = Math.min(box.w * 0.88, 940), Hh = 124;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Depth: Google-coloured shapes drifting behind the bar. */}
      <ThreeCanvas width={box.w} height={box.h} camera={{ position: [0, 0, 12], fov: 40 }} style={{ position: "absolute", inset: 0 }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[4, 6, 8]} intensity={1.8} />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = i * 1.05 + t * 0.35;
          const pos: [number, number, number] = [Math.cos(a) * (3.6 + (i % 2) * 0.6), Math.sin(a * 1.3 + i) * 2.4, -3 - (i % 3)];
          return (
            <mesh key={i} position={pos} rotation={[t * 0.6 + i, t * 0.4 + i * 0.7, 0]} scale={enter * (0.75 + (i % 3) * 0.2)}>
              {i % 3 === 0 ? <sphereGeometry args={[0.32, 32, 32]} /> : i % 3 === 1 ? <boxGeometry args={[0.5, 0.5, 0.5]} /> : <torusGeometry args={[0.28, 0.11, 16, 40]} />}
              <meshStandardMaterial color={GOOGLE[i % 4]} roughness={0.45} metalness={0.05} />
            </mesh>
          );
        })}
      </ThreeCanvas>

      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", perspective: 1500 }}>
        {/* Soft floor shadow that breathes with the hover. */}
        <div style={{ position: "absolute", left: "50%", top: `calc(50% + ${Hh * 0.95}px)`, width: W * 0.8, height: 46, transform: `translateX(-50%) scale(${1 - lift / 400})`, background: "radial-gradient(closest-side, rgba(32,33,36,0.22), rgba(32,33,36,0))", opacity: enter }} />
        <div style={{
          width: W, height: Hh, borderRadius: Hh / 2, background: "#FFFFFF", border: "1.5px solid #DFE1E5",
          boxShadow: "0 1px 3px rgba(32,33,36,0.10), 0 10px 24px rgba(32,33,36,0.12), 0 28px 60px rgba(32,33,36,0.14)",
          display: "flex", alignItems: "center", gap: 26, padding: "0 40px", boxSizing: "border-box",
          transform: `translateY(${lift}px) rotateX(${tiltX}deg) rotateY(${yaw}deg) scale(${press})`, transformStyle: "preserve-3d", opacity: Math.min(1, enter * 1.6),
        }}>
          <GoogleG size={54} />
          <div style={{ flex: 1, fontFamily: theme.font, fontSize: 40, fontWeight: 500, color: "#202124", whiteSpace: "nowrap", overflow: "hidden", display: "flex", alignItems: "center" }}>
            {chars === 0 && <span style={{ color: "#9AA0A6" }}>Search Google</span>}
            <span>{plain}</span>
            {op && <span style={{ color: "#1A73E8", background: "#E8F0FE", borderRadius: 10, padding: "2px 8px", marginLeft: 2 }}>{op}</span>}
            {!done && <span style={{ display: "inline-block", width: 3, height: 44, marginLeft: 3, background: "#1A73E8", opacity: frame % 16 < 9 ? 1 : 0 }} />}
          </div>
          <Mic size={44} />
        </div>
      </div>
    </div>
  );
};
