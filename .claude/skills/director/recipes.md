# Recipes from the reference videos

**Numbered section with an image under it** ("1.) Story" → notebook photo)
```json
{ "type": "board", "elements": [
  { "id": "h", "kind": "text", "text": "1.) Story", "x": 50, "y": 10 },
  { "id": "ar", "kind": "arrow", "from": "h", "to": "img", "at": "write" },
  { "id": "img", "kind": "image", "query": "notebook handwritten story", "x": 50, "y": 28, "w": 46, "at": "write" } ] }
```

**Two examples side by side with name labels** ("2.) Characters" → Tommy / CJ)
`{ "id": "a", "kind": "image", "query": "...", "x": 32, "y": 30, "w": 28, "label": "Tommy", "at": "Tommy" }` + the same at x 68.

**Logo above a screenshot, arrow down** (Blender → UI)
`{ "id": "logo", "kind": "icon", "icon": "logo:blender", "x": 50, "y": 10, "w": 16 }`, `{ "id": "ui", "kind": "image", "url": "<official screenshot>", "x": 50, "y": 30, "w": 70, "label": "Design characters", "at": "design" }`, arrow logo→ui.

**Branching** ("Contribution" → Programming + 3D modelling, each arriving on its word)
header text at (50,10); images at (30,30) and (70,30) with labels, `at` their words; two arrows from header, each `at` its word.

**A + B = result** — icons at x 30 / 70, a `text` "+" at x 50 (`size: "xl"`), a `text` result below at y 48.

**Sticker on an image** — `{ "id": "free", "kind": "badge", "text": "FREE", "on": "img", "at": "free" }`

**Stacked screenshots** — 2–3 images at x 50, y 18 / 34 / 50, w 46, each `at` the word that introduces it.

**Sound / voice** — `{ "id": "wave", "kind": "component", "name": "Waveform", "x": 50, "y": 30, "w": 70, "h": 12 }` under a header.

**Switch flips on** — scene visual `{ "type": "component", "name": "Toggle", "props": { "label": "Monetization", "icon": "logo:youtube" } }`

**Phone with a clip + stat beside it** — `{ "type": "component", "name": "DeviceFrame", "props": { "device": "phone", "query": "person scrolling phone", "kind": "video", "side": "logo:instagram", "sideLabel": "+10M\nViews" } }`

**Comment-keyword CTA** (reference ending) — board: text "Comment" (50,8, sm), text "“GEO + your niche”" (50,14, md, weight 700), image/icon of the reward (e.g. `emoji:📘` w 22, label "Guide") at (62,72) beside the narrator, dotted curved arrow from the keyword text to it.

**Mixed look extras** — one `three` scene (NodeNetwork3D for "everything connects", SearchBar3D for "people search for…"), a `stock` video `frame: "card"` for real-world motion, StatCounter for a number that matters.

**Reddit proof (real-looking threads, no fake counts)** — `{ "type": "component", "name": "RedditFeed", "props": { "posts": [ { "sub": "r/smallbusiness", "title": "Is a cheap website worth it?", "age": "5h", "flair": "Question", "at": "people" } ] } }`

**Google search moment (3D)** — `{ "type": "three", "name": "SearchBar3D", "props": { "query": "your service site:reddit.com", "typeAt": "add" } }` — operators (site:, inurl:) are highlighted automatically.

**Tool shortlist with real logos** — save official icons once (`npm run save -- <slug> logo-x "<apple-touch-icon url>" --credit "X official icon"`), then `{ "type": "component", "name": "ToolStack", "props": { "title": "GEO shortlist", "items": [ { "name": "Profound", "sub": "AI answer visibility", "icon": "assets/manual/logo-profound.png", "at": "Profound" } ] } }`. Same stack again with `"still": true`, `"mark": "skip"`, `"markAt": "skip"`, `"stamp": "LATER"` for "I'd skip those"; `"mark": "plus"` for an add-on.

**"Bigger isn't better" hook** — `{ "type": "component", "name": "DashboardBloat", "props": { "growAt": "bigger", "pickAt": "right", "pickLabel": "The right one" } }`

**Every week / consistency** — `{ "id": "wk", "kind": "component", "name": "Streak", "props": { "at": "every" }, "x": 50, "y": 46, "w": 88, "h": 12 }`
