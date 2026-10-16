// AI Director Studio dashboard — vanilla JS, hash routes, talks to dashboard/server.ts.

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const view = $("#view");

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : {},
    body: opts.body !== undefined ? (typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body)) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

function toast(msg, bad = false) {
  const t = document.createElement("div");
  t.className = `toast${bad ? " bad" : ""}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), bad ? 5000 : 2400);
}

const ago = (ms) => {
  if (!ms) return "—";
  const s = (Date.now() - (typeof ms === "string" ? Date.parse(ms) : ms)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const secs = (n) => (n == null ? "—" : `${Math.round(n)}s`);

// ---------------------------------------------------------------- tiny markdown
function md(src) {
  if (!src) return `<div class="empty">Nothing written yet.</div>`;
  src = src.replace(/^---\n[\s\S]*?\n---\n?/, (fm) => `<pre><code>${esc(fm.trim())}</code></pre>\n`);
  const lines = src.split("\n");
  let out = "", list = null, inCode = false, table = [];
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, "$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  const flushList = () => { if (list) { out += `</${list}>`; list = null; } };
  const flushTable = () => {
    if (!table.length) return;
    const rows = table.filter((r) => !/^\|?\s*:?-{2,}/.test(r.replace(/\|/g, "").trim() ? r : "---"));
    const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
    const [h, ...rest] = rows.filter((r) => !/^\|?[\s:|-]+\|?$/.test(r));
    out += `<div class="table-wrap"><table><thead><tr>${cells(h).map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rest.map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    table = [];
  };
  for (const raw of lines) {
    if (raw.startsWith("<pre>") || inCode && !raw.startsWith("```")) {
      if (raw.startsWith("<pre>")) { out += raw; continue; }
      out += esc(raw) + "\n"; continue;
    }
    if (raw.startsWith("```")) { flushList(); flushTable(); out += inCode ? "</code></pre>" : "<pre><code>"; inCode = !inCode; continue; }
    if (/^\s*\|/.test(raw)) { flushList(); table.push(raw.trim()); continue; } else flushTable();
    const h = raw.match(/^(#{1,4})\s+(.*)/);
    if (h) { flushList(); out += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; continue; }
    const ul = raw.match(/^\s*[-*]\s+(.*)/), ol = raw.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul || ol) {
      const t = ul ? "ul" : "ol";
      if (list !== t) { flushList(); out += `<${t}>`; list = t; }
      out += `<li>${inline((ul ?? ol)[1].replace(/^\[ \]\s*/, "☐ ").replace(/^\[x\]\s*/i, "☑ "))}</li>`;
      continue;
    }
    flushList();
    if (/^>\s?/.test(raw)) { out += `<blockquote>${inline(raw.replace(/^>\s?/, ""))}</blockquote>`; continue; }
    if (/^-{3,}$/.test(raw.trim())) { out += "<hr>"; continue; }
    if (raw.trim().startsWith("<!--")) continue;
    if (raw.trim()) out += `<p>${inline(raw)}</p>`;
  }
  flushList(); flushTable();
  if (inCode) out += "</code></pre>";
  return `<div class="md">${out}</div>`;
}

// ---------------------------------------------------------------- icons
const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 4l9 7v9H3z"/><path d="M9 20v-6h6v6"/></svg>',
  film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h10M4 12h16M4 18h7"/><circle cx="18" cy="6" r="2"/><circle cx="15" cy="18" r="2"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
  shapes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="7" cy="7" r="4"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><path d="M17 3l4 7h-8z"/></svg>',
  face: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 21c-1-4-1-13 6-13s7 9 6 13"/><circle cx="10" cy="13" r=".8" fill="currentColor"/><circle cx="14" cy="13" r=".8" fill="currentColor"/><path d="M10.5 16.5h3"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 14H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
  term: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  claude: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>',
};

const NAV = [
  ["", "Overview", I.home], ["episodes", "Episodes", I.film], ["inbox", "Inbox", I.inbox], ["roadmap", "Roadmap", I.map],
  ["sep", "Studio"], ["skills", "Skills & commands", I.spark], ["components", "Components", I.shapes], ["avatar", "Avatar", I.face],
  ["sep", "Track"], ["analytics", "Analytics", I.chart], ["jobs", "Jobs", I.term], ["setup", "Setup", I.gear],
];
function renderNav(counts = {}) {
  const route = location.hash.replace(/^#\/?/, "").split("/")[0];
  $("#nav").innerHTML = NAV.map(([k, label, icon]) => k === "sep" ? `<div class="nav-sep">${label}</div>`
    : `<a href="#/${k}" class="${route === k ? "on" : ""}">${icon}<span>${label}</span>${counts[k] ? `<span class="count">${counts[k]}</span>` : ""}</a>`).join("");
}

// ---------------------------------------------------------------- shared bits
const STEPS = ["draft", "validate", "tts", "timing", "lipsync", "assets", "render"];
const STEP_LABEL = { draft: "Draft", validate: "Validate", tts: "Voice", timing: "Timing", lipsync: "Lip sync", assets: "Assets", render: "Render" };
const STAGES = [["briefed", "Briefed"], ["drafted", "Script ready"], ["approved", "Approved"], ["rendered", "Rendered"], ["ready", "Ready to post"], ["published", "Published"]];
const stageLabel = Object.fromEntries(STAGES);
const stagePill = (s) => `<span class="pill ${s === "published" ? "good" : s === "ready" ? "accent" : s === "approved" || s === "rendered" ? "info" : ""}">${stageLabel[s] ?? s}</span>`;
const miniSteps = (steps = {}) => `<div class="mini-steps">${STEPS.map((s) => `<i class="${steps[s]?.state ?? ""}" title="${STEP_LABEL[s]}: ${steps[s]?.state ?? "not run"}"></i>`).join("")}</div>`;

async function runJob(kind, slug, extra = {}) {
  try {
    const job = await api("/api/jobs", { body: { kind, slug, ...extra } });
    openConsole(job.id, job.title + (slug ? ` · ${slug}` : ""));
    return job;
  } catch (e) { toast(e.message, true); }
}

// ---------------------------------------------------------------- job console
let es = null, consoleJob = null;
function openConsole(id, title) {
  const c = $("#console"), body = $("#console-body");
  c.classList.add("open"); c.classList.remove("min");
  $("#console-title").textContent = title;
  $("#console-dot").className = "dot running";
  $("#console-link").innerHTML = "";
  body.innerHTML = "";
  consoleJob = id;
  es?.close();
  es = new EventSource(`/api/jobs/${id}/stream`);
  const add = (line) => {
    const d = document.createElement("div");
    d.className = /✗|error|failed|Error/.test(line) ? "err" : /^✓|^ok |done:|━━ done/.test(line) ? "ok" : /^⚙/.test(line) ? "tool" : /^\$|^›|^━━/.test(line) ? "dim" : "";
    d.innerHTML = esc(line).replace(/(https?:\/\/localhost:\d+)/g, '<a href="$1" target="_blank">$1</a>');
    body.appendChild(d);
    const m = line.match(/https?:\/\/localhost:\d+/);
    if (m && /studio/i.test($("#console-title").textContent)) $("#console-link").innerHTML = `<a href="${m[0]}" target="_blank">Open Studio ↗</a>`;
  };
  es.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 40;
    (msg.replay ?? [msg.line]).forEach(add);
    if (atBottom || msg.replay) body.scrollTop = body.scrollHeight;
  };
  es.addEventListener("end", (ev) => {
    const { state } = JSON.parse(ev.data);
    $("#console-dot").className = `dot ${state === "done" ? "done" : "failed"}`;
    es.close();
    refreshCurrent();
  });
}
$("#console-close").onclick = () => { $("#console").classList.remove("open"); es?.close(); };
$("#console-min").onclick = () => $("#console").classList.toggle("min");
$("#console-stop").onclick = async () => { if (consoleJob) await api(`/api/jobs/${consoleJob}/stop`, { body: {} }); };

// ---------------------------------------------------------------- views
const views = {};
let current = null;

