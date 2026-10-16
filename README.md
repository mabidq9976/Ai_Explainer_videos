# AI Director Studio

Drop in a topic brief → get a 30–60 s vertical explainer (Shorts / Reels / X) plus a blog post, X thread and captions.
**Claude writes, directs and produces.** Local scripts make the voice, word timing, lip sync, footage and render.

Style: a white page, a small line-drawn narrator (your avatar) who talks with lip sync and natural gestures, and
graphics that arrive on the exact word that names them — photos, screenshots, logos, arrows, stickers, plus
motion graphics, a little 3D and stock footage where they earn it.

## Start

```bash
npm run dashboard        # http://localhost:4400 — progress, episodes, roadmap, setup
```

1. **Setup page** → paste your Gemini API key (and Pexels / Pixabay / Magnific when you have them).
   Until your replicated voice exists, `GEMINI_VOICE_ID=Kore` (a prebuilt voice) works; `TTS_PROVIDER=local` uses the free macOS voice.
2. **Avatar** → export your layered SVG to `avatar/avatar.svg` (layer names in `avatar/README.md`). The Avatar page checks every layer.
3. **Inbox** → write a brief (your angle is the one field Claude can't fill).

## Captions

Set `"captions"` in scene.json: `"keywords"` (1–2 key words per scene pop up big beside the narrator — set per
scene with `"pop": [...]`), `"full"` (running captions) or `"off"`. Word timings come from whisper.cpp (open source,
runs locally); `.srt`/`.vtt` subtitle files are exported for every episode to upload as platform captions.

## Per episode

| Step | Where | Claude? |
|---|---|---|
| Brief | Dashboard → Inbox, or `npm run new <slug>` | — |
| `/draft <slug>` | Claude Code, or the dashboard button | research → hooks → script → **director** → critic → blog/thread/captions |
| Approve the script | Dashboard → episode → Script tab | you |
| `/produce <slug>` | Claude Code, or dashboard → Ask Claude → /produce | voice → real word timestamps → Claude re-times every visual & gesture, fixes assets → render |
| Approve the render | Dashboard → episode → Video tab | you |
| Post + log results | Dashboard → episode → Post & log | — |

No-Claude path for the media: `npm run episode <slug>` (validate → voice → timing → lip sync → assets → render).

## Commands

```
npm run dashboard            local dashboard
npm run doctor               check tools, keys, avatar layers
npm run new <slug>           new brief in topics/inbox
npm run validate <slug>      check scene.json
npm run timeline <slug>      what lands on which word (what Claude reads as producer)
npm run episode <slug>       full media pipeline   (-- --from=assets | --only=tts | --no-render | --preview)
npm run studio <slug>        Remotion Studio on one episode (port 3100)
npm run render <slug>        render (-- --preview for half-res)
npm run subtitles <slug>     write out/captions.srt + .vtt (also automatic after the voice step)
npm run setup:tools          (re)install Rhubarb + whisper model
```

Skills (`.claude/skills/`): draft · research-brief · hook-writer · script-writer · **director** · critic · repurpose ·
geo-optimizer · **produce** · component-builder · retro. The plan lives in `AI Director Studio Build Plan.md` (Downloads).

## Layout

```
avatar/            your narrator SVG + rig.json (placeholder/ until yours exists)
brand/             voice, hooks library, pronunciations, visual style, music/
topics/inbox/      briefs
episodes/<slug>/   brief, hooks, scene.json, audio/, mouth.json, assets/, blog, thread, captions, out/
studio/src/        Remotion: Episode.tsx, Board.tsx, avatar/, components/, three/
scripts/           validate, tts, timing, lipsync, fetch-assets, render, episode, timeline, doctor
dashboard/         local dashboard (server.ts + public/)
library/           shared stock cache (30-day reuse rule)
```
