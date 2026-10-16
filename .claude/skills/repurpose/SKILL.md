---
name: repurpose
description: Writes the blog post, X thread, Shorts title/description, Reels caption and hashtags from an episode's brief and script. Use after scene.json is approved or when redoing the written channels.
argument-hint: [episode-slug]
allowed-tools: Read Write
model: sonnet
---

# Repurpose

Read `episodes/$ARGUMENTS/brief.md`, `episodes/$ARGUMENTS/scene.json` and `brand/voice.md`.

## blog.md (800–1,200 words)
- Frontmatter: title, slug, description (≤ 155 chars), date, pillar.
- The direct answer to the viewer's question in the first two sentences.
- H2s phrased as real questions. Short paragraphs. Every claim links its source inline.
- One original element: the user's angle as a clearly labelled opinion, or a test/dataset from the brief.
- End with `## FAQ` (3–5 Q&As). `geo-optimizer` adds the schema afterwards.

## thread.md (X, 4–6 posts)
Post 1 = the hook, reworded for text. Each post ≤ 270 chars, one idea each. Last post: CTA + "(video ↓)". Number them `1/`.

## captions.md
- **YouTube Shorts** — title ≤ 60 chars (hook-led, no clickbait), description: 2 lines + sources list + 3 hashtags.
- **Instagram Reels** — caption: hook line, 2–3 short lines, CTA, then 5–8 hashtags.
- **Cover text** — 2–5 words for the cover frame.
- **Subtitles** — remind the user to upload `out/captions.srt` to YouTube/X (exported automatically after the voice step).
- **Attribution** — if `episodes/$ARGUMENTS/assets/manifest.json` exists, list each clip's author + source + license.

Reply with the Shorts title only.