views[""] = async () => {
  const o = await api("/api/overview");
  renderNav({ inbox: o.inbox.length || 0 });
  const req = o.health.filter((h) => !h.ok && h.level === "required");
  const rec = o.health.filter((h) => !h.ok && h.level === "recommended");
  const eps = o.episodes;
  const byStage = (s) => eps.filter((e) => e.stage === s);
  const todos = [];
  if (req.length) todos.push(["⚠️", `${req.length} required setup item${req.length > 1 ? "s" : ""} missing`, req.map((r) => r.name).join(", "), `<a class="btn sm" href="#/setup">Fix</a>`]);
  if (!o.health.find((h) => h.name === "GEMINI_API_KEY")?.ok) todos.push(["🔑", "Add your Gemini API key", "Needed for your voice. Until then the pipeline can use the free macOS voice.", `<a class="btn sm" href="#/setup">Add key</a>`]);
  if (o.avatar.isPlaceholder) todos.push(["✏️", "Add your avatar SVG", "Export it to avatar/avatar.svg — the placeholder narrator is used until then.", `<a class="btn sm" href="#/avatar">Layer spec</a>`]);
  const ready = o.inbox.filter((b) => b.angleReady);
  if (ready.length) todos.push(["✍️", `${ready.length} brief${ready.length > 1 ? "s" : ""} ready to draft`, ready.map((b) => b.slug).join(", "), `<button class="btn sm primary" data-act="draft-all">${I.claude} Draft ${ready.length > 1 ? "all" : ""}</button>`]);
  const needAngle = o.inbox.filter((b) => !b.angleReady);
  if (needAngle.length) todos.push(["💬", `Write your angle on ${needAngle.length} brief${needAngle.length > 1 ? "s" : ""}`, "The one field Claude can't fill.", `<a class="btn sm" href="#/inbox">Open inbox</a>`]);
  for (const e of byStage("drafted")) todos.push(["👀", `Review the script: ${e.slug}`, e.validation?.errors ? `${e.validation.errors} validation error(s)` : "Approval point 1 of 2", `<a class="btn sm" href="#/episodes/${e.slug}">Review</a>`]);
  for (const e of byStage("approved")) todos.push(["🎬", `Produce ${e.slug}`, "Voice → lip sync → assets → render", `<button class="btn sm primary" data-act="produce" data-slug="${e.slug}">${I.play} Run</button>`]);
  for (const e of byStage("rendered")) todos.push(["✅", `Approve the render: ${e.slug}`, "Approval point 2 of 2", `<a class="btn sm" href="#/episodes/${e.slug}/video">Watch</a>`]);
  if (!todos.length) todos.push(["🌱", "All clear", "Drop a new brief in the inbox when a topic is ready.", `<a class="btn sm" href="#/inbox">New brief</a>`]);

  const rm = o.roadmap;
  view.innerHTML = `
    <div class="top"><div><h1>Overview</h1><p>One topic in → a vertical video, blog, X thread and captions out.</p></div>
      <div class="row"><a class="btn" href="#/inbox">+ New brief</a><button class="btn primary" data-act="draft-all" ${o.inbox.length ? "" : "disabled"}>${I.claude} Draft inbox with Claude</button></div></div>
    <div class="grid g4">
      <div class="card stat"><div class="n">${o.inbox.length}</div><div class="l">Briefs in inbox</div></div>
      <div class="card stat"><div class="n">${eps.filter((e) => !["published"].includes(e.stage)).length}</div><div class="l">Episodes in progress</div></div>
      <div class="card stat"><div class="n">${rm.publishedCount}</div><div class="l">Videos published · block ${rm.currentBlock ? `${rm.currentBlock.from}–${Math.min(rm.currentBlock.to, 99)}` : "—"}</div></div>
      <div class="card stat"><div class="n">${Math.round((rm.done / rm.total) * 100)}%</div><div class="l">Build roadmap</div><div class="bar accent" style="margin-top:8px"><i style="width:${(rm.done / rm.total) * 100}%"></i></div></div>
    </div>
    <div class="sp"></div>
    <div class="grid g3">
      <div class="card span2"><h2>Next actions</h2>${todos.map(([ic, t, s, a]) => `<div class="todo"><div class="ic">${ic}</div><div class="grow"><b>${esc(t)}</b><span>${esc(s)}</span></div>${a}</div>`).join("")}</div>
      <div class="card"><h2>System <span class="sub"><a href="#/setup">Setup →</a></span></h2>
        <div class="list">${o.health.filter((h) => h.level !== "optional").map((h) => `<div class="li"><span class="dot ${h.ok ? "done" : h.level === "required" ? "failed" : "skipped"}"></span><div class="grow"><div class="t">${esc(h.name)}</div><div class="s">${esc(h.detail)}</div></div></div>`).join("")}</div>
      </div>
    </div>
    <div class="sp"></div>
    <div class="card"><h2>Pipeline board <span class="sub">${eps.length} episode${eps.length === 1 ? "" : "s"}</span></h2>
      <div class="board">
        <div class="col"><h3>Inbox <span>${o.inbox.length}</span></h3>${o.inbox.map((b) => `<a class="ep-card" href="#/inbox"><div class="t">${esc(b.topic || b.slug)}</div><div class="m"><span class="pill">${esc(b.pillar ?? "")}</span>${b.angleReady ? '<span class="pill good">angle ✓</span>' : '<span class="pill warn">needs angle</span>'}</div></a>`).join("")}</div>
        ${STAGES.map(([k, l]) => `<div class="col"><h3>${l} <span>${byStage(k).length}</span></h3>${byStage(k).map((e) => `<a class="ep-card" href="#/episodes/${e.slug}"><div class="t">${esc(e.title)}</div><div class="m"><span class="pill">${esc(e.pillar ?? "")}</span><span class="pill">${esc(e.format ?? "")}</span></div>${miniSteps(e.steps)}</a>`).join("")}</div>`).join("")}
      </div>
    </div>
    <div class="sp"></div>
    <div class="card"><h2>Recent jobs <span class="sub"><a href="#/jobs">All →</a></span></h2>${jobsList(o.jobs)}</div>`;
};

function jobsList(jobs) {
  if (!jobs.length) return `<div class="empty">No jobs yet this session.</div>`;
  return `<div class="list">${jobs.map((j) => `<div class="li"><span class="dot ${j.state === "done" ? "done" : j.state === "running" ? "running" : "failed"}"></span><div class="grow"><div class="t">${esc(j.title)}${j.slug ? ` · ${esc(j.slug)}` : ""}</div><div class="s mono">${esc(j.last)}</div></div><span class="muted">${ago(j.started)}</span>${j.url ? `<a class="btn sm" href="${j.url}" target="_blank">Open ↗</a>` : ""}<button class="btn sm" data-act="log" data-id="${j.id}" data-title="${esc(j.title)}">Log</button></div>`).join("")}</div>`;
}

// ---------------------------------------------------------------- episodes list
views.episodes = async (args) => {
  if (args[0]) return episodeView(args[0], args[1] ?? "script");
  const eps = await api("/api/episodes");
  view.innerHTML = `
    <div class="top"><div><h1>Episodes</h1><p>Every video, its pipeline state and approvals.</p></div><a class="btn" href="#/inbox">+ New brief</a></div>
    ${eps.length ? `<div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Episode</th><th>Stage</th><th>Pipeline</th><th>Length</th><th>Validation</th><th>Written</th><th>Updated</th></tr></thead>
      <tbody>${eps.map((e) => `<tr>
        <td><a href="#/episodes/${e.slug}"><b>${esc(e.title)}</b></a><div class="hint mono">${e.slug} · ${esc(e.pillar ?? "")} · ${esc(e.format ?? "")}</div></td>
        <td>${stagePill(e.stage)}</td>
        <td style="min-width:120px">${miniSteps(e.steps)}</td>
        <td>${e.duration ? secs(e.duration) : e.validation?.stats?.seconds ? `~${e.validation.stats.seconds}s` : "—"}</td>
        <td>${e.validation ? (e.validation.errors ? `<span class="pill bad">${e.validation.errors} errors</span>` : `<span class="pill good">pass</span>`) : "—"}</td>
        <td>${["blog", "thread", "captions"].map((k) => `<span class="pill ${e.written[k] ? "good" : ""}">${k}</span>`).join(" ")}</td>
        <td class="muted">${ago(e.updatedAt)}</td></tr>`).join("")}</tbody></table></div></div>` : `<div class="empty">No episodes yet. Write a brief in the inbox and draft it with Claude.</div>`}`;
};

// ---------------------------------------------------------------- episode detail
const LAYOUTS = ["full", "corner", "hidden"], POSITIONS = ["left", "center", "right"], EXPRS = ["neutral", "raised", "frown"];
const GESTURES = ["rest", "point-right", "open-palm", "count", "thumbs-up", "wave"];
let epCache = null, avatarPoses = [];

