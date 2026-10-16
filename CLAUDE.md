# AI Director Studio

Topic brief in → 30–60 s vertical explainer video + blog, X thread and captions out.
**Claude writes, directs and produces. Local scripts make the voice, lip sync, footage and render.**
Claude decides what is on screen on every word (boards timed to spoken words, narrator beats, assets, 3D,
new motion graphics) — but never opens media files; it works from `npm run timeline <slug>` text.

## Niche & voice
SEO, GEO and AIO for builders and marketers. Tone and banned phrases: `brand/voice.md`.
Visual style (white page, narrator character, diagram-first motion graphics): `brand/visual-style.md`.

## Rules
- Claude writes files; scripts make media. Never open, read or describe audio, image or video files.
- Every step is a skill with a fixed input and output file — rerun any step on its own.
- `episodes/<slug>/scene.json` is the contract with the pipeline. It must pass `npm run validate <slug>`.
- Lines are spoken verbatim by TTS: only words plus `<short pause>`, `<breath>`, `<laugh>`. Delivery goes in `style` (≤ 8 words).
- Every claim needs a source from the brief. Never invent stats.
- The user approves at two points only: the script, and the final render.
- Flow: `/draft <slug>` → user approves script → `/produce <slug>` (voice, re-time to real words, render) → user approves render.
- `look`: `reference` = exactly the reference style (white boards, photos, logos, arrows); `mixed` adds 3D / custom graphics / stock video.
- Keep this file short. Procedures live in `.claude/skills/`.

## File map
| Path | What |
|---|---|
| `topics/inbox/<slug>.md` | Raw briefs from the user (template: `npm run new <slug>`) |
| `episodes/<slug>/` | brief.md · hooks.md · scene.json · blog.md · thread.md · captions.md · schema.json · status.json |
| `schema/scene.schema.json` | scene.json schema |
| `studio/src/components/catalog.json` | Every motion graphic / 3D scene the renderer knows, with props |
| `avatar/` | Layered narrator SVG + rig (see `avatar/README.md`) |
| `brand/` | voice, hooks library, pronunciations, visual style |
| `analytics/results.csv` | One row per post |

## Commands
`npm run validate <slug>` · `npm run timeline <slug>` (word times + what lands when) ·
`npm run episode <slug>` (voice → timing → lip sync → assets → render, no Claude) ·
`npm run studio <slug>` (Remotion Studio) · `npm run mark <slug> <step> <state>` (dashboard status) ·
`npm run dashboard` (http://localhost:4400)
