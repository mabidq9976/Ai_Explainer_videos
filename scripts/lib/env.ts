import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { ROOT } from "./paths.ts";

dotenv.config({ path: path.join(ROOT, ".env"), quiet: true });

export const env = (key: string, fallback = ""): string => (process.env[key] ?? "").trim() || fallback;

/** Resolve a tool binary: explicit env path, then tools/ folder, then PATH. */
export function toolPath(envKey: string, localCandidates: string[], pathNames: string[]): string | null {
  const explicit = env(envKey);
  if (explicit) return path.isAbsolute(explicit) ? explicit : path.join(ROOT, explicit);
  for (const c of localCandidates) {
    const p = path.join(ROOT, c);
    if (fs.existsSync(p)) return p;
  }
  for (const dir of (process.env.PATH ?? "").split(":").concat(["/opt/homebrew/bin", "/usr/local/bin"])) {
    for (const name of pathNames) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

export const rhubarbPath = () =>
  toolPath("RHUBARB_PATH", ["tools/rhubarb/rhubarb", "tools/Rhubarb-Lip-Sync-1.14.0-macOS/rhubarb"], ["rhubarb"]);
export const whisperPath = () => toolPath("WHISPER_PATH", ["tools/whisper/whisper-cli"], ["whisper-cli", "whisper-cpp"]);
export const whisperModel = () => {
  const m = env("WHISPER_MODEL", "tools/whisper/ggml-base.en.bin");
  return path.isAbsolute(m) ? m : path.join(ROOT, m);
};
export const ffmpegPath = () => toolPath("FFMPEG_PATH", [], ["ffmpeg"]);
