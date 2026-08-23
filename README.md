# Victory Class

Interactive LCARS familiarization brief for the USS Victory, NCC-9754-A —
a fan-made Star Trek ship class set in late 2374, during the Dominion War.

## Contents

Everything published lives under `public/`. Everything else is source of record.

- `public/index.html` — the console
- `public/models/victory.glb` — the hull mesh, meshopt-compressed
  (314k triangles, 1.2 MB); `victory-lowpoly.glb` is the decimated copy the
  schematic wireframe is built from
- `public/js/victory-model.js` — loads and normalises the mesh, and surfaces it
  triplanarly from the reference views (bow +X, dorsal +Y, starboard +Z)
- `public/js/hull-data.js` — generated reference measurements; do not hand-edit
- `public/js/app.js` — survey sequence, view stations, still handoff
- `public/css/lcars.css` — LCARS chrome, palette sampled from the reference sheets
- `public/vendor/` — three.js r169, vendored so the site is plain static files
- `public/refs/` — reference art and the generated crops
- `public/refs/decks/` — the fourteen deck plates, registered onto the hull's
  plan silhouette and stored as opaque WebP (2 MB for all fourteen; the same
  plates with an alpha channel came to 25 MB as PNG)
- `refs-src/decks/` — the deck renders as delivered, before registration
- `tools/extract-hull.py` — measures the hull off the reference views and
  regenerates `hull-data.js` and the texture crops. Run from the repo root
  after changing the art.
- `tools/register-decks.py` — fits each deck render onto the hull's plan
  silhouette by maximising overlap, so the ship holds still while scrubbing
- `tools/clean-hull.py` — strips detached geometry from a scanned hull
- `docs/deck-plan.md` — deck-by-deck layout
- `docs/ui-spec.md` — screen layout and interaction spec

## Running locally

Static files, no build step. Any static server will do:

```
cd public && python3 -m http.server 8000
```

## Deploying

Cloudflare, deploy command `npx wrangler deploy`. `wrangler.jsonc` declares
`public/` as the assets directory; there is no Worker code and no build step.

## Status

Working: the auto-rotating survey across five stations with beauty-still
handoff, a schematic wireframe mode, and the deck browser — fourteen
registered deck plates with a continuous slider that settles on a deck.

Not yet built: per-deck callouts and the reference key, the systems pages,
and the dossier. All specified in `docs/ui-spec.md`.
