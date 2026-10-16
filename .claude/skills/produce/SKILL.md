---
name: produce
description: Producer pass for one approved episode — generates the voice, then uses the real word timestamps to place every asset and gesture, sources photos/clips/icons/music through the Magnific MCP, fixes pacing, and renders. Claude reads only text (timeline, logs, search titles), never media.
disable-model-invocation: true
argument-hint: [episode-slug] [--final to skip the preview]
allowed-tools: Read Edit Write Skill WebSearch Bash(npm run tts *) Bash(npm run episode *) Bash(npm run timeline *) Bash(npm run validate *) Bash(npm run assets *) Bash(npm run render *) Bash(npm run mark *) Bash(npm run save *) mcp__magnific__account_balance mcp__magnific__simulate_cost mcp__magnific__stock_search mcp__magnific__stock_get mcp__magnific__stock_download mcp__magnific__audio_music_generate mcp__magnific__audio_sfx_generate mcp__magnific__creations_wait mcp__magnific__audio_tts
---

# Producer

Episode: `$ARGUMENTS`. You're the producer: the script is approved, now make the cut land on the words.

1. **Voice + timing + lip sync** — `npm run episode <slug> -- --no-render`.
   If it pauses with "Voice needed" (TTS_PROVIDER=magnific): run `/voice <slug>`, then
   `npm run episode <slug> -- --from=timing --no-render`.
   On a real failure: show the failing step + last 20 lines, suggest one fix, stop.
2. **Read the real timeline** — `npm run timeline <slug>`. Every word now has a real time.
3. **Source assets with the Magnific MCP** (see `magnific.md` in this folder for the exact steps and credit rules):
   every `image` element or `stock` scene without a file (`✗`, `(not fetched)`, `🖼` placeholder) → `stock_search` →
   pick by title → `stock_download` → `npm run save -- <slug> <scene>.<id> "<url>" --credit "Magnific · <title>"` →
   set the element's `"src"` to the printed path (keep `query` for the record). For a `stock` scene, change it to a board
   with one image element, or keep it and save as `<sceneId>` then set `"src"` on a board element.
4. **Producer pass** — edit `episodes/<slug>/scene.json` (visuals, avatar beats and `sound` only, never the approved lines):
   - `⚠ … with nothing new on screen` → add an element or a narrator beat timed to a word in that gap.
   - `⚠ one visual > 3s` on a non-board scene → turn it into a board, or add `until`/new elements.
   - Check the `cues:` lines: punches and risers/hushes sit on the right words now that times are real
     (a riser needs ~2 s of runway before its word; a hush needs a word that starts after a breath).
   - Elements bunched on one word → spread them across the next words so they arrive one by one.
   - Narrator: gestures change on meaningful words (point when something appears, count on lists), position moves every few scenes.
   - Need a graphic that doesn't exist? `/component-builder <Name> <what>` then use it.
   - Sound: a music bed from `brand/music/` plays automatically, ducked under the voice; pops/whooshes come from `brand/sfx/`.
     Set `"sound": { "musicVolume": 0.1–0.18 }` to taste. Only generate new music if the user asked or none exists (`magnific.md`).
5. `npm run validate <slug>` and `npm run timeline <slug>` again — no ⚠, no "overlaps" / "crowd the subtitles"
   warnings, and no missing assets left.
6. **Render** — `npm run render <slug> -- --preview` (fast, half-res), unless `--final` was passed; then `npm run render <slug>`.
7. Reply in ≤ 6 lines: output path + duration, what you changed, Magnific credits spent, and:
   "Watch it on the dashboard → approve render (approval point 2)."

Never open, read or describe audio, image or video files — only the timeline, logs and search result titles.
