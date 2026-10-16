---
name: draft
description: Orchestrator — turns one inbox brief (or every brief in topics/inbox) into brief, hooks, scene.json, critic review, blog, thread and captions.
disable-model-invocation: true
argument-hint: [episode-slug, or empty for the whole inbox]
allowed-tools: Read Write Edit Glob Skill Bash(npm run validate *) Bash(npm run mark *) Bash(mkdir *) Bash(mv topics/*)
---

# Draft

Target: `$ARGUMENTS` — if empty, every `topics/inbox/*.md` (one after another, in this session).

For each slug:
1. `npm run mark <slug> draft running` (create `episodes/<slug>/` first if needed).
2. `/research-brief <slug>` — stop for this slug if the angle is missing and tell the user.
3. `/hook-writer <slug>`
4. `/script-writer <slug>`
5. `/director <slug>` — picks the look, plans word-timed boards and narrator beats, builds missing graphics
5b. `/caption-designer <slug>` — headline, fact tags, subtitles
6. `npm run validate <slug>` — fix and re-run until it passes (max 3 rounds; if still failing, report the errors and move on).
7. `/critic <slug>` — if `VERDICT: FIX`, apply the fixes that keep validation passing, then re-validate. One round only.
8. `/repurpose <slug>`
9. `/geo-optimizer <slug>`
10. `npm run mark <slug> draft done`

Do not read audio, video or image files. Do not run the media pipeline — the user approves the script first.

Finish with a table: slug · hook · words · ~seconds · validation · critic verdict · Shorts title.
Then remind the user: review the script on the dashboard (approval point 1), then `/produce <slug>` — the producer pass
generates the voice and re-times every visual to the real word timestamps before rendering.
