---
name: retro
description: Learning pass over the latest published videos — reads analytics/results.csv, finds what worked, promotes winning hooks into the library and writes a retro note.
disable-model-invocation: true
argument-hint: [number of recent videos, default 5]
allowed-tools: Read Write Edit Glob
---

# Retro

1. Read `analytics/results.csv` (latest ${ARGUMENTS:-5} distinct slugs) and each one's `episodes/<slug>/scene.json` (hook, pattern, format, layouts, length).
2. Compare on: viewed-vs-swiped (hook strength), avg % viewed (pacing), shares + saves (usefulness), follows, blog citations, minutes spent.
3. Note which variable the current block was testing (see the operating plan: hook pattern → layout → length → pillar) and what the data says — a direction, not proof, with 5 videos.
4. Promote any hook that beat the block's median viewed-vs-swiped into the **Proven winners** table in `brand/hooks-library.md`.
5. Write `analytics/retro-<YYYY-MM-DD>.md`: what worked, what didn't, one thing to change next block, one thing to hold constant.

Reply with the one change for the next block.
