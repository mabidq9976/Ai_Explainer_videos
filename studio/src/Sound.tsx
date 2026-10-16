import React from "react";
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import type { Block, SceneDef, Word } from "./types";
import { resolveAt } from "./timeline";
import { CHECK_MIN } from "./components/Checklist";

export type SfxKind = "pop" | "whoosh" | "riser" | "scratch" | "ding" | "typing";
export type SfxEvent = { frame: number; kind: SfxKind; frames?: number };

const VOL: Record<SfxKind, number> = { pop: 1, whoosh: 0.75, riser: 0.9, scratch: 0.9, ding: 0.8, typing: 0.45 };

/**
 * Sound design: a music bed that ducks under the voice (looping seamlessly if shorter than the video) and drops
 * out for "hush" moments, plus UI sounds — pops, whooshes, risers, dings, typing, scratches.
 */
export const Sound: React.FC<{
  music: string | null; musicDuration: number | null; words: Word[]; sfx: Record<string, string>; events: SfxEvent[]; hushes: number[];
  musicVolume?: number; sfxVolume?: number; useMusic?: boolean; useSfx?: boolean;
}> = ({ music, musicDuration, words, sfx, events, hushes, musicVolume = 0.14, sfxVolume = 0.22, useMusic = true, useSfx = true }) => {
  const { durationInFrames, fps } = useVideoConfig();

  // Ducking: full bed in pauses, about half under speech, with 0.25 s ramps.
  const speaking = (t: number) => words.some((w) => t >= w.start - 0.15 && t <= w.end + 0.25);
  // Hush: music fades out over 0.15 s, stays silent ~0.55 s up to the key word, then returns over 0.3 s.
  const hush = (abs: number) => {
    let m = 1;
    for (const h of hushes) {
      const v = interpolate(abs, [h - fps * 0.7, h - fps * 0.55, h, h + fps * 0.3], [1, 0, 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      m = Math.min(m, v);
    }
    return m;
  };
  const level = (abs: number) => {
    const t = abs / fps;
    const near = [-0.25, 0, 0.25].map((d) => (speaking(t + d) ? 1 : 0) as number).reduce((a, b) => a + b, 0) / 3;
    const duck = 1 - near * 0.5;
    const fade = interpolate(abs, [0, fps * 0.6, durationInFrames - fps * 1.5, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return musicVolume * duck * fade * hush(abs);
  };

  const segLen = musicDuration ? Math.floor(musicDuration * fps) : durationInFrames;
  const XF = Math.round(fps * 0.4);
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
        <Sequence key={`s${i}`} from={Math.max(0, e.frame)} durationInFrames={e.frames ?? fps * 3} layout="none">
          <Audio src={staticFile(sfx[e.kind])} loop={e.kind === "typing"} volume={(f) => sfxVolume * VOL[e.kind] * (e.kind === "typing" ? interpolate(f, [0, 3, (e.frames ?? 30) - 6, e.frames ?? 30], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1)} />
        </Sequence>
      ) : null)}
    </>
  );
};

/**
 * All sound cues for an episode:
 *  - automatic: whoosh on picture changes, pop when board items land, ding on each checklist tick,
 *    typing while the AI-answer card types
 *  - directed: each scene's `sfx` list ({ at: word, kind }) — a riser is placed so it *ends* on its word;
 *    "hush" isn't a sound, it returns the frames where the music should drop out
 */
export function soundCues(opts: {
  chains: { elements: { kind: string; name?: string; inF: number; props?: any }[] }[];
  blocks: Block[]; scenes: SceneDef[]; words: Word[]; sfxDur: Record<string, number>; fps: number; cardStyle?: string;
}) {
  const { chains, blocks, scenes, words, sfxDur, fps } = opts;
  const ev: SfxEvent[] = [];
  const hushes: number[] = [];

  // Picture changes (not continued boards).
  blocks.slice(1).filter((b) => !(b.visual?.type === "board" && b.visual.continue)).forEach((b) => ev.push({ frame: b.startFrame, kind: "whoosh" }));
  // Board items landing.
  for (const c of chains) for (const e of c.elements) if (["image", "icon", "badge", "component"].includes(e.kind)) ev.push({ frame: e.inF, kind: "pop" });

  // Component-driven cues (timings mirror the components' own animation).
  const componentCues = (name: string | undefined, props: any, start: number) => {
    // Same timings as the components themselves (word cues already resolved to seconds after `start`).
    if (name === "Checklist") (props?.items ?? []).forEach((it: any, i: number) => {
      const d = Math.max(typeof it === "object" && typeof it.at === "number" ? Math.round(it.at * fps) - 8 : 10 + i * 14, CHECK_MIN(i));
      const tick = d + 10;
      ev.push({ frame: start + tick, kind: "ding" });
    });
    if (name === "SerpVsAiAnswer" && props?.answer) {
      const cardF = typeof props.cardAt === "number" ? Math.round(props.cardAt * fps) : 30;
      const from = typeof props.typeAt === "number" ? Math.round(props.typeAt * fps) : cardF + ((props.look ?? opts.cardStyle) === "chat" ? 22 : 8);
      ev.push({ frame: start + from, kind: "typing", frames: Math.round(String(props.answer).length * 0.9) });
    }
  };
  for (const b of blocks) if (b.visual && (b.visual.type === "component" || b.visual.type === "three")) componentCues(b.visual.name, b.visual.props, b.startFrame);
  for (const c of chains) for (const e of c.elements) if (e.kind === "component") componentCues(e.name, e.props, e.inF);

  // Directed cues.
  for (const sc of scenes) {
    const b = blocks.find((x) => x.id === sc.id);
    if (!b) continue;
    for (const cue of sc.sfx ?? []) {
      const f = resolveAt(cue.at, b, words) + 3;
      if (cue.kind === "hush") hushes.push(f);
      else if (cue.kind === "riser") ev.push({ frame: f - Math.round((sfxDur.riser ?? 2) * fps), kind: "riser" });
      else ev.push({ frame: f, kind: cue.kind });
    }
  }

  // Never stack one-shots closer than 5 frames (directed and component cues win over pops).
  ev.sort((a, b) => a.frame - b.frame);
  const rank: Record<SfxKind, number> = { pop: 0, whoosh: 1, ding: 2, typing: 2, scratch: 3, riser: 3 };
  const out: SfxEvent[] = [];
  for (const e of ev) {
    const last = out[out.length - 1];
    if (last && e.kind !== "riser" && e.kind !== "typing" && last.kind !== "riser" && last.kind !== "typing" && e.frame - last.frame < 5) {
      if (rank[e.kind] > rank[last.kind]) out[out.length - 1] = e;
      continue;
    }
    out.push(e);
  }
  return { events: out, hushes };
}
