# Cost & token rules

**Credits (Magnific, approximate — `simulate_cost` when unsure)**
- Free-license photo download ~40 · premium video ~600 · icon ~40 · 1 s sound effect ~5 · 30 s music ~80 ·
  voice ~3.6 per second.
- Paid once = reused forever: always pass `--query` to `npm run save` so the file goes into `library/` and the next
  episode with a similar query gets it free from `npm run assets`.
- Order of preference: catalog component / logo / icon / emoji (0) → library hit (0) → Pexels/Pixabay (0, needs keys)
  → Magnific free-license photo → Magnific premium photo → Magnific video (rarely).

**Tokens (Claude)**
- The shot list and `npm run sync` / `npm run timeline` are compact text — read those, not scene.json, to plan.
- One `stock_search` per item: results are ~50 items (several thousand tokens). Never page; refine the query instead.
- Don't call `account_balance` more than once per episode; don't re-generate a voice or sound that's cached.
- New Remotion components cost tokens once and are free forever after — build generic, reusable ones, never
  episode-specific code.
