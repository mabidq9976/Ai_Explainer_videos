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

## Camera & sound
- Every shot pushes in slowly (about 3.5%); punch-ins (about 8%) land on 2–4 key words per video.
- Music ducks under the voice and drops out completely ("hush") before the single most important line.
- Risers build into reveals; dings reward wins; a scratch marks a myth. Keep each special: 1–2 per video.

## Captions
Designed by `/caption-designer` (rules: `.claude/skills/caption-designer/style-guide.md`):
headline in condensed caps at the top during the hook, orange fact tags for hard numbers, lower-third subtitles
in Montserrat ExtraBold. Presets: `editorial` (ink on white) and `bold` (white with dark outline, the reference look).
`.srt`/`.vtt` files are exported every time for the platforms.

## Narrator
Small, line-drawn, always alive: lip-synced mouth, blinks, breathing, gentle sway and weight shifts, nods at
sentence ends, arm accents on emphasis words, little hops when changing position, and word-timed gesture/pose beats.
Gestures: `rest`, `point-right`, `open-palm`, `count`, `thumbs-up`, `wave`, plus any whole-body
`pose-<name>` drawn in the avatar (e.g. `thinking`, `sunglasses`, `shrug`). Expression: `neutral`, `raised`, `frown`.
