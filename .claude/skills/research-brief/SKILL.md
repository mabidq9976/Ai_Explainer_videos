---
name: research-brief
description: Turns a raw topic brief from topics/inbox into a clean episode brief (claim, evidence, sources, angle, the viewer's question). Use when starting an episode or when a brief needs tightening.
argument-hint: [episode-slug]
allowed-tools: Read Write Edit Glob Bash(mkdir *) Bash(mv topics/*) WebFetch
---

# Research brief

Input: `topics/inbox/$ARGUMENTS.md` (or `episodes/$ARGUMENTS/brief.md` if it already exists).
Output: `episodes/$ARGUMENTS/brief.md`. Then move the inbox file to `topics/archive/`.

1. Read the raw brief. If **My angle** is empty or still the template text, stop and ask the user for it — it's the one field you must not invent.
2. Check each source URL actually supports the point it's attached to (WebFetch if unsure). Drop or flag any claim without support.
3. Write `episodes/$ARGUMENTS/brief.md`, keeping the frontmatter (slug, pillar, format, length) and these sections:
   - **Viewer's question** — the exact question someone types or asks an AI.
   - **Claim** — one sentence the video proves.
   - **Angle** — the user's opinion, verbatim.
   - **Evidence** — 3–5 bullets, each ending with `[source n]`.
   - **Sources** — numbered list: URL : what it proves.
   - **Visual hooks** — 3–6 concrete things that could be shown (products, logos, UI moments, numbers). This feeds director.
   - **CTA** — from the raw brief.
4. Keep it under 60 lines. Reply with the claim in one line.
