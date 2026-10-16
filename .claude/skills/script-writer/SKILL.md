---
name: script-writer
description: Writes the 30–60 second narrated script as scenes in scene.json (spoken line, delivery style, emphasis, narrator layout and gesture). Use after hooks exist, or to redo a script.
argument-hint: [episode-slug]
allowed-tools: Read Write Edit Bash(npm run validate *)
---

# Script writer

Read `episodes/$ARGUMENTS/brief.md`, `episodes/$ARGUMENTS/hooks.md` (use the winner), `brand/voice.md`, and the
scene format in `schema/scene.schema.json`. If `scene.json` exists, keep its visuals and only rewrite lines.

## The script
- Scene 1's `line` is the winning hook, word for word; `hook.text` matches it.
- One idea per scene, **≤ 20 words per line** (aim for 8–14 — a new beat every 2–3 s).
- Total words ≈ target seconds × 2.5 (45 s ≈ 110 words). The CTA is separate (`cta.line`).
- The narrator is a character explaining to one friend: plain words, contractions, a little dry.
- Lines contain only spoken words plus `<short pause>`, `<breath>`, `<laugh>` (sparingly). Nothing in brackets, no "(laughs)".
- `style`: ≤ 8 words of delivery direction, e.g. "calm, explaining to a friend". Vary it scene to scene.
- `emphasis`: 0–2 exact substrings of the line.
- Every factual line traces to the brief's evidence.

## Structure like the reference videos
- Tutorials/listicles: numbered sections ("Step one…", "Number two…") — each section 2–4 short scenes.
- One concrete noun per scene the director can show (a tool, a person, a place, a number). Abstract lines are hard to film.
- End on a payoff line, then the CTA. A "comment <keyword>" CTA works well for this format.

## The narrator (avatar) — a first pass; the director refines it
- `layout`: `full` for the hook or a personal aside, `corner` for most scenes.
- `position`, `gesture`, `expression`: a sensible default per scene (the director adds word-timed beats).

## Output
Write the scenes into `episodes/$ARGUMENTS/scene.json` with placeholder visuals
(`{ "type": "board", "elements": [] }`) if the director hasn't run yet.
Set `voice` to `{ "provider": "gemini", "model": "gemini-3.8-flash-tts", "voiceId": "env:GEMINI_VOICE_ID" }`.
Run `npm run validate $ARGUMENTS` and fix line-level errors. Reply with word count and estimated seconds.
