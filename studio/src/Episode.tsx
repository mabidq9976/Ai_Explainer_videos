import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Block, EpisodeProps, Word } from "./types";
import { buildBlocks } from "./load";
import { layoutAt } from "./layout";
import { VisualLayer } from "./VisualLayer";
import { Captions, KeywordPops, findPops } from "./Captions";
import { Avatar } from "./avatar/Avatar";
import { Board, type PlacedElement } from "./Board";
import { avatarEvents, resolveAt } from "./timeline";
import { theme, W } from "./theme";
import { Sound, sfxEvents } from "./Sound";

type Chain = { start: number; end: number; elements: PlacedElement[] };

/** Group board scenes: a board with `continue: true` keeps the previous board's elements on screen. */
function buildChains(blocks: Block[], words: Word[]) {
  const chains: Chain[] = [];
  const owner = new Map<string, Chain>();
  let last: Chain | null = null;
  blocks.forEach((b, i) => {
    const v = b.visual;
    if (v?.type !== "board") { last = null; return; }
    const prevBoard = i > 0 && blocks[i - 1].visual?.type === "board";
    const chain: Chain = v.continue && prevBoard && last ? last : { start: b.startFrame, end: b.endFrame, elements: [] };
    if (chain !== last) chains.push(chain);
    chain.end = b.endFrame;
    v.elements.forEach((el, k) => {
      const inF = resolveAt(el.at, b, words, b.startFrame + k * 4);
      chain.elements.push({ ...el, scene: b.id, inF, outF: el.until !== undefined ? resolveAt(el.until, b, words, b.endFrame) : -1 });
    });
    owner.set(b.id, chain);
    last = chain;
  });
  for (const c of chains) for (const e of c.elements) if (e.outF < 0) e.outF = c.end;
  return { chains, owner };
}

/** Where pop words appear: beside the narrator, on the side with room (above its head when centred). */
function popAnchor(av: { x: number; y: number; w: number; h: number }, layout: string, captionY: number) {
  if (layout !== "corner") return { x: W / 2, y: captionY, maxW: W * 0.86 };
  const cx = av.x + av.w / 2;
  if (Math.abs(cx - W / 2) < 80) return { x: W / 2, y: av.y - 95, maxW: W * 0.8 };
  // Beside the head, clear of gesturing hands (which reach out past the avatar box at chest height).
  const free = cx < W / 2 ? { from: av.x + av.w + 40, to: W - 30 } : { from: 30, to: av.x - 40 };
  return { x: (free.from + free.to) / 2, y: av.y + av.h * 0.12, maxW: free.to - free.from };
}

/** Reads scene.json (+ timing, mouth, assets) and lays every scene on the timeline. No per-episode code. */
export const Episode: React.FC<EpisodeProps> = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const blocks = useMemo(() => buildBlocks(props), [props]);
  const words = props.timing?.words ?? [];
  const { chains } = useMemo(() => buildChains(blocks, words), [blocks, words]);
  const events = useMemo(() => avatarEvents(blocks, words), [blocks, words]);
  const pops = useMemo(() => (props.scene ? findPops(props.scene.scenes, words) : []), [props.scene, words]);
  // Whoosh only where the picture actually changes (not when a board continues).
  const sounds = useMemo(() => sfxEvents(chains, blocks.filter((b) => !(b.visual?.type === "board" && b.visual.continue)).map((b) => b.startFrame)), [chains, blocks]);

  if (!props.scene || !blocks.length) {
    return (
      <AbsoluteFill style={{ background: theme.paper, alignItems: "center", justifyContent: "center", fontFamily: theme.font, fontSize: 48, color: theme.muted, textAlign: "center", padding: 80 }}>
        No episode loaded. Run <b>npm run studio &lt;slug&gt;</b> to open one.
      </AbsoluteFill>
    );
  }

  const L = layoutAt(frame, events, props.rig.flipWhenRight);
  const curBlock = blocks.find((b) => frame >= b.startFrame && frame < b.endFrame) ?? blocks[blocks.length - 1];
  const stockFull = curBlock.visual?.type === "stock" && curBlock.visual.frame === "full" && !!props.manifest[curBlock.id]?.file;
  const capMode = props.scene.captions === true ? "full" : props.scene.captions || "off";

  return (
    <AbsoluteFill style={{ background: theme.paper }}>
      {blocks.filter((b) => b.visual?.type !== "board").map((b) => (
        <Sequence key={b.id} from={b.startFrame} durationInFrames={Math.max(1, b.endFrame - b.startFrame)} layout="none">
          <VisualLayer block={b} manifest={props.manifest} />
        </Sequence>
      ))}
      {chains.map((c, i) => (
        <Sequence key={`chain-${i}`} from={c.start} durationInFrames={Math.max(1, c.end - c.start)} layout="none">
          <Board elements={c.elements} offset={c.start} manifest={props.manifest} />
        </Sequence>
      ))}

      {capMode === "full" && <Captions words={words} y={L.captionY} onImage={stockFull} />}
      {capMode === "keywords" && <KeywordPops pops={pops} {...popAnchor(L.avatar, L.cur.layout, L.captionY)} />}

      {props.avatarSvg && (
        <div style={{ position: "absolute", left: L.avatar.x, top: L.avatar.y, width: L.avatar.w, height: L.avatar.h, zIndex: 20, transform: L.facing !== 1 ? `scaleX(${L.facing.toFixed(3)})` : undefined }}>
          <Avatar svg={props.avatarSvg} pivots={props.rig.pivots} aliases={props.rig.aliases} events={events} move={L.move} mouth={props.mouth} words={words} totalFrames={durationInFrames} />
        </div>
      )}

      {props.hasAudio && <Audio src={staticFile("audio/voice.wav")} />}
      <Sound music={props.music} musicDuration={props.musicDuration} words={words} sfx={props.sfx} events={sounds}
        useMusic={props.scene.sound?.music ?? true} useSfx={props.scene.sound?.sfx ?? true}
        musicVolume={props.scene.sound?.musicVolume} sfxVolume={props.scene.sound?.sfxVolume} />

      {props.estimated && (
        <div style={{ position: "absolute", top: 24, right: 24, fontFamily: theme.font, fontSize: 26, fontWeight: 700, color: "#fff", background: theme.accent, padding: "6px 16px", borderRadius: 999, zIndex: 99 }}>
          DRAFT TIMING · no voice yet
        </div>
      )}
    </AbsoluteFill>
  );
};
