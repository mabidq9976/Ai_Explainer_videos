import { loadFont } from "@remotion/google-fonts/Inter";

// Mirrors brand/visual-style.md — change both together.
const { fontFamily } = loadFont("normal", { weights: ["500", "700", "800", "900"], subsets: ["latin"] });

export const theme = {
  paper: "#FFFFFF",
  ink: "#111111",
  muted: "#6B6A66",
  line: "#E6E2D8",
  accent: "#FF5A1F",
  marker: "#FFD84D",
  link: "#1A0DAB",
  good: "#1F9D55",
  card: "#FFFFFF",
  stroke: 6,
  radius: 28,
  font: fontFamily,
  /** Default card design for UI graphics (episode `cardStyle` overrides). */
  cardStyle: "chat" as "brutal" | "soft" | "line" | "chat",
};

export const W = 1080;
export const H = 1920;
export const FPS = 30;
