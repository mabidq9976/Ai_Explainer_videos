export type CaptionPreset = "editorial" | "bold";
export type CaptionConfig = {
  preset: CaptionPreset | "off";
  subtitles: boolean;
  tags: boolean;
  title?: { text: string; until?: string | number };
};

/**
 * scene.json `captions` → config. Accepts the object form, or the older shorthands:
 * true / "full" → editorial subtitles · "keywords" → editorial fact tags only · false / "off" → nothing.
 */
export function captionConfig(c: unknown): CaptionConfig {
  if (!c || c === "off") return { preset: "off", subtitles: false, tags: false };
  if (c === true || c === "full") return { preset: "editorial", subtitles: true, tags: true };
  if (c === "keywords") return { preset: "editorial", subtitles: false, tags: true };
  const o = c as Partial<CaptionConfig>;
  return { preset: o.preset ?? "editorial", subtitles: o.subtitles ?? true, tags: o.tags ?? true, title: o.title };
}

/** Colours per preset. editorial = ink on the white page; bold = white with a dark outline (reads on anything). */
export const LOOK = {
  // Ink on the white page; a white halo keeps it readable if it ever crosses a photo.
  editorial: { fill: "#111111", stroke: "#FFFFFF", strokeW: 10, shadow: "none", emphasis: "#FF5A1F", titleFill: "#111111", titleStroke: "transparent", titleStrokeK: 0, titleShadow: "none" },
  // The reference look: white type, a thin dark outline and a soft dark shadow (no thick stroke — it spikes on corners).
  bold: {
    fill: "#FFFFFF", stroke: "#0B0B0B", strokeW: 2.5, emphasis: "#FFD84D",
    shadow: "0 0 3px rgba(0,0,0,0.9), 0 3px 8px rgba(0,0,0,0.75), 0 0 18px rgba(0,0,0,0.45)",
    titleFill: "#FFFFFF", titleStroke: "#0B0B0B", titleStrokeK: 0.035, titleShadow: "0 5px 0 rgba(0,0,0,0.55), 0 0 22px rgba(0,0,0,0.45)",
  },
};
export const TAG_BG = "#FF5A1F";
