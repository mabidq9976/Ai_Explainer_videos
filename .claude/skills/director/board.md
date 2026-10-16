# Board spec

A board is one scene's canvas. Coordinates are **% of the 1080×1920 frame**, `x`,`y` = the element's centre.

```
y  0 ┌──────────────────────────┐
   8 │      1.) Section header   │  header row  (y 8–12)
  20 │   [ main image / logo ]   │  main zone   (y 18–45)
  45 │  label     label   label  │  second row  (y 42–58)
  63 │ ─ ─ ─ narrator zone ─ ─ ─ │  corner narrator stands here (y 63–85), at x≈20 / 50 / 80
  85 │                           │  keep clear: Reels/Shorts UI below y≈85
 100 └──────────────────────────┘
     x 0          50          100
```

## Elements (all need `id` and `kind`; `at` = seconds after scene start, or a word/phrase from the line)
| kind | key fields | notes |
|---|---|---|
| `text` | `text`, `size` sm/md/lg/xl, `weight`, `align`, `w` | `\n` for line breaks. Headers: md, weight 500. `enter: "type"` types it on. |
| `image` | `query` (stock search) or `url` (specific image) or `src` (`assets/manual/x.png`), `media` photo/video, `frame` plain/rounded/card/cutout/circle/phone/laptop, `label`, `w`, `h` | default `frame: plain` (reference look). Width 40–70 for a hero image, 25–35 for pairs. |
| `icon` | `icon` (`logo:blender`, `emoji:🎓`, `line:users`, `text:+10M`), `label`, `w` | w 12–22 typical. |
| `arrow` | `from`, `to` (element ids or `[x,y]`), `style` straight/curve/dotted, `bend` | draws on at `at`. Element arrows auto-attach to the nearest edges. |
| `badge` | `on` (element id), `text` | red starburst sticker, e.g. "FREE", "NEW", "#1". |
| `component` | `name`, `props`, `w`, `h` | any catalog component placed inside a box on the board. |

Optional on any element: `until` (when it leaves), `enter` pop/fade/slide/type/none.
On the board: `"continue": true` keeps the previous scene's elements (header persists, new items add).
Element ids must be unique across a continued chain.