async function episodeView(slug, tab) {
  const [e, catalog, av] = await Promise.all([api(`/api/episodes/${slug}`), api("/api/catalog"), api("/api/avatar").catch(() => ({ poses: [] }))]);
  epCache = e; avatarPoses = av.poses ?? [];
  const st = e.steps ?? {};
  const val = e.validationFull;
  const canApproveScript = val && val.errors.length === 0;
  const tabs = [["script", "Script"], ["timeline", "Timeline"], ["brief", "Brief"], ["hooks", "Hooks"], ["video", "Video"], ["assets", "Assets"], ["blog", "Blog"], ["thread", "X thread"], ["captions", "Captions"], ["post", "Post & log"]];
  view.innerHTML = `
    <a class="crumb" href="#/episodes">← Episodes</a>
    <div class="top"><div><h1>${esc(e.title)}</h1><p class="row"><span class="mono">${e.slug}</span>${stagePill(e.stage)}<span class="pill">${esc(e.pillar ?? "?")}</span><span class="pill">${esc(e.format ?? "?")}</span>${e.length ? `<span class="pill">target ${e.length}s</span>` : ""}${e.duration ? `<span class="pill info">voice ${secs(e.duration)}</span>` : ""}</p></div>
      <div class="row">
        <button class="btn" data-act="skill-menu">${I.claude} Ask Claude ▾</button>
        <button class="btn" data-act="studio" data-slug="${slug}">Open in Studio</button>
        <button class="btn primary" data-act="produce" data-slug="${slug}" ${e.scene ? "" : "disabled"}>${I.play} Run pipeline</button>
      </div></div>
    <div id="skill-menu" class="card" style="display:none;margin-bottom:14px"><h2>Run a skill with Claude <span class="sub">headless · same as typing it in Claude Code</span></h2><div class="row">
      ${[["draft", "Full draft"], ["research-brief", "Research brief"], ["hook-writer", "Redo hooks"], ["script-writer", "Redo script"], ["director", "Redo direction"], ["produce", "Producer pass + render"], ["caption-designer", "Design captions"], ["voice", "Make voice-over"], ["critic", "Critic review"], ["repurpose", "Blog · thread · captions"], ["geo-optimizer", "GEO check"]].map(([k, l]) => `<button class="btn sm" data-act="skill" data-skill="${k}" data-slug="${slug}">/${k} <span class="muted">${l}</span></button>`).join("")}
    </div></div>
    <div class="stepper">${STEPS.map((s) => {
      const x = st[s] ?? {};
      const runnable = s !== "draft";
      return `<div class="step ${x.state ?? ""}"><div class="k"><span class="dot ${x.state ?? ""}"></span>${STEP_LABEL[s]}</div><div class="v">${x.state ?? "not run"}</div><div class="ms">${x.ms ? `${(x.ms / 1000).toFixed(1)}s · ` : ""}${x.at ? ago(x.at) : ""}</div>${x.note ? `<div class="hint" title="${esc(x.note)}" style="color:var(--bad);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.note)}</div>` : ""}
        ${runnable ? `<div class="row" style="gap:4px"><button class="btn sm" data-act="step" data-step="${s}" data-slug="${slug}">Run</button>${s !== "render" ? `<button class="btn sm ghost" data-act="from" data-step="${s}" data-slug="${slug}" title="Run this step and everything after it">→ end</button>` : `<button class="btn sm ghost" data-act="step" data-step="preview" data-slug="${slug}">Preview</button>`}</div>` : `<button class="btn sm" data-act="skill" data-skill="draft" data-slug="${slug}">${I.claude} /draft</button>`}</div>`;
    }).join("")}</div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card flat row" style="justify-content:space-between"><div><b>① Script approval</b><div class="hint">${e.approvals.script ? `Approved ${ago(e.approvals.script)}` : canApproveScript ? "Validation passes — read it, then approve." : val ? `${val.errors.length} validation error(s) to fix first` : "No scene.json yet"}</div></div>
        <button class="btn ${e.approvals.script ? "" : "primary"}" data-act="approve" data-what="script" data-v="${e.approvals.script ? "" : "1"}" data-slug="${slug}" ${canApproveScript || e.approvals.script ? "" : "disabled"}>${e.approvals.script ? "Un-approve" : "Approve script"}</button></div>
      <div class="card flat row" style="justify-content:space-between"><div><b>② Render approval</b><div class="hint">${e.approvals.render ? `Approved ${ago(e.approvals.render)}` : e.hasFinal ? "Watch the final render, then approve." : "No final render yet"}</div></div>
        <button class="btn ${e.approvals.render ? "" : "primary"}" data-act="approve" data-what="render" data-v="${e.approvals.render ? "" : "1"}" data-slug="${slug}" ${e.hasFinal ? "" : "disabled"}>${e.approvals.render ? "Un-approve" : "Approve render"}</button></div>
    </div>
    <nav class="tabs">${tabs.map(([k, l]) => `<a href="#/episodes/${slug}/${k}" class="${tab === k ? "on" : ""}">${l}</a>`).join("")}</nav>
    <div id="tab"></div>`;
  const T = $("#tab");
  if (tab === "script") T.innerHTML = scriptTab(e, catalog);
  else if (["brief", "hooks", "blog", "thread", "captions"].includes(tab)) T.innerHTML = textTab(e, `${tab}.md`);
  else if (tab === "video") T.innerHTML = videoTab(e);
  else if (tab === "assets") T.innerHTML = assetsTab(e);
  else if (tab === "post") T.innerHTML = postTab(e);
  else if (tab === "timeline") T.innerHTML = await timelineTab(e);
  bindScriptEditor();
}

function scriptTab(e, catalog) {
  if (!e.scene) return `<div class="empty">No scene.json yet. Run <b>/draft ${e.slug}</b> (button above) or write one by hand.<br><br>${e.sceneRaw ? `<pre class="mono">${esc(e.sceneRaw)}</pre>` : ""}</div>`;
  const s = e.scene;
  const val = e.validationFull;
  const names = Object.keys(catalog);
  const opt = (arr, v) => arr.map((x) => `<option ${x === v ? "selected" : ""}>${x}</option>`).join("");
  const gestures = [...GESTURES, ...avatarPoses.filter((p) => !GESTURES.includes(p))];
  const timing = Object.fromEntries((e.timing?.scenes ?? []).map((x) => [x.id, x]));
  return `
    <div class="grid g3">
      <div class="span2">
        <div class="card flat" style="margin-bottom:12px"><div class="row" style="justify-content:space-between">
          <div style="flex:1;min-width:260px"><b>Hook</b> <span class="pill">${esc(s.hook.pattern)}</span><div class="hint">Scene 1's line must match the hook text.</div>
            <div class="row" style="margin-top:8px;flex-wrap:nowrap"><input type="text" id="cap-title" placeholder="Caption headline, e.g. WHAT IF YOU COULD BREATHE UNDERWATER?" value="${esc(capCfg(s.captions).title?.text ?? "")}"/><input type="text" id="cap-until" style="width:110px" placeholder="until s1" value="${esc(capCfg(s.captions).title?.until ?? "")}"/></div></div>
          <div class="row"><label class="row hint">cards <select id="card-style" style="width:auto;padding:4px 8px">${["chat", "soft", "line", "brutal"].map((m) => `<option ${(s.cardStyle ?? "chat") === m ? "selected" : ""}>${m}</option>`).join("")}</select></label><label class="row hint"><input type="checkbox" id="cam-toggle" ${s.camera === false ? "" : "checked"}/> camera moves</label><label class="row hint">captions <select id="cap-preset" style="width:auto;padding:4px 8px">${["off", "boxed", "editorial", "bold"].map((m) => `<option ${capCfg(s.captions).preset === m ? "selected" : ""}>${m}</option>`).join("")}</select></label><label class="row hint"><input type="checkbox" id="cap-subs" ${capCfg(s.captions).subtitles ? "checked" : ""}/> subtitles</label><span class="hint" id="totals"></span></div></div></div>
        <div id="scenes">${s.scenes.map((sc, i) => {
          const v = sc.visual;
          return `<div class="scene" data-i="${i}">
            <div class="scene-head"><span class="id">${sc.id}</span><span class="pill ${v.type === "stock" ? "info" : v.type === "three" ? "accent" : ""}">${v.type}${v.name ? ` · ${esc(v.name)}` : ""}${v.query ? ` · “${esc(v.query)}”` : ""}${v.type === "board" ? ` · ${v.elements.length} elements${v.continue ? " · continues" : ""}` : ""}</span>${(sc.avatar.beats ?? []).length ? `<span class="pill">${sc.avatar.beats.length} narrator beat${sc.avatar.beats.length > 1 ? "s" : ""}</span>` : ""}${timing[sc.id] ? `<span class="hint">${timing[sc.id].start.toFixed(1)}–${timing[sc.id].end.toFixed(1)}s</span>` : ""}<span class="wc" style="margin-left:auto" data-wc></span></div>
            <div class="scene-grid">
              <div>
                <div class="field"><label class="f">Spoken line (read verbatim — only &lt;short pause&gt; &lt;breath&gt; &lt;laugh&gt;)</label><textarea data-k="line" rows="2">${esc(sc.line)}</textarea></div>
                <div class="grid g2" style="gap:8px"><div><label class="f">Delivery style (≤ 8 words)</label><input type="text" data-k="style" value="${esc(sc.style)}"/></div>
                <div><label class="f">Emphasis (comma-separated)</label><input type="text" data-k="emphasis" value="${esc((sc.emphasis ?? []).join(", "))}"/></div>
                <div class="span2"><label class="f">Fact tag (text @ word) — orange bar, hard facts only</label><input type="text" data-k="tag" value="${esc(sc.tag ? `${sc.tag.text}${sc.tag.at !== undefined ? ` @ ${sc.tag.at}` : ""}` : (sc.pop ?? []).join(", "))}" placeholder="3 STEPS @ steps"/></div>
                <div><label class="f">Camera punch-in words</label><input type="text" data-k="punch" value="${esc((sc.punch ?? []).join(", "))}" placeholder="e.g. ChatGPT"/></div>
                <div><label class="f">Sound cues (kind@word)</label><input type="text" data-k="sfx" value="${esc((sc.sfx ?? []).map((c) => `${c.kind}@${c.at}`).join(", "))}" placeholder="riser@three, hush@Clear"/></div></div>
              </div>
              <div>
                <label class="f">Narrator</label>
                <div class="sel4"><select data-k="layout" title="layout">${opt(LAYOUTS, sc.avatar.layout)}</select><select data-k="position" title="position">${opt(POSITIONS, sc.avatar.position ?? "left")}</select>
                <select data-k="gesture" title="gesture">${opt(gestures, sc.avatar.gesture ?? "rest")}</select><select data-k="expression" title="expression">${opt(EXPRS, sc.avatar.expression ?? "neutral")}</select></div>
                <details style="margin-top:10px"><summary class="hint">Visual JSON ${(v.type === "component" || v.type === "three") && !names.includes(v.name) ? '<span class="pill bad">unknown component</span>' : ""}</summary><textarea class="code" data-k="visual" rows="7">${esc(JSON.stringify(v, null, 2))}</textarea></details>
              </div>
            </div></div>`;
        }).join("")}</div>
        <div class="scene"><div class="scene-head"><span class="id">cta</span><span class="pill">${esc(s.cta.visual)}</span><span class="wc" style="margin-left:auto" data-wc-cta></span></div>
          <textarea id="cta-line" rows="1">${esc(s.cta.line)}</textarea></div>
        <div class="row" style="position:sticky;bottom:12px;background:var(--bg);padding:10px;border-radius:12px;border:1px solid var(--line)">
          <button class="btn primary" data-act="save-scene" data-slug="${e.slug}">Save & validate</button>
          <button class="btn" data-act="raw-scene">Edit raw JSON</button>
          <span class="hint">Saving clears the script approval.</span>
        </div>
        <div id="raw-wrap" style="display:none;margin-top:12px"><textarea class="code" id="raw-scene" rows="24">${esc(e.sceneRaw)}</textarea>
          <div class="row" style="margin-top:8px"><button class="btn primary" data-act="save-raw" data-slug="${e.slug}">Save raw JSON & validate</button></div></div>
      </div>
      <div>
        <div class="card" style="position:sticky;top:16px"><h2>Validation <span class="sub">${val ? ago(val.at) : ""}</span></h2><div id="val">${validationHtml(val)}</div>
          ${e.texts["component-requests.md"] ? `<h2 style="margin-top:16px">Component requests</h2>${md(e.texts["component-requests.md"])}` : ""}
        </div>
      </div>
    </div>`;
}
const validationHtml = (v) => !v ? `<div class="empty">Not validated yet.</div>` : `<ul class="issues">${v.errors.map((x) => `<li class="e">✗ ${esc(x)}</li>`).join("")}${v.warnings.map((x) => `<li class="w">! ${esc(x)}</li>`).join("")}${!v.errors.length ? `<li class="ok">✓ Passes — ${v.stats.scenes} scenes · ${v.stats.words} words · ~${v.stats.seconds}s</li>` : ""}</ul>`;

