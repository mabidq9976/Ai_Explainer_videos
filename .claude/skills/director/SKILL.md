---
name: director
description: Directs an episode — decides what the viewer sees on every word. Plans boards (text, photos, screenshots, logos, arrows, stickers, motion graphics, 3D, stock clips) timed to spoken words, the narrator's gestures, poses and movement, and the episode's look. Requests or builds new motion graphics when the library lacks one. Use after the script exists, or to redo visuals.
argument-hint: [episode-slug]
allowed-tools: Read Write Edit Skill WebSearch Bash(npm run validate *) Bash(npm run timeline *)
---

# Director

You are the director. The script is written; you decide **what is on screen at every moment** and **what the narrator does**.

Read: `episodes/$ARGUMENTS/scene.json`, `episodes/$ARGUMENTS/brief.md` (Visual hooks), `brand/visual-style.md`,
`studio/src/components/catalog.json`, and in this folder `board.md` (element spec + coordinates) and `recipes.md` (patterns from the reference videos).
Run `npm run timeline $ARGUMENTS` to see each word's time (estimated before the voice exists, real after).

## 1. Pick the look (top-level `look`)
- `reference` — exactly the reference style: white page, boards of photos/screenshots/logos/emoji + short labels, thin arrows, numbered section headers, stickers. No 3D. Use for most tutorials and listicles.
- `mixed` — the reference style plus a few extras where they earn it: one 3D scene, a custom motion graphic, a stock video clip, a DeviceFrame. Use when a concept is abstract or a moment needs a "wow".
Keep whatever the brief/user asked for. Default `reference`.

Also pick a top-level `cardStyle` for UI graphics (AI answer, quotes, citations, browser frames):
`chat` (default — grey chat bubble with typing dots, feels like a real AI), `brutal` (thick ink border, hard shadow — bold), `soft` (modern app card, soft shadow, source chips),
`line` (clean outline with an accent edge — editorial).
One per episode for consistency; a single graphic can override with `props.look`.

## 2. Direct every scene
Default to a **board** (`"type": "board"`). For each spoken line ask: what would the narrator point at while saying this? Then:
- Put elements on the board with `at` = the **word** that should make them appear (`"at": "Characters"`). Things arrive *as they're said*, never all at once.
- Numbered sections: a header text (`"1.) Story"`) at y≈10, then items under it. Keep the header across scenes with `"continue": true` on following boards.
- Something new on screen at least every ~2–3 s (the timeline prints ⚠ when a gap > 3.5 s).
- Labels 1–3 words, plain sentence case. Big statements only for the hook/payoff (BigQuestion / HookTitle).
- Real things (people, places, products) → `image` with a 2–5 noun `query`. The producer sources it from Magnific (MCP);
  if you're running inside `/produce` you can source it yourself (`../produce/magnific.md`).
  Specific product UI or a known image → `url` to an official screenshot you found (WebSearch); it's logged "verify rights".
- Brands → `icon: "logo:<slug>"` (simple-icons; no OpenAI/LinkedIn/Amazon/Canva/Windows — use an image `url` or `line:robot`).
- Ideas → emoji or `line:` icons. Relationships → arrows (`straight` for sequence, `curve` for cause, `dotted` for "go here").
- A standalone moment that's clearer as one graphic → `component` scene or a `component` element (Toggle, StatCounter, Waveform, Checklist, SerpVsAiAnswer, CitationCards, ProfileList, DeviceFrame…).
- `mixed` look only: up to one 3D scene (SearchBar3D, NodeNetwork3D) and stock video where motion matters.

## 3. Direct the narrator (`avatar`)
- Start each scene with `layout`, `position`, `gesture`, `expression`; then add `beats` timed to words where meaning changes:
  `"beats": [{ "at": "first", "gesture": "count" }, { "at": "Blender", "gesture": "point-right", "position": "center" }]`.
- Natural, not robotic: 0–1 beats per scene, gestures that match meaning. Current narrator (`npm run doctor` lists them):
  `rest` (neutral) · `open-palm` / `point-right` / `wave` (presenting palm) · `count` / `thumbs-up` (finger up — lists,
  "one thing", ideas) · `thinking` (hand on chin — questions, "here's the catch") · `arms-crossed` (confident, myth-busting, "nope").
  Fewer, longer gestures look natural: hold a pose through related lines, change it at most every ~2–3 s
  (the renderer drops changes held < 0.8 s), and use `rest` for calm stretches.
- Move the narrator (`position`) every 2–3 scenes, toward the side the eye should go. Never two identical states in a row.
- `full` layout for the hook or a personal aside; `corner` most of the time; `hidden` almost never.
- Keep board elements out of the narrator's area (y > 63 in corner layout) unless placing a prop beside them on purpose.

## 4. Camera and sound cues (engagement)
The camera slowly pushes in on every shot automatically (`"camera": false` at the top level turns it off).
You add the accents, timed to words:
- `punch`: words where the camera snaps in ~8% and eases back — the hook's key word, the payoff, a big number.
  About one every other scene at most.
- `sfx`: `[{ "at": "<word>", "kind": "…" }]` on a scene —
  `riser` (builds up and ends exactly on the word: before a reveal/payoff, 1–2 per video),
  `hush` (music drops out for ~0.5 s right before the word — the single most important line, 1–2 per video),
  `scratch` (myth-bust / "wrong"), `ding` (a win), `pop` / `whoosh` (extra accents).
  Automatic already: whoosh on picture changes, pops when board items land, dings on checklist ticks,
  typing under the AI-answer card — don't duplicate those.
- Pacing: something new on screen every ~2 s (`npm run timeline` flags gaps > 2.5 s and single visuals > 3 s).
- Pattern interrupt about every 8 s: something visually different from the last few beats (a real photo after icons,
  the one 3D moment, a full-layout aside, a stock clip).

## 5. Captions
Run `/caption-designer <slug>` after you finish the visuals — it sets the headline, fact tags and subtitles
(professional presets, fixed positions). Leave a clear band at the top (y < 24) in the hook scene if the hook
deserves a headline.

## 6. When the library lacks a graphic
If a moment truly needs a new motion graphic (e.g. a "loading bar filling", "phone notification stack"):
invoke `/component-builder <Name> <what it shows>` to build it now, then use it. Otherwise note it in
`episodes/$ARGUMENTS/component-requests.md` and use the closest existing option.

## 7. Finish
`npm run validate $ARGUMENTS` until it passes, then `npm run timeline $ARGUMENTS` and fix any ⚠.
Reply with one line per scene: `id — what's on screen — narrator`.
