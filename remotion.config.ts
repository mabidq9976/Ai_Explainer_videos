import { Config } from "@remotion/cli/config";

// Each episode renders with its own folder as the public dir (see scripts/render.ts),
// so staticFile("scene.json") always means the current episode.
Config.setPublicDir("./studio/public");
Config.setVideoImageFormat("jpeg");
Config.setConcurrency(null);
Config.setOverwriteOutput(true);
