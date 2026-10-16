import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const r = (...p: string[]) => path.join(ROOT, ...p);

export const EPISODES = r("episodes");
export const LIBRARY = r("library");
export const CACHE = r(".cache");

export const ep = (slug: string, ...p: string[]) => path.join(EPISODES, slug, ...p);

export function requireSlug(argv = process.argv.slice(2)): string {
  const slug = argv.find((a) => !a.startsWith("-"));
  if (!slug) {
    console.error("Usage: <script> <episode-slug>");
    process.exit(1);
  }
  if (!fs.existsSync(ep(slug))) {
    console.error(`No episode folder: episodes/${slug}`);
    process.exit(1);
  }
  return slug;
}

export const readJson = <T = any>(file: string): T => JSON.parse(fs.readFileSync(file, "utf8"));
export const readJsonIf = <T = any>(file: string): T | null => (fs.existsSync(file) ? readJson<T>(file) : null);
export const writeJson = (file: string, data: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
};

/** True when this module was run directly (tsx scripts/x.ts) rather than imported. */
export const isMain = (metaUrl: string) => {
  try {
    return fs.realpathSync(fileURLToPath(metaUrl)) === fs.realpathSync(process.argv[1] ?? "");
  } catch {
    return false;
  }
};
