/**
 * Runs the whole media chain for one episode: validate → tts → timing → lipsync → assets → render.
 * Usage:
 *   npm run episode <slug>                 full chain
 *   npm run episode <slug> -- --from=assets   resume from a step
 *   npm run episode <slug> -- --only=tts      one step
 *   npm run episode <slug> -- --no-render     stop before rendering (then preview in Studio)
 *   npm run episode <slug> -- --preview       half-res render
 */
import { ep, requireSlug, readJson } from "./lib/paths.ts";
import { track, type Step } from "./lib/status.ts";
import { validateScene } from "./validate.ts";
import { tts } from "./tts.ts";
import { timing } from "./timing.ts";
import { lipsync } from "./lipsync.ts";
import { fetchAssets } from "./fetch-assets.ts";
import { render } from "./render.ts";
import { writeJson } from "./lib/paths.ts";

const slug = requireSlug();
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const flag = (k: string) => process.argv.includes(`--${k}`);

const chain: [Step, () => Promise<unknown>][] = [
  ["validate", async () => {
    const res = validateScene(readJson(ep(slug, "scene.json")));
    writeJson(ep(slug, "validation.json"), { ...res, at: new Date().toISOString() });
    res.warnings.forEach((w) => console.log(`warn  ${w}`));
    res.errors.forEach((e) => console.log(`error ${e}`));
    if (res.errors.length) throw new Error(`${res.errors.length} validation error(s) — fix scene.json first`);
    console.log(`ok    ${res.stats.scenes} scenes, ${res.stats.words} words, ~${res.stats.seconds}s`);
  }],
  ["tts", () => tts(slug, { force: flag("force-tts") })],
  ["timing", () => timing(slug)],
  ["lipsync", () => lipsync(slug)],
  ["assets", () => fetchAssets(slug)],
  ["render", () => render(slug, { preview: flag("preview") })],
];

const from = arg("from");
const only = arg("only");
let started = !from;
const t0 = Date.now();
for (const [step, fn] of chain) {
  if (from === step) started = true;
  if (!started || (only && only !== step)) continue;
  if (step === "render" && flag("no-render")) break;
  console.log(`\n━━ ${step} ━━`);
  try {
    await track(slug, step, fn);
  } catch (e: any) {
    console.error(`\n✗ ${step} failed: ${e.message}`);
    process.exit(1);
  }
}
console.log(`\n✓ ${slug} finished in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
