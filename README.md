# Victory Class

Interactive LCARS familiarization brief for the USS Victory, NCC-9754-A —
a fan-made Star Trek ship class set in late 2374, during the Dominion War.

## Contents

- `index.html` — the console
- `js/victory-model.js` — procedural three.js hull (nose +X, dorsal +Y, starboard +Z)
- `js/app.js` — survey sequence, view stations, mode switching
- `css/lcars.css` — LCARS chrome, palette sampled from the reference sheets
- `vendor/` — three.js r169, vendored so the site deploys as plain static files
- `docs/deck-plan.md` — deck-by-deck layout
- `docs/ui-spec.md` — screen layout and interaction spec
- `refs/` — reference art

## Running locally

Static files, no build step. Any static server will do:

```
python3 -m http.server 8000
```

## Deploying

Cloudflare Pages, pointed at this repo. No build command, output directory `/`.

## Status

The overview stage is working: auto-rotating survey with five manual view
stations and a wireframe mode. Deck plans, systems, and the dossier are
specified in `docs/ui-spec.md` but not yet built.
