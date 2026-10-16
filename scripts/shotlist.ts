/**
 * Shot list — every asset an episode needs, what's already ready, and the cheapest way to get the rest.
 * Writes episodes/<slug>/shotlist.json and prints a compact list (this is what the asset-producer skill reads).
 *
 *   npm run shotlist <slug>
 *
 * Status per item: ready · free (catalog/icon/library/Pexels-Pixabay) · credits (Magnific, estimated) · build (new
 * Remotion component — Claude writes code once, reusable). Budget: EPISODE_CREDIT_BUDGET (default 300).
 */
import fs from "node:fs";
import path from "node:path";
import * as simpleIcons from "simple-icons";
import { ep, r, readJson, readJsonIf, requireSlug, writeJson, LIBRARY } from "./lib/paths.ts";
import { env } from "./lib/env.ts";
import { catalog, type SceneFile } from "./lib/text.ts";

const slug = requireSlug();
const scene = readJson<SceneFile>(ep(slug, "scene.json")) as any;
const manifest = readJsonIf<Record<string, any>>(ep(slug, "assets", "manifest.json")) ?? {};
const index: any[] = readJsonIf(path.join(LIBRARY, "index.json")) ?? [];
const cat = catalog();
const LOGOS = new Set((Object.values(simpleIcons) as any[]).filter((v) => v?.slug).map((v) => v.slug));
const budget = +env("EPISODE_CREDIT_BUDGET", "300");
const hasStockKeys = !!(env("PEXELS_API_KEY") || env("PIXABAY_API_KEY"));

// Magnific credit estimates seen in practice (simulate_cost before anything unusual).
const COST = { photo: 40, video: 600, icon: 40, sfx: 5, music: 80, voicePerSec: 3.6 };

type Item = { key: string; scene: string; kind: string; need: string; status: "ready" | "free" | "credits" | "build"; credits: number; how: string };
const items: Item[] = [];
const toks = (q: string) => [...new Set(q.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2))];
const libHit = (q: string, kind: string) => {
  const qt = toks(q);
  return index.find((e) => e.kind === kind && fs.existsSync(path.join(LIBRARY, e.file)) && (() => {
    const A = new Set(qt), B = new Set(e.tokens ?? toks(e.query ?? ""));
    const inter = [...A].filter((x) => B.has(x)).length;
    return inter / (new Set([...A, ...B]).size || 1) >= 0.5;
  })());
};

function media(key: string, sceneId: string, q: { query?: string; url?: string; src?: string; media?: string; kind?: string }) {
  const kind = q.media === "video" || q.kind === "video" ? "video" : "photo";
  const need = q.query ?? q.url ?? q.src ?? "";
  if (q.src && fs.existsSync(ep(slug, q.src))) return items.push({ key, scene: sceneId, kind, need, status: "ready", credits: 0, how: q.src });
  if (manifest[key]?.file) return items.push({ key, scene: sceneId, kind, need, status: "ready", credits: 0, how: `${manifest[key].source} (fetched)` });
  if (q.url) return items.push({ key, scene: sceneId, kind, need, status: "free", credits: 0, how: "npm run assets (downloads the url)" });
  const hit = q.query ? libHit(q.query, kind) : null;
  if (hit) return items.push({ key, scene: sceneId, kind, need, status: "free", credits: 0, how: `library: ${hit.file} — npm run assets` });
  if (hasStockKeys) return items.push({ key, scene: sceneId, kind, need, status: "free", credits: 0, how: "Pexels/Pixabay — npm run assets" });
  items.push({ key, scene: sceneId, kind, need, status: "credits", credits: kind === "video" ? COST.video : COST.photo, how: `Magnific stock_search ${kind}${kind === "video" ? " (premium ~600 — prefer a photo or a component)" : " (free license)"}` });
}

function component(key: string, sceneId: string, name: string, type: string) {
  if (cat[name]) items.push({ key, scene: sceneId, kind: type === "three" ? "3D" : "motion", need: name, status: "ready", credits: 0, how: "catalog" });
  else items.push({ key, scene: sceneId, kind: type === "three" ? "3D" : "motion", need: name, status: "build", credits: 0, how: `/component-builder ${name} — or use the closest catalog component` });
}

function icon(key: string, sceneId: string, spec: string) {
  const [k, v] = spec.split(/:(.*)/s);
  if (k === "logo" && !LOGOS.has(v)) items.push({ key, scene: sceneId, kind: "icon", need: spec, status: "credits", credits: COST.icon, how: "no simple-icons logo — use line:/emoji: (free) or Magnific icon search (hand-drawn)" });
}

const walkProps = (o: any, sceneId: string, p: string) => {
  if (!o || typeof o !== "object") return;
  if (typeof o.query === "string" && p) media(`${sceneId}.${p}`, sceneId, o);
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string" && /^(icon|header|side)$/.test(k)) icon(`${sceneId}.${p ? p + "." : ""}${k}`, sceneId, v);
    else if (v && typeof v === "object") walkProps(v, sceneId, p ? `${p}.${k}` : k);
  }
};

