---
name: component-builder
description: Creates a new Remotion motion graphic or 3D component in the house style and adds it to the catalog. Use when the director or producer needs a graphic the library doesn't have, or when the user asks for one.
argument-hint: [ComponentName] [what it shows]
allowed-tools: Read Write Edit Glob Bash(npm run typecheck) Bash(npm run render *) Bash(npx remotion *)
---

# Component builder

Request: $ARGUMENTS
Build it once, reusable: generic props, no episode-specific text baked in.
(Also check `episodes/*/component-requests.md` for pending requests that match.)

1. Read `brand/visual-style.md`, `studio/src/theme.ts`, `studio/src/components/shared.tsx`, `studio/src/components/Icon.tsx`
   and two existing components (Diagram.tsx and Toggle.tsx) to match conventions.
2. Create `studio/src/components/<Name>.tsx` (or `studio/src/three/<Name>.tsx` for 3D with `@remotion/three`):
   - Props are plain JSON-serialisable values, plus `box: { w, h }` (the zone it renders in) and optional `assets`
     (files fetched for any prop object with a `query`).
   - Timed moves take word cues: name the prop `at` (or `<thing>At`, e.g. `revealAt`) — add the key to `AT_KEYS` in
     `studio/src/timeline.ts`; it arrives as seconds after the component appears. Default to a stagger when absent.
   - Animate only from `useCurrentFrame()` — no `Math.random()`, no timers, no CSS animations. Use `random(seed)` from remotion.
   - Use `theme` colours/font, `usePop` for entrances, `Icon` for any icon spec. White page, ink lines, one accent.
   - Lay out relative to `box` so it works as a full scene and as a `component` element inside a board.
   - 3D: simple geometry, flat materials, ≤ ~50 meshes.
3. Register it in `studio/src/components/registry.ts` and add an entry to `studio/src/components/catalog.json`
   (`type`, `use`, `props` with types) — validate.ts and director read the catalog.
4. Add a recipe line to `.claude/skills/director/recipes.md`.
5. Run `npm run typecheck`. Fix errors. Remove the request from component-requests.md if it came from there.

Reply with the component name and one example `visual` JSON.