function bindScriptEditor() {
  const scenes = $("#scenes");
  if (!scenes) return;
  const count = () => {
    let total = 0;
    $$(".scene[data-i]").forEach((el) => {
      const n = el.querySelector('[data-k="line"]').value.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      total += n;
      const wc = el.querySelector("[data-wc]");
      wc.textContent = `${n} words · ~${(n / 2.5).toFixed(1)}s`;
      wc.classList.toggle("over", n > 20);
    });
    const c = ($("#cta-line")?.value ?? "").split(/\s+/).filter(Boolean).length;
    total += c;
    $("[data-wc-cta]").textContent = `${c} words`;
    $("#totals").textContent = `${total} words · ~${Math.round(total / 2.5)}s`;
  };
  scenes.addEventListener("input", count);
  $("#cta-line")?.addEventListener("input", count);
  count();
}

function collectScene() {
  const s = structuredClone(epCache.scene);
  $$(".scene[data-i]").forEach((el) => {
    const sc = s.scenes[+el.dataset.i];
    const g = (k) => el.querySelector(`[data-k="${k}"]`).value;
    sc.line = g("line").trim();
    sc.style = g("style").trim();
    const em = g("emphasis").split(",").map((x) => x.trim()).filter(Boolean);
    if (em.length) sc.emphasis = em; else delete sc.emphasis;
    const tagIn = g("tag").trim();
    delete sc.pop;
    if (tagIn) { const [text, at] = tagIn.split("@").map((x) => x.trim()); sc.tag = at ? { text, at } : { text }; } else delete sc.tag;
    const punch = g("punch").split(",").map((x) => x.trim()).filter(Boolean);
    if (punch.length) sc.punch = punch; else delete sc.punch;
    const cues = g("sfx").split(",").map((x) => x.trim()).filter(Boolean).map((c) => {
      const [kind, ...at] = c.split("@");
      if (!["riser", "scratch", "ding", "pop", "whoosh", "hush"].includes(kind.trim()) || !at.length) throw new Error(`${sc.id}: sound cue "${c}" — use kind@word with kind riser | hush | scratch | ding | pop | whoosh`);
      return { at: at.join("@").trim(), kind: kind.trim() };
    });
    if (cues.length) sc.sfx = cues; else delete sc.sfx;
    sc.avatar = { ...sc.avatar, layout: g("layout"), position: g("position"), gesture: g("gesture"), expression: g("expression") };
    try { sc.visual = JSON.parse(g("visual")); } catch { throw new Error(`${sc.id}: visual JSON is invalid`); }
  });
  s.cta.line = $("#cta-line").value.trim();
  s.hook.text = s.scenes[0].line.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if ($("#cam-toggle").checked) delete s.camera; else s.camera = false;
  if ($("#card-style").value === "chat") delete s.cardStyle; else s.cardStyle = $("#card-style").value;
  const preset = $("#cap-preset").value, titleText = $("#cap-title").value.trim(), until = $("#cap-until").value.trim();
  if (preset === "off") delete s.captions;
  else s.captions = { preset, subtitles: $("#cap-subs").checked, tags: true, ...(titleText ? { title: { text: titleText, ...(until ? { until: /^\d+(\.\d+)?$/.test(until) ? +until : until } : {}) } } : {}) };
  return s;
}

async function timelineTab(e) {
  const { text } = await api(`/api/episodes/${e.slug}/timeline`);
  const scenes = e.timing?.scenes ?? [];
  const total = e.timing?.duration ?? 1;
  const colors = { board: "var(--ink)", component: "var(--info)", three: "var(--accent)", stock: "var(--good)" };
  const typeOf = (id) => id === "cta" ? "component" : e.scene?.scenes.find((s) => s.id === id)?.visual.type;
  return `<div class="card" style="margin-bottom:14px"><h2>Cut <span class="sub">${e.timing ? `real word timings · ${secs(total)}` : "no voice yet — estimates"}</span></h2>
    ${scenes.length ? `<div style="display:flex;height:46px;border-radius:10px;overflow:hidden;border:1px solid var(--line)">${scenes.map((s) => `<div title="${s.id} ${s.start.toFixed(1)}–${s.end.toFixed(1)}s" style="flex:${s.end - s.start};background:${colors[typeOf(s.id)] ?? "var(--line-2)"};color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;border-right:2px solid var(--panel)">${s.id}</div>`).join("")}</div>
      <div class="row hint" style="margin-top:8px">${Object.entries(colors).map(([k, c]) => `<span><span class="dot" style="background:${c}"></span> ${k}</span>`).join("")}</div>` : '<div class="empty">Run the voice step to get the real cut.</div>'}
    <p class="hint">This is exactly what Claude reads in the producer pass (<span class="kbd">npm run timeline ${e.slug}</span>). ⚠ marks pacing gaps or missing assets.</p></div>
    <div class="card"><pre class="mono" style="white-space:pre-wrap;margin:0;line-height:1.55">${esc(text)}</pre></div>`;
}

function textTab(e, file) {
  const text = e.texts[file];
  const skill = { "brief.md": "research-brief", "hooks.md": "hook-writer", "blog.md": "repurpose", "thread.md": "repurpose", "captions.md": "repurpose" }[file];
  return `<div class="grid g2">
    <div class="card"><h2>${file} <span class="sub"><button class="btn sm" data-act="copy-text" data-file="${file}">Copy</button> ${skill ? `<button class="btn sm" data-act="skill" data-skill="${skill}" data-slug="${e.slug}">${I.claude} /${skill}</button>` : ""}${file === "blog.md" ? ` <button class="btn sm" data-act="skill" data-skill="geo-optimizer" data-slug="${e.slug}">/geo-optimizer</button>` : ""}</span></h2>${md(text)}
      ${file === "blog.md" && e.texts["schema.json"] ? `<details style="margin-top:12px"><summary>JSON-LD schema.json</summary><pre class="mono" style="white-space:pre-wrap">${esc(e.texts["schema.json"])}</pre></details>` : ""}</div>
    <div class="card"><h2>Edit</h2><textarea class="code" id="text-edit" rows="28" style="min-height:420px">${esc(text ?? "")}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn primary" data-act="save-text" data-file="${file}" data-slug="${e.slug}">Save</button></div></div></div>`;
}

