/** Renders out/avatar-sheet.png: every pose × mouth, blink and brows, through the real rig code. Usage: npm run avatar:sheet */
import fs from "node:fs";
import path from "node:path";
import { r } from "./lib/paths.ts";
import { run, log } from "./lib/run.ts";
import { avatarFile } from "./lib/avatar.ts";

const pub = r(".cache", "avatar-sheet");
fs.rmSync(pub, { recursive: true, force: true });
fs.mkdirSync(path.join(pub, "_render"), { recursive: true });
fs.copyFileSync(avatarFile(), path.join(pub, "_render", "avatar.svg"));
fs.mkdirSync(r("out"), { recursive: true });
await run(r("node_modules", ".bin", "remotion"), ["still", "studio/src/index.ts", "AvatarSheet", "out/avatar-sheet.png", `--public-dir=${pub}`], { quiet: true });
log("out/avatar-sheet.png");
