import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import type { CP } from "../components/shared";

const CAM_Z = 11.5;
const FOV = 40;

/** Entities linking into a knowledge graph around a centre node, slowly orbiting. */
export const NodeNetwork3D: React.FC<CP<{ labels: string[] }>> = ({ labels = [], box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = labels.slice(0, 7);
  const rot = (frame / fps) * 0.35;
  const nodes = useMemo(
    () => list.map((_, i) => {
      const a = (i / list.length) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * 2.6, Math.sin(i * 1.7) * 1.4, Math.sin(a) * 2.6);
    }),
    [list.join("|")],
  );
  const lines = useMemo(
    () => nodes.map((n) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), n]), new THREE.LineBasicMaterial({ color: theme.ink }))),
    [nodes],
  );
  const grow = (i: number) => spring({ frame: frame - 6 - i * 5, fps, config: { damping: 14 } });
  lines.forEach((l, i) => l.scale.setScalar(Math.max(0.001, grow(i))));

  // Project node positions to screen for crisp HTML labels.
  const f = box.h / 2 / Math.tan((FOV * Math.PI) / 360);
  const project = (v: THREE.Vector3) => {
    const x = v.x * Math.cos(rot) + v.z * Math.sin(rot);
    const z = -v.x * Math.sin(rot) + v.z * Math.cos(rot);
    const s = f / (CAM_Z - z);
    return { x: box.w / 2 + x * s, y: box.h / 2 - v.y * s, z };
  };
  const centre = spring({ frame, fps, config: { damping: 12 } });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ThreeCanvas width={box.w} height={box.h} camera={{ position: [0, 0, CAM_Z], fov: FOV }} style={{ position: "absolute", inset: 0 }}>
        <ambientLight intensity={1.3} />
        <directionalLight position={[4, 6, 8]} intensity={1.5} />
        <group rotation={[0, rot, 0]}>
          <mesh scale={centre}>
            <icosahedronGeometry args={[0.7, 1]} />
            <meshStandardMaterial color={theme.accent} flatShading />
          </mesh>
          {nodes.map((n, i) => (
            <group key={i}>
              <primitive object={lines[i]} />
              <mesh position={n} scale={grow(i) * 0.9}>
                <sphereGeometry args={[0.32, 20, 20]} />
                <meshStandardMaterial color={i % 2 ? theme.marker : theme.card} flatShading />
              </mesh>
            </group>
          ))}
        </group>
      </ThreeCanvas>
      {nodes.map((n, i) => {
        const p = project(n);
        const o = interpolate(grow(i), [0.5, 1], [0, 1], { extrapolateLeft: "clamp" });
        return (
          <div key={i} style={{ position: "absolute", left: p.x, top: p.y - 58, transform: "translate(-50%, -50%)", fontFamily: theme.font, fontWeight: 800, fontSize: 38, background: theme.card, border: `4px solid ${theme.ink}`, borderRadius: 999, padding: "6px 22px", opacity: o * interpolate(p.z, [-3, 3], [0.55, 1]), zIndex: Math.round(p.z * 10) + 50, whiteSpace: "nowrap" }}>
            {list[i]}
          </div>
        );
      })}
    </div>
  );
};
