/**
 * Sync check — does every visual land on the word that names it?
 * For each board element, fact tag and word-cued item inside a graphic (checklist items, diagram nodes,
 * profile items), find where its label is spoken and compare with when it appears.
 *
 *   npm run sync <slug>            report (✓ in sync · ⚠ early/late/unanchored) + a sync score
 *   npm run sync <slug> -- --fix   anchor every flagged item to its spoken word (writes scene.json)
 *
 * Zero Claude tokens for the mechanical part; the /sync skill handles the judgement calls.
 */
import { ep, readJson, readJsonIf, requireSlug, writeJson } from "./lib/paths.ts";
import { normWord, words as splitWords, type SceneFile } from "./lib/text.ts";

const slug = requireSlug();
const FIX = process.argv.includes("--fix");
const TOL = 0.35; // seconds a visual may lead/lag its word and still count as in sync
const LEAD = 0.1; // the renderer lands visuals ~3 frames before the word on purpose

const file = ep(slug, "scene.json");
const scene = readJson<SceneFile>(file) as any;
const timing = readJsonIf(ep(slug, "audio", "timing.json"));
if (!timing) console.log("(no voice yet — using 150 wpm estimates; re-run after the voice step for real sync)\n");

type W = { text: string; start: number; scene: string };
const words: W[] = timing?.words ?? (() => {
  const out: W[] = []; let t = 0;
  for (const b of [...scene.scenes, { id: "cta", line: scene.cta.line }]) for (const w of splitWords(b.line)) { out.push({ text: w, start: t, scene: b.id }); t += 0.4; }
  return out;
})();
const sceneStart = (id: string) => (timing?.scenes?.find((s: any) => s.id === id)?.start ?? words.find((w) => w.scene === id)?.start ?? 0);

const STOP = new Set("a an the to of and or in on at for by with your you our my is are be it this that these those how what why when where who from as into up down out not no".split(" "));
const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const asWord = (t: string) => (/^\d+$/.test(t) && +t < NUM.length ? NUM[+t] : t);
const toks = (s: string) => s.split(/[\s/·+\-–—:.)(]+/).map((x) => asWord(normWord(x))).filter((t) => t.length > 1 && !STOP.has(t));
/** Same word, or the same stem ("mentioned" ~ "mentions", "question" ~ "questions"). */
const same = (a: string, b: string) => {
  a = asWord(a); b = asWord(b);
  if (a === b) return true;
  let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++;
  return k >= 5 && k >= Math.min(a.length, b.length) * 0.7;
};

