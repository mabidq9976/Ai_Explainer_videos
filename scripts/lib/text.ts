import fs from "node:fs";
import { r, readJsonIf } from "./paths.ts";

export const TAG_RE = /<(short pause|breath|laugh|sigh|cough)>/gi;
export const ALLOWED_TAGS = ["short pause", "breath", "laugh"];

/** Display text: tags removed, whitespace collapsed. Used for captions, word counts and Rhubarb. */
export const stripTags = (s: string) => s.replace(TAG_RE, " ").replace(/\s+/g, " ").trim();

export const words = (s: string) => stripTags(s).split(" ").filter(Boolean);

export const normWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Spoken text for TTS: pronunciations applied (GEO -> "G E O"), tags kept. */
export function applyPronunciations(s: string): string {
  const map = readJsonIf<Record<string, string>>(r("brand", "pronunciations.json")) ?? {};
  let out = s;
  for (const [term, say] of Object.entries(map)) {
    if (term.startsWith("_")) continue;
    out = out.replace(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), say);
  }
  return out;
}

export type Scene = {
  id: string;
  line: string;
  emphasis?: string[];
  pop?: string[];
  tag?: { text: string; at?: string | number; until?: string | number };
  punch?: string[];
  sfx?: { at: number | string; kind: string }[];
  style: string;
  avatar: { layout: "full" | "corner" | "hidden"; position?: string; gesture?: string; expression?: string; beats?: { at: number | string; gesture?: string; expression?: string; position?: string; layout?: string }[] };
  visual: any;
};
export type SceneFile = {
  slug: string;
  title?: string;
  pillar: string;
  format: string;
  length?: number;
  hook: { text: string; pattern: string };
  scenes: Scene[];
  cta: { line: string; style?: string; visual: string; props?: any };
  voice: { provider: string; model?: string; voiceId?: string };
};

/** Scenes plus the CTA as a final spoken block — the unit TTS, timing and render all share. */
export function spokenBlocks(scene: SceneFile) {
  return [
    ...scene.scenes.map((s) => ({ id: s.id, line: s.line, style: s.style })),
    { id: "cta", line: scene.cta.line, style: scene.cta.style ?? "warm, direct, friendly" },
  ];
}

export const catalog = (): Record<string, { type: string; use: string; props: Record<string, string> }> =>
  JSON.parse(fs.readFileSync(r("studio", "src", "components", "catalog.json"), "utf8"));
