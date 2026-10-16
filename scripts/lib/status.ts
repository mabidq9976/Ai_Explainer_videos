import fs from "node:fs";
import { ep, readJsonIf, writeJson } from "./paths.ts";

export const STEPS = ["draft", "validate", "tts", "timing", "lipsync", "assets", "render"] as const;
export type Step = (typeof STEPS)[number];
export type StepState = { state: "idle" | "running" | "done" | "failed" | "skipped"; at?: string; ms?: number; note?: string };
export type EpisodeStatus = {
  steps: Partial<Record<Step, StepState>>;
  approvals: { script?: string | null; render?: string | null };
  posted?: Record<string, string>;
  minutes?: number;
};

const file = (slug: string) => ep(slug, "status.json");

export function readStatus(slug: string): EpisodeStatus {
  return readJsonIf<EpisodeStatus>(file(slug)) ?? { steps: {}, approvals: {} };
}

export function patchStatus(slug: string, fn: (s: EpisodeStatus) => void) {
  if (!fs.existsSync(ep(slug))) return;
  const s = readStatus(slug);
  fn(s);
  writeJson(file(slug), s);
}

export function setStep(slug: string, step: Step, state: StepState["state"], extra: Partial<StepState> = {}) {
  patchStatus(slug, (s) => {
    s.steps[step] = { ...s.steps[step], state, at: new Date().toISOString(), ...extra };
  });
}

/** Wrap a pipeline step so the dashboard sees running/done/failed and timing. */
export async function track<T>(slug: string, step: Step, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  setStep(slug, step, "running", { note: undefined });
  try {
    const out = await fn();
    setStep(slug, step, "done", { ms: Date.now() - t0 });
    return out;
  } catch (e: any) {
    // Waiting on Claude (e.g. a Magnific voice) isn't a failure — show it as pending with the reason.
    if (e?.constructor?.name === "NeedsClaude") {
      setStep(slug, step, "idle", { ms: Date.now() - t0, note: String(e.message).slice(0, 400) });
      throw e;
    }
    setStep(slug, step, "failed", { ms: Date.now() - t0, note: String(e?.message ?? e).slice(0, 400) });
    throw e;
  }
}