/** Where (and with which word) a label is first spoken in this scene — the earliest of any of its words. */
function spoken(label: string, sceneId: string) {
  const ws = words.filter((w) => w.scene === sceneId);
  const lt = toks(label);
  // Where most of the label's words are spoken together (within 2 s) — "Step one, answer first", not "the last one".
  let best: W | null = null, bestScore = 0;
  ws.forEach((w, i) => {
    if (!lt.some((t) => same(normWord(w.text), t))) return;
    const near = ws.slice(i).filter((x) => x.start - w.start <= 2);
    const score = lt.filter((t) => near.some((x) => same(normWord(x.text), t))).length;
    if (score > bestScore) { best = w; bestScore = score; }
  });
  const hit = best as W | null;
  return hit ? { word: hit.text.replace(/[^\w'’-]/g, ""), time: hit.start, tokens: lt } : null;
}
/** When an `at` value fires (seconds, absolute). */
function fires(at: unknown, sceneId: string, fallback: number) {
  if (at === undefined || at === "start") return { time: fallback, anchored: false };
  if (typeof at === "number") return { time: sceneStart(sceneId) + at, anchored: true };
  const ws = words.filter((w) => w.scene === sceneId);
  const t = String(at).split(/\s+/).map(normWord);
  let i = ws.findIndex((_, k) => t.every((x, j) => ws[k + j] && normWord(ws[k + j].text) === x));
  if (i < 0) i = ws.findIndex((_, k) => t.every((x, j) => ws[k + j] && normWord(ws[k + j].text).startsWith(x)));
  return { time: i >= 0 ? ws[i].start : fallback, anchored: i >= 0 };
}

let total = 0, inSync = 0, fixed = 0;
const lines: string[] = [];
function check(where: string, label: string, at: unknown, sceneId: string, fallback: number, setAt: (word: string) => void) {
  const s = spoken(label, sceneId);
  if (!s) return; // illustrative visual — its label isn't spoken; nothing to sync to
  total++;
  const f = fires(at, sceneId, fallback);
  const delta = f.time - (s.time - LEAD);
  // In sync if it fires on (about) the first spoken word of its label, or is anchored to any word of its own label.
  const onOwnWord = typeof at === "string" && toks(at).some((t) => s.tokens.some((x) => same(t, x)));
  const ok = (f.anchored && onOwnWord) || Math.abs(delta) <= TOL;
  if (ok) { inSync++; return; }
  const why = !f.anchored ? "not anchored" : delta < 0 ? `${(-delta).toFixed(1)}s early` : `${delta.toFixed(1)}s late`;
  lines.push(`  ⚠ ${where} "${label}" — ${why}; "${s.word}" is spoken at ${s.time.toFixed(2)}s${FIX ? ` → anchored to "${s.word}"` : ""}`);
  if (FIX) { setAt(s.word); fixed++; inSync++; }
}

for (const sc of scene.scenes) {
  const start = sceneStart(sc.id);
  const v = sc.visual;
  if (v.type === "board") {
    v.elements.forEach((el: any, k: number) => {
      const label = el.text ?? el.label ?? (el.icon?.startsWith("logo:") ? el.icon.slice(5) : undefined) ?? el.query;
      if (label && el.kind !== "arrow") check(`${sc.id}.${el.id}`, label, el.at, sc.id, start + k * 0.13, (w) => (el.at = w));
      // An arrow should arrive with the element it points to.
      if (el.kind === "arrow" && typeof el.to === "string") {
        const target = v.elements.find((x: any) => x.id === el.to);
        if (target?.at !== undefined && el.at !== target.at) {
          total++;
          lines.push(`  ⚠ ${sc.id}.${el.id} arrow fires at a different moment than "${el.to}"${FIX ? " → matched" : ""}`);
          if (FIX) { el.at = target.at; fixed++; inSync++; }
        } else if (target) { total++; inSync++; }
      }
    });
  }
  if ((v.type === "component" || v.type === "three") && v.props) {
    const p = v.props;
    if (Array.isArray(p.items)) p.items.forEach((it: any, i: number) => {
      const text = typeof it === "string" ? it : it.text ?? it.title;
      if (!text) return;
      check(`${sc.id} ${v.name} item ${i + 1}`, text, typeof it === "object" ? it.at : undefined, sc.id, start + 0.2 + i * 0.4, (w) => {
        p.items[i] = typeof it === "string" ? { text: it, at: w } : { ...it, at: w };
      });
    });
    if (Array.isArray(p.nodes)) p.nodes.forEach((n: any, i: number) => n.label && check(`${sc.id} ${v.name} node ${i + 1}`, n.label, n.at, sc.id, start + 0.5 + i * 0.55, (w) => (n.at = w)));
    if (v.name === "SerpVsAiAnswer" && p.answer) check(`${sc.id} AI answer`, p.answer, p.cardAt, sc.id, start + 1, (w) => (p.cardAt = w));
  }
  if (sc.tag?.text) check(`${sc.id} tag`, sc.tag.text, sc.tag.at, sc.id, start, (w) => (sc.tag.at = w));
}

const score = total ? Math.round((inSync / total) * 100) : 100;
console.log(`${slug} · sync ${score}% (${inSync}/${total} visuals land on their word)${timing ? "" : " · estimated timing"}`);
if (lines.length) console.log(lines.join("\n"));
else console.log("  ✓ every named visual lands on its word");
if (FIX && fixed) {
  writeJson(file, scene);
  console.log(`\nfixed ${fixed} — re-render to see it (npm run render ${slug}).`);
} else if (lines.length) console.log(`\nrun: npm run sync ${slug} -- --fix   (anchors the flagged items to their words)`);
