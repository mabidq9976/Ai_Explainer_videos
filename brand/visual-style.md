# Visual style

Reference: Podus-style explainers (`@podus.app`) — a plain white page, a small line-drawn narrator who
changes pose every beat, and simple graphics that build up piece by piece. Calm, clean, lots of white.

## Page
- Background **#FFFFFF**. Ink **#111111**. Muted text #6B6A66. Hairlines #E6E2D8.
- Accent **#FF5A1F** (sparingly: one thing per scene). Marker yellow **#FFD84D** for emphasis words.
- Font: Inter — 700 for labels, 900 for big statements. Labels are short (1–3 words).
- These values live in `studio/src/theme.ts` — change both together.

## Composition (1080 × 1920)
- Visual sits in the upper ~60%. The narrator stands below it, ~20% of the width, at
  `left`, `center` or `right` — move it between scenes so the frame never feels static.
- Keep everything above y≈1640 (Reels/Shorts UI covers the bottom).
- `full` layout (big narrator) for the hook or a personal aside; `corner` for most scenes; `hidden` rarely.

## What a scene looks like (in order of preference)
1. **Board** — Claude places photos, screenshots, logos, emoji, short labels, thin arrows and stickers on the
   page, each arriving on the word that names it. Numbered section headers ("1.) Story") stay up while items
   build underneath. This is the default and matches both reference videos. (Spec: `.claude/skills/director/board.md`.)
   **Diagram** is the auto-laid-out version for quick rows/trees.
2. **Toggle / ProfileList / StatCounter / Checklist** — single, legible UI moments.
3. **DeviceFrame** — a phone or laptop showing a clip or screenshot, with a sticker + big text beside it.
4. **Stock** photo or clip in a `card` (framed) or `cutout`. Rarely `full`.
5. **3D** (SearchBar3D, NodeNetwork3D) — at most one per video, for a "wow" beat.

## Looks
- `reference` — exactly the reference: boards only, plain-framed photos and screenshots, logos, emoji, arrows, red "FREE" stickers. No 3D.
- `mixed` — the same base plus, where they earn it: one 3D scene, a custom motion graphic, stock video, device frames, stat counters.

## Motion
- New beat every 1.5–3 s; elements arrive on their word with a short pop, arrows draw on.
- No transitions between scenes beyond the pop-in. No shaky zooms.

## Captions
Per episode, `captions` in scene.json:
- `"keywords"` — 1–2 key words per scene pop up big (black on marker-yellow, slight tilt) beside the narrator as
  they're spoken. Words come from each scene's `pop` list (default: its `emphasis`). Engaging without clutter.
- `"full"` — running 2–4 word captions, emphasis words on a yellow marker.
- `"off"` (default) — the pure reference look; labels on the board carry the text.
Subtitle files (`out/captions.srt`, `out/captions.vtt`) are exported every time for YouTube/X/blog players —
upload them as platform captions (accessibility + search) instead of burning in full captions.

## Narrator
Small, line-drawn, always alive: lip-synced mouth, blinks, breathing, gentle sway and weight shifts, nods at
sentence ends, arm accents on emphasis words, little hops when changing position, and word-timed gesture/pose beats.
Gestures: `rest`, `point-right`, `open-palm`, `count`, `thumbs-up`, `wave`, plus any whole-body
`pose-<name>` drawn in the avatar (e.g. `thinking`, `sunglasses`, `shrug`). Expression: `neutral`, `raised`, `frown`.
