/**
 * Saves a file Claude fetched through the Magnific MCP (signed URLs expire, so save right away).
 *   npm run save -- <slug> <key> "<url>" --credit "Magnific · <title>"   → episodes/<slug>/assets/manual/<key>.<ext>
 *   npm run save brand <music|sfx/pop|sfx/whoosh> <url>                → brand/music.<ext>, brand/sfx/<name>.<ext>
 * Prints the path to reference: an element's "src", or nothing to do for brand audio (picked up automatically).
 */
import fs from "node:fs";
import path from "node:path";
import { ep, r, readJsonIf, writeJson } from "./lib/paths.ts";

// npm swallows "--flags" before a bare "--", so accept the credit as `--credit=…`, `--credit …`, or a 4th positional.
const args = process.argv.slice(2);
const ci = args.indexOf("--credit");
const creditArg = args.find((a) => a.startsWith("--credit="))?.slice(9) ?? (ci >= 0 ? args[ci + 1] : undefined);
const positional = args.filter((a, i) => !a.startsWith("--") && !(ci >= 0 && i === ci + 1));
const [target, key, url, creditPos] = positional;
const credit = creditArg ?? creditPos;
if (!target || !key || !/^https?:\/\//.test(url ?? "")) {
  console.error('Usage: npm run save -- <slug|brand> <key> "<url>" --credit "…"');
  process.exit(1);
}
if (!/^[a-zA-Z0-9._/-]+$/.test(key) || key.includes("..")) {
  console.error("key may only contain letters, numbers, . _ - /");
  process.exit(1);
}

const res = await fetch(url);
if (!res.ok) {
  console.error(`download failed: HTTP ${res.status}`);
  process.exit(1);
}
const type = res.headers.get("content-type") ?? "";
const fromUrl = new URL(url).pathname.match(/\.(jpe?g|png|webp|gif|svg|mp4|webm|mov|mp3|wav|m4a|aac|ogg)$/i)?.[1]?.toLowerCase();
const ext =
  fromUrl ??
  (type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("svg") ? "svg" : type.includes("mp4") ? "mp4" :
   type.includes("mpeg") ? "mp3" : type.includes("wav") ? "wav" : type.includes("ogg") ? "ogg" : type.includes("aac") || type.includes("m4a") ? "m4a" : "jpg");
const buf = Buffer.from(await res.arrayBuffer());

let file: string;
if (target === "brand") {
  file = r("brand", `${key}.${ext}`);
  // one file per brand sound: remove older versions with another extension
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.replace(/\.[^.]+$/, "") === path.basename(key) && f !== path.basename(file)) fs.rmSync(path.join(dir, f));
} else {
  if (!fs.existsSync(ep(target))) {
    console.error(`No episode folder: episodes/${target}`);
    process.exit(1);
  }
  file = ep(target, "assets", "manual", `${key}.${ext}`);
}
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, buf);

// Credits log: what came from where (for descriptions and audits).
const creditsFile = target === "brand" ? r("brand", "credits.json") : ep(target, "assets", "manual", "credits.json");
const credits = readJsonIf<Record<string, any>>(creditsFile) ?? {};
credits[key] = { file: path.relative(target === "brand" ? r("brand") : ep(target), file), source: /freepik|magnific|cdnpk/i.test(url) ? "magnific" : "web", credit: credit ?? null, savedAt: new Date().toISOString() };
writeJson(creditsFile, credits);

const rel = target === "brand" ? path.relative(r(), file) : path.relative(ep(target), file);
console.log(`saved ${(buf.length / 1024).toFixed(0)} KB → ${target === "brand" ? rel : `episodes/${target}/${rel}`}`);
if (target !== "brand") console.log(`use: "src": "${rel}"`);
