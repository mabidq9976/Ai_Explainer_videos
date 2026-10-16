# Magnific MCP — sourcing assets

Check `account_balance` once at the start. Costs seen so far: free-license photo download 40 credits, premium
video ~600, music (google-lyria-3, 30 s) 80, a 1 s sound effect 5. Use `simulate_cost` when unsure.

## Photos / screenshots-like images
1. `stock_search` with `query` (2–5 concrete nouns), `content_type: "photo"`, `license: "free"` first,
   `orientation: "landscape"` for board images (`"portrait"` only for full-frame), `ai_generated: "excluded"` for real people/places.
2. Pick the result whose **title** best matches the line (you can't see images — trust titles; avoid "blank screen", "green screen", text-heavy titles).
3. `stock_download { id, type: "photo" }` → `npm run save -- <slug> <sceneId>.<elementId> "<downloadUrl>" --credit "Magnific · <title>"`.
   Signed URLs expire within minutes — save immediately.
4. Set the element `"src": "assets/manual/<sceneId>.<elementId>.jpg"` (the save command prints it).

## Icons for things simple-icons doesn't cover
`stock_search { content_type: "icon", shape: "hand-drawn" or "outline", query }` → `stock_download { id, type: "icon", format: "png" }`
→ save as above → use as an `image` element with `"frame": "cutout"` (hand-drawn icons match the narrator's line style).

## Video clips (mixed look only, max one per episode unless the user says otherwise)
`stock_search { content_type: "video", video_type: "footage", orientation }` → `stock_download { id, type: "video", max_bytes: 30000000 }`
→ save → element `"media": "video", "src": …`. Premium video costs ~600 credits — say so in your reply.

## Music bed / sound effects (only when asked, or brand/music is empty)
`audio_music_generate { model: "google-lyria-3", prompt: "<mild, curious, unobtrusive lo-fi bed …, no vocals>" }` →
`creations_wait` → `npm run save -- brand music/<name> "<url>" --credit "Magnific · Lyria"`.
Sound effects: `audio_sfx_generate { prompt, durationSeconds: 1 }` → `npm run save -- brand sfx/<pop|whoosh> "<url>"`.
Episode-only music: `npm run save -- <slug> music "<url>"` (overrides the brand bed for that episode).
