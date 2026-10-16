/**
 * Opens Remotion Studio on one episode so you can scrub, nudge props and render. Usage: npm run studio <slug>
 * Studio's public dir is fixed at launch, so switching episodes means restarting it: any earlier Studio
 * of this project on the same port is shut down first (otherwise Remotion would reuse it and show the old episode).
 */
import { execFileSync, spawn } from "node:child_process";
import { ep, r, requireSlug, ROOT } from "./lib/paths.ts";
import { prepareRender } from "./render.ts";

const slug = requireSlug();
const port = process.argv.find((a) => a.startsWith("--port="))?.split("=")[1] ?? "3100";

const sh = (cmd: string, args: string[]) => {
  try { return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return ""; }
};
const listeners = () => sh("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]).split("\n").filter(Boolean).map(Number);

// Stop an earlier Studio of *this project* on the port; refuse to touch anything else.
for (const pid of listeners()) {
  const cmd = sh("ps", ["-o", "command=", "-p", String(pid)]);
  const cwd = sh("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"]).split("\n").find((l) => l.startsWith("n"))?.slice(1);
  if (/remotion/.test(cmd) && cwd === ROOT) {
    console.log(`Stopping the previous Studio (pid ${pid}) so this episode loads…`);
    try { process.kill(pid, "SIGTERM"); } catch {}
  } else {
    console.error(`Port ${port} is used by another program (${cmd.trim() || pid}). Pass --port=<free port>.`);
    process.exit(1);
  }
}
for (let i = 0; i < 40 && listeners().length; i++) await new Promise((res) => setTimeout(res, 150));
for (const pid of listeners()) try { process.kill(pid, "SIGKILL"); } catch {}

await prepareRender(slug);
console.log(`Studio → episode ${slug}`);
const child = spawn(r("node_modules", ".bin", "remotion"), ["studio", "studio/src/index.ts", `--public-dir=${ep(slug)}`, `--port=${port}`, "--force-new"], {
  cwd: r(),
  stdio: "inherit",
});
// When this wrapper is stopped (dashboard Stop, Ctrl-C), take Studio down with it — no orphans.
const stop = () => { if (!child.killed) child.kill("SIGTERM"); };
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.on(sig, () => { stop(); process.exit(0); });
process.on("exit", stop);
child.on("exit", (code) => process.exit(code ?? 0));
