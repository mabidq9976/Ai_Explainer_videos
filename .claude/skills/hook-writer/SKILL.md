---
name: hook-writer
description: Writes and scores five opening hooks for a short video from an episode brief. Use when drafting or redoing the first line of a Shorts or Reels script.
argument-hint: [episode-slug]
allowed-tools: Read Write
---

# Hook writer

Read `episodes/$ARGUMENTS/brief.md` and `brand/hooks-library.md` (including its Proven winners table).

## Write five hooks
- One line each, 6 to 14 words, speakable in under 3 seconds.
- Use five different patterns from the library: bold-claim, myth-bust, number, question, before-after, warning,
  plus the niche favourites specific-result, mistake-callout, contrarian, live-proof and curiosity-gap.
- At least two of the five use a **niche favourite**. Skip specific-result and live-proof when the brief has no
  sourced result or real audit to point at; never invent the number, business or audit.
- Hooks may be two short sentences when the pattern needs it ("Stop paying for SEO. Do this instead."), still under 3 seconds.
- Open with the viewer's problem or a surprising fact. Never open with "In this video".
- No jargon in the first line. Explain GEO or AIO later in the script.
- Make no claim the brief's sources don't support.
- At least two of the five should set up an **open loop** (a promise the video pays off later: "the last one surprised me").
- If the library has proven winners, at least one hook reuses a winning pattern.

## Score each hook from 1 to 5 on
Curiosity gap, clarity within 3 seconds, relevance to the target viewer, fit with brand voice (`brand/voice.md`).

## Output
Write `episodes/$ARGUMENTS/hooks.md`: a table of the five hooks with pattern and scores, then the winner and one alternate. Reply with the winner only.
