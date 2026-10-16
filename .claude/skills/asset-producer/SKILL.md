---
name: asset-producer
description: Prepares every asset an episode needs before assembly — reads the shot list, gets what's missing the cheapest way (catalog graphics, logos/icons, the shared library, free stock APIs, then Magnific), builds missing motion graphics or 3D in Remotion, and confirms everything is ready to render. Cost- and token-efficient by design. Use after the director and sync passes, before rendering.
argument-hint: [episode-slug]
allowed-tools: Read Edit Skill Bash(npm run shotlist *) Bash(npm run assets *) Bash(npm run save *) Bash(npm run validate *) Bash(npm run sync *) mcp__magnific__stock_search mcp__magnific__stock_download mcp__magnific__audio_sfx_generate mcp__magnific__audio_music_generate mcp__magnific__creations_wait mcp__magnific__simulate_cost mcp__magnific__account_balance
---

# Asset producer — create assets first, then assemble

Episode: `$ARGUMENTS`. Read `cost-rules.md` in this folder once.

1. `npm run shotlist $ARGUMENTS` — every asset with its status: ready · 🆓 free · 💳 credits · 🛠 build, plus the
   credit estimate vs budget (`EPISODE_CREDIT_BUDGET`, default 300). If the estimate is over budget, swap paid items
   for free alternatives (step 3) before spending anything; still over → stop and ask the user.
2. **Free first:** `npm run assets $ARGUMENTS` (library cache, Pexels/Pixabay if keys exist, `url` downloads — zero
   tokens). Re-run the shot list.
3. **For each 💳 item, ask "does this need a real photo?"** Decorative or conceptual → replace it in scene.json with a
   catalog component, `logo:` / `line:` / `emoji:` icon, or a Diagram (free). Only real people/places/products earn stock.
4. **Magnific for what's left:** one `stock_search` per item (`content_type: "photo"`, `license: "free"`,
   `orientation: "landscape"`, `ai_generated: "excluded"` for real things). Pick by title → `stock_download` →
   `npm run save -- $ARGUMENTS <key> "<url>" --credit "Magnific · <title>" --query "<query>"` → set the element's `"src"`.
   Video only in the mixed look and only if motion is the point (≈600 credits).
5. **🛠 items (new motion graphic / 3D):** first try to express the beat with an existing catalog component and props.
   Only if none fits: `/component-builder <Name> <what it shows>` — generic, reusable, animated from the frame only,
   word-cue props (`at`) for its moves. 3D: at most one per video, simple geometry, mixed look only.
6. **Sound:** reuse `brand/sfx` and `brand/music`; generate only a missing kind (`audio_sfx_generate`, 1 s, ~5 credits)
   → `npm run save -- brand sfx/<kind> "<url>"`.
7. `npm run shotlist $ARGUMENTS` until every item is ready, then `npm run sync $ARGUMENTS` (new items need anchors) and
   `npm run validate $ARGUMENTS`. Reply: credits spent vs estimate, what you built, what you swapped for free.

Never open, read or describe image, audio or video files — titles and the shot list are enough.
