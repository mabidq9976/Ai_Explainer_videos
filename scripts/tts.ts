/**
 * Voice adapter: gemini | elevenlabs | local (macOS `say`).
 * One request per episode (one text block per scene, each with its own style) so voice,
 * volume and room sound stay consistent. Output: episodes/<slug>/audio/voice.wav (24 kHz mono 16-bit).
 * Cached under .cache/tts/<hash>.wav, so a visual-only re-render costs nothing.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ep, r, readJson, requireSlug, isMain, CACHE, writeJson } from "./lib/paths.ts";
import { env } from "./lib/env.ts";
import { run, log, probeDuration } from "./lib/run.ts";
import { applyPronunciations, spokenBlocks, stripTags, type SceneFile } from "./lib/text.ts";
import { track } from "./lib/status.ts";

type Block = { id: string; text: string; style: string };
type Provider = { name: string; voice: string; model: string; synth: (blocks: Block[], outWav: string) => Promise<void> };

const resolveEnvRef = (v?: string) => (v?.startsWith("env:") ? env(v.slice(4)) : v ?? "");

// ---------- Gemini (Interactions API) ----------
function gemini(model: string, voice: string): Provider {
  return {
    name: "gemini",
    model,
    voice,
    async synth(blocks, outWav) {
      const key = env("GEMINI_API_KEY");
      if (!key) throw new Error("GEMINI_API_KEY is empty in .env (or set TTS_PROVIDER=local to test with the macOS voice).");
      const body = {
        model,
        input: [
          {
            type: "user_input",
            content: blocks.map((b) => ({
              type: "text",
              text: b.text,
              annotations: [{ type: "speech_metadata", style: b.style }],
            })),
          },
        ],
        response_format: { type: "audio" },
        generation_config: { speech_config: [{ voice }] },
      };
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Gemini TTS ${res.status}: ${text.slice(0, 600)}`);
      const json = JSON.parse(text);
      const audio: string[] = [];
      for (const step of json.steps ?? []) {
        if (step.type !== "model_output") continue;
        for (const c of step.content ?? []) if (c.type === "audio" && c.data) audio.push(c.data);
      }
      if (!audio.length) throw new Error(`Gemini TTS returned no audio: ${text.slice(0, 400)}`);
      const parts = audio.map((b64) => Buffer.from(b64, "base64"));
      await writeWavParts(parts, outWav);
    },
  };
}

// ---------- ElevenLabs ----------
function elevenlabs(voice: string): Provider {
  return {
    name: "elevenlabs",
    model: "eleven_multilingual_v2",
    voice,
    async synth(blocks, outWav) {
      const key = env("ELEVENLABS_API_KEY");
      if (!key || !voice) throw new Error("ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID missing in .env");
      const text = blocks.map((b) => b.text.replace(/<short pause>/gi, "…").replace(/<[^>]+>/g, "")).join(" ");
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=pcm_24000`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
      });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 400)}`);
      await writeWavParts([Buffer.from(await res.arrayBuffer())], outWav);
    },
  };
}

// ---------- Local (macOS say) — free, for testing the pipeline ----------
function local(voice: string): Provider {
  return {
    name: "local",
    model: "macos-say",
    voice,
    async synth(blocks, outWav) {
      const text = blocks
        .map((b) => b.text.replace(/<short pause>/gi, "[[slnc 350]]").replace(/<breath>/gi, "[[slnc 200]]").replace(/<[^>]+>/g, ""))
        .join(" [[slnc 250]] ");
      const aiff = outWav.replace(/\.wav$/, ".aiff");
      const args = ["-o", aiff];
      if (voice && voice !== "default") args.push("-v", voice);
      await run("say", [...args, text], { quiet: true });
      await run("ffmpeg", ["-y", "-loglevel", "error", "-i", aiff, "-ar", "24000", "-ac", "1", "-sample_fmt", "s16", outWav], { quiet: true });
      fs.rmSync(aiff, { force: true });
    },
  };
}

/** Write WAV (or raw L16 PCM) chunks as one normalized 24 kHz mono 16-bit WAV. */
async function writeWavParts(parts: Buffer[], outWav: string) {
  const tmpDir = path.join(CACHE, "tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const files: string[] = [];
  parts.forEach((buf, i) => {
    const isWav = buf.subarray(0, 4).toString("ascii") === "RIFF";
    const f = path.join(tmpDir, `part-${i}.${isWav ? "wav" : "pcm"}`);
    fs.writeFileSync(f, buf);
    files.push(f);
  });
  const inputs = files.flatMap((f) => (f.endsWith(".pcm") ? ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", f] : ["-i", f]));
  const filter = files.length > 1 ? ["-filter_complex", `${files.map((_, i) => `[${i}:a]`).join("")}concat=n=${files.length}:v=0:a=1[a]`, "-map", "[a]"] : [];
  await run("ffmpeg", ["-y", "-loglevel", "error", ...inputs, ...filter, "-ar", "24000", "-ac", "1", "-sample_fmt", "s16", outWav], { quiet: true });
  files.forEach((f) => fs.rmSync(f, { force: true }));
}

// ---------- Magnific (through the Magnific MCP) ----------
// Scripts can't call MCP tools, so this provider is two-step: the voice step writes audio/tts-request.json
// (exact text + voice + model), Claude generates it with the Magnific MCP (`/voice <slug>`), then
// `npm run tts <slug> -- --import "<url>"` converts and caches it. Cached by hash, so re-renders are free.
export class NeedsClaude extends Error {}

export type Energy = "natural" | "upbeat" | "high";

/** Delivery tags nudged up a notch for `upbeat` (unknown tags pass through). */
const UPBEAT: Record<string, string> = {
  calm: "warm", clear: "upbeat", steady: "upbeat", neutral: "upbeat", "matter of fact": "confident", dry: "playful",
  brisk: "energetic", building: "excited", warm: "warm and upbeat", serious: "confident", curious: "curious",
};

/**
 * ElevenLabs v3 notation: one short [tag] per block from its style; inline tags converted.
 * energy: natural = the scene styles as written · upbeat = each style nudged livelier ·
 * high = enthusiastic throughout, excited on the hook and the last line (which end in "!").
 */
export function magnificText(blocks: Block[], model: string, energy: Energy = "natural") {
  const conv = (t: string) =>
    t.replace(/<short pause>/gi, "...").replace(/<breath>/gi, model.startsWith("gemini") ? "[pause 0.3s]" : "[exhales]").replace(/<laugh>/gi, "[laughs]").replace(/\s+/g, " ").trim();
  return blocks
    .map((b, i) => {
      const first = (b.style ?? "").split(",")[0].trim().split(/\s+/).filter(Boolean);
      let tag = (first.length <= 3 ? first : first.slice(0, 1)).join(" ").toLowerCase(); // "matter of fact" stays whole
      let text = conv(b.text);
      if (energy === "upbeat") tag = UPBEAT[tag] ?? tag;
      if (energy === "high") {
        const edge = i === 0 || i === blocks.length - 1;
        tag = edge ? "excited" : "enthusiastic";
        if (edge) text = text.replace(/\.$/, "!");
      }
      return `${tag ? `[${tag}] ` : ""}${text}`;
    })
    .join("\n\n");
}

/** Voice settings: scene.json `voice` wins, then .env, then defaults. */
export function voiceTuning(scene: SceneFile) {
  const v: any = scene.voice ?? {};
  const num = (x: unknown, d: number) => (x === undefined || x === "" || isNaN(Number(x)) ? d : Number(x));
  const energy = (v.energy ?? env("MAGNIFIC_VOICE_ENERGY", "natural")) as Energy;
  return {
    energy: (["natural", "upbeat", "high"].includes(energy) ? energy : "natural") as Energy,
    stability: Math.min(1, Math.max(0, num(v.stability ?? env("MAGNIFIC_VOICE_STABILITY"), 0.45))),
    speed: Math.min(1.2, Math.max(0.7, num(v.speed ?? env("MAGNIFIC_VOICE_SPEED"), 1))),
  };
}

function magnific(model: string, voice: string): Provider {
  return {
    name: "magnific",
    model,
    voice,
    async synth() {
      throw new NeedsClaude("needs-claude");
    },
  };
}

export function pickProvider(scene: SceneFile): Provider {
  const name = env("TTS_PROVIDER") || scene.voice.provider || "gemini";
  if (name === "magnific") return magnific(env("MAGNIFIC_TTS_MODEL", "eleven_v3"), env("MAGNIFIC_VOICE_ID", "1213"));
  if (name === "local") return local(env("LOCAL_VOICE", "Daniel"));
  if (name === "elevenlabs") return elevenlabs(env("ELEVENLABS_VOICE_ID"));
  const model = env("GEMINI_TTS_MODEL") || scene.voice.model || "gemini-3.8-flash-tts";
  const voice = resolveEnvRef(scene.voice.voiceId) || env("GEMINI_VOICE_ID", "Kore");
  return gemini(model, voice);
}

export async function tts(slug: string, opts: { force?: boolean; importUrl?: string } = {}) {
  const scene = readJson<SceneFile>(ep(slug, "scene.json"));
  const provider = pickProvider(scene);
  const blocks: Block[] = spokenBlocks(scene).map((b) => ({ id: b.id, text: applyPronunciations(b.line), style: b.style }));
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ p: provider.name, m: provider.model, v: provider.voice, blocks, ...(provider.name === "magnific" ? { tune: voiceTuning(scene) } : {}) }))
    .digest("hex")
    .slice(0, 16);
  const cached = path.join(CACHE, "tts", `${hash}.wav`);
  const out = ep(slug, "audio", "voice.wav");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.mkdirSync(path.dirname(cached), { recursive: true });

  const reqFile = ep(slug, "audio", "tts-request.json");
  if (opts.importUrl) {
    // Import a voice Claude generated through the Magnific MCP.
    const req = fs.existsSync(reqFile) ? readJson(reqFile) : null;
    if (!req || req.hash !== hash) throw new Error("The script changed since the voice was requested — run the voice step again so the request matches.");
    const res = await fetch(opts.importUrl);
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
    const tmp = path.join(CACHE, "tmp", `${hash}.src`);
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    await run("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-ar", "24000", "-ac", "1", "-sample_fmt", "s16", cached], { quiet: true });
    fs.rmSync(tmp, { force: true });
    log(`Imported Magnific voice (${hash})`);
  } else if (fs.existsSync(cached) && !opts.force) {
    log(`TTS cache hit (${hash}) — no API call`);
  } else if (provider.name === "magnific") {
    const tune = voiceTuning(scene);
    const text = magnificText(blocks, provider.model, tune.energy);
    writeJson(reqFile, {
      hash,
      provider: "magnific",
      model: provider.model,
      voiceId: Number(provider.voice),
      // Cloned "My Voices" share ids with the catalog, so Magnific needs source=mine for them.
      ...(env("MAGNIFIC_VOICE_SOURCE") === "mine" ? { source: "mine" } : {}),
      // Expressiveness: lower stability = more emotional range; speed 0.7–1.2 (ElevenLabs v3).
      stability: tune.stability,
      ...(tune.speed !== 1 ? { speed: tune.speed } : {}),
      energy: tune.energy,
      text,
      chars: text.length,
      ...(provider.model.startsWith("gemini") ? { systemInstruction: "Friendly, confident explainer narrator for short social videos: clear, warm, a little playful, natural pace." } : {}),
      importWith: `npm run tts ${slug} -- --import "<url>"`,
    });
    throw new NeedsClaude(`Voice needed: audio/tts-request.json is ready. Ask Claude to run /voice ${slug} (Magnific MCP), or /produce ${slug}.`);
  } else {
    log(`TTS: ${provider.name} · ${provider.model} · voice ${provider.voice} · ${blocks.length} blocks`);
    await provider.synth(blocks, cached);
  }
  fs.copyFileSync(cached, out);
  const duration = await probeDuration(out);
  writeJson(ep(slug, "audio", "voice.meta.json"), {
    provider: provider.name,
    model: provider.model,
    voice: provider.voice,
    hash,
    duration,
    // Display text for alignment and Rhubarb (pronunciations not applied, tags stripped).
    blocks: spokenBlocks(scene).map((b) => ({ id: b.id, text: stripTags(b.line) })),
  });
  log(`voice.wav ${duration.toFixed(2)}s`);
}

if (isMain(import.meta.url)) {
  const slug = requireSlug();
  const imp = process.argv.indexOf("--import");
  const importUrl = imp >= 0 ? process.argv[imp + 1] : process.argv.find((a) => a.startsWith("--import="))?.slice(9);
  await track(slug, "tts", () => tts(slug, { force: process.argv.includes("--force"), importUrl })).catch((e) => {
    console.error(e.message);
    process.exit(e instanceof NeedsClaude ? 3 : 1);
  });
}
