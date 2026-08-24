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
- `public/js/app.js` — survey sequence, view stations, still handoff, decks
- `public/js/annotations.js` — the four systems-readout groups and their
  per-view anchors
- `public/js/deck-data.js` — per-deck contents transcribed from
  `docs/deck-plan.md`, tagged fwd/mid/aft rather than pinned to exact
  coordinates, since the source text doesn't support finer placement
- `public/js/annotate.js` — the annotation overlay shared by both readout
  systems: pins, leaders, captions, column balancing, overlap-safe stacking
- `public/css/lcars.css` — LCARS chrome, palette sampled from the reference
  sheets; design canvas is 960x540 (2x the original 1920x1080) so the whole
  console reads larger at any window size
- `public/js/audio.js` — button and ambient sound manager: handles the
  autoplay-block/first-gesture unlock, the boot voice sequence, and mute
- `public/audio/` — the nine LCARS sound cues
- `public/vendor/` — three.js r169, vendored so the site is plain static files
- `public/refs/` — reference art and the generated crops
- `public/refs/decks/` — the fourteen deck interiors plus `hull-outline.webp`,
  a shared silhouette layer common to all of them, stored as opaque WebP
- `refs-src/decks-v2/` — the deck renders and the hull-outline layer as
  delivered, before registration
- `tools/extract-hull.py` — measures the hull off the reference views and
  regenerates `hull-data.js` and the texture crops. Run from the repo root
  after changing the art.
- `tools/register-decks.py` — centres the shared frame on the hull outline and
  matches its proportions to the exterior top view. Because the outline layer
  is common to every deck, one transform serves all fourteen — there is
  nothing left to drift between them. It also measures the baked-in deck
  titles and cuts them off below the lowest one, rather than at a fixed row
  that the taller titles hang past.
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

Version 1.0. Working: the auto-rotating survey across five stations with
beauty-still handoff, a schematic wireframe mode, four systems readouts that
pin hardware to whichever station is showing, and the deck browser — a
continuous slider over fourteen registered plates, each with its own
animated callouts transcribed from the deck plan, entered via a triangle-by
-triangle strip-away of the exterior hull. Dimensions (455 x 304 x 101 m)
are derived from the reference art rather than the original spec text, for
consistency between what the panel says and what it draws.

Not yet built: the reference key on the deck plates, and the dossier page.
Both specified in `docs/ui-spec.md`.

## Audio

Nine cues: a looping ambient engine bed, work/fail feedback on every button
press, secondary confirmation sounds for view changes, auto-survey,
wireframe, and the deck browser, and a two-part boot voice sequence
(accessing-library → security-accepted). Browsers block audio until the page
has seen a user gesture, so the boot screen holds until PROCEED is pressed —
the load bar grows into that button once the hull and its textures are in —
and that press is what starts the welcome sequence and the engine bed. A
MUTE pill in the bottom bar silences everything, including the ambient loop.
