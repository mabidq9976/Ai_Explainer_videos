/**
 * Rejects a scene.json before any money or time is spent on it.
 * Usage: npm run validate <slug>   (exit 1 on errors; prints one line per problem)
 */
import fs from "node:fs";
import { Ajv } from "ajv";
import { r, ep, readJson, requireSlug, writeJson, isMain } from "./lib/paths.ts";
import { TAG_RE, ALLOWED_TAGS, words, catalog, type SceneFile } from "./lib/text.ts";
import { track } from "./lib/status.ts";
import { inspectAvatar } from "./lib/avatar.ts";
import * as simpleIcons from "simple-icons";

const LOGOS = new Set((Object.values(simpleIcons) as any[]).filter((v) => v?.slug).map((v) => v.slug));

const WPM = 150;
const MAX_WORDS_PER_LINE = 20;
const MAX_STYLE_WORDS = 8;
const MAX_VISUAL_SECONDS = 3;

export function validateScene(data: unknown): { errors: string[]; warnings: string[]; stats: Record<string, number> } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ajv = new Ajv({ allErrors: true, strict: false });
  const check = ajv.compile(readJson(r("schema", "scene.schema.json")));
  if (!check(data)) {
    for (const e of check.errors ?? []) {
      if (e.keyword === "oneOf" || e.keyword === "const") continue; // noisy duplicates of the real error
      errors.push(`schema ${e.instancePath || "/"} ${e.message}${e.params && "allowedValues" in e.params ? `: ${(e.params as any).allowedValues.join(", ")}` : ""}`);
    }
    if (errors.length === 0) errors.push("schema: a visual does not match component | three | stock (check type and required fields)");
    return { errors, warnings, stats: {} };
  }
  const s = data as SceneFile;
  const cat = catalog();
  const blocks = [...s.scenes.map((x) => ({ id: x.id, line: x.line, style: x.style })), { id: "cta", line: s.cta.line, style: s.cta.style ?? "" }];

  // Lines: word caps, tags, no stage directions.
  let totalWords = 0;
  for (const b of blocks) {
    const n = words(b.line).length;
    totalWords += n;
    if (n > MAX_WORDS_PER_LINE) errors.push(`${b.id}: line has ${n} words (max ${MAX_WORDS_PER_LINE}). Split the scene.`);
    const bad = [...b.line.matchAll(/<([^>]+)>/g)].map((m) => m[1]).filter((t) => !ALLOWED_TAGS.includes(t.toLowerCase()));
    if (bad.length) errors.push(`${b.id}: unknown inline tag(s) <${bad.join(">, <")}>. Allowed: ${ALLOWED_TAGS.map((t) => `<${t}>`).join(" ")}`);
    if (/[\[(*]|\b(say|says|pause here|whisper(ing)?|laughing|excitedly|cheerfully)\b:?/i.test(b.line.replace(TAG_RE, "")))
      errors.push(`${b.id}: line looks like it contains a delivery direction. Directions go in "style" — TTS reads lines verbatim.`);
    if (b.style && b.style.split(/\s+/).filter(Boolean).length > MAX_STYLE_WORDS)
      errors.push(`${b.id}: style "${b.style}" is over ${MAX_STYLE_WORDS} words.`);
  }

  // Length budget.
  const estSeconds = (totalWords / WPM) * 60;
  if (s.length) {
    const budget = Math.round((s.length / 60) * WPM);
    if (totalWords > budget * 1.1) errors.push(`script is ${totalWords} words; target ${s.length}s fits about ${budget} at ${WPM} wpm.`);
    else if (totalWords < budget * 0.6) warnings.push(`script is ${totalWords} words; target ${s.length}s fits about ${budget}. It will run short.`);
  }

  // Visuals: catalog names, fallbacks, cadence, variety.
  for (const sc of s.scenes) {
    const v = sc.visual;
    if (v.type === "component" || v.type === "three") {
      if (!cat[v.name]) errors.push(`${sc.id}: ${v.type} "${v.name}" is not in the component catalog.`);
      else if (cat[v.name].type !== v.type) errors.push(`${sc.id}: "${v.name}" is a ${cat[v.name].type}, not a ${v.type}.`);
    }
    if (v.type === "stock" && !cat[v.fallback]) errors.push(`${sc.id}: stock fallback "${v.fallback}" is not in the catalog.`);
    const secs = (words(sc.line).length / WPM) * 60;
    const boardBeats = v.type === "board" ? v.elements.filter((e: any) => e.kind !== "arrow" && e.kind !== "badge").length : 1;
    // Self-animating graphics (components, 3D) can hold a little longer than a still image.
    const limit = v.type === "stock" ? MAX_VISUAL_SECONDS : v.type === "board" ? MAX_VISUAL_SECONDS : MAX_VISUAL_SECONDS + 1;
    if (secs / Math.max(1, boardBeats) > limit + 0.5) warnings.push(`${sc.id}: ~${secs.toFixed(1)}s on one visual (aim for a change every ${limit}s).`);
    for (const e of sc.emphasis ?? []) if (!sc.line.toLowerCase().includes(e.toLowerCase())) errors.push(`${sc.id}: emphasis "${e}" is not in the line.`);
    for (const e of (sc as any).pop ?? []) if (!sc.line.toLowerCase().includes(e.toLowerCase())) errors.push(`${sc.id}: pop "${e}" is not in the line.`);
    if ((sc as any).pop?.length > 2) warnings.push(`${sc.id}: ${(sc as any).pop.length} pop words — 1–2 per scene keeps them special.`);
  }
  const specs: string[] = [];
  // Boards: unique ids, anchors that exist in the line, arrow/badge targets, a clear narrator area.
  const nw = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  const anchorOk = (at: unknown, line: string) => {
    if (at === undefined || typeof at === "number" || at === "start" || at === "end") return true;
    const lw = words(line).map(nw), t = String(at).split(/\s+/).map(nw).filter(Boolean);
    return lw.some((_, i) => t.every((x, k) => lw[i + k] && (lw[i + k] === x || lw[i + k].startsWith(x))));
  };
  let boardIds = new Set<string>();
  s.scenes.forEach((sc, idx) => {
    for (const b of sc.avatar.beats ?? []) if (!anchorOk(b.at, sc.line)) errors.push(`${sc.id}: beat at "${b.at}" — that word isn't in the line.`);
    for (const w of (sc as any).punch ?? []) if (!anchorOk(w, sc.line)) errors.push(`${sc.id}: punch "${w}" — that word isn't in the line.`);
    for (const c of (sc as any).sfx ?? []) if (!anchorOk(c.at, sc.line)) errors.push(`${sc.id}: sfx ${c.kind} at "${c.at}" — that word isn't in the line.`);
    const v = sc.visual as any;
    if (v.type !== "board") { boardIds = new Set(); return; }
    if (v.continue && (idx === 0 || (s.scenes[idx - 1].visual as any).type !== "board")) errors.push(`${sc.id}: "continue" needs the previous scene to be a board.`);
    if (!v.continue) boardIds = new Set();
    const local = new Set<string>();
    for (const el of v.elements) {
      if (local.has(el.id) || (v.continue && boardIds.has(el.id))) errors.push(`${sc.id}: duplicate element id "${el.id}".`);
      local.add(el.id);
      if (!anchorOk(el.at, sc.line)) errors.push(`${sc.id}.${el.id}: at "${el.at}" — that word isn't in the line.`);
      if (el.until !== undefined && !anchorOk(el.until, sc.line)) errors.push(`${sc.id}.${el.id}: until "${el.until}" — that word isn't in the line.`);
      if (el.kind === "text" && !el.text) errors.push(`${sc.id}.${el.id}: text element needs "text".`);
      if (el.kind === "icon" && !el.icon) errors.push(`${sc.id}.${el.id}: icon element needs "icon".`);
      if (el.kind === "image" && !el.query && !el.url && !el.src && !el.icon) errors.push(`${sc.id}.${el.id}: image needs "query", "url" or "src".`);
      if (el.kind === "component") {
        if (!cat[el.name]) errors.push(`${sc.id}.${el.id}: component "${el.name}" is not in the catalog.`);
        else if (cat[el.name].type === "three" && (s as any).look === "reference") warnings.push(`${sc.id}.${el.id}: 3D in a "reference" look episode.`);
      }
      if (el.icon) specs.push(el.icon);
      const narratorY = sc.avatar.layout === "corner" ? 63 : sc.avatar.layout === "full" ? 46 : 101;
      if (el.kind !== "arrow" && el.kind !== "badge" && (el.y ?? 30) > narratorY && sc.avatar.layout !== "hidden")
        warnings.push(`${sc.id}.${el.id}: y=${el.y} sits in the narrator's area — fine if placed beside it on purpose.`);
    }
    for (const el of v.elements) {
      const known = (ref: unknown) => Array.isArray(ref) || local.has(String(ref)) || boardIds.has(String(ref));
      if (el.kind === "arrow" && (!el.from || !el.to || !known(el.from) || !known(el.to))) errors.push(`${sc.id}.${el.id}: arrow needs "from" and "to" (element ids on this board, or [x, y]).`);
      if (el.kind === "badge" && (!el.on || !known(el.on))) errors.push(`${sc.id}.${el.id}: badge needs "on": an element id.`);
    }
    local.forEach((id) => boardIds.add(id));
  });

  // Variety: the same component three scenes running is an error; the same type is only a warning,
  // because the reference style is mostly motion graphics.
  const visualKey = (v: any) => (v.type === "stock" ? `stock` : v.type === "board" ? `board:${v.continue ? "c" : ""}${Math.random()}` : `${v.type}:${v.name}`);
  for (let i = 2; i < s.scenes.length; i++) {
    const k = [i - 2, i - 1, i].map((x) => visualKey(s.scenes[x].visual));
    const t = [i - 2, i - 1, i].map((x) => s.scenes[x].visual.type);
    if (k[0] === k[1] && k[1] === k[2]) errors.push(`${s.scenes[i].id}: "${k[0]}" repeats three scenes in a row.`);
    else if (t[0] === t[1] && t[1] === t[2] && !["component", "board"].includes(t[0])) warnings.push(`${s.scenes[i].id}: visual type "${t[0]}" repeats three scenes in a row.`);
  }
  // Icon specs: unknown logo slugs render as a letter tile — flag them.
  const collect = (o: any) => {
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string" && /^(icon|header|side)$/.test(k)) specs.push(v);
      else if (v && typeof v === "object") collect(v);
    }
  };
  s.scenes.forEach((sc) => collect((sc.visual as any).props));
  for (const spec of specs) {
    const [kind, val] = spec.split(/:(.*)/s);
    if (kind === "logo" && !LOGOS.has(val)) warnings.push(`icon "${spec}": no such simple-icons logo (try line:robot, emoji:🤖 or a query photo).`);
    if (!["logo", "emoji", "line", "text"].includes(kind) && !spec.startsWith("assets/")) errors.push(`icon "${spec}": use logo:<slug> | emoji:<char> | line:<name> | text:<words> | assets/<file>.`);
  }
  // Gestures the avatar can't show fall back to rest — warn so it's a choice, not a surprise.
  const av = inspectAvatar();
  const drawn = new Set([...av.required, ...av.optional].filter((g) => g.ok).map((g) => g.id).concat(av.poses.map((p) => `pose-${p}`)));
  for (const sc of s.scenes) {
    const g = sc.avatar.gesture;
    if (!g || g === "rest") continue;
    const alias = av.aliases[g];
    if (alias && drawn.has(`pose-${alias}`)) continue;
    if (!drawn.has(`pose-${g}`) && !drawn.has(`arm-left-${g}`) && !drawn.has(`arm-right-${g}`) && !(g === "wave" && (drawn.has("arm-right-open-palm") || drawn.has("arm-left-open-palm"))))
      warnings.push(`${sc.id}: avatar has no "${g}" gesture or pose-${g} — it will show rest.`);
  }

  // Caption design (see the caption-designer skill).
  const cap: any = (s as any).captions;
  if (cap && typeof cap === "object") {
    const tw = cap.title?.text ? cap.title.text.split(/\s+/).length : 0;
    if (tw > 7) warnings.push(`caption title is ${tw} words — 3–7 reads at a glance.`);
    if (cap.title?.until && typeof cap.title.until === "string" && !s.scenes.some((x) => x.id === cap.title.until)) errors.push(`captions.title.until "${cap.title.until}" is not a scene id.`);
    if (cap.title?.text) {
      // The headline covers roughly the top 20% while it's up: board items there will be hidden.
      const until = typeof cap.title.until === "string" ? s.scenes.findIndex((x) => x.id === cap.title.until) : 0;
      s.scenes.slice(0, Math.max(0, until) + 1).forEach((sc) => {
        const v: any = sc.visual;
        if (v.type === "board") for (const el of v.elements) if (el.kind !== "arrow" && (el.y ?? 30) < 24) warnings.push(`${sc.id}.${el.id}: y=${el.y} sits under the caption headline — move it below y≈24 while the title is up.`);
      });
    }
  }
  const tagged = s.scenes.filter((x: any) => x.tag || x.pop?.length);
  if (tagged.length > Math.max(3, Math.ceil(s.scenes.length / 2))) warnings.push(`${tagged.length} scenes with fact tags — keep them for real facts/numbers (about one every other scene at most).`);
  for (const sc of s.scenes as any[]) {
    if (sc.tag?.text && sc.tag.text.split(/\s+/).length > 6) warnings.push(`${sc.id}: tag "${sc.tag.text}" — keep tags to 2–6 words.`);
    if (sc.tag?.at !== undefined && !anchorOk(sc.tag.at, sc.line)) errors.push(`${sc.id}: tag at "${sc.tag.at}" — that word isn't in the line.`);
  }

  // Engagement cues: keep them special.
  const punches = s.scenes.reduce((n, x) => n + ((x as any).punch?.length ?? 0), 0);
  if (punches > Math.max(3, Math.round(s.scenes.length / 2))) warnings.push(`${punches} camera punches — more than ~1 every other scene stops feeling like emphasis.`);
  const hushes = s.scenes.reduce((n, x) => n + ((x as any).sfx ?? []).filter((c: any) => c.kind === "hush").length, 0);
  if (hushes > 2) warnings.push(`${hushes} music hushes — keep it to 1–2 per video (the payoff, maybe the hook).`);
  const risers = s.scenes.reduce((n, x) => n + ((x as any).sfx ?? []).filter((c: any) => c.kind === "riser").length, 0);
  if (risers > 2) warnings.push(`${risers} risers — 1–2 per video, before the payoff.`);

  const threeCount = s.scenes.filter((x) => x.visual.type === "three").length;
  if (threeCount > 1) warnings.push(`${threeCount} 3D scenes — keep to one per video, 3D is the slowest part of a render.`);
  if (!cat[s.cta.visual]) errors.push(`cta: visual "${s.cta.visual}" is not in the catalog.`);

  // Structure.
  const norm = (x: string) => words(x).join(" ").toLowerCase();
  if (norm(s.scenes[0].line) !== norm(s.hook.text)) errors.push(`s1: the first scene's line must be the hook text.`);
  const ids = s.scenes.map((x) => x.id);
  if (new Set(ids).size !== ids.length) errors.push(`scene ids must be unique.`);

  return { errors, warnings, stats: { words: totalWords, seconds: Math.round(estSeconds), scenes: s.scenes.length } };
}

if (isMain(import.meta.url)) {
  const slug = requireSlug();
  const file = ep(slug, "scene.json");
  await track(slug, "validate", async () => {
    if (!fs.existsSync(file)) throw new Error(`episodes/${slug}/scene.json does not exist yet — run /draft ${slug} first.`);
    let data: unknown;
    try {
      data = readJson(file);
    } catch (e: any) {
      throw new Error(`scene.json is not valid JSON: ${e.message}`);
    }
    const res = validateScene(data);
    writeJson(ep(slug, "validation.json"), { ...res, at: new Date().toISOString() });
    for (const w of res.warnings) console.log(`warn  ${w}`);
    for (const e of res.errors) console.log(`error ${e}`);
    if (res.errors.length) throw new Error(`${res.errors.length} error(s) in scene.json`);
    console.log(`ok    ${slug}: ${res.stats.scenes} scenes, ${res.stats.words} words, ~${res.stats.seconds}s`);
  }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
