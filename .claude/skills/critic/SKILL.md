---
name: critic
description: Fresh-eyes review of an episode script against the critic checklist; returns PASS or specific fixes. Runs in a separate subagent that only sees the script and brief.
argument-hint: [episode-slug]
context: fork
agent: critic
allowed-tools: Read
---

Review `episodes/$ARGUMENTS/scene.json` against `episodes/$ARGUMENTS/brief.md`, `brand/voice.md` and
`.claude/skills/critic/checklist.md`.

Return exactly:
- `VERDICT: PASS` or `VERDICT: FIX`
- If FIX: a numbered list, each item `scene id — problem — concrete rewrite`. Max 6 items, most important first.
Nothing else.
