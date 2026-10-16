---
name: sync
description: Makes every visual land on the spoken word it illustrates — board items, graphic animations (checklist ticks, AI-card typing, diagram nodes), fact tags, punches, sound cues and narrator gestures — using the real voice timings. Use after the voice exists and before rendering, or when visuals feel early or late.
argument-hint: [episode-slug]
allowed-tools: Read Edit Bash(npm run sync *) Bash(npm run timeline *) Bash(npm run validate *)
---

# Sync

Episode: `$ARGUMENTS`. Needs `audio/timing.json` (word times snapped to the waveform). Text only — never open media.

1. **Mechanical pass (free):** `npm run sync $ARGUMENTS -- --fix` — anchors every visual whose label is spoken to that
   word (and arrows to their target). Then `npm run sync $ARGUMENTS` must show 100%.
2. **Judgement pass:** `npm run timeline $ARGUMENTS`. For visuals whose label is *not* spoken (illustrations: a photo
   of a laptop, an emoji, a 3D scene), set `at` to the first word of the phrase they illustrate.
   - Inside graphics, use word cues: Checklist items `{ "text", "at": "<word>" }`, SerpVsAiAnswer `cardAt` / `typeAt`,
     Toggle `flipAt`, StatCounter `at`, CitationCards `citedAt`, Diagram nodes / ProfileList items `at`.
   - Narrator `beats`, `punch`, `sfx` and `tag.at` sit on the word that carries the meaning — not the scene's first word.
   - A riser needs ~2 s of runway before its word; a hush needs a word that starts after a breath.
3. **Rules:** the renderer already leads each visual ~0.1 s before its word — never anchor earlier than the word.
   Establishing shots (a scene's first image/header) may sit at the scene start. Nothing appears more than ~0.4 s
   before the word that names it — except when that word is the scene's last (< 0.8 s before the cut): then anchor
   it to an earlier word of the same sentence so it's on screen ≥ 0.7 s (the checker allows up to ~1.2 s early).
   Typing/animated graphics must finish ≥ 0.5 s before the cut.
4. `npm run validate $ARGUMENTS`. Reply with: sync score before → after, and anything you couldn't anchor.
