/** Checks tools, keys and the avatar rig. Usage: npm run doctor  (the dashboard's Setup page uses the same checks) */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { r, isMain } from "./lib/paths.ts";
import { env, rhubarbPath, whisperPath, whisperModel, ffmpegPath } from "./lib/env.ts";
import { inspectAvatar } from "./lib/avatar.ts";

export type Check = { group: string; name: string; ok: boolean; level: "required" | "recommended" | "optional"; detail: string; fix?: string };

const version = (bin: string | null, args: string[]) => {
  if (!bin) return null;
  try {
    return execFileSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).split("\n")[0].trim();
  } catch (e: any) {
    return (String(e.stdout ?? "") + String(e.stderr ?? "")).split("\n").find(Boolean)?.trim() ?? "installed";
  }
};

export function healthCheck(): Check[] {
  const c: Check[] = [];
  const add = (x: Check) => c.push(x);
  const nodeMajor = +process.versions.node.split(".")[0];
  add({ group: "Tools", name: "Node.js", ok: nodeMajor >= 18, level: "required", detail: `v${process.versions.node}` });
  add({ group: "Tools", name: "Remotion", ok: fs.existsSync(r("node_modules", "remotion")), level: "required", detail: fs.existsSync(r("node_modules", "remotion", "package.json")) ? `v${JSON.parse(fs.readFileSync(r("node_modules", "remotion", "package.json"), "utf8")).version}` : "not installed", fix: "npm install" });
  const ff = ffmpegPath();
  add({ group: "Tools", name: "ffmpeg", ok: !!ff, level: "required", detail: ff ? version(ff, ["-version"])!.slice(0, 40) : "missing", fix: "brew install ffmpeg" });
  const rb = rhubarbPath();
  add({ group: "Tools", name: "Rhubarb Lip Sync", ok: !!rb, level: "required", detail: rb ? version(rb, ["--version"]) ?? "" : "missing", fix: "npm run setup:tools" });
  const wh = whisperPath();
  add({ group: "Tools", name: "whisper.cpp", ok: !!wh, level: "required", detail: wh ?? "missing", fix: "npm run setup:tools" });
  add({ group: "Tools", name: "Whisper model", ok: fs.existsSync(whisperModel()), level: "required", detail: fs.existsSync(whisperModel()) ? `${(fs.statSync(whisperModel()).size / 1e6).toFixed(0)} MB` : "missing", fix: "npm run setup:tools" });
  const claude = version("claude", ["--version"]);
  add({ group: "Tools", name: "Claude Code CLI", ok: !!claude && !/not found|ENOENT/i.test(claude), level: "recommended", detail: claude ?? "missing", fix: "Install Claude Code" });

  const key = (k: string, level: Check["level"], why: string) =>
    add({ group: "Keys (.env)", name: k, ok: !!env(k), level, detail: env(k) ? "set" : why, fix: "Add it on the Setup page or in .env" });
  const provider = env("TTS_PROVIDER", "gemini");
  key("GEMINI_API_KEY", provider === "gemini" ? "required" : "optional", provider === "magnific" ? "not needed — voice comes from Magnific" : "empty — needed for Gemini TTS");
  if (provider === "magnific") add({ group: "Keys (.env)", name: "Magnific voice", ok: true, level: "optional", detail: `voice ${env("MAGNIFIC_VOICE_ID", "714")} · ${env("MAGNIFIC_TTS_MODEL", "gemini_v3_1_flash_tts")} · ${env("MAGNIFIC_VOICE_ENERGY", "natural")} · made by Claude via the Magnific MCP (/voice)` });
  if (provider === "gemini") add({ group: "Keys (.env)", name: "GEMINI_VOICE_ID", ok: !!env("GEMINI_VOICE_ID"), level: "required", detail: env("GEMINI_VOICE_ID") ? (env("GEMINI_VOICE_ID").startsWith("voice_") ? "replicated voice" : `prebuilt voice: ${env("GEMINI_VOICE_ID")}`) : "empty" });
  add({ group: "Keys (.env)", name: "TTS_PROVIDER", ok: true, level: "optional", detail: provider });
  key("PEXELS_API_KEY", "recommended", "empty — stock scenes will use fallbacks");
  key("PIXABAY_API_KEY", "recommended", "empty");
  add({ group: "Keys (.env)", name: "Magnific", ok: true, level: "optional", detail: env("MAGNIFIC_API_KEY") ? "API key set (MCP preferred)" : "via the Magnific MCP in Claude — no key needed" });

  const av = inspectAvatar();
  const missing = av.required.filter((g) => !g.ok).map((g) => g.id);
  add({ group: "Avatar", name: "avatar/avatar.svg", ok: !av.isPlaceholder, level: "recommended", detail: av.isPlaceholder ? "not added yet — using the placeholder" : "found", fix: "Export your layered SVG to avatar/avatar.svg" });
  add({ group: "Avatar", name: "Required layers", ok: missing.length === 0, level: "required", detail: missing.length ? `missing: ${missing.join(", ")}` : `all ${av.required.length} present`, fix: "See avatar/README.md for the layer names" });
  const mouthsExtra = av.optional.filter((g) => g.ok && g.id.startsWith("mouth-")).length;
  add({ group: "Avatar", name: "Extra mouths", ok: true, level: "optional", detail: `${mouthsExtra}/3 (G, H, X)` });
  const aliasList = Object.entries(av.aliases).filter(([, p]) => av.poses.includes(p)).map(([g, p]) => `${g}→${p}`);
  add({ group: "Avatar", name: "Gestures", ok: true, level: "optional", detail: [av.poses.length ? `poses: ${av.poses.join(", ")}` : "no pose-* groups", aliasList.length ? `aliases: ${aliasList.join(", ")}` : "", `arm variants: ${av.optional.filter((g) => g.ok && g.id.startsWith("arm-")).length}`].filter(Boolean).join(" · ") });
  const sfx = fs.existsSync(r("brand", "sfx")) ? fs.readdirSync(r("brand", "sfx")).filter((f) => /\.(mp3|wav|m4a)$/.test(f)) : [];
  const music = fs.existsSync(r("brand", "music")) ? fs.readdirSync(r("brand", "music")).filter((f) => /\.(mp3|wav|m4a)$/.test(f)) : [];
  add({ group: "Sound", name: "Music beds", ok: music.length > 0, level: "recommended", detail: music.length ? music.join(", ") : "none — ask /produce to generate one with Magnific", fix: "brand/music/" });
  add({ group: "Sound", name: "UI sound effects", ok: sfx.length > 0, level: "optional", detail: sfx.length ? sfx.join(", ") : "none (pop / whoosh)" });
  return c;
}

if (isMain(import.meta.url)) {
  let bad = 0;
  let group = "";
  for (const x of healthCheck()) {
    if (x.group !== group) console.log(`\n${(group = x.group)}`);
    const mark = x.ok ? "✓" : x.level === "required" ? "✗" : "·";
    if (!x.ok && x.level === "required") bad++;
    console.log(`  ${mark} ${x.name.padEnd(22)} ${x.detail}${!x.ok && x.fix ? `   → ${x.fix}` : ""}`);
  }
  console.log(bad ? `\n${bad} required item(s) missing.` : "\nAll required items present.");
}
