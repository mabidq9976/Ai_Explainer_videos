export type Layout = "full" | "corner" | "hidden";
/** A thing placed on the board, timed to a spoken word. Coordinates are % of the 1080×1920 frame (centre point). */
export type BoardElement = {
  id: string;
  kind: "text" | "image" | "icon" | "arrow" | "badge" | "component";
  at?: number | string; // seconds from scene start, or a word/phrase from the line ("Characters")
  until?: number | string; // optional exit, same format (default: end of the board)
  x?: number; y?: number; w?: number; h?: number;
  enter?: "pop" | "fade" | "slide" | "type" | "draw" | "none";
  // text
  text?: string; size?: "sm" | "md" | "lg" | "xl"; weight?: number; color?: string; align?: "left" | "center" | "right";
  // image / icon
  icon?: string; query?: string; url?: string; src?: string; media?: "photo" | "video";
  frame?: "plain" | "card" | "rounded" | "cutout" | "phone" | "laptop" | "circle"; label?: string;
  // arrow
  from?: string | [number, number]; to?: string | [number, number]; style?: "straight" | "curve" | "dotted"; bend?: number;
  // badge (sticker stuck on another element)
  on?: string;
  // component
  name?: string; props?: Record<string, any>;
};

export type Beat = { at: number | string; gesture?: string; expression?: string; position?: "left" | "center" | "right"; layout?: Layout };

export type Visual =
  | { type: "board"; continue?: boolean; elements: BoardElement[] }
  | { type: "component" | "three"; name: string; props?: Record<string, any>; label?: string }
  | { type: "stock"; query: string; kind?: "video" | "photo"; frame?: "card" | "full" | "cutout"; label?: string; fallback: string; fallbackProps?: Record<string, any> };

export type SceneDef = {
  id: string;
  line: string;
  emphasis?: string[];
  /** Words/phrases from the line that pop up in "keywords" caption mode (default: emphasis). */
  pop?: string[];
  /** A fact tag (orange bar) — text can differ from the spoken words; `at` = the word it lands on. */
  tag?: { text: string; at?: string | number; until?: string | number };
  /** Words where the camera punches in (quick zoom). */
  punch?: string[];
  /** Sound cues on words: riser (builds up to the word), scratch, ding, pop, whoosh, hush (music drops out just before the word). */
  sfx?: { at: number | string; kind: "riser" | "scratch" | "ding" | "pop" | "whoosh" | "hush" }[];
  style: string;
  avatar: { layout: Layout; position?: "left" | "center" | "right"; gesture?: string; expression?: string; beats?: Beat[] };
  visual: Visual;
};

export type SceneFile = {
  slug: string;
  title?: string;
  pillar: string;
  format: string;
  length?: number;
  hook: { text: string; pattern: string };
  /** off (default) · full = running 2–4 word captions · keywords = only key words pop up big. `true` = full. */
  captions?: boolean | "off" | "full" | "keywords" | { preset?: "editorial" | "bold" | "off"; subtitles?: boolean; tags?: boolean; title?: { text: string; until?: string | number } };
  /** Sound design: music bed level and UI sound effects (pop on element entrances, whoosh on scene changes). */
  sound?: { music?: boolean; musicVolume?: number; sfx?: boolean; sfxVolume?: number };
  look?: "reference" | "mixed";
  /** Slow push-ins + word punch-ins on the graphics (default true). */
  camera?: boolean;
  scenes: SceneDef[];
  cta: { line: string; style?: string; visual: string; props?: Record<string, any> };
  voice: { provider: string; model?: string; voiceId?: string };
};

export type Word = { text: string; start: number; end: number; scene: string; emphasis: boolean };
export type Timing = { duration: number; words: Word[]; scenes: { id: string; start: number; end: number }[] };
export type MouthFile = { fps: number; shapes: string[]; cues: { frame: number; shape: string }[] };
export type ManifestEntry = { file?: string; fallback?: string; kind?: "video" | "photo"; frame?: string; duration?: number; width?: number; height?: number };

/** One spoken block on the timeline (every scene, then the CTA). */
export type Block = {
  id: string;
  line: string;
  startFrame: number;
  endFrame: number;
  layout: Layout;
  position: "left" | "center" | "right";
  gesture: string;
  expression: string;
  visual: Visual | null;
  cta?: SceneFile["cta"];
  beats: Beat[];
};

/** Narrator state from a point in time (scene starts and word-timed beats). */
export type AvatarEvent = { frame: number; gesture: string; expression: string; position: "left" | "center" | "right"; layout: Layout };

export type EpisodeProps = {
  scene: SceneFile | null;
  timing: Timing | null;
  mouth: MouthFile | null;
  manifest: Record<string, ManifestEntry>;
  avatarSvg: string | null;
  rig: { pivots?: Record<string, [number, number]>; aliases?: Record<string, string>; flipWhenRight?: boolean };
  music: string | null;
  musicDuration: number | null;
  sfx: Record<string, string>;
  sfxDur: Record<string, number>;
  hasAudio: boolean;
  estimated: boolean;
};
