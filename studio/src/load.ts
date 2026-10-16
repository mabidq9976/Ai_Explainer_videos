import { staticFile } from "remotion";
import type { EpisodeProps, SceneFile, Timing, Word, Block } from "./types";
import { FPS } from "./theme";

const get = async (p: string, as: "json" | "text") => {
  try {
    const res = await fetch(staticFile(p));
    if (!res.ok) return null;
    return as === "json" ? await res.json() : await res.text();
  } catch {
    return null;
  }
};

export async function loadEpisode(): Promise<EpisodeProps> {
  const [scene, timing, mouth, manifest, avatarSvg, rig, info, audioHead] = await Promise.all([
    get("scene.json", "json"),
    get("audio/timing.json", "json"),
    get("mouth.json", "json"),
    get("assets/manifest.json", "json"),
    get("_render/avatar.svg", "text"),
    get("_render/rig.json", "json"),
    get("_render/info.json", "json"),
    fetch(staticFile("audio/voice.wav"), { method: "HEAD" }).then((r) => r.ok).catch(() => false),
  ]);
  const s = scene as SceneFile | null;
  const hasAudio = !!audioHead && !!timing;
  return {
    scene: s,
    timing: hasAudio ? (timing as Timing) : s ? estimateTiming(s) : null,
    mouth: hasAudio ? mouth : null,
    manifest: manifest ?? {},
    avatarSvg: avatarSvg && avatarSvg.includes("<svg") ? avatarSvg : null,
    rig: rig ?? {},
    music: info?.music ?? null,
    musicDuration: info?.musicDuration ?? null,
    sfx: info?.sfx ?? {},
    hasAudio,
    estimated: !hasAudio,
  };
}

const WPS = 2.5; // 150 wpm
const tokenize = (s: string) => s.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean);

/** Before TTS exists: lay words out at 150 wpm so the episode still previews in Studio. */
export function estimateTiming(s: SceneFile): Timing {
  const blocks = [...s.scenes.map((x) => ({ id: x.id, line: x.line, emphasis: x.emphasis ?? [] })), { id: "cta", line: s.cta.line, emphasis: [] as string[] }];
  const words: Word[] = [];
  const scenes: Timing["scenes"] = [];
  let t = 0.15;
  for (const b of blocks) {
    const start = t;
    const emph = b.emphasis.flatMap((e) => tokenize(e.toLowerCase()));
    for (const w of tokenize(b.line)) {
      const d = Math.max(0.18, w.length * 0.055 + 0.12) / (WPS / 2.5);
      words.push({ text: w, start: t, end: t + d, scene: b.id, emphasis: emph.includes(w.toLowerCase().replace(/[^a-z0-9']/g, "")) });
      t += d;
    }
    t += 0.25;
    scenes.push({ id: b.id, start, end: t });
  }
  scenes[0].start = 0;
  return { duration: t + 0.2, words, scenes };
}

export function buildBlocks(p: EpisodeProps): Block[] {
  if (!p.scene || !p.timing) return [];
  const s = p.scene;
  const byId = Object.fromEntries(p.timing.scenes.map((x) => [x.id, x]));
  const blocks: Block[] = s.scenes.map((sc) => ({
    id: sc.id,
    line: sc.line,
    startFrame: Math.round((byId[sc.id]?.start ?? 0) * FPS),
    endFrame: Math.round((byId[sc.id]?.end ?? 0) * FPS),
    layout: sc.avatar.layout,
    position: sc.avatar.position ?? "left",
    gesture: sc.avatar.gesture ?? "rest",
    expression: sc.avatar.expression ?? "neutral",
    visual: sc.visual,
    beats: sc.avatar.beats ?? [],
  }));
  blocks.push({
    id: "cta",
    line: s.cta.line,
    startFrame: Math.round((byId.cta?.start ?? 0) * FPS),
    endFrame: Math.round(totalSeconds(p) * FPS),
    layout: "full",
    position: "center",
    gesture: "wave",
    expression: "raised",
    visual: { type: "component", name: s.cta.visual, props: { text: s.cta.line, ...(s.cta.props ?? {}) } },
    cta: s.cta,
    beats: [],
  });
  for (let i = 0; i < blocks.length - 1; i++) blocks[i].endFrame = Math.max(blocks[i].startFrame + 1, blocks[i + 1].startFrame);
  return blocks;
}

export const totalSeconds = (p: EpisodeProps) => (p.timing ? p.timing.duration + 0.8 : 3);
