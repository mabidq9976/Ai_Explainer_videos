---
name: produce
description: Producer pass for one approved episode — generates the voice, then uses the real word timestamps to place every asset and gesture, sources photos/clips/icons/music through the Magnific MCP, fixes pacing, and renders. Claude reads only text (timeline, logs, search titles), never media.
disable-model-invocation: true
argument-hint: [episode-slug] [--final to skip the preview]
allowed-tools: Read Edit Write Skill WebSearch Bash(npm run sync *) Bash(npm run shotlist *) Bash(npm run tts *) Bash(npm run episode *) Bash(npm run timeline *) Bash(npm run validate *) Bash(npm run assets *) Bash(npm run render *) Bash(npm run mark *) Bash(npm run save *) mcp__magnific__account_balance mcp__magnific__simulate_cost mcp__magnific__stock_search mcp__magnific__stock_get mcp__magnific__stock_download mcp__magnific__audio_music_generate mcp__magnific__audio_sfx_generate mcp__magnific__creations_wait mcp__magnific__audio_tts
---

# Producer

Episode: `$ARGUMENTS`. You're the producer: the script is approved, now make the cut land on the words.

1. **Voice + timing + lip sync** — `npm run episode <slug> -- --no-render`.
   If it pauses with "Voice needed" (TTS_PROVIDER=magnific): run `/voice <slug>`, then
   `npm run episode <slug> -- --from=timing --no-render`.
   On a real failure: show the failing step + last 20 lines, suggest one fix, stop.
2. **Sync** — `/sync <slug>`: every visual onto its spoken word (mechanical `--fix`, then the judgement pass).
3. **Assets first** — `/asset-producer <slug>`: shot list → free sources → Magnific only for what's left → build any
   missing motion graphic / 3D → everything ready (within the credit budget).
4. **Producer pass** — `npm run timeline <slug>`; edit visuals, beats and `sound` only (never the approved lines):
   - `⚠ … with nothing new on screen` → add an element or a narrator beat timed to a word in that gap.
   - `⚠ one visual > 3s` on a non-board scene → turn it into a board, or add `until`/new elements.
   - Narrator: gestures change on meaningful words, position moves every few scenes.
5. `npm run sync <slug>` (100%), `npm run validate <slug>` and `npm run timeline <slug>` again — no ⚠, no "overlaps" / "crowd the subtitles"
   warnings, and no missing assets left.
6. **Render** — `npm run render <slug> -- --preview` (fast, half-res), unless `--final` was passed; then `npm run render <slug>`.
7. Reply in ≤ 6 lines: output path + duration, what you changed, Magnific credits spent, and:
   "Watch it on the dashboard → approve render (approval point 2)."

Never open, read or describe audio, image or video files — only the timeline, logs and search result titles.