function videoTab(e) {
  const v = (f, label) => `<div class="card"><h2>${label}</h2><div class="video-wrap"><video src="/media/${e.slug}/out/${f}?t=${Date.now()}" controls playsinline></video></div><div class="row" style="margin-top:10px;justify-content:center"><a class="btn sm" href="/media/${e.slug}/out/${f}" download>Download</a></div></div>`;
  return `<div class="grid g3">
    ${e.hasFinal ? v("final.mp4", "Final render") : `<div class="card"><h2>Final render</h2><div class="empty">Not rendered yet.<br><br><button class="btn primary" data-act="step" data-step="render" data-slug="${e.slug}">Render final</button></div></div>`}
    ${e.hasPreview ? v("preview.mp4", "Preview (half-res)") : `<div class="card"><h2>Preview</h2><div class="empty">A half-resolution render is ~3× faster.<br><br><button class="btn" data-act="step" data-step="preview" data-slug="${e.slug}">Render preview</button></div></div>`}
    <div class="card"><h2>Voice</h2>${e.hasAudio ? `<audio src="/media/${e.slug}/audio/voice.wav?t=${Date.now()}" controls style="width:100%"></audio>
      <div class="hint" style="margin-top:8px">${esc(e.voice?.provider ?? "")} · ${esc(e.voice?.model ?? "")} · ${esc(e.voice?.voice ?? "")} · ${secs(e.voice?.duration)}${e.timing ? ` · whisper matched ${Math.round((e.timing.matchedRatio ?? 0) * 100)}% of words` : ""}</div>
      <div class="row" style="margin-top:10px"><button class="btn sm" data-act="tts-force" data-slug="${e.slug}">Re-generate voice (skip cache)</button></div>
      ${e.hasSubtitles ? `<h2 style="margin-top:18px">Subtitles</h2><p class="hint">Upload as platform captions (YouTube, X) — made from the whisper word timings.</p><div class="row"><a class="btn sm" href="/media/${e.slug}/out/captions.srt" download>captions.srt</a><a class="btn sm" href="/media/${e.slug}/out/captions.vtt" download>captions.vtt</a></div>` : ""}` : `<div class="empty">No voice yet.<br><br><button class="btn" data-act="step" data-step="tts" data-slug="${e.slug}">Generate voice</button></div>`}
      <h2 style="margin-top:18px">Remotion Studio</h2><p class="hint">Scrub the timeline, nudge props and render from the Studio UI. Opens on port 3100.</p>
      <button class="btn" data-act="studio" data-slug="${e.slug}">Open in Studio</button></div>
  </div>`;
}

function assetsTab(e) {
  const m = e.manifest;
  if (!m || !Object.keys(m).length) return `<div class="empty">No assets fetched yet (or no stock / query visuals in this script).<br><br><button class="btn" data-act="step" data-step="assets" data-slug="${e.slug}">Fetch assets</button></div>`;
  return `<div class="row" style="margin-bottom:12px"><button class="btn" data-act="step" data-step="assets" data-slug="${e.slug}">Re-fetch assets</button><span class="hint">Library first (30-day reuse rule) → Pexels → Pixabay → Magnific. Licenses logged in assets/manifest.json.</span></div>
  <div class="grid g4">${Object.entries(m).map(([k, a]) => `<div class="asset"><div class="thumb">${a.file ? (a.kind === "photo" || /\.(jpe?g|png|webp)$/i.test(a.file) ? `<img src="/media/${e.slug}/${a.file}" loading="lazy">` : `<video src="/media/${e.slug}/${a.file}#t=1" muted preload="metadata"></video>`) : `fallback → ${esc(a.fallback ?? "icon")}`}</div>
    <div class="meta"><b class="mono">${esc(k)}</b> ${a.file ? `<span class="pill good">${esc(a.source)}</span>` : '<span class="pill warn">no match</span>'}<div class="hint">“${esc(a.query)}”</div>${a.author ? `<div class="hint">${esc(a.author)} · ${esc(a.license)}${a.pageUrl ? ` · <a href="${esc(a.pageUrl)}" target="_blank">source</a>` : ""}</div>` : ""}</div></div>`).join("")}</div>`;
}

