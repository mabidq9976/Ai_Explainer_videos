/**
 * Compact, token-cheap timeline for Claude's producer pass: every scene's real start/end,
 * each word with its time, and where every board element / narrator beat lands.
 * Usage: npm run timeline <slug>
 */
import fs from "node:fs";
import { ep, readJson, readJsonIf, requireSlug } from "./lib/paths.ts";
import { normWord, words as splitWords, type SceneFile } from "./lib/text.ts";

const slug = requireSlug();
const scene = readJson<SceneFile>(ep(slug, "scene.json"));
const timing = readJsonIf(ep(slug, "audio", "timing.json"));
const manifest = readJsonIf(ep(slug, "assets", "manifest.json")) ?? {};
if (!timing) console.log("(no voice yet — times below are 150 wpm estimates; run the voice step for real ones)\n");

type W = { text: string; start: number; end: number; scene: string };
let ws: W[] = timing?.words ?? [];
let scenes: { id: string; start: number; end: number }[] = timing?.scenes ?? [];
if (!timing) {
  let t = 0;
  for (const b of [...scene.scenes.map((s) => ({ id: s.id, line: s.line })), { id: "cta", line: scene.cta.line }]) {
    const st = t;
    for (const w of splitWords(b.line)) { ws.push({ text: w, start: t, end: t + 0.4, scene: b.id }); t += 0.4; }
    t += 0.25;
    scenes.push({ id: b.id, start: st, end: t });
  }
}
const at = (sceneId: string, a: unknown): string => {
  const sc = scenes.find((s) => s.id === sceneId)!;
  if (a === undefined || a === "start") return `${sc.start.toFixed(2)}`;
  if (typeof a === "number") return `${(sc.start + a).toFixed(2)}`;
  const t = String(a).split(/\s+/).map(normWord);
  const sw = ws.filter((w) => w.scene === sceneId);
  const i = sw.findIndex((_, k) => t.every((x, j) => sw[k + j] && normWord(sw[k + j].text).startsWith(x)));
  return i >= 0 ? `${sw[i].start.toFixed(2)}` : `?? ("${a}" not spoken)`;
};

const total = timing?.duration ?? scenes[scenes.length - 1]?.end ?? 0;
console.log(`${slug} · ${total.toFixed(1)}s · look: ${(scene as any).look ?? "reference"} · ${scene.scenes.length} scenes\n`);
for (const s of [...scene.scenes, { id: "cta", line: scene.cta.line, visual: { type: "component", name: scene.cta.visual }, avatar: { layout: "full", gesture: "wave" } } as any]) {
  const sc = scenes.find((x) => x.id === s.id);
  if (!sc) continue;
  const dur = sc.end - sc.start;
  console.log(`[${s.id}] ${sc.start.toFixed(2)}–${sc.end.toFixed(2)} (${dur.toFixed(1)}s)${dur > 4 && s.visual.type !== "board" ? "  ⚠ one visual > 4s" : ""}`);
  console.log(`  words: ${ws.filter((w) => w.scene === s.id).map((w) => `${w.text}@${w.start.toFixed(2)}`).join(" ")}`);
  const a = s.avatar;
  console.log(`  narrator: ${a.layout}/${a.position ?? "left"} ${a.gesture ?? "rest"} ${a.expression ?? ""}${(a.beats ?? []).map((b: any) => ` | @${at(s.id, b.at)} ${[b.gesture, b.expression, b.position, b.layout].filter(Boolean).join(" ")}`).join("")}`);
  const v = s.visual;
  if (v.type === "board") {
    const gaps: number[] = [];
    let lastT = sc.start;
    for (const el of v.elements) {
      const t = at(s.id, el.at);
      const m = manifest[`${s.id}.${el.id}`];
      const asset = el.kind === "image" ? (el.src ? ` src ${el.src}` : m?.file ? ` ✓ ${m.source}` : m ? " ✗ no asset" : " (not fetched)") : "";
      console.log(`  ${t.padStart(6)}  ${el.id} ${el.kind}${el.text ? ` "${el.text}"` : ""}${el.icon ? ` ${el.icon}` : ""}${el.query ? ` q:"${el.query}"` : ""}${el.from ? ` ${JSON.stringify(el.from)}→${JSON.stringify(el.to)}` : ""}${el.on ? ` on ${el.on}` : ""}${el.x !== undefined ? ` @(${el.x},${el.y})` : ""}${asset}`);
      const tn = parseFloat(t);
      if (!isNaN(tn)) { gaps.push(tn - lastT); lastT = tn; }
    }
    gaps.push(sc.end - lastT);
    const maxGap = Math.max(...gaps);
    if (maxGap > 3.5) console.log(`  ⚠ ${maxGap.toFixed(1)}s with nothing new on screen`);
  } else {
    const m = manifest[s.id];
    console.log(`  visual: ${v.type} ${v.name ?? ""}${v.query ? ` q:"${v.query}" ${m?.file ? `✓ ${m.source}` : m ? `✗ → ${v.fallback}` : ""}` : ""}`);
  }
}
if (fs.existsSync(ep(slug, "validation.json"))) {
  const val = readJson(ep(slug, "validation.json"));
  console.log(`\nvalidation: ${val.errors.length} errors, ${val.warnings.length} warnings`);
}
