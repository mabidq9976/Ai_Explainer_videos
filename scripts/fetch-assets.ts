/**
 * Finds footage/photos for every stock scene — none of this passes through Claude.
 * Order: shared library/ (skipping anything used in the last 30 days) → Pexels → Pixabay → Magnific.
 * Nothing passes the filters → the scene uses its fallback component at render time.
 * Every pick is logged in episodes/<slug>/assets/manifest.json (source, id, author, license, query).
 */
import fs from "node:fs";
import path from "node:path";
import { ep, requireSlug, isMain, readJson, readJsonIf, writeJson, LIBRARY } from "./lib/paths.ts";
import { env } from "./lib/env.ts";
import { log, probeDuration } from "./lib/run.ts";
import { track } from "./lib/status.ts";
import type { SceneFile } from "./lib/text.ts";

type Kind = "video" | "photo";
type Candidate = {
  source: string; id: string; kind: Kind; url: string; width: number; height: number; duration?: number;
  author: string; pageUrl: string; license: string;
};
type LibEntry = Omit<Candidate, "url"> & { file: string; query: string; tokens: string[]; used: Record<string, string> };

const REUSE_DAYS = 30;
const INDEX = path.join(LIBRARY, "index.json");
const tokens = (q: string) => [...new Set(q.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2))];
const jaccard = (a: string[], b: string[]) => {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / (new Set([...a, ...b]).size || 1);
};

/** Size/orientation/duration filter. Full-bleed needs portrait; framed cards accept any orientation. */
function passes(c: Candidate, frame: string, strictDuration: boolean) {
  if (frame === "full" && c.height <= c.width) return false;
  if (Math.min(c.width, c.height) < 1080 && frame === "full") return false;
  if (frame !== "full" && c.width < 1080) return false;
  if (c.kind === "video" && c.duration != null) {
    if (c.duration < 3) return false;
    if (strictDuration && c.duration > 10) return false;
    if (c.duration > 40) return false;
  }
  return true;
}

