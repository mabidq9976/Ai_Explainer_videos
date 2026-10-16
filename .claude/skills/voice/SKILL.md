---
name: voice
description: Generates an episode's voice-over with the Magnific MCP text-to-speech (ElevenLabs v3 by default) from the prepared request, then imports it into the pipeline. Use when the voice step says "Voice needed", or to regenerate a voice.
argument-hint: [episode-slug]
allowed-tools: Read Bash(npm run tts *) mcp__magnific__audio_voices_list mcp__magnific__audio_tts mcp__magnific__creations_wait mcp__magnific__simulate_cost mcp__magnific__account_balance mcp__magnific__audio_tts_direction
---

# Voice (Magnific)

Episode: `$ARGUMENTS`.

1. `npm run tts $ARGUMENTS` — if it prints a cache hit, the voice already exists: stop and say so.
   Otherwise it writes `episodes/$ARGUMENTS/audio/tts-request.json`.
2. Read that file. Call `audio_tts` with exactly: `text`, `voiceId`, `model`, `stability`, and `speed`, `source`,
   `systemInstruction` when present (`source: "mine"` is required for the user's own cloned voice). `energy` is already
   baked into the text's tags — don't pass it.
   Do not rewrite the text — it's the approved script with pronunciations applied and one short
   delivery [tag] per scene.
3. `creations_wait` on the returned identifier until it's completed (repeat if it isn't yet).
4. `npm run tts $ARGUMENTS -- --import "<result url>"` — converts to 24 kHz mono WAV and caches it.
5. Reply in one line: duration, voice, credits spent. If called from `/produce`, continue with
   `npm run episode $ARGUMENTS -- --from=timing --no-render`.

To find the user's cloned voice id: `audio_voices_list { scope: "mine" }`.

After importing, check the transcript in `.cache/tmp/whisper-out.json` (text only) against the script: if key words
were misheard ("code" for "quote"), the delivery may be too fast/loose — suggest speed 1.0 and stability 0.4–0.45.

Never open or describe the audio file.
