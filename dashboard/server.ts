/**
 * AI Director Studio dashboard — local only (127.0.0.1). Reads the repo's files, runs pipeline
 * scripts and Claude Code headless as jobs, and streams their logs.  npm run dashboard
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { r, ep, EPISODES, readJsonIf, writeJson, ROOT } from "../scripts/lib/paths.ts";
import { healthCheck } from "../scripts/doctor.ts";
import { inspectAvatar, avatarFile } from "../scripts/lib/avatar.ts";
import { readStatus, patchStatus, STEPS } from "../scripts/lib/status.ts";
import { validateScene } from "../scripts/validate.ts";
import { briefTemplate } from "../scripts/new-brief.ts";
import { env } from "../scripts/lib/env.ts";

const PORT = +(process.env.DASHBOARD_PORT ?? 4400);
const PUBLIC = r("dashboard", "public");
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TEXT_FILES = ["brief.md", "hooks.md", "blog.md", "thread.md", "captions.md", "component-requests.md", "schema.json"];
const ENV_KEYS = {
  secret: ["GEMINI_API_KEY", "ELEVENLABS_API_KEY", "PEXELS_API_KEY", "PIXABAY_API_KEY", "MAGNIFIC_API_KEY"],
  plain: ["TTS_PROVIDER", "MAGNIFIC_VOICE_ID", "MAGNIFIC_VOICE_SOURCE", "MAGNIFIC_TTS_MODEL", "GEMINI_TTS_MODEL", "GEMINI_VOICE_ID", "ELEVENLABS_VOICE_ID", "MAGNIFIC_API_BASE", "LOCAL_VOICE"],
};

// ---------------------------------------------------------------- helpers
const readText = (f: string) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null);
const mtime = (f: string) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);

function frontmatter(md: string): Record<string, string> {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  return Object.fromEntries(
    m[1].split("\n").filter((l) => l.includes(":")).map((l) => {
      const [k, ...v] = l.split(":");
      return [k.trim(), v.join(":").replace(/#.*$/, "").trim()];
    }),
  );
}
const section = (md: string, name: string) => md.match(new RegExp(`## ${name}\\n([\\s\\S]*?)(\\n## |$)`))?.[1].trim() ?? "";

function send(res: http.ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}
async function body(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return raw; }
}

// ---------------------------------------------------------------- episodes
function listSlugs() {
  if (!fs.existsSync(EPISODES)) return [];
  return fs.readdirSync(EPISODES).filter((d) => SLUG_RE.test(d) && fs.statSync(ep(d)).isDirectory());
}

function stage(slug: string) {
  const st = readStatus(slug);
  const has = (f: string) => fs.existsSync(ep(slug, f));
  if (st.posted && Object.keys(st.posted).length) return "published";
  if (st.approvals.render) return "ready";
  if (has("out/final.mp4")) return "rendered";
  if (st.approvals.script) return "approved";
  if (has("scene.json")) return "drafted";
  return "briefed";
}

function summary(slug: string) {
  const scene = readJsonIf(ep(slug, "scene.json"));
  const brief = readText(ep(slug, "brief.md")) ?? "";
  const fm = frontmatter(brief);
  const st = readStatus(slug);
  const val = readJsonIf(ep(slug, "validation.json"));
  const timing = readJsonIf(ep(slug, "audio", "timing.json"));
  const files = ["scene.json", "brief.md", "hooks.md", "blog.md", "thread.md", "captions.md"].map((f) => mtime(ep(slug, f)));
  return {
    slug,
    title: scene?.title ?? scene?.hook?.text ?? section(brief, "Topic") ?? slug,
    hook: scene?.hook?.text ?? null,
    pillar: scene?.pillar ?? fm.pillar ?? null,
    format: scene?.format ?? fm.format ?? null,
    length: scene?.length ?? (fm.length ? +fm.length : null),
    scenes: scene?.scenes?.length ?? 0,
    duration: timing?.duration ?? null,
    stage: stage(slug),
    steps: st.steps,
    approvals: st.approvals,
    posted: st.posted ?? {},
    minutes: st.minutes ?? null,
    validation: val ? { errors: val.errors.length, warnings: val.warnings.length, stats: val.stats, at: val.at } : null,
    hasFinal: fs.existsSync(ep(slug, "out", "final.mp4")),
    hasPreview: fs.existsSync(ep(slug, "out", "preview.mp4")),
    written: { blog: !!readText(ep(slug, "blog.md")), thread: !!readText(ep(slug, "thread.md")), captions: !!readText(ep(slug, "captions.md")) },
    updatedAt: Math.max(mtime(ep(slug, "status.json")), ...files),
  };
}

function detail(slug: string) {
  const texts = Object.fromEntries(TEXT_FILES.map((f) => [f, readText(ep(slug, f))]));
  const timing = readJsonIf(ep(slug, "audio", "timing.json"));
  return {
    ...summary(slug),
    scene: readJsonIf(ep(slug, "scene.json")),
    sceneRaw: readText(ep(slug, "scene.json")),
    validationFull: readJsonIf(ep(slug, "validation.json")),
    manifest: readJsonIf(ep(slug, "assets", "manifest.json")),
    timing: timing ? { duration: timing.duration, scenes: timing.scenes, matchedRatio: timing.matchedRatio } : null,
    voice: readJsonIf(ep(slug, "audio", "voice.meta.json")),
    hasAudio: fs.existsSync(ep(slug, "audio", "voice.wav")),
    hasSubtitles: fs.existsSync(ep(slug, "out", "captions.srt")),
    texts,
  };
}

// ---------------------------------------------------------------- inbox
function inbox() {
  const dir = r("topics", "inbox");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => {
    const md = fs.readFileSync(path.join(dir, f), "utf8");
    const fm = frontmatter(md);
    const angle = section(md, "My angle");
    return {
      slug: fm.slug || f.replace(/\.md$/, ""),
      file: `topics/inbox/${f}`,
      pillar: fm.pillar, format: fm.format, length: fm.length,
      topic: section(md, "Topic"),
      angleReady: !!angle && !/Required\.?$/.test(angle) && angle.length > 10,
      raw: md,
      mtime: mtime(path.join(dir, f)),
    };
  }).sort((a, b) => b.mtime - a.mtime);
}

// ---------------------------------------------------------------- roadmap
function roadmap() {
  const data = readJsonIf(r("dashboard", "roadmap.json"));
  const state: Record<string, boolean> = readJsonIf(r("dashboard", "roadmap-state.json")) ?? {};
  const health = healthCheck();
  const ok = (name: string) => health.find((h) => h.name === name)?.ok ?? false;
  const slugs = listSlugs();
  const posted = analyticsRows().filter((x) => x.slug).map((x) => x.slug);
  const publishedCount = new Set(posted).size;
  const auto: Record<string, () => boolean> = {
    testRender: () => fs.existsSync(r("out", "test.mp4")),
    keys: () => ["GEMINI_API_KEY", "PEXELS_API_KEY", "PIXABAY_API_KEY"].every((k) => !!env(k)),
    avatar: () => { const a = inspectAvatar(); return !a.isPlaceholder && a.required.every((g) => g.ok); },
    voiceId: () => env("GEMINI_VOICE_ID").startsWith("voice_"),
    built: () => true,
    rhubarb: () => ok("Rhubarb Lip Sync") && slugs.some((s) => fs.existsSync(ep(s, "mouth.json"))) && !inspectAvatar().isPlaceholder,
    practice: () => slugs.filter((s) => readJsonIf(ep(s, "validation.json"))?.errors?.length === 0 && s !== "demo-geo-citations").length >= 5,
    published5: () => publishedCount >= 5,
    reserve: () => slugs.filter((s) => { const st = readStatus(s); return !!st.approvals.render && !(st.posted && Object.keys(st.posted).length); }).length >= 2,
  };
  let done = 0, total = 0;
  const phases = data.phases.map((p: any) => {
    const items = p.items.map((it: any) => {
      const autoDone = it.auto ? auto[it.auto]?.() ?? false : false;
      const isDone = autoDone || !!state[it.id];
      total++; if (isDone) done++;
      return { ...it, done: isDone, autoDone };
    });
    return { ...p, items, done: items.filter((i: any) => i.done).length, total: items.length };
  });
  const block = data.blocks.find((b: any) => publishedCount + 1 >= b.from && publishedCount + 1 <= b.to);
  return { phases, blocks: data.blocks, currentBlock: block, publishedCount, done, total };
}

// ---------------------------------------------------------------- analytics
const CSV = r("analytics", "results.csv");
function parseCsvLine(line: string) {
  const out: string[] = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur); return out;
}
function analyticsRows(): Record<string, string>[] {
  const t = readText(CSV);
  if (!t) return [];
  const [head, ...lines] = t.trim().split("\n");
  const cols = parseCsvLine(head);
  return lines.filter(Boolean).map((l) => { const v = parseCsvLine(l); return Object.fromEntries(cols.map((c, i) => [c, v[i] ?? ""])); });
}
const csvCell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

// ---------------------------------------------------------------- skills
function skills() {
  const dir = r(".claude", "skills");
  return fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, "SKILL.md"))).map((d) => {
    const md = fs.readFileSync(path.join(dir, d, "SKILL.md"), "utf8");
    const fm = frontmatter(md);
    return {
      name: fm.name ?? d,
      description: fm.description ?? "",
      argumentHint: fm["argument-hint"] ?? "",
      manualOnly: fm["disable-model-invocation"] === "true",
      model: fm.model ?? null,
      fork: fm.context === "fork",
      agent: fm.agent ?? null,
      files: fs.readdirSync(path.join(dir, d)),
      body: md.replace(/^---[\s\S]*?---\n/, "").trim(),
    };
  });
}

// ---------------------------------------------------------------- settings (.env)
function envStatus() {
  return {
    secret: ENV_KEYS.secret.map((k) => ({ key: k, set: !!env(k) })),
    plain: ENV_KEYS.plain.map((k) => ({ key: k, value: env(k) })),
  };
}
function setEnv(key: string, value: string) {
  if (![...ENV_KEYS.secret, ...ENV_KEYS.plain].includes(key)) throw new Error("key not allowed");
  if (/[\n\r]/.test(value)) throw new Error("value must be one line");
  const file = r(".env");
  let text = readText(file) ?? "";
  const line = `${key}=${value}`;
  text = new RegExp(`^${key}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${key}=.*$`, "m"), line) : `${text.trimEnd()}\n${line}\n`;
  fs.writeFileSync(file, text);
  process.env[key] = value;
}

// ---------------------------------------------------------------- jobs
type Job = { id: string; kind: string; slug?: string; title: string; state: "running" | "done" | "failed" | "stopped"; started: number; ended?: number; code?: number | null; lines: string[]; url?: string; proc?: ChildProcess; listeners: Set<http.ServerResponse> };
const jobs = new Map<string, Job>();
let jobSeq = 0;
const tsx = (script: string, ...args: string[]) => [r("node_modules", ".bin", "tsx"), [r("scripts", script), ...args]] as const;

const JOB_KINDS: Record<string, { title: string; needsSlug?: boolean; cmd: (slug: string, opts: any) => readonly [string, readonly string[]] }> = {
  validate: { title: "Validate", needsSlug: true, cmd: (s) => tsx("validate.ts", s) },
  // Magnific voices are made by Claude through the MCP, so the Voice button runs /voice in that case.
  tts: {
    title: "Voice (TTS)", needsSlug: true, cmd: (s, o) => env("TTS_PROVIDER") === "magnific"
      ? ["claude", ["-p", `/voice ${s}`, "--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits", "--allowedTools", "Read Bash(npm run tts *) mcp__magnific"]]
      : tsx("tts.ts", s, ...(o.force ? ["--force"] : [])),
  },
  timing: { title: "Word timing", needsSlug: true, cmd: (s) => tsx("timing.ts", s) },
  lipsync: { title: "Lip sync", needsSlug: true, cmd: (s) => tsx("lipsync.ts", s) },
  assets: { title: "Fetch assets", needsSlug: true, cmd: (s) => tsx("fetch-assets.ts", s) },
  render: { title: "Render final", needsSlug: true, cmd: (s) => tsx("render.ts", s) },
  preview: { title: "Render preview", needsSlug: true, cmd: (s) => tsx("render.ts", s, "--preview") },
  episode: { title: "Full pipeline", needsSlug: true, cmd: (s, o) => tsx("episode.ts", s, ...(o.from ? [`--from=${o.from}`] : []), ...(o.noRender ? ["--no-render"] : []), ...(o.preview ? ["--preview"] : [])) },
  studio: { title: "Remotion Studio", needsSlug: true, cmd: (s) => tsx("studio.ts", s, "--port=3100") },
  draft: {
    title: "Claude /draft", cmd: (s) => ["claude", ["-p", s ? `/draft ${s}` : "/draft", "--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits",
      "--allowedTools", "Skill Read Write Edit Glob Grep WebFetch WebSearch Bash(npm run *) Bash(mkdir -p episodes/*) Bash(mv topics/*) mcp__magnific"]],
  },
  skill: {
    title: "Claude skill", needsSlug: true, cmd: (s, o) => ["claude", ["-p", `/${o.skill} ${s}`, "--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits",
      "--allowedTools", "Skill Read Write Edit Glob Grep WebFetch WebSearch Bash(npm run *) mcp__magnific"]],
  },
  doctor: { title: "Doctor", cmd: () => tsx("doctor.ts") },
  "setup-tools": { title: "Install tools", cmd: () => tsx("setup-tools.ts") },
  "test-render": { title: "Test render", cmd: () => [r("node_modules", ".bin", "remotion"), ["render", "studio/src/index.ts", "TestCard", "out/test.mp4"]] },
};

/** Claude stream-json → readable lines. */
function claudeLine(raw: string): string | null {
  try {
    const m = JSON.parse(raw);
    if (m.type === "assistant") {
      return (m.message?.content ?? []).map((c: any) => c.type === "text" ? c.text : c.type === "tool_use"
        ? `⚙ ${c.name}${c.input?.command ? `: ${c.input.command}` : c.input?.file_path ? `: ${path.relative(ROOT, c.input.file_path)}` : c.input?.skill ? `: /${c.input.skill} ${c.input.args ?? ""}` : ""}` : "").filter(Boolean).join("\n") || null;
    }
    if (m.type === "result") return `\n━━ ${m.is_error ? "failed" : "done"} · ${((m.duration_ms ?? 0) / 1000).toFixed(0)}s${m.total_cost_usd != null ? ` · $${m.total_cost_usd.toFixed(3)}` : ""}${m.num_turns ? ` · ${m.num_turns} turns` : ""}`;
    if (m.type === "system" && m.subtype === "init") return `Claude session ${String(m.session_id ?? "").slice(0, 8)} · model ${m.model ?? "?"}`;
    return null;
  } catch { return raw; }
}

