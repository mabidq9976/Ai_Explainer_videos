import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Block, EpisodeProps, Word } from "./types";
import { buildBlocks } from "./load";
import { layoutAt } from "./layout";
import { VisualLayer } from "./VisualLayer";
import { captionConfig } from "./captions/config";
import { FactTag, Subtitles, TitleCard, TITLE_TOP, titleLayout } from "./captions/Layers";
import { buildTags, titleWindow } from "./captions/tags";
import { Avatar } from "./avatar/Avatar";
import { Board, type PlacedElement } from "./Board";
import { avatarEvents, resolveAt, resolveProps } from "./timeline";
import { theme, W } from "./theme";
import { CardStyleContext } from "./components/shared";
import { Sound, soundCues } from "./Sound";
import { cameraScale, punchFrames, type Shot } from "./camera";
import { zones } from "./layout";

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
      const props = el.kind === "component" && el.props ? resolveProps(el.props, b, words, inF) : el.props;
      chain.elements.push({ ...el, props, scene: b.id, inF, outF: el.until !== undefined ? resolveAt(el.until, b, words, b.endFrame) : -1 });
    });
    owner.set(b.id, chain);
    last = chain;
  });
  for (const c of chains) for (const e of c.elements) if (e.outF < 0) e.outF = c.end;
  return { chains, owner };
}

/** Reads scene.json (+ timing, mouth, assets) and lays every scene on the timeline. No per-episode code. */
export const Episode: React.FC<EpisodeProps> = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const blocks = useMemo(() => buildBlocks(props), [props]);
  const words = props.timing?.words ?? [];
  const { chains } = useMemo(() => buildChains(blocks, words), [blocks, words]);
  const events = useMemo(() => avatarEvents(blocks, words), [blocks, words]);
  // Camera: shots are board chains (a push carries through continued boards) or single non-board scenes.
  const shots = useMemo<Shot[]>(() => [
    ...chains.map((c) => ({ start: c.start, end: c.end })),
    ...blocks.filter((b) => b.visual?.type !== "board").map((b) => ({ start: b.startFrame, end: b.endFrame })),
  ], [chains, blocks]);
  const punches = useMemo(() => (props.scene ? punchFrames(blocks, props.scene.scenes, words) : []), [blocks, props.scene, words]);
  const cap = captionConfig(props.scene?.captions);
  // The CTA card already shows its words — don't repeat them as subtitles.
  const subWords = useMemo(() => (props.scene?.cta?.visual === "CTAEnd" ? words.filter((w) => w.scene !== "cta") : words), [words, props.scene]);
  const tags = useMemo(() => (props.scene && cap.tags ? buildTags(props.scene.scenes as any, blocks, words) : []), [props.scene, cap.tags, blocks, words]);
  const title = cap.preset !== "off" && cap.title?.text ? { text: cap.title.text, ...titleWindow(cap.title.until, blocks), ...titleLayout(cap.title.text) } : null;
  const sounds = useMemo(
    () => soundCues({ chains, blocks, scenes: props.scene?.scenes ?? [], words, sfxDur: props.sfxDur, fps: 30, cardStyle: props.scene?.cardStyle ?? theme.cardStyle }),
    [chains, blocks, props.scene, words, props.sfxDur],
  );

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
  const titleOn = !!title && frame >= title.from && frame <= title.to;
  // While the headline is up, motion-graphic scenes start below it.
  const topInset = title ? TITLE_TOP + title.height + 40 : 0;

  const cam = props.scene.camera === false ? 1 : cameraScale(frame, shots, punches);
  const vz = zones(curBlock.layout, curBlock.position).visual;
  return (
    <CardStyleContext.Provider value={props.scene.cardStyle ?? theme.cardStyle}>
    <AbsoluteFill style={{ background: theme.paper }}>
      <AbsoluteFill style={{ transform: `scale(${cam.toFixed(4)})`, transformOrigin: `${W / 2}px ${vz.y + vz.h / 2}px` }}>
      {blocks.filter((b) => b.visual?.type !== "board").map((b) => (
        <Sequence key={b.id} from={b.startFrame} durationInFrames={Math.max(1, b.endFrame - b.startFrame)} layout="none">
          <VisualLayer block={b} manifest={props.manifest} topInset={title && b.startFrame < title.to ? topInset : 0} />
        </Sequence>
      ))}
      {chains.map((c, i) => (
        <Sequence key={`chain-${i}`} from={c.start} durationInFrames={Math.max(1, c.end - c.start)} layout="none">
          <Board elements={c.elements} offset={c.start} manifest={props.manifest} />
        </Sequence>
      ))}
      </AbsoluteFill>

      {cap.preset !== "off" && title && <TitleCard text={title.text} from={title.from} to={title.to} preset={cap.preset} />}
      {cap.preset !== "off" && cap.tags && <FactTag tags={tags} top={titleOn && title ? TITLE_TOP + title.height + 22 : 34} preset={cap.preset} />}
      {cap.preset !== "off" && cap.subtitles && <Subtitles words={subWords} y={L.captionY} preset={stockFull && cap.preset === "editorial" ? "bold" : cap.preset} />}

      {props.avatarSvg && (
        <div style={{ position: "absolute", left: L.avatar.x, top: L.avatar.y, width: L.avatar.w, height: L.avatar.h, zIndex: 20, transform: L.facing !== 1 ? `scaleX(${L.facing.toFixed(3)})` : undefined }}>
          <Avatar svg={props.avatarSvg} pivots={props.rig.pivots} aliases={props.rig.aliases} events={events} move={L.move} mouth={props.mouth} words={words} totalFrames={durationInFrames} />
        </div>
      )}

      {props.hasAudio && <Audio src={staticFile("audio/voice.wav")} />}
      <Sound music={props.music} musicDuration={props.musicDuration} words={words} sfx={props.sfx} events={sounds.events} hushes={sounds.hushes}
        useMusic={props.scene.sound?.music ?? true} useSfx={props.scene.sound?.sfx ?? true}
        musicVolume={props.scene.sound?.musicVolume} sfxVolume={props.scene.sound?.sfxVolume} />

      {props.estimated && (
        <div style={{ position: "absolute", top: 24, right: 24, fontFamily: theme.font, fontSize: 26, fontWeight: 700, color: "#fff", background: theme.accent, padding: "6px 16px", borderRadius: 999, zIndex: 99 }}>
          DRAFT TIMING · no voice yet
        </div>
      )}
    </AbsoluteFill>
    </CardStyleContext.Provider>
  );
};
