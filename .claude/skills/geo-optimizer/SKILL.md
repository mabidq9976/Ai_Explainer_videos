---
name: geo-optimizer
description: Checks an episode's blog post against the GEO checklist, fixes what fails, and adds FAQPage + Article JSON-LD. Use after repurpose writes blog.md.
argument-hint: [episode-slug]
allowed-tools: Read Write Edit
---

# GEO optimizer

Read `episodes/$ARGUMENTS/blog.md`, `episodes/$ARGUMENTS/brief.md` and `checklist.md` in this folder.

1. Score the post against every checklist item (pass / fail + one-line reason).
2. Fix every fail directly in `blog.md`. Don't pad — tighten.
3. Write `episodes/$ARGUMENTS/schema.json`: an array with one `Article` (headline, description, datePublished, author, citation URLs from the brief) and one `FAQPage` built from the post's FAQ section. Valid JSON-LD.
4. Append a `<!-- GEO check: n/n passed -->` comment at the end of blog.md.

Reply with the score before and after, e.g. `GEO 6/9 → 9/9`.