// ---------- Providers ----------
async function pexels(q: string, kind: Kind, frame: string): Promise<Candidate[]> {
  const key = env("PEXELS_API_KEY");
  if (!key) return [];
  const orientation = frame === "full" ? "portrait" : "landscape";
  if (kind === "video") {
    const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&orientation=${orientation}&per_page=20`, { headers: { Authorization: key } });
    if (!res.ok) throw new Error(`Pexels ${res.status}`);
    const json: any = await res.json();
    return (json.videos ?? []).flatMap((v: any) => {
      const files = (v.video_files ?? []).filter((f: any) => f.file_type === "video/mp4" && f.width && f.height);
      files.sort((a: any, b: any) => a.width * a.height - b.width * b.height);
      const f = files.find((f: any) => Math.min(f.width, f.height) >= 1080) ?? files[files.length - 1];
      return f ? [{ source: "pexels", id: String(v.id), kind, url: f.link, width: f.width, height: f.height, duration: v.duration, author: v.user?.name ?? "", pageUrl: v.url, license: "Pexels License" }] : [];
    });
  }
  const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=${orientation}&per_page=20`, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels ${res.status}`);
  const json: any = await res.json();
  return (json.photos ?? []).map((p: any) => ({ source: "pexels", id: String(p.id), kind, url: p.src?.large2x ?? p.src?.original, width: p.width, height: p.height, author: p.photographer, pageUrl: p.url, license: "Pexels License" }));
}

async function pixabay(q: string, kind: Kind): Promise<Candidate[]> {
  const key = env("PIXABAY_API_KEY");
  if (!key) return [];
  if (kind === "video") {
    const res = await fetch(`https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(q)}&per_page=20&safesearch=true`);
    if (!res.ok) throw new Error(`Pixabay ${res.status}`);
    const json: any = await res.json();
    return (json.hits ?? []).flatMap((h: any) => {
      const f = h.videos?.large?.url ? h.videos.large : h.videos?.medium;
      return f?.url ? [{ source: "pixabay", id: String(h.id), kind, url: f.url, width: f.width, height: f.height, duration: h.duration, author: h.user, pageUrl: h.pageURL, license: "Pixabay Content License" }] : [];
    });
  }
  const res = await fetch(`https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(q)}&image_type=photo&per_page=20&safesearch=true`);
  if (!res.ok) throw new Error(`Pixabay ${res.status}`);
  const json: any = await res.json();
  return (json.hits ?? []).map((h: any) => ({ source: "pixabay", id: String(h.id), kind, url: h.largeImageURL, width: h.imageWidth, height: h.imageHeight, author: h.user, pageUrl: h.pageURL, license: "Pixabay Content License" }));
}

/** Magnific (Freepik catalog). Photos via /v1/resources; download URL resolved lazily. */
async function magnific(q: string, kind: Kind): Promise<Candidate[]> {
  const key = env("MAGNIFIC_API_KEY");
  if (!key || kind !== "photo") return [];
  const base = env("MAGNIFIC_API_BASE", "https://api.freepik.com");
  const res = await fetch(`${base}/v1/resources?term=${encodeURIComponent(q)}&limit=20&filters[content_type][photo]=1`, { headers: { "x-freepik-api-key": key, "Accept-Language": "en-US" } });
  if (!res.ok) throw new Error(`Magnific ${res.status}`);
  const json: any = await res.json();
  return (json.data ?? []).map((d: any) => ({
    source: "magnific", id: String(d.id), kind, url: `${base}/v1/resources/${d.id}/download`,
    width: d.image?.source?.size ? parseInt(String(d.image.source.size).split("x")[0]) || 2000 : 2000,
    height: d.image?.source?.size ? parseInt(String(d.image.source.size).split("x")[1]) || 1300 : 1300,
    author: d.author?.name ?? "", pageUrl: d.url ?? "", license: d.licenses?.[0]?.type ?? "Freepik/Magnific license",
  }));
}

async function download(c: Candidate): Promise<string> {
  let url = c.url;
  if (c.source === "magnific") {
    const r = await fetch(url, { headers: { "x-freepik-api-key": env("MAGNIFIC_API_KEY") } });
    if (!r.ok) throw new Error(`Magnific download ${r.status}`);
    url = ((await r.json()) as any).data?.url;
  }
  const ext = c.kind === "video" ? "mp4" : (url.match(/\.(jpe?g|png|webp)(\?|$)/i)?.[1] ?? "jpg").toLowerCase();
  const file = path.join(LIBRARY, `${c.source}-${c.id}.${ext}`);
  if (!fs.existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${res.status} ${c.source}/${c.id}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

export async function fetchAssets(slug: string) {
  const scene = readJson<SceneFile>(ep(slug, "scene.json"));
  fs.mkdirSync(LIBRARY, { recursive: true });
  const index: LibEntry[] = readJsonIf(INDEX) ?? [];
  const assetsDir = ep(slug, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  const manifest: Record<string, any> = {};
  const now = Date.now();
  const usedInEpisode = new Set<string>();

  const fresh = (e: LibEntry) => Object.entries(e.used).every(([s, d]) => s === slug || now - Date.parse(d) > REUSE_DAYS * 864e5);

  /** Library first, then providers in order (strict duration, then relaxed). */
  async function find(key: string, query: string, kind: Kind, frame: string): Promise<LibEntry | null> {
    const qTokens = tokens(query);
    const libHit = index
      .filter((e) => e.kind === kind && !usedInEpisode.has(e.file) && fresh(e) && passes({ ...e, url: "" }, frame, false))
      .map((e) => ({ e, score: jaccard(qTokens, e.tokens) }))
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score)[0];
    if (libHit) {
      log(`${key}: library hit ${path.basename(libHit.e.file)} for "${query}"`);
      return libHit.e;
    }
    for (const strict of [true, false]) {
      for (const [name, fn] of [["pexels", () => pexels(query, kind, frame)], ["pixabay", () => pixabay(query, kind)], ["magnific", () => magnific(query, kind)]] as const) {
        let cands: Candidate[] = [];
        try { cands = await fn(); } catch (e: any) { log(`${key}: ${name} failed (${e.message})`); continue; }
        const c = cands.find((c) => passes(c, frame, strict) && !index.some((e) => e.source === c.source && e.id === c.id && (!fresh(e) || usedInEpisode.has(e.file))));
        if (!c) continue;
        try {
          const file = await download(c);
          const duration = c.kind === "video" ? await probeDuration(file).catch(() => c.duration) : undefined;
          const { url: _u, ...rest } = c;
          const entry: LibEntry = { ...rest, duration, file: path.relative(LIBRARY, file), query, tokens: qTokens, used: {} };
          const existing = index.findIndex((e) => e.file === entry.file);
          if (existing >= 0) index[existing] = { ...entry, used: index[existing].used };
          else index.push(entry);
          log(`${key}: ${c.source} #${c.id} (${c.width}x${c.height}${duration ? `, ${duration.toFixed(1)}s` : ""}) for "${query}"`);
          return index.find((e) => e.file === entry.file)!;
        } catch (e: any) { log(`${key}: ${e.message}`); }
      }
    }
    return null;
  }

  function place(key: string, pick: LibEntry, frame: string) {
    pick.used[slug] = new Date().toISOString();
    usedInEpisode.add(pick.file);
    const src = path.join(LIBRARY, pick.file);
    const dest = path.join(assetsDir, `${key}${path.extname(src)}`);
    fs.rmSync(dest, { force: true });
    try { fs.linkSync(src, dest); } catch { fs.copyFileSync(src, dest); }
    const { tokens: _t, used: _used, file: _f, ...meta } = pick;
    manifest[key] = { file: `assets/${path.basename(dest)}`, frame, ...meta };
  }

  /** A specific image Claude found on the web (product screenshot, official press image). Logged as "verify rights". */
  async function fromUrl(key: string, url: string) {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ai-director-studio" } });
    if (!res.ok) throw new Error(`${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("gif") ? "gif" : type.includes("mp4") ? "mp4" : type.includes("svg") ? "svg" : "jpg";
    if (!/image|video/.test(type)) throw new Error(`not an image (${type || "unknown type"})`);
    const name = `web-${Buffer.from(url).toString("base64url").slice(-24)}.${ext}`;
    const file = path.join(LIBRARY, name);
    if (!fs.existsSync(file)) fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    const dest = path.join(assetsDir, `${key}.${ext}`);
    fs.rmSync(dest, { force: true });
    try { fs.linkSync(file, dest); } catch { fs.copyFileSync(file, dest); }
    manifest[key] = { file: `assets/${path.basename(dest)}`, kind: ext === "mp4" ? "video" : "photo", source: "web", pageUrl: url, license: "web — verify you may use it", query: url };
    log(`${key}: downloaded ${url.slice(0, 70)}`);
  }

  for (const sc of scene.scenes) {
    const v = sc.visual as any;
    if (v.type === "board") {
      for (const el of v.elements ?? []) {
        if (el.kind !== "image" || el.src) continue;
        const key = `${sc.id}.${el.id}`;
        if (el.url) {
          try { await fromUrl(key, el.url); continue; } catch (e: any) { log(`${key}: url failed (${e.message})${el.query ? " — trying the query" : ""}`); }
        }
        if (!el.query) continue;
        const kind: Kind = el.media === "video" ? "video" : "photo";
        const pick = await find(key, el.query, kind, "card");
        if (pick) place(key, pick, el.frame ?? "plain");
        else { manifest[key] = { query: el.query, reason: "no match — shows a placeholder; add a url or drop a file in assets/manual/" }; log(`${key}: no match for "${el.query}"`); }
      }
      continue;
    }
    if (v.type === "stock") {
      const kind: Kind = v.kind ?? "video";
      const frame = v.frame ?? "card";
      const pick = await find(sc.id, v.query, kind, frame);
      if (pick) place(sc.id, pick, frame);
      else {
        manifest[sc.id] = { fallback: v.fallback, query: v.query, reason: "no asset passed the filters (or no API keys set)" };
        log(`${sc.id}: no match — will use fallback ${v.fallback}`);
      }
      continue;
    }
    // Component props that ask for media: any object with a `query` (Diagram nodes, DeviceFrame, ProfileList items).
    // Keyed "<scene>.<path>" e.g. s3.nodes.1, s4.media — components read them from their `assets` prop.
    const walk = async (o: any, p: string) => {
      if (!o || typeof o !== "object") return;
      if (typeof o.query === "string" && p !== "") {
        const key = `${sc.id}.${p}`;
        const pick = await find(key, o.query, o.kind === "video" ? "video" : "photo", "card");
        if (pick) place(key, pick, "card");
        else log(`${key}: no match for "${o.query}" — shows its icon/label only`);
      }
      for (const [k, val] of Object.entries(o)) if (val && typeof val === "object") await walk(val, p ? `${p}.${k}` : k);
    };
    const props = (v as any).props ?? {};
    // Only graphics that show media take `query` as a stock search (SerpVsAiAnswer's query is search-bar text).
    if (!["DeviceFrame", "Diagram", "ProfileList"].includes((v as any).name)) continue;
    if ((v as any).name === "DeviceFrame" && typeof props.query === "string") {
      const key = `${sc.id}.media`;
      const pick = await find(key, props.query, props.kind === "video" ? "video" : "photo", "card");
      if (pick) place(key, pick, "card");
    }
    await walk(props, "");
  }

  // Clean stale scene files from earlier runs.
  for (const f of fs.readdirSync(assetsDir)) {
    const key = f.replace(/\.[a-z0-9]+$/i, "");
    if (f !== "manifest.json" && fs.statSync(path.join(assetsDir, f)).isFile() && !manifest[key]?.file) fs.rmSync(path.join(assetsDir, f), { force: true });
  }
  writeJson(path.join(assetsDir, "manifest.json"), manifest);
  writeJson(INDEX, index);
  const got = Object.values(manifest).filter((m: any) => m.file).length;
  log(`assets: ${got}/${Object.keys(manifest).length} media slots filled, the rest use fallbacks or icons`);
}

if (isMain(import.meta.url)) {
  const slug = requireSlug();
  await track(slug, "assets", () => fetchAssets(slug)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
