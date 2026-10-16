/**
 * Installs the local media tools into tools/ (git-ignored):
 *  - Rhubarb Lip Sync (official GitHub release)
 *  - whisper.cpp model (ggml-base.en) — the whisper-cli binary comes from `brew install whisper-cpp`
 */
import fs from "node:fs";
import path from "node:path";
import { r } from "./lib/paths.ts";
import { run, log } from "./lib/run.ts";
import { rhubarbPath, whisperPath, whisperModel } from "./lib/env.ts";

const RHUBARB_URL =
  "https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.14.0/Rhubarb-Lip-Sync-1.14.0-macOS.zip";
const MODEL_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";

async function rhubarb() {
  if (rhubarbPath()) return log(`Rhubarb ready: ${rhubarbPath()}`);
  const zip = r("tools", "rhubarb.zip");
  log("Downloading Rhubarb Lip Sync 1.14.0…");
  await run("curl", ["-sSL", "--fail", "-o", zip, RHUBARB_URL]);
  const tmp = r("tools", "_rhubarb");
  fs.rmSync(tmp, { recursive: true, force: true });
  await run("unzip", ["-q", zip, "-d", tmp]);
  const inner = fs.readdirSync(tmp).find((d) => d.startsWith("Rhubarb"))!;
  fs.rmSync(r("tools", "rhubarb"), { recursive: true, force: true });
  fs.renameSync(path.join(tmp, inner), r("tools", "rhubarb"));
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(zip, { force: true });
  fs.chmodSync(r("tools", "rhubarb", "rhubarb"), 0o755);
  log(`Rhubarb installed: tools/rhubarb/rhubarb`);
}

async function whisper() {
  if (!whisperPath()) {
    log("whisper-cli not found. Installing with Homebrew…");
    await run("brew", ["install", "whisper-cpp"]);
  }
  const model = whisperModel();
  if (fs.existsSync(model)) return log(`Whisper model ready: ${path.relative(r(), model)}`);
  fs.mkdirSync(path.dirname(model), { recursive: true });
  log("Downloading whisper model ggml-base.en (~148 MB)…");
  await run("curl", ["-sSL", "--fail", "-o", model, MODEL_URL]);
  log("Whisper model installed.");
}

await rhubarb();
await whisper();
log("Tools ready. Run `npm run doctor` to check everything.");
