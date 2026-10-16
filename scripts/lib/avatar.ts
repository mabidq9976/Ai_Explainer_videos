import fs from "node:fs";
import { r } from "./paths.ts";

/** Your avatar if present, otherwise the placeholder so the pipeline still runs. */
export const avatarFile = () => (fs.existsSync(r("avatar", "avatar.svg")) ? r("avatar", "avatar.svg") : r("avatar", "placeholder", "avatar.svg"));

export const REQUIRED_GROUPS = [
  "body", "head", "eyes-open", "eyes-closed",
  "brows-neutral", "brows-raised", "brows-frown",
  "mouth-A", "mouth-B", "mouth-C", "mouth-D", "mouth-E", "mouth-F",
  "arm-left-rest", "arm-right-rest",
];
export const OPTIONAL_GROUPS = [
  "mouth-G", "mouth-H", "mouth-X",
  ...["point-right", "open-palm", "count", "thumbs-up", "wave"].flatMap((g) => [`arm-left-${g}`, `arm-right-${g}`]),
];

/** Normalize editor-mangled ids (Illustrator "mouth-A_1_", Figma "mouth-A-2") back to rig names. */
export const rigName = (id: string) => id.replace(/_\d+_$/, "").replace(/(-|_)\d+$/, "").trim();

export function inspectAvatar(file = avatarFile()) {
  const svg = fs.readFileSync(file, "utf8");
  const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => rigName(m[1])));
  const lower = new Set([...ids].map((i) => i.toLowerCase()));
  const has = (g: string) => lower.has(g.toLowerCase());
  return {
    file,
    isPlaceholder: !file.endsWith("avatar/avatar.svg"),
    required: REQUIRED_GROUPS.map((g) => ({ id: g, ok: has(g) })),
    optional: OPTIONAL_GROUPS.map((g) => ({ id: g, ok: has(g) })),
    poses: [...ids].filter((i) => i.toLowerCase().startsWith("pose-")).map((i) => i.slice(5)),
    aliases: (() => {
      try { return JSON.parse(fs.readFileSync(file.replace(/[^/]+$/, "rig.json"), "utf8")).aliases ?? {}; } catch { return {}; }
    })() as Record<string, string>,
    viewBox: svg.match(/viewBox="([^"]+)"/)?.[1] ?? null,
  };
}
