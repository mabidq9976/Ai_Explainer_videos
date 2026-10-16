import { spawn } from "node:child_process";
import { ROOT } from "./paths.ts";

/** Run a command, streaming output, and resolve with captured stdout. */
export function run(cmd: string, args: string[], opts: { quiet?: boolean; cwd?: string } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd ?? ROOT, env: process.env });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d;
      if (!opts.quiet) process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      err += d;
      if (!opts.quiet) process.stderr.write(d);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} exited ${code}\n${err.split("\n").slice(-20).join("\n")}`));
    });
  });
}

export async function probeDuration(file: string): Promise<number> {
  const out = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { quiet: true });
  return parseFloat(out.trim());
}

export const log = (msg: string) => console.log(`› ${msg}`);
