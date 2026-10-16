# Avatar

## Your narrator (current)
`avatar.svg` is **generated** — don't edit it by hand. Sources are your Illustrator exports:

| File | Pose | Used for gestures |
|---|---|---|
| `README-02.svg` | neutral | `rest` (base `body` + `head`) |
| `README-01.svg` | hand on chin, "?" | `thinking` (alias `think`) |
| `README-03.svg` | arms crossed | `arms-crossed` (alias `crossed`) |
| `README-04.svg` | finger up | `count`, `thumbs-up` |
| `README-05.svg` | open palm, presenting | `open-palm`, `point-right`, `wave` |

`build-avatar.py` gives every pose its own head group (`head-pose`, so the head can drift, nod and tilt while the body
stays put) and adds to every pose: nine lip-sync mouths (A–H drawn to sit under the mustache, X = your own smile),
closed eyes for blinks, raised and frown brows, and lines each pose's head up with the neutral one so nothing jumps.
`rig.json` holds the pivots, the gesture → pose aliases, and `flipWhenRight` (mirror when standing on the right so
gestures face the content).

Edit a source drawing (or add a pose) → `npm run avatar:build` → `npm run avatar:sheet` (writes `out/avatar-sheet.png`
showing every pose × mouth, blink and brow state). To add a pose, export it from Illustrator, add an entry to `POSES`
in `build-avatar.py` (element indices come from a quick measurement — ask Claude), and an alias in `rig.json` if useful.

---

Drop your layered master file here as **`avatar/avatar.svg`** (and adjust `avatar/rig.json`).
Until it exists, the pipeline uses `avatar/placeholder/avatar.svg` so every render still works.
Check your file any time on the dashboard's **Avatar** page or with `npm run doctor`.

## Drawing rules
- Artboard **1080 × 1080**, one stroke width for every line.
- Name layers exactly as below — Figma and Illustrator export layer names as SVG ids
  (suffixes like `mouth-A_1_` or `mouth-A-2` are cleaned up automatically).
- All mouths share one anchor point and bounding box so swapping never makes the face jump.
- Arms pivot from the shoulder: put each shoulder's coordinates in `rig.json → pivots`.
- Export as SVG with **"Include id attributes"** on, outlines as strokes or paths (either is fine), no embedded raster images.

## Required groups
| id | what |
|---|---|
| `body` | torso (breathes: 1–2% scale from `pivots.body`) |
| `head` | head, contains eyes/brows/mouths (bobs while speaking, 3° tilt on emphasis) |
| `eyes-open`, `eyes-closed` | blink every 2–6 s |
| `brows-neutral`, `brows-raised`, `brows-frown` | the scene's `expression` |
| `mouth-A` … `mouth-F` | Rhubarb shapes (A closed M/B/P · B teeth · C open · D wide · E rounded · F puckered) |
| `arm-left-rest`, `arm-right-rest` | resting arms |

## Optional groups
| id | what |
|---|---|
| `mouth-G`, `mouth-H`, `mouth-X` | F/V teeth-on-lip · long L · relaxed rest — more natural speech |
| `arm-left-<gesture>`, `arm-right-<gesture>` | gestures: `point-right`, `open-palm`, `count`, `thumbs-up`, `wave` — each side shows its variant if drawn, otherwise rest |
| `pose-<name>` | **whole-body pose** (like the reference's narrator switching poses every beat): when a scene's gesture is `<name>` and `pose-<name>` exists, it replaces body, head and arms. Put `mouth-*` groups inside a pose to keep lip sync. Examples: `pose-thinking`, `pose-sunglasses`, `pose-shrug`, `pose-peek` |

Wrap variants in parent groups `arm-left` / `arm-right` if you like — only the ids above matter.

## rig.json
```json
{ "pivots": { "head": [540, 690], "body": [540, 1060], "arm-left": [392, 700], "arm-right": [688, 700] } }
```
Coordinates are in your SVG's viewBox units.