function startJob(kind: string, slug: string | undefined, opts: any = {}): Job {
  const def = JOB_KINDS[kind];
  if (!def) throw new Error(`unknown job ${kind}`);
  if (def.needsSlug && (!slug || !SLUG_RE.test(slug))) throw new Error("slug required");
  if (slug && !SLUG_RE.test(slug)) throw new Error("bad slug");
  const running = [...jobs.values()].find((j) => j.state === "running" && j.kind === kind && j.slug === slug);
  if (running) return running;
  if (kind === "studio") for (const j of jobs.values()) if (j.kind === "studio" && j.state === "running") stopJob(j);
  const [cmd, args] = def.cmd(slug ?? "", opts);
  const id = `j${++jobSeq}`;
  const job: Job = { id, kind, slug, title: kind === "skill" ? `/${opts.skill}` : def.title, state: "running", started: Date.now(), lines: [], listeners: new Set() };
  jobs.set(id, job);
  const push = (line: string) => {
    job.lines.push(line);
    if (job.lines.length > 4000) job.lines.splice(0, 1000);
    const m = line.match(/https?:\/\/localhost:\d+/);
    if (m && kind === "studio") job.url = m[0];
    if (kind === "studio" && /Studio → episode/.test(line)) job.url = undefined; // reset until the new instance reports its URL
    for (const l of job.listeners) l.write(`data: ${JSON.stringify({ line })}\n\n`);
  };
  push(`$ ${path.basename(String(cmd))} ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ").replace(ROOT + "/", "")}`);
  if (kind === "draft" || kind === "skill") patchStatus(slug ?? "", (s) => { if (slug) s.steps.draft = { state: "running", at: new Date().toISOString() }; });
  // Own process group, so Stop takes down everything the job started (Studio, Chrome, ffmpeg…).
  const proc = spawn(cmd, args as string[], { cwd: ROOT, detached: true, env: { ...process.env, FORCE_COLOR: "0", NODE_OPTIONS: "--no-deprecation" } });
  job.proc = proc;
  let buf = "";
  const onData = (d: Buffer) => {
    buf += d.toString();
    const parts = buf.split(/\r?\n|\r/);
    buf = parts.pop() ?? "";
    for (const p of parts) {
      if (!p.trim()) continue;
      const line = kind === "draft" || kind === "skill" ? claudeLine(p) : p.replace(/\x1b\[[0-9;]*m/g, "");
      if (line) line.split("\n").forEach(push);
    }
  };
  proc.stdout.on("data", onData);
  proc.stderr.on("data", onData);
  proc.on("error", (e) => push(`✗ ${e.message}`));
  proc.on("close", (code) => {
    if (buf.trim()) push(buf);
    job.code = code;
    job.ended = Date.now();
    if (job.state === "running") job.state = code === 0 ? "done" : "failed";
    if ((kind === "draft" || kind === "skill") && slug && job.state !== "done") patchStatus(slug, (s) => { s.steps.draft = { state: "failed", at: new Date().toISOString() }; });
    for (const l of job.listeners) { l.write(`event: end\ndata: ${JSON.stringify({ state: job.state, code })}\n\n`); l.end(); }
    job.listeners.clear();
  });
  return job;
}
function stopJob(j: Job) {
  if (j.state !== "running") return;
  j.state = "stopped";
  const pid = j.proc?.pid;
  if (!pid) return;
  try { process.kill(-pid, "SIGTERM"); } catch { j.proc?.kill("SIGTERM"); }
  setTimeout(() => { try { process.kill(-pid, "SIGKILL"); } catch {} }, 4000);
}
const jobView = (j: Job) => ({ id: j.id, kind: j.kind, slug: j.slug, title: j.title, state: j.state, started: j.started, ended: j.ended, code: j.code, url: j.url, last: j.lines[j.lines.length - 1] ?? "" });

// ---------------------------------------------------------------- static + media
const MIME: Record<string, string> = { ".srt": "application/x-subrip; charset=utf-8", ".vtt": "text/vtt; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".json": "application/json", ".md": "text/markdown; charset=utf-8" };

function serveFile(req: http.IncomingMessage, res: http.ServerResponse, file: string) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: "not found" });
  const stat = fs.statSync(file);
  const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.range;
  if (range) {
    const [s, e] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(s, 10), end = e ? parseInt(e, 10) : stat.size - 1;
    res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { "Content-Type": type, "Content-Length": stat.size, "Accept-Ranges": "bytes", "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  }
}
/** Resolve a path inside a base folder, refusing anything that escapes it. */
const inside = (base: string, rel: string) => {
  const p = path.resolve(base, rel);
  return p.startsWith(base + path.sep) || p === base ? p : null;
};

// ---------------------------------------------------------------- router
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const p = decodeURIComponent(url.pathname);
  const m = (re: RegExp) => p.match(re);
  const method = req.method ?? "GET";
  try {
    // Only accept requests addressed to this machine (guards against DNS rebinding).
    const host = (req.headers.host ?? "").split(":")[0];
    if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) return send(res, 403, { error: "forbidden host" });

    if (p === "/api/overview") {
      const eps = listSlugs().map(summary).sort((a, b) => b.updatedAt - a.updatedAt);
      return send(res, 200, { health: healthCheck(), episodes: eps, inbox: inbox().map(({ raw, ...x }) => x), roadmap: roadmap(), jobs: [...jobs.values()].map(jobView).reverse().slice(0, 8), avatar: inspectAvatar(), analytics: analyticsRows().length });
    }
    if (p === "/api/episodes" && method === "GET") return send(res, 200, listSlugs().map(summary).sort((a, b) => b.updatedAt - a.updatedAt));

    let mm: RegExpMatchArray | null;
    if ((mm = m(/^\/api\/episodes\/([a-z0-9-]+)$/)) && method === "GET") {
      if (!fs.existsSync(ep(mm[1]))) return send(res, 404, { error: "no such episode" });
      return send(res, 200, detail(mm[1]));
    }
    if ((mm = m(/^\/api\/episodes\/([a-z0-9-]+)\/timeline$/))) {
      const slug = mm[1];
      const out = await new Promise<string>((resolve) => {
        const p = spawn(r("node_modules", ".bin", "tsx"), [r("scripts", "timeline.ts"), slug], { cwd: ROOT, env: { ...process.env, NODE_OPTIONS: "--no-deprecation" } });
        let o = "";
        p.stdout.on("data", (d) => (o += d));
        p.stderr.on("data", (d) => (o += d));
        p.on("close", () => resolve(o));
      });
      return send(res, 200, { text: out });
    }
    if ((mm = m(/^\/api\/episodes\/([a-z0-9-]+)\/scene$/)) && method === "PUT") {
      const b = await body(req);
      let data: unknown;
      try { data = typeof b === "string" ? JSON.parse(b) : b; } catch (e: any) { return send(res, 400, { error: `Invalid JSON: ${e.message}` }); }
      fs.writeFileSync(ep(mm[1], "scene.json"), JSON.stringify(data, null, 2) + "\n");
      const v = validateScene(data);
      writeJson(ep(mm[1], "validation.json"), { ...v, at: new Date().toISOString() });
      patchStatus(mm[1], (s) => { s.approvals.script = null; s.steps.validate = { state: v.errors.length ? "failed" : "done", at: new Date().toISOString() }; });
      return send(res, 200, v);
    }
    if ((mm = m(/^\/api\/episodes\/([a-z0-9-]+)\/file\/([a-z-]+\.(md|json))$/)) && method === "PUT") {
      if (!TEXT_FILES.includes(mm[2])) return send(res, 400, { error: "file not editable" });
      const b = await body(req);
      fs.writeFileSync(ep(mm[1], mm[2]), typeof b === "string" ? b : String(b.text ?? ""));
      return send(res, 200, { ok: true });
    }
    if ((mm = m(/^\/api\/episodes\/([a-z0-9-]+)\/approve$/)) && method === "POST") {
      const { what, value } = await body(req);
      if (!["script", "render"].includes(what)) return send(res, 400, { error: "what = script | render" });
      patchStatus(mm[1], (s) => { s.approvals[what as "script" | "render"] = value ? new Date().toISOString() : null; });
      return send(res, 200, summary(mm[1]));
    }
    if ((mm = m(/^\/api\/episodes\/([a-z0-9-]+)\/meta$/)) && method === "POST") {
      const b = await body(req);
      patchStatus(mm[1], (s) => {
        if (b.minutes != null) s.minutes = +b.minutes || 0;
        if (b.posted) s.posted = { ...(s.posted ?? {}), ...b.posted };
      });
      return send(res, 200, summary(mm[1]));
    }
    if ((mm = m(/^\/media\/([a-z0-9-]+)\/(.+)$/))) {
      const f = inside(ep(mm[1]), mm[2]);
      return f ? serveFile(req, res, f) : send(res, 403, { error: "forbidden" });
    }

    if (p === "/api/inbox" && method === "GET") return send(res, 200, inbox());
    if (p === "/api/inbox" && method === "POST") {
      const b = await body(req);
      if (!SLUG_RE.test(b.slug ?? "")) return send(res, 400, { error: "slug must be kebab-case, e.g. geo-citations" });
      const file = r("topics", "inbox", `${b.slug}.md`);
      if (fs.existsSync(file) || fs.existsSync(ep(b.slug))) return send(res, 409, { error: "a brief or episode with that slug exists" });
      fs.writeFileSync(file, briefTemplate({ ...b, length: b.length ? +b.length : undefined, points: (b.points ?? "").split("\n").map((x: string) => x.replace(/^[-•]\s*/, "").trim()).filter(Boolean), sources: (b.sources ?? "").split("\n").map((x: string) => x.replace(/^[-•]\s*/, "").trim()).filter(Boolean) }));
      return send(res, 200, { ok: true });
    }
    if ((mm = m(/^\/api\/inbox\/([a-z0-9-]+)$/)) && method === "PUT") {
      const b = await body(req);
      fs.writeFileSync(r("topics", "inbox", `${mm[1]}.md`), typeof b === "string" ? b : String(b.text ?? ""));
      return send(res, 200, { ok: true });
    }
    if ((mm = m(/^\/api\/inbox\/([a-z0-9-]+)\/archive$/)) && method === "POST") {
      const from = r("topics", "inbox", `${mm[1]}.md`);
      if (fs.existsSync(from)) fs.renameSync(from, r("topics", "archive", `${mm[1]}.md`));
      return send(res, 200, { ok: true });
    }

    if (p === "/api/roadmap" && method === "GET") return send(res, 200, roadmap());
    if ((mm = m(/^\/api\/roadmap\/([a-z0-9-]+)$/)) && method === "POST") {
      const state = readJsonIf(r("dashboard", "roadmap-state.json")) ?? {};
      state[mm[1]] = !state[mm[1]];
      writeJson(r("dashboard", "roadmap-state.json"), state);
      return send(res, 200, roadmap());
    }

    if (p === "/api/skills") return send(res, 200, skills());
    if (p === "/api/catalog") return send(res, 200, readJsonIf(r("studio", "src", "components", "catalog.json")));
    if (p === "/api/health") return send(res, 200, healthCheck());
    if (p === "/api/avatar") return send(res, 200, { ...inspectAvatar(), svg: readText(avatarFile()), rig: readJsonIf(path.join(path.dirname(avatarFile()), "rig.json")) });

    if (p === "/api/settings" && method === "GET") return send(res, 200, envStatus());
    if (p === "/api/settings" && method === "POST") {
      const { key, value } = await body(req);
      setEnv(String(key), String(value ?? "").trim());
      return send(res, 200, envStatus());
    }

    if (p === "/api/analytics" && method === "GET") return send(res, 200, { columns: parseCsvLine((readText(CSV) ?? "").split("\n")[0]), rows: analyticsRows() });
    if (p === "/api/analytics" && method === "POST") {
      const b = await body(req);
      const cols = parseCsvLine((readText(CSV) ?? "").split("\n")[0]);
      fs.appendFileSync(CSV, cols.map((c) => csvCell(b[c])).join(",") + "\n");
      if (b.slug && SLUG_RE.test(b.slug) && fs.existsSync(ep(b.slug)) && b.platform) patchStatus(b.slug, (s) => { s.posted = { ...(s.posted ?? {}), [b.platform]: b.date || new Date().toISOString().slice(0, 10) }; });
      return send(res, 200, { ok: true });
    }

    if (p === "/api/jobs" && method === "GET") return send(res, 200, [...jobs.values()].map(jobView).reverse());
    if (p === "/api/jobs" && method === "POST") {
      const b = await body(req);
      const job = startJob(b.kind, b.slug || undefined, b);
      return send(res, 200, jobView(job));
    }
    if ((mm = m(/^\/api\/jobs\/(j\d+)\/stream$/))) {
      const job = jobs.get(mm[1]);
      if (!job) return send(res, 404, { error: "no such job" });
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      res.write(`data: ${JSON.stringify({ replay: job.lines })}\n\n`);
      if (job.state !== "running") { res.write(`event: end\ndata: ${JSON.stringify({ state: job.state, code: job.code })}\n\n`); return res.end(); }
      job.listeners.add(res);
      req.on("close", () => job.listeners.delete(res));
      return;
    }
    if ((mm = m(/^\/api\/jobs\/(j\d+)\/stop$/)) && method === "POST") {
      const job = jobs.get(mm[1]);
      if (job) stopJob(job);
      return send(res, 200, job ? jobView(job) : {});
    }

    if (p.startsWith("/api/")) return send(res, 404, { error: "unknown endpoint" });

    // Static app
    const f = inside(PUBLIC, p === "/" ? "index.html" : p.slice(1));
    if (f && fs.existsSync(f) && fs.statSync(f).isFile()) return serveFile(req, res, f);
    return serveFile(req, res, path.join(PUBLIC, "index.html"));
  } catch (e: any) {
    send(res, 500, { error: e.message ?? String(e) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  AI Director Studio dashboard → http://localhost:${PORT}\n`);
});
const shutdown = () => { for (const j of jobs.values()) stopJob(j); process.exit(0); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
void STEPS;
