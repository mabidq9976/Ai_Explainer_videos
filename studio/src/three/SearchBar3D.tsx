import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import type { CP } from "../components/shared";

/** A 3D search box tilting into view while the query types itself. Flat materials, simple geometry. */
export const SearchBar3D: React.FC<CP<{ query: string }>> = ({ query, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const tilt = interpolate(frame, [0, 24], [0.9, 0.18], { extrapolateRight: "clamp" });
  const chars = Math.floor(interpolate(frame, [18, 18 + query.length * 1.6], [0, query.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const typed = query.slice(0, chars);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ThreeCanvas width={box.w} height={box.h} camera={{ position: [0, 0, 9], fov: 40 }} style={{ position: "absolute", inset: 0 }}>
        <ambientLight intensity={1.4} />
        <directionalLight position={[3, 5, 6]} intensity={1.6} />
        <group rotation={[tilt, Math.sin(t * 0.8) * 0.12, 0]}>
          <mesh>
            <boxGeometry args={[6.4, 1.3, 0.5]} />
            <meshStandardMaterial color={theme.card} flatShading />
          </mesh>
          <mesh position={[0, 0, -0.08]} scale={[1.04, 1.18, 1]}>
            <boxGeometry args={[6.4, 1.3, 0.42]} />
            <meshBasicMaterial color={theme.ink} />
          </mesh>
          <mesh position={[-2.65, 0.08, 0.3]}>
            <torusGeometry args={[0.28, 0.07, 12, 32]} />
            <meshStandardMaterial color={theme.ink} />
          </mesh>
          <mesh position={[-2.38, -0.2, 0.3]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.06, 0.06, 0.32, 12]} />
            <meshStandardMaterial color={theme.ink} />
          </mesh>
        </group>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.3 + t * 0.5) * 3.4, Math.sin(i * 2.1 + t * 0.6) * 2.6, -2 - i * 0.3]} rotation={[t + i, t * 0.7 + i, 0]}>
            <boxGeometry args={[0.35, 0.35, 0.35]} />
            <meshStandardMaterial color={i % 2 ? theme.accent : theme.marker} flatShading />
          </mesh>
        ))}
      </ThreeCanvas>
      {/* Query text as an HTML overlay keeps type crisp and avoids font loading in three.js. */}
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-40%, -50%) perspective(900px) rotateX(${tilt * 57}deg)`, fontFamily: theme.font, fontSize: 46, fontWeight: 700, color: theme.ink, whiteSpace: "nowrap", width: box.w * 0.55 }}>
        {typed}
        <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>|</span>
      </div>
    </div>
  );
};
