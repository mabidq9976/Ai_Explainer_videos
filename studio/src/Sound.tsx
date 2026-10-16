import React from "react";
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import type { Word } from "./types";

export type SfxEvent = { frame: number; kind: "pop" | "whoosh" };

/**
 * Sound design: a music bed that ducks under the voice (and loops seamlessly if shorter than the video),
 * plus soft UI sounds — a pop when board items land, a whoosh on scene changes.
 */
export const Sound: React.FC<{
  music: string | null; musicDuration: number | null; words: Word[]; sfx: Record<string, string>; events: SfxEvent[];
  musicVolume?: number; sfxVolume?: number; useMusic?: boolean; useSfx?: boolean;
}> = ({ music, musicDuration, words, sfx, events, musicVolume = 0.14, sfxVolume = 0.22, useMusic = true, useSfx = true }) => {
  const { durationInFrames, fps } = useVideoConfig();

  // Ducking: full bed in pauses, about half under speech, with 0.25 s ramps.
  const speaking = (t: number) => words.some((w) => t >= w.start - 0.15 && t <= w.end + 0.25);
  const level = (abs: number) => {
    const t = abs / fps;
    const near = [-0.25, 0, 0.25].map((d) => (speaking(t + d) ? 1 : 0) as number).reduce((a, b) => a + b, 0) / 3;
    const duck = 1 - near * 0.5;
    const fade = interpolate(abs, [0, fps * 0.6, durationInFrames - fps * 1.5, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return musicVolume * duck * fade;
  };

  const segLen = musicDuration ? Math.floor(musicDuration * fps) : durationInFrames;
  const XF = Math.round(fps * 0.4); // crossfade between loop passes
  const passes = musicDuration ? Math.ceil(durationInFrames / Math.max(1, segLen - XF)) : 1;

  return (
    <>
      {useMusic && music && Array.from({ length: passes }, (_, k) => {
        const from = k * (segLen - XF);
        if (from >= durationInFrames) return null;
        return (
          <Sequence key={`m${k}`} from={from} durationInFrames={Math.min(segLen, durationInFrames - from)} layout="none">
            <Audio src={staticFile(music)} volume={(f) => {
              const edge = passes > 1 ? interpolate(f, [0, XF, segLen - XF, segLen], [k === 0 ? 1 : 0, 1, 1, k === passes - 1 ? 1 : 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
              return level(from + f) * edge;
            }} />
          </Sequence>
        );
      })}
      {useSfx && events.map((e, i) => sfx[e.kind] ? (
        <Sequence key={`s${i}`} from={e.frame} durationInFrames={fps * 2} layout="none">
          <Audio src={staticFile(sfx[e.kind])} volume={e.kind === "pop" ? sfxVolume : sfxVolume * 0.75} />
        </Sequence>
      ) : null)}
    </>
  );
};

/** Pops for board items landing, whooshes when the scene's visual changes; never closer than 5 frames. */
export function sfxEvents(chains: { start: number; elements: { kind: string; inF: number }[] }[], sceneStarts: number[]): SfxEvent[] {
  const ev: SfxEvent[] = [];
  for (const f of sceneStarts.slice(1)) ev.push({ frame: f, kind: "whoosh" });
  for (const c of chains) for (const e of c.elements) if (["image", "icon", "badge", "component"].includes(e.kind)) ev.push({ frame: e.inF, kind: "pop" });
  ev.sort((a, b) => a.frame - b.frame);
  const out: SfxEvent[] = [];
  for (const e of ev) {
    const last = out[out.length - 1];
    if (last && e.frame - last.frame < 5) { if (e.kind === "whoosh") out[out.length - 1] = e; continue; }
    out.push(e);
  }
  return out;
}
