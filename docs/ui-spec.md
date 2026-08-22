# VICTORY CLASS — INTERACTIVE LCARS BRIEF
## Screen layout & interaction specification

**In-universe frame:** Starfleet Advanced Tactical Design Bureau familiarization
brief, Stardate 51900. Accessed by Acting Lt. Wesley Crusher, Chief Engineer,
USS Victory NCC-9754-A. Classification: restricted, Bureau eyes only.

**Visual target:** the amber/lavender LCARS wireframe sheet (`refs/`), not the
grey blueprint aesthetic of the NX-01 reference. That reference contributes
information architecture only.

---

## 1. FRAME

Base canvas 1920×1080, scaled fluidly. Root sizing driven by
`clamp()` on `vmin` so the whole console scales as one unit from 720p to 4K
without reflowing. Desktop only for now; no mobile breakpoint.

```
┌──────────────────────────────────────────────────────────────────────┐
│  TITLE BAR — class/registry left · classification block right        │
├────────┬─────────────────────────────────────────┬───────────────────┤
│        │                                         │                   │
│  NAV   │                                         │   READOUT         │
│  RAIL  │            STAGE                        │   COLUMN          │
│        │      (3D canvas / SVG deck plan)        │                   │
│ ~190px │                                         │     ~360px        │
│        │                                         │                   │
│        ├─────────────────────────────────────────┤                   │
│        │  VIEW CONTROL SUB-RAIL                  │                   │
├────────┴─────────────────────────────────────────┴───────────────────┤
│  FRAME-STATION RULER · STATUS TICKER · STARDATE                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Title bar.** Rounded LCARS elbow terminating the left rail. Text:
`FEDERATION STARFLEET • VICTORY CLASS HEAVY INTERDICTOR • USS VICTORY •
NCC-9754-A`. Right end carries a classification block that pulses slowly.

**Nav rail.** Standard LCARS elbow column — one large radius top-left, stacked
pill buttons below, filler blocks with meaningless-but-consistent numeric IDs.

- OVERVIEW
- EXTERNAL VIEW
- LCARS WIREFRAME
- DECK PLANS
- SYSTEMS
- DOSSIER

**Readout column.** Context-sensitive. Content changes per mode; the chrome
does not.

**Bottom bar.** Frame-station ruler (hull frames, fore to aft), a slow status
ticker, and the stardate fixed at 51900.

---

## 2. MODES

### 2.0 BOOT / AUTH
Three seconds. Classification banner, authorization line for Acting Lt.
Crusher, a progress wipe. Skippable on click. Sets the frame; never shown again
in the session.

### 2.1 OVERVIEW *(default)*
Stage shows the three.js model, auto-rotating. Readout column carries the
headline specifications — dimensions, mass, decks, complement, propulsion,
armament summary.

**Auto-rotate sequence.** Starboard → top → starboard → forward → starboard →
aft → starboard → ventral → starboard. 2s hold per station, ~1s eased
transition. Full cycle ≈ 27s.

**Rule:** auto-rotate stops permanently on any control interaction and resumes
only via the AUTO button. It never restarts on a timer.

### 2.2 EXTERNAL VIEW
The rendered beauty stills. Model rotates to the requested station, then
cross-fades to the high-resolution render behind a scanline sweep. The sweep is
not decoration — it masks silhouette mismatch between model and render.

### 2.3 LCARS WIREFRAME
Same model, edge/wireframe shader in amber on black. Interactive: hull hotspots
are live here. Click the nose notch → pulse cannons. Click the dorsal spine →
thermal radiators. Selection routes to SYSTEMS with that entry open.

### 2.4 DECK PLANS
Two sub-modes, toggled in the sub-rail.

**ELEVATION** — side view with all 14 decks as stacked bands. Hovering a band
lights it and names it; clicking opens that deck in PLAN.

**PLAN (INTERNAL SCAN)** — the MRI view. Deck slider 1–14 on the sub-rail,
plus arrow keys and scroll wheel.

Per-deck composition, borrowed wholesale from the NX-01 reference:

| Element | Behaviour |
|---|---|
| Ghost hull | Full top-down silhouette, dim. Identical on every deck |
| Active footprint | That deck's hull cross-section, amber, drawn over the ghost |
| Zone shapes | Authored SVG compartments from `docs/deck-plan.md` |
| Numbered callouts | Circled numerals on the plan, keyed to the features list |
| Features list | Bottom-left. Numbered, matches the callouts. Clickable |
| Reference key | Icon legend, right column |
| Elevation inset | Small side view, current deck highlighted as a band |
| Scale panel | Human · workbee · Defiant · Galaxy, for 455m context |

**Registration.** Every deck's hull outline is a horizontal slice of the same
three.js model, exported once at build time. Guaranteed pixel-registered across
all fourteen. Compartments are authored SVG on top, so a lore revision is a
text edit, not a redraw.

**Reference key icons** (Victory-specific, replacing the NX-01 set):
main corridor · Jefferies tube (0.8m, marked as restricted) · turbolift shaft ·
holo-emitter · EPS junction · coolant loop · heat-sink bank · ablative armor
boundary · pressure bulkhead · transporter pad · ordnance feed · EVA hatch

### 2.5 SYSTEMS
Entries: propulsion · tactical · cloak · thermal · shields · computer ·
holographic systems · evacuation · crew.

Left sub-nav lists systems; stage shows the wireframe with that system's
components highlighted; readout column carries the text. Holographic systems
covers the EMH Mk IV, the ESH security holograms, and the EEH — the last as a
brief entry only, expandable later.

The cloak entry carries the Treaty of Algeron note: a wartime allowance,
valid only while the alliance is.

### 2.6 DOSSIER
Long-form: project summary, registry lineage back to the Constellation-class
NCC-9754, dedication plaque, and the Bureau's certification record including
the Starfleet Medical objection.

---

## 3. DATA

Three JSON files. The panel is a renderer; the lore is data.

- `data/ship.json` — identity, dimensions, headline specs
- `data/decks.json` — 14 entries: name, zones, callouts, notes, restrictions
- `data/systems.json` — system entries, hotspot IDs, body copy

Hotspot IDs are shared across the model, the deck zones, and the systems
entries, so any surface can route to any other.

---

## 4. TYPE & COLOR

**Typeface:** Antonio (Google Fonts) — the standard LCARS substitute for Swiss
911 Ultra Compressed. Fallback stack of condensed sans.

**Palette:** sampled from the wireframe reference sheet once it lands in
`refs/`. Structurally: amber line work and primary text, lavender and
periwinkle panel fills, salmon for warnings and restricted markers, pure black
ground.

---

## 5. BUILD

Static files. No framework, no build step. three.js from a local vendored copy
so it deploys as plain assets. Cloudflare Pages pointed at the repo.
