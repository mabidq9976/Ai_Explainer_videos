/**
 * Renders episodes/<slug>/out/final.mp4 with Remotion. The episode folder is the public dir,
 * so the composition reads scene.json, audio/, mouth.json and assets/ via staticFile().
 * Usage: npm run render <slug> [--preview]   (--preview = half-res draft render, much faster)
 */
import fs from "node:fs";
import path from "node:path";
import { ep, r, requireSlug, isMain } from "./lib/paths.ts";
import { run, log, probeDuration } from "./lib/run.ts";
import { track } from "./lib/status.ts";
import { avatarFile } from "./lib/avatar.ts";

const AUDIO = /\.(mp3|wav|m4a|aac|ogg)$/i;

/** Copy the shared pieces (avatar, rig, music bed, sound effects) into the episode's _render/ folder. */
export async function prepareRender(slug: string) {
  const dir = ep(slug, "_render");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "sfx"), { recursive: true });
  const svg = avatarFile();
  fs.copyFileSync(svg, path.join(dir, "avatar.svg"));
  const rig = path.join(path.dirname(svg), "rig.json");
  fs.writeFileSync(path.join(dir, "rig.json"), fs.existsSync(rig) ? fs.readFileSync(rig) : "{}");

  // Music: the episode's own bed (assets/manual/music.*) wins, else rotate brand/music/* per episode.
  const manual = ep(slug, "assets", "manual");
  const own = fs.existsSync(manual) ? fs.readdirSync(manual).find((f) => /^music\./.test(f) && AUDIO.test(f)) : undefined;
  const brandDir = r("brand", "music");
  const brand = fs.existsSync(brandDir) ? fs.readdirSync(brandDir).filter((f) => AUDIO.test(f)).sort() : [];
  const src = own ? path.join(manual, own) : brand.length ? path.join(brandDir, brand[[...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % brand.length]) : null;
  let music: string | null = null, musicDuration: number | null = null;
  if (src) {
    music = `_render/music${path.extname(src)}`;
    fs.copyFileSync(src, ep(slug, music));
    musicDuration = await probeDuration(src).catch(() => null);
  }

  // Sound effects: brand/sfx/<name>.* (pop, whoosh…), overridable per episode with assets/manual/sfx-<name>.*
  const sfx: Record<string, string> = {};
  const sfxDir = r("brand", "sfx");
  for (const f of fs.existsSync(sfxDir) ? fs.readdirSync(sfxDir).filter((x) => AUDIO.test(x)) : []) {
    fs.copyFileSync(path.join(sfxDir, f), path.join(dir, "sfx", f));
    sfx[f.replace(/\.[^.]+$/, "")] = `_render/sfx/${f}`;
  }
  for (const f of fs.existsSync(manual) ? fs.readdirSync(manual).filter((x) => /^sfx-/.test(x) && AUDIO.test(x)) : []) {
    fs.copyFileSync(path.join(manual, f), path.join(dir, "sfx", f));
    sfx[f.replace(/^sfx-/, "").replace(/\.[^.]+$/, "")] = `_render/sfx/${f}`;
  }
  fs.writeFileSync(path.join(dir, "info.json"), JSON.stringify({ music, musicDuration, sfx, avatarIsPlaceholder: !svg.endsWith("avatar/avatar.svg") }));
}

export async function render(slug: string, opts: { preview?: boolean } = {}) {
  await prepareRender(slug);
  const out = ep(slug, "out", opts.preview ? "preview.mp4" : "final.mp4");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const args = ["render", "studio/src/index.ts", "Episode", out, `--public-dir=${ep(slug)}`, "--log=info"];
  if (opts.preview) args.push("--scale=0.5", "--crf=28");
  log(`Rendering ${path.relative(r(), out)}…`);
  try {
    await run(r("node_modules", ".bin", "remotion"), [...args, "--timeout=60000"]);
  } catch (e: any) {
    // A cold webpack cache or low free memory can stall the first tab; one gentle retry usually clears it.
    if (!/delayRender|timeout/i.test(e.message)) throw e;
    log("Render stalled — retrying once with a single worker…");
    await run(r("node_modules", ".bin", "remotion"), [...args, "--timeout=90000", "--concurrency=1"]);
  }
  const d = await probeDuration(out);
  log(`done: ${path.relative(r(), out)} (${d.toFixed(1)}s)`);
  return { out, duration: d };
}

if (isMain(import.meta.url)) {
  const slug = requireSlug();
  await track(slug, "render", () => render(slug, { preview: process.argv.includes("--preview") })).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
