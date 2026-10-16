---
name: caption-designer
description: Designs an episode's on-screen captions like a professional short-form editor — hook headline, fact tags and lower-third subtitles — choosing the preset, wording, timing and placement so text looks intentional, never random. Use after the director, or to redo captions.
argument-hint: [episode-slug]
allowed-tools: Read Edit Bash(npm run validate *) Bash(npm run timeline *)
---

# Caption designer

Read `episodes/$ARGUMENTS/scene.json`, `episodes/$ARGUMENTS/brief.md`, `brand/visual-style.md` and `style-guide.md` in
this folder. Run `npm run timeline $ARGUMENTS` for word times. Edit only `captions`, and each scene's `tag` / `pop`
(and nudge a board element's `y` if the headline would cover it).

## The system (three layers, each with one fixed home)
1. **Headline** — `captions.title`: the hook as a 3–7 word statement or question in condensed caps, stacked at the
   top for the hook scene (`until`: a scene id, default the first scene). It's the thumbnail moment.
2. **Fact tags** — a scene's `tag: { "text", "at" }`: condensed caps on an orange bar, top strip (under the headline
   while it's up). Only for a hard fact or number worth screenshotting: "71% OF EARTH IS OCEAN", "3 STEPS", "FREE".
3. **Subtitles** — `captions.subtitles: true`: the spoken words in the lower third. `boxed`: one short line in a black
   box; `editorial`/`bold`: ≤ 2 balanced lines. Emphasis words in the accent colour. Line breaks and timing are automatic — you control what's emphasised
   through each scene's `emphasis`.

## Decide
- `preset`: `boxed` (default — small white text on a black rounded box, one short 2–4 word line at a time; clean on
  any background), `editorial` (larger ink two-line subtitles on the white page) or `bold` (white with outline +
  shadow, for footage-heavy or dark episodes). With `editorial`, full-frame footage switches subtitles to `bold`.
- Subtitles on for almost every episode (most viewers watch muted). Off only for the pure reference look when the
  board labels already carry every word.
- Headline: yes when the hook is a strong claim or question; rewrite it shorter than the spoken hook if needed
  ("WHAT IF YOU COULD BREATHE UNDERWATER?"). While it's up, board items must sit below y≈24.
- Tags: 0–3 per video, never two scenes in a row, never repeating text that's already on the board at that moment,
  and every number must come from the brief's sources.
- Emphasis: 0–1 word per line in subtitles; the word that carries the meaning, not filler.
- Remove any old `pop` lists (the sticker style is retired) — use `tag` instead.

## Finish
`npm run validate $ARGUMENTS` (fix caption warnings), then reply with: preset · headline · tags with their words.