const walkIcons = (o: any, sceneId: string) => {
  if (!o || typeof o !== "object") return;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string" && /^(icon|header|side)$/.test(k)) icon(`${sceneId}.${k}`, sceneId, v);
    else if (v && typeof v === "object") walkIcons(v, sceneId);
  }
};

for (const sc of scene.scenes) {
  const v = sc.visual;
  if (v.type === "board") {
    for (const el of v.elements) {
      if (el.kind === "image") media(`${sc.id}.${el.id}`, sc.id, el);
      if (el.icon) icon(`${sc.id}.${el.id}`, sc.id, el.icon);
      if (el.kind === "component" && el.name) component(`${sc.id}.${el.id}`, sc.id, el.name, cat[el.name]?.type ?? "component");
    }
  } else if (v.type === "stock") media(sc.id, sc.id, v);
  else {
    component(sc.id, sc.id, v.name, v.type);
    // Only these graphics take a photo/clip via `query` (elsewhere `query` is just text, e.g. a search bar).
    if (v.name === "DeviceFrame" && v.props?.query) media(`${sc.id}.media`, sc.id, v.props);
    if (v.name === "Diagram" || v.name === "ProfileList") walkProps(v.props, sc.id, "");
    else walkIcons(v.props, sc.id);
  }
}
component("cta", "cta", scene.cta.visual, "component");

// Sound: what the cues will ask for vs. what's in brand/sfx and brand/music.
const sfxDir = r("brand", "sfx");
const have = new Set(fs.existsSync(sfxDir) ? fs.readdirSync(sfxDir).map((f) => f.replace(/\.[^.]+$/, "")) : []);
const wanted = new Set(["whoosh", "pop"]);
for (const sc of scene.scenes) {
  for (const c of sc.sfx ?? []) if (c.kind !== "hush") wanted.add(c.kind);
  if (sc.visual.name === "Checklist") wanted.add("ding");
  if (sc.visual.name === "SerpVsAiAnswer") wanted.add("typing");
}
if (scene.sound?.sfx !== false) for (const k of wanted) items.push({ key: `sfx.${k}`, scene: "-", kind: "sfx", need: k, status: have.has(k) ? "ready" : "credits", credits: have.has(k) ? 0 : COST.sfx, how: have.has(k) ? `brand/sfx/${k}` : `Magnific audio_sfx_generate (1 s) → npm run save -- brand sfx/${k}` });
const musicDir = r("brand", "music");
const hasMusic = (fs.existsSync(musicDir) && fs.readdirSync(musicDir).some((f) => /\.(mp3|wav|m4a)$/.test(f))) || (fs.existsSync(ep(slug, "assets", "manual")) && fs.readdirSync(ep(slug, "assets", "manual")).some((f) => /^music\./.test(f)));
if (scene.sound?.music !== false) items.push({ key: "music", scene: "-", kind: "music", need: "music bed", status: hasMusic ? "ready" : "credits", credits: hasMusic ? 0 : COST.music, how: hasMusic ? "brand/music (rotates)" : "Magnific audio_music_generate (Lyria 3, 30 s)" });

// Voice.
const voice = fs.existsSync(ep(slug, "audio", "voice.wav"));
const words = scene.scenes.reduce((n: number, s: any) => n + s.line.split(/\s+/).length, scene.cta.line.split(/\s+/).length);
items.push({ key: "voice", scene: "-", kind: "voice", need: `${words} words`, status: voice ? "ready" : "credits", credits: voice ? 0 : Math.round((words / 2.5) * COST.voicePerSec), how: voice ? "audio/voice.wav (re-check: npm run tts — cache hit = free)" : "/voice (Magnific TTS)" });

// Report.
const spend = items.reduce((n, i) => n + i.credits, 0);
const by = (s: Item["status"]) => items.filter((i) => i.status === s);
writeJson(ep(slug, "shotlist.json"), { at: new Date().toISOString(), budget, estimatedCredits: spend, items });
console.log(`${slug} · ${items.length} assets · ready ${by("ready").length} · free ${by("free").length} · paid ${by("credits").length} (~${spend} credits) · to build ${by("build").length} · budget ${budget}`);
for (const s of ["build", "credits", "free"] as const) for (const i of by(s)) console.log(`  ${s === "build" ? "🛠" : s === "credits" ? "💳" : "🆓"} ${i.key.padEnd(16)} ${i.kind.padEnd(6)} ${i.need.slice(0, 50).padEnd(50)} → ${i.how}${i.credits ? ` (~${i.credits})` : ""}`);
if (spend > budget) console.log(`\n⚠ over budget (${spend} > ${budget}): swap paid items for catalog components, logos/icons or library hits first.`);
if (!by("credits").length && !by("build").length && !by("free").length) console.log("  ✓ everything is ready — assemble: npm run render " + slug);
