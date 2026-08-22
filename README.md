# Victory Class

Interactive LCARS familiarization brief for the USS Victory, NCC-9754-A —
a fan-made Star Trek ship class set in late 2374, during the Dominion War.

## Contents

Everything published lives under `public/`. Everything else is source of record.

- `public/index.html` — the console
- `public/js/victory-model.js` — hull lofted from the reference orthographics
  (bow +X, dorsal +Y, starboard +Z)
- `public/js/hull-data.js` — generated section data; do not hand-edit
- `public/js/app.js` — survey sequence, view stations, still handoff
- `public/css/lcars.css` — LCARS chrome, palette sampled from the reference sheets
- `public/vendor/` — three.js r169, vendored so the site is plain static files
- `public/refs/` — reference art and the generated crops
- `tools/extract-hull.py` — measures the hull off the reference views and
  regenerates `hull-data.js` and the texture crops. Run from the repo root
  after changing the art.
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

The overview stage is working: auto-rotating survey with five manual view
stations and a wireframe mode. Deck plans, systems, and the dossier are
specified in `docs/ui-spec.md` but not yet built.