function postTab(e) {
  const today = new Date().toISOString().slice(0, 10);
  return `<div class="grid g2">
    <div class="card"><h2>Posted to</h2>
      ${["youtube", "instagram", "x", "blog"].map((p) => `<div class="li"><div class="grow"><div class="t">${{ youtube: "YouTube Shorts", instagram: "Instagram Reels", x: "X", blog: "Blog" }[p]}</div><div class="s">${e.posted[p] ? `Posted ${esc(e.posted[p])}` : "Not yet"}</div></div><button class="btn sm ${e.posted[p] ? "" : "primary"}" data-act="posted" data-p="${p}" data-slug="${e.slug}">${e.posted[p] ? "Update date" : "Mark posted"}</button></div>`).join("")}
      <h2 style="margin-top:18px">Your minutes on this video</h2>
      <div class="row"><input type="number" id="minutes" value="${e.minutes ?? ""}" style="width:110px" placeholder="min"/><button class="btn" data-act="minutes" data-slug="${e.slug}">Save</button><span class="hint">Goal: under 30.</span></div></div>
    <div class="card"><h2>Log results <span class="sub">→ analytics/results.csv</span></h2>
      <form id="result-form" class="grid g2" style="gap:10px">
        <input type="hidden" name="slug" value="${e.slug}"/><input type="hidden" name="pillar" value="${esc(e.pillar ?? "")}"/><input type="hidden" name="format" value="${esc(e.format ?? "")}"/>
        <input type="hidden" name="hook_pattern" value="${esc(e.scene?.hook?.pattern ?? "")}"/><input type="hidden" name="length_s" value="${e.duration ? Math.round(e.duration) : ""}"/>
        <input type="hidden" name="layout" value="${esc(e.scene ? mostCommon(e.scene.scenes.map((s) => s.avatar.layout)) : "")}"/>
        <div><label class="f">Date</label><input type="date" name="date" value="${today}"/></div>
        <div><label class="f">Platform</label><select name="platform"><option>youtube</option><option>instagram</option><option>x</option><option>blog</option></select></div>
        ${[["views", "Views"], ["viewed_vs_swiped_pct", "Viewed vs swiped %"], ["avg_pct_viewed", "Avg % viewed"], ["likes", "Likes"], ["shares", "Shares"], ["saves", "Saves"], ["follows", "Follows"], ["minutes_spent", "Your minutes"]].map(([k, l]) => `<div><label class="f">${l}</label><input type="number" step="any" name="${k}"/></div>`).join("")}
        <div class="span2"><label class="f">URL</label><input type="text" name="url"/></div>
        <div class="span2"><label class="f">Notes</label><input type="text" name="notes"/></div>
        <div class="span2"><button class="btn primary" type="submit">Add row</button></div>
      </form></div></div>`;
}
/** scene.json captions (old shorthands or the object form) → { preset, subtitles, tags, title }. */
const capCfg = (c) => (!c || c === "off" ? { preset: "off", subtitles: false } : c === true || c === "full" ? { preset: "boxed", subtitles: true } : c === "keywords" ? { preset: "boxed", subtitles: false } : { preset: c.preset ?? "boxed", subtitles: c.subtitles ?? true, title: c.title });
const mostCommon = (arr) => Object.entries(arr.reduce((a, x) => ((a[x] = (a[x] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

// ---------------------------------------------------------------- inbox
views.inbox = async () => {
  const items = await api("/api/inbox");
  renderNav({ inbox: items.length });
  view.innerHTML = `
    <div class="top"><div><h1>Inbox</h1><p>Briefs waiting to be drafted. Ten minutes each — your angle is the one field Claude can't fill.</p></div>
      <button class="btn primary" data-act="draft-all" ${items.some((b) => b.angleReady) ? "" : "disabled"}>${I.claude} Draft all ready briefs</button></div>
    <div class="grid g2">
      <div class="card"><h2>New brief</h2>
        <form id="brief-form">
          <div class="grid g2" style="gap:10px">
            <div class="span2"><label class="f">Slug (kebab-case, becomes the folder name)</label><input type="text" name="slug" placeholder="geo-citations" required pattern="[a-z0-9]+(-[a-z0-9]+)*"/></div>
            <div><label class="f">Pillar</label><select name="pillar"><option>GEO</option><option>SEO</option><option>AIO</option></select></div>
            <div><label class="f">Format</label><select name="format"><option>explainer</option><option>myth-bust</option><option>tutorial</option><option>news-take</option><option>comparison</option></select></div>
            <div><label class="f">Target length</label><select name="length"><option value="30">30 s</option><option value="45" selected>45 s</option><option value="60">60 s</option></select></div>
            <div><label class="f">CTA</label><input type="text" name="cta" value="Follow for one GEO tip a day"/></div>
            <div class="span2"><label class="f">Topic</label><input type="text" name="topic" placeholder="How AI answer engines choose which sources to cite" required/></div>
            <div class="span2"><label class="f">My angle — your opinion, 1–2 sentences (required)</label><textarea name="angle" rows="2" required></textarea></div>
            <div class="span2"><label class="f">Key points (one per line)</label><textarea name="points" rows="3"></textarea></div>
            <div class="span2"><label class="f">Sources (one per line: URL : what it proves)</label><textarea name="sources" rows="3"></textarea></div>
          </div>
          <div class="row" style="margin-top:12px"><button class="btn primary" type="submit">Add to inbox</button></div>
        </form></div>
      <div>${items.length ? items.map((b) => `<div class="card" style="margin-bottom:12px"><h2>${esc(b.topic || b.slug)} <span class="sub mono">${b.slug}</span></h2>
          <div class="row" style="margin-bottom:10px"><span class="pill">${esc(b.pillar ?? "?")}</span><span class="pill">${esc(b.format ?? "?")}</span><span class="pill">${esc(b.length ?? "?")}s</span>${b.angleReady ? '<span class="pill good">angle ✓</span>' : '<span class="pill warn">needs your angle</span>'}<span class="muted" style="margin-left:auto">${ago(b.mtime)}</span></div>
          <details><summary class="hint">Edit brief</summary><textarea class="code" data-inbox="${b.slug}" rows="16">${esc(b.raw)}</textarea><div class="row" style="margin-top:8px"><button class="btn sm primary" data-act="save-inbox" data-slug="${b.slug}">Save</button><button class="btn sm" data-act="archive-inbox" data-slug="${b.slug}">Archive</button></div></details>
          <div class="row" style="margin-top:10px"><button class="btn primary" data-act="skill" data-skill="draft" data-slug="${b.slug}" ${b.angleReady ? "" : "disabled"}>${I.claude} /draft ${b.slug}</button><span class="hint">or run <span class="kbd">/draft ${b.slug}</span> in Claude Code</span></div></div>`).join("") : `<div class="empty">Inbox is empty. Add a brief on the left, or run <span class="kbd">npm run new &lt;slug&gt;</span>.</div>`}</div>
    </div>`;
};

// ---------------------------------------------------------------- roadmap
views.roadmap = async () => {
  const rm = await api("/api/roadmap");
  view.innerHTML = `
    <div class="top"><div><h1>Roadmap</h1><p>Two build weeks, then publish in blocks of five. Each diamond is a gate — don't start the next phase until it passes.</p></div>
      <div style="min-width:220px"><div class="row" style="justify-content:space-between"><b>${rm.done}/${rm.total}</b><span class="hint">${Math.round((rm.done / rm.total) * 100)}%</span></div><div class="bar accent"><i style="width:${(rm.done / rm.total) * 100}%"></i></div></div></div>
    <div class="grid g3">${rm.phases.map((p) => `<div class="card"><h2>${esc(p.title)} <span class="sub">${p.done}/${p.total}</span></h2><div class="bar" style="margin-bottom:10px"><i style="width:${(p.done / p.total) * 100}%"></i></div>
      ${p.items.map((it) => `<div class="check ${it.done ? "done" : ""} ${it.autoDone ? "auto" : ""}" ${it.autoDone ? "" : `data-act="toggle-rm" data-id="${it.id}"`}><span class="box">${it.done ? "✓" : ""}</span><span class="txt">${esc(it.text)}${it.autoDone ? ' <span class="pill good">auto</span>' : it.auto && !it.done ? ' <span class="pill">detects automatically</span>' : ""}</span></div>`).join("")}
      <div class="gate ${p.done === p.total ? "pass" : ""} ${p.highlight ? "hl" : ""}"><span class="dia"></span><span><b>Gate:</b> ${esc(p.gate)}</span></div></div>`).join("")}</div>
    <div class="sp"></div>
    <div class="card"><h2>Operating plan · blocks of five <span class="sub">${rm.publishedCount} published · change one thing per block</span></h2>
      <div class="table-wrap"><table><thead><tr><th>Videos</th><th>Phase</th><th>What changes</th><th>Held constant</th><th></th></tr></thead><tbody>
      ${rm.blocks.map((b) => { const cur = rm.currentBlock && rm.currentBlock.from === b.from; return `<tr style="${cur ? "background:var(--accent-soft)" : ""}"><td><b>${b.from}${b.to > 900 ? "+" : `–${b.to}`}</b></td><td>${esc(b.phase)}</td><td>${esc(b.changes)}</td><td class="muted">${esc(b.held)}</td><td>${cur ? '<span class="pill accent">current</span>' : rm.publishedCount >= b.to ? '<span class="pill good">done</span>' : ""}</td></tr>`; }).join("")}
      </tbody></table></div>
      <p class="hint" style="margin-top:10px">Run <span class="kbd">/retro</span> in Claude Code after every five published videos. At the end of month 3: did one format clearly win, are you under 30 min/video, has any AI answer cited the blog?</p></div>`;
};

// ---------------------------------------------------------------- skills
views.skills = async () => {
  const sk = await api("/api/skills");
  const order = ["draft", "research-brief", "hook-writer", "script-writer", "director", "critic", "repurpose", "geo-optimizer", "produce", "component-builder", "retro"];
  sk.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  view.innerHTML = `
    <div class="top"><div><h1>Skills & commands</h1><p>Everything lives in <span class="kbd">.claude/skills/</span>. Type <span class="kbd">/name</span> in Claude Code, or run them from an episode page.</p></div></div>
    <div class="card"><h2>Commands</h2><div class="table-wrap"><table><thead><tr><th>Command</th><th>What it does</th><th>Uses Claude</th></tr></thead><tbody>
      ${[["/draft <slug>", "Writes everything for one brief", "Yes — the main spend per video"], ["/draft", "Writes everything for every brief in the inbox", "Yes — cheapest per video"], ["/hook-writer <slug>", "Redoes the hook", "Small"], ["/script-writer <slug>", "Redoes the script", "Small"], ["/director <slug>", "Re-directs visuals and narrator beats", "Small"], ["/produce <slug>", "Producer pass: voice, re-time visuals to real word timestamps, fix assets, render", "Small–medium"], ["npm run episode <slug>", "Same pipeline, straight from the terminal", "None"], ["npm run studio <slug>", "Opens Remotion Studio on one episode", "None"], ["npm run validate <slug>", "Checks scene.json", "None"], ["npm run new <slug>", "Creates a brief in the inbox", "None"], ["/component-builder <Name> <what>", "Adds a new motion graphic to the library", "Medium, build weeks only"], ["/retro", "Learning pass over your latest five videos", "Small"], ["npm run doctor", "Checks tools, keys and avatar", "None"]].map(([c, d, u]) => `<tr><td><span class="kbd copy" data-act="copy" data-text="${esc(c)}">${esc(c)}</span></td><td>${esc(d)}</td><td class="muted">${esc(u)}</td></tr>`).join("")}
    </tbody></table></div></div>
    <div class="sp"></div>
    <div class="grid g2">${sk.map((s) => `<div class="card"><h2>/${esc(s.name)} <span class="sub">${s.manualOnly ? '<span class="pill">you only</span>' : '<span class="pill info">Claude or you</span>'} ${s.fork ? '<span class="pill accent">forked subagent</span>' : ""} ${s.model ? `<span class="pill">model: ${esc(s.model)}</span>` : ""}</span></h2>
      <p class="muted" style="margin-top:0">${esc(s.description)}</p>
      <div class="row"><span class="kbd copy" data-act="copy" data-text="/${esc(s.name)} ${esc(s.argumentHint.replace(/[[\]]/g, "").split(",")[0])}">/${esc(s.name)} ${esc(s.argumentHint)}</span><span class="hint">${s.files.length > 1 ? `+ ${s.files.filter((f) => f !== "SKILL.md").join(", ")}` : ""}</span></div>
      <details style="margin-top:10px"><summary class="hint">Show SKILL.md</summary>${md(s.body)}</details></div>`).join("")}</div>`;
};

// ---------------------------------------------------------------- components
views.components = async () => {
  const c = await api("/api/catalog");
  view.innerHTML = `
    <div class="top"><div><h1>Components</h1><p>The motion-graphic library the director picks from — or builds into. Add more with <span class="kbd">/component-builder</span>.</p></div></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Use for</th><th>Props</th></tr></thead><tbody>
    ${Object.entries(c).map(([n, x]) => `<tr><td><b>${esc(n)}</b></td><td><span class="pill ${x.type === "three" ? "accent" : ""}">${x.type === "three" ? "3D" : "motion"}</span></td><td>${esc(x.use)}</td><td class="mono" style="font-size:12px">${Object.entries(x.props).map(([k, t]) => `<div><b>${esc(k)}</b>: <span class="muted">${esc(t)}</span></div>`).join("")}</td></tr>`).join("")}
    </tbody></table></div></div>
    <div class="sp"></div>
    <div class="card"><h2>Icon specs</h2><p class="muted" style="margin-top:0">Used by Diagram, Toggle, DeviceFrame and ProfileList.</p>
      <div class="table-wrap"><table><tbody>
        <tr><td class="mono">logo:&lt;slug&gt;</td><td>Brand logo tile from simple-icons — google, youtube, instagram, x, tiktok, perplexity, wordpress, shopify… (OpenAI isn't included — use line:robot)</td></tr>
        <tr><td class="mono">emoji:🎓</td><td>Emoji sticker</td></tr>
        <tr><td class="mono">line:&lt;name&gt;</td><td>users, user, search, link, chart, doc, globe, lock, check, cross, bolt, star, clock, money, mail, phone, laptop, robot, heart, eye</td></tr>
        <tr><td class="mono">text:+10M</td><td>Big bold text in place of an icon</td></tr>
        <tr><td class="mono">{ "query": "…" }</td><td>On a node or item: fetch-assets downloads a matching photo (no Claude tokens)</td></tr>
      </tbody></table></div></div>`;
};

// ---------------------------------------------------------------- avatar
let avatarState = { mouth: "A", eyes: "open", brows: "neutral", left: "rest", right: "rest", pose: null };
views.avatar = async () => {
  const a = await api("/api/avatar");
  const has = (id) => [...a.required, ...a.optional].find((g) => g.id === id)?.ok || a.poses.includes(id.replace(/^pose-/, ""));
  const chip = (group, val, id) => `<span class="chip ${avatarState[group] === val ? "on" : ""} ${has(id) ? "" : "missing"}" data-act="av" data-g="${group}" data-v="${val}">${val}</span>`;
  view.innerHTML = `
    <div class="top"><div><h1>Avatar</h1><p>${a.isPlaceholder ? 'Using the <b>placeholder</b> narrator. Export your layered SVG to <span class="kbd">avatar/avatar.svg</span> and this page checks every layer.' : "Your avatar is in. Click through the layers to check each one swaps cleanly."}</p></div>
      <button class="btn" data-act="reload">Re-check file</button></div>
    <div class="grid g3">
      <div class="card"><div class="avatar-stage" id="stage">${a.svg ?? ""}</div><p class="hint mono" style="margin-top:8px">${esc(a.file.replace(/^.*?(avatar\/)/, "$1"))} · viewBox ${esc(a.viewBox ?? "?")}</p></div>
      <div class="card"><h2>Test the rig</h2>
        <label class="f">Mouth (Rhubarb shapes)</label><div class="chips">${"ABCDEFGHX".split("").map((m) => chip("mouth", m, `mouth-${m}`)).join("")}</div><div class="sp"></div>
        <label class="f">Eyes</label><div class="chips">${chip("eyes", "open", "eyes-open")}${chip("eyes", "closed", "eyes-closed")}</div><div class="sp"></div>
        <label class="f">Brows (expression)</label><div class="chips">${EXPRS.map((x) => chip("brows", x, `brows-${x}`)).join("")}</div><div class="sp"></div>
        <label class="f">Left arm</label><div class="chips">${GESTURES.map((x) => chip("left", x, `arm-left-${x}`)).join("")}</div><div class="sp"></div>
        <label class="f">Right arm</label><div class="chips">${GESTURES.map((x) => chip("right", x, `arm-right-${x}`)).join("")}</div><div class="sp"></div>
        <label class="f">Whole-body poses</label><div class="chips">${a.poses.length ? [`<span class="chip ${!avatarState.pose ? "on" : ""}" data-act="av" data-g="pose" data-v="">none</span>`, ...a.poses.map((p) => `<span class="chip ${avatarState.pose === p ? "on" : ""}" data-act="av" data-g="pose" data-v="${esc(p)}">${esc(p)}</span>`)].join("") : '<span class="hint">None yet — add groups named pose-&lt;name&gt; (e.g. pose-thinking) for reference-style pose changes.</span>'}</div>
        <div class="sp"></div><button class="btn sm" data-act="av-talk">▶ Simulate talking</button>
      </div>
      <div class="card"><h2>Layers <span class="sub">${a.required.filter((g) => g.ok).length}/${a.required.length} required</span></h2>
        <div class="list">${a.required.map((g) => `<div class="li"><span class="dot ${g.ok ? "done" : "failed"}"></span><span class="mono grow">${g.id}</span><span class="pill">required</span></div>`).join("")}
        ${a.optional.map((g) => `<div class="li"><span class="dot ${g.ok ? "done" : ""}"></span><span class="mono grow">${g.id}</span><span class="muted">optional</span></div>`).join("")}</div>
        <p class="hint">Full spec: <span class="kbd">avatar/README.md</span>. Pivots: <span class="kbd">rig.json</span> ${a.rig ? `<code>${esc(JSON.stringify(a.rig.pivots ?? {}))}</code>` : ""}</p></div>
    </div>`;
  applyAvatar();
};
function applyAvatar() {
  const svg = $("#stage svg");
  if (!svg) return;
  const all = $$("[id]", svg);
  const norm = (id) => id.replace(/_\d+_$/, "").replace(/(-|_)\d+$/, "");
  const set = (prefix, keep) => all.forEach((el) => { const n = norm(el.id); if (n.toLowerCase().startsWith(prefix.toLowerCase())) el.style.display = n.toLowerCase() === keep.toLowerCase() ? "" : "none"; });
  set("mouth-", `mouth-${avatarState.mouth}`);
  set("eyes-", `eyes-${avatarState.eyes}`);
  set("brows-", `brows-${avatarState.brows}`);
  const armVariant = (side, g) => all.some((el) => norm(el.id) === `arm-${side}-${g}`) ? g : "rest";
  set("arm-left-", `arm-left-${armVariant("left", avatarState.left)}`);
  set("arm-right-", `arm-right-${armVariant("right", avatarState.right)}`);
  set("pose-", avatarState.pose ? `pose-${avatarState.pose}` : "pose-__none");
  ["body", "head", "arm-left", "arm-right"].forEach((id) => all.filter((el) => norm(el.id) === id).forEach((el) => (el.style.display = avatarState.pose ? "none" : "")));
}
let talkTimer = null;

// ---------------------------------------------------------------- analytics
views.analytics = async () => {
  const { rows } = await api("/api/analytics");
  const num = (v) => (v === "" || v == null ? null : +v);
  const groupAvg = (key, metric) => {
    const g = {};
    rows.forEach((r) => { const v = num(r[metric]); if (v == null || !r[key]) return; (g[r[key]] ??= []).push(v); });
    return Object.entries(g).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length, v.length]).sort((a, b) => b[1] - a[1]);
  };
  const bars = (title, data, unit = "%") => `<div class="card"><h2>${title}</h2>${data.length ? data.map(([k, v, n]) => `<div style="margin-bottom:10px"><div class="row" style="justify-content:space-between"><span><b>${esc(k)}</b> <span class="hint">n=${n}</span></span><span>${v.toFixed(1)}${unit}</span></div><div class="bar"><i style="width:${Math.min(100, v)}%"></i></div></div>`).join("") : '<div class="empty">No data yet.</div>'}</div>`;
  const mins = rows.map((r) => num(r.minutes_spent)).filter((x) => x != null);
  view.innerHTML = `
    <div class="top"><div><h1>Analytics</h1><p>One row per post in <span class="kbd">analytics/results.csv</span>. Log results from an episode's <b>Post & log</b> tab a few days after posting.</p></div></div>
    <div class="grid g4">
      <div class="card stat"><div class="n">${rows.length}</div><div class="l">Rows logged</div></div>
      <div class="card stat"><div class="n">${new Set(rows.map((r) => r.slug)).size}</div><div class="l">Videos</div></div>
      <div class="card stat"><div class="n">${mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : "—"}</div><div class="l">Avg minutes / video (goal &lt; 30)</div></div>
      <div class="card stat"><div class="n">${rows.filter((r) => r.blog_cited_by).length}</div><div class="l">AI citations of the blog</div></div>
    </div><div class="sp"></div>
    <div class="grid g3">${bars("Viewed vs swiped · by hook pattern", groupAvg("hook_pattern", "viewed_vs_swiped_pct"))}${bars("Avg % viewed · by format", groupAvg("format", "avg_pct_viewed"))}${bars("Avg % viewed · by layout", groupAvg("layout", "avg_pct_viewed"))}</div>
    <div class="sp"></div>
    <div class="card"><h2>All rows</h2>${rows.length ? `<div class="table-wrap"><table><thead><tr>${["date", "slug", "platform", "hook_pattern", "views", "viewed_vs_swiped_pct", "avg_pct_viewed", "shares", "saves", "follows", "minutes_spent"].map((c) => `<th>${c.replace(/_/g, " ")}</th>`).join("")}</tr></thead><tbody>${rows.slice().reverse().map((r) => `<tr>${["date", "slug", "platform", "hook_pattern", "views", "viewed_vs_swiped_pct", "avg_pct_viewed", "shares", "saves", "follows", "minutes_spent"].map((c) => `<td>${c === "slug" ? `<a href="#/episodes/${esc(r.slug)}">${esc(r.slug)}</a>` : esc(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : '<div class="empty">Nothing logged yet.</div>'}</div>`;
};

// ---------------------------------------------------------------- jobs
views.jobs = async () => {
  const jobs = await api("/api/jobs");
  view.innerHTML = `<div class="top"><div><h1>Jobs</h1><p>Pipeline scripts and Claude runs started from this dashboard (this session).</p></div></div><div class="card">${jobsList(jobs)}</div>`;
};

// ---------------------------------------------------------------- setup
views.setup = async () => {
  const [h, s] = await Promise.all([api("/api/health"), api("/api/settings")]);
  const groups = [...new Set(h.map((x) => x.group))];
  view.innerHTML = `
    <div class="top"><div><h1>Setup</h1><p>Tools, keys and the avatar. Keys are written to <span class="kbd">.env</span> (git-ignored) and never shown back.</p></div>
      <div class="row"><button class="btn" data-act="job" data-kind="setup-tools">Install / update tools</button><button class="btn" data-act="job" data-kind="test-render">Test render</button><button class="btn" data-act="reload">Re-check</button></div></div>
    <div class="grid g2">
      <div>${groups.map((g) => `<div class="card" style="margin-bottom:14px"><h2>${esc(g)}</h2><div class="list">${h.filter((x) => x.group === g).map((x) => `<div class="li"><span class="dot ${x.ok ? "done" : x.level === "required" ? "failed" : "skipped"}"></span><div class="grow"><div class="t">${esc(x.name)} <span class="pill">${x.level}</span></div><div class="s">${esc(x.detail)}${!x.ok && x.fix ? ` → ${esc(x.fix)}` : ""}</div></div></div>`).join("")}</div></div>`).join("")}</div>
      <div>
        <div class="card" style="margin-bottom:14px"><h2>API keys</h2>
          ${s.secret.map((k) => `<div class="field"><label class="f">${k.key} ${k.set ? '<span class="pill good">set</span>' : '<span class="pill warn">empty</span>'}</label><div class="row" style="flex-wrap:nowrap"><input type="password" autocomplete="off" data-env="${k.key}" placeholder="${k.set ? "•••••••• (leave blank to keep)" : "paste key"}"/><button class="btn" data-act="save-env" data-key="${k.key}">Save</button></div></div>`).join("")}
          <p class="hint">Gemini: aistudio.google.com → API keys. Pexels: pexels.com/api. Pixabay: pixabay.com/api/docs. Magnific runs through the Magnific MCP in Claude — no key needed (the field is only for the optional API).</p></div>
        <div class="card"><h2>Voice & settings</h2>
          ${s.plain.map((k) => `<div class="field"><label class="f">${k.key}</label><div class="row" style="flex-wrap:nowrap">${k.key === "TTS_PROVIDER" ? `<select data-env="${k.key}">${["magnific", "gemini", "elevenlabs", "local"].map((o) => `<option ${o === (k.value || "gemini") ? "selected" : ""}>${o}</option>`).join("")}</select>` : k.key === "MAGNIFIC_VOICE_ENERGY" ? `<select data-env="${k.key}">${["natural", "upbeat", "high"].map((o) => `<option ${o === (k.value || "natural") ? "selected" : ""}>${o}</option>`).join("")}</select>` : `<input type="text" data-env="${k.key}" value="${esc(k.value)}"/>`}<button class="btn" data-act="save-env" data-key="${k.key}">Save</button></div></div>`).join("")}
          <p class="hint"><b>TTS_PROVIDER=magnific</b>: Claude makes the voice-over with the Magnific MCP (ElevenLabs v3); <b>MAGNIFIC_VOICE_ID</b> is a Magnific voice id (1213 = Fletcher Rowan Whitaker). For your own cloned voice set <b>MAGNIFIC_VOICE_SOURCE=mine</b>. Enthusiasm: <b>MAGNIFIC_VOICE_ENERGY</b> natural · upbeat · high, <b>MAGNIFIC_VOICE_STABILITY</b> (0.3 lively – 0.7 steady), <b>MAGNIFIC_VOICE_SPEED</b> (0.7–1.2). <b>GEMINI_VOICE_ID</b>: a prebuilt voice (e.g. Kore) until your replicated <span class="kbd">voice_…</span> ID is ready. <b>TTS_PROVIDER=local</b> uses the free macOS voice to test the pipeline. <b>LOCAL_VOICE</b>: a macOS voice name (default Daniel).</p></div>
      </div></div>`;
};

// ---------------------------------------------------------------- router
async function render() {
  const [route, ...args] = location.hash.replace(/^#\/?/, "").split("/");
  renderNav();
  current = { route, args };
  clearInterval(talkTimer);
  try { await (views[route] ?? views[""])(args); } catch (e) { view.innerHTML = `<div class="empty">Couldn't load: ${esc(e.message)}</div>`; }
  renderNav();
}
async function refreshCurrent() {
  if (document.activeElement?.matches("textarea, input, select")) return; // don't clobber edits
  const y = scrollY;
  await render();
  scrollTo(0, y);
}
window.addEventListener("hashchange", () => { scrollTo(0, 0); render(); });

// ---------------------------------------------------------------- actions
document.addEventListener("click", async (ev) => {
  const t = ev.target.closest("[data-act]");
  if (!t) return;
  const { act, slug } = t.dataset;
  try {
    switch (act) {
      case "draft-all": return runJob("draft", "");
      case "produce": return runJob("episode", slug);
      case "studio": return runJob("studio", slug);
      case "step": return runJob(t.dataset.step, slug);
      case "from": return runJob("episode", slug, { from: t.dataset.step });
      case "tts-force": return runJob("tts", slug, { force: true });
      case "job": return runJob(t.dataset.kind);
      case "skill": return runJob(t.dataset.skill === "draft" ? "draft" : "skill", slug, { skill: t.dataset.skill });
      case "skill-menu": { const m = $("#skill-menu"); m.style.display = m.style.display === "none" ? "" : "none"; return; }
      case "log": return openConsole(t.dataset.id, t.dataset.title);
      case "reload": return render();
      case "approve": await api(`/api/episodes/${slug}/approve`, { body: { what: t.dataset.what, value: !!t.dataset.v } }); toast(t.dataset.v ? "Approved" : "Approval cleared"); return render();
      case "save-scene": case "save-raw": {
        const data = act === "save-raw" ? $("#raw-scene").value : collectScene();
        const v = await api(`/api/episodes/${slug}/scene`, { method: "PUT", body: typeof data === "string" ? data : data });
        toast(v.errors.length ? `Saved — ${v.errors.length} validation error(s)` : "Saved — validation passes", !!v.errors.length);
        return render();
      }
      case "raw-scene": { const w = $("#raw-wrap"); w.style.display = w.style.display === "none" ? "" : "none"; return; }
      case "save-text": await api(`/api/episodes/${slug}/file/${t.dataset.file}`, { method: "PUT", body: { text: $("#text-edit").value } }); toast("Saved"); return render();
      case "copy-text": await navigator.clipboard.writeText(epCache.texts[t.dataset.file] ?? ""); return toast("Copied");
      case "copy": await navigator.clipboard.writeText(t.dataset.text); return toast(`Copied ${t.dataset.text}`);
      case "save-inbox": await api(`/api/inbox/${slug}`, { method: "PUT", body: { text: $(`[data-inbox="${slug}"]`).value } }); toast("Brief saved"); return render();
      case "archive-inbox": await api(`/api/inbox/${slug}/archive`, { body: {} }); toast("Archived"); return render();
      case "toggle-rm": await api(`/api/roadmap/${t.dataset.id}`, { body: {} }); return render();
      case "posted": { const d = prompt("Posted on (YYYY-MM-DD)", new Date().toISOString().slice(0, 10)); if (!d) return; await api(`/api/episodes/${slug}/meta`, { body: { posted: { [t.dataset.p]: d } } }); return render(); }
      case "minutes": await api(`/api/episodes/${slug}/meta`, { body: { minutes: $("#minutes").value } }); return toast("Saved");
      case "save-env": {
        const el = $(`[data-env="${t.dataset.key}"]`);
        if (el.type === "password" && !el.value) return toast("Paste a value first", true);
        await api("/api/settings", { body: { key: t.dataset.key, value: el.value } });
        toast(`${t.dataset.key} saved`); return render();
      }
      case "av": avatarState[t.dataset.g] = t.dataset.v || null; if (t.dataset.g !== "pose") avatarState[t.dataset.g] ??= t.dataset.v; $$(`.chip[data-g="${t.dataset.g}"]`).forEach((c) => c.classList.toggle("on", c === t)); return applyAvatar();
      case "av-talk": {
        clearInterval(talkTimer);
        let i = 0; const seq = "XBCDCBEAFBDCGBHX".split("");
        talkTimer = setInterval(() => { avatarState.mouth = seq[i++ % seq.length]; avatarState.eyes = i % 23 === 0 ? "closed" : "open"; applyAvatar(); if (i > 64) clearInterval(talkTimer); }, 90);
        return;
      }
    }
  } catch (e) { toast(e.message, true); }
});

document.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const data = Object.fromEntries(new FormData(f));
  try {
    if (f.id === "brief-form") { await api("/api/inbox", { body: data }); toast("Brief added to inbox"); return render(); }
    if (f.id === "result-form") { await api("/api/analytics", { body: data }); toast("Row added to results.csv"); return render(); }
  } catch (e) { toast(e.message, true); }
});

// Keep the page fresh while jobs run.
setInterval(async () => {
  try {
    const jobs = await api("/api/jobs");
    const running = jobs.filter((j) => j.state === "running").length;
    $("#side-foot").innerHTML = running ? `<span class="dot running"></span> ${running} job${running > 1 ? "s" : ""} running` : `<span class="dot done"></span> idle`;
    if (running && ["", "episodes"].includes(current?.route) && !document.activeElement?.matches("textarea, input, select")) refreshCurrent();
  } catch {}
}, 4000);

render();
