/* ==========================================================================
   VICTORY CLASS — interactive brief, overview stage
   Auto-rotating orthographic survey with manual view stations.
   ========================================================================== */

import * as THREE from '../vendor/three.module.min.js';
import { buildVictory, SHIP } from './victory-model.js';
import { HULL } from './hull-data.js';
import { createAnnotations } from './annotate.js';
import { READOUTS } from './annotations.js';
import { DECKS, ZONE_U } from './deck-data.js';
import { sfx } from './audio.js';

/* --- view stations -------------------------------------------------------- */
/* dir = unit vector from the ship toward the camera; up orients the screen.  */

/* `span` is the ship dimension that fills the frame at that station, so bow
   and stern zoom in instead of leaving the hull tiny in the middle. */
const STATIONS = {
  starboard: { label: 'STARBOARD ELEVATION', dir: [ 0,  0,  1], up: [0,  1,  0], span: 'length' },
  top:       { label: 'DORSAL PLAN',         dir: [ 0,  1,  0], up: [0,  0, -1], span: 'length' },
  forward:   { label: 'BOW ASPECT',          dir: [ 1,  0,  0], up: [0,  1,  0], span: 'beam'   },
  aft:       { label: 'STERN ASPECT',        dir: [-1,  0,  0], up: [0,  1,  0], span: 'beam'   },
  ventral:   { label: 'VENTRAL PLAN',        dir: [ 0, -1,  0], up: [0,  0,  1], span: 'length' }
};

const spanOf = (name) => STATIONS[name].span === 'beam' ? SHIP.beam : SHIP.length;

/* the survey loop: always returning to the starboard beam between stations   */
const SEQUENCE = [
  'starboard', 'top', 'starboard', 'forward',
  'starboard', 'aft', 'starboard', 'ventral'
];

const HOLD_MS       = 2000;
const TRANSITION_MS = 1100;

/* --- scene ---------------------------------------------------------------- */

const stage    = document.getElementById('stage');

/** One design unit in physical pixels — the whole console scales off this. */
const unitPx = () => parseFloat(getComputedStyle(document.documentElement)
  .getPropertyValue('--s')) || (stage.clientWidth / 833);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();

/* Long focal length: reads as an orthographic schematic but keeps enough
   perspective that the rotation has depth. */
const RADIUS = 168;
const camera = new THREE.PerspectiveCamera(17, 1, 1, 1000);
camera.position.set(0, 0, RADIUS);
camera.lookAt(0, 0, 0);

const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

const ship = buildVictory();
scene.add(ship);

/* Lighting rides with the camera. A world-fixed key leaves whichever face is
   pointed at the viewer in shadow — the ventral station was rendering 4% lit
   against 47% in the reference — so the key, fill and rim are all children of
   the rig and every station is lit the same way. */

scene.add(new THREE.HemisphereLight(0xc4d2e6, 0x8892a2, 3.0));

function rigLight(color, intensity, pos) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.set(pos[0], pos[1], pos[2]);
  l.target.position.set(0, 0, 0);
  rig.add(l);
  rig.add(l.target);
  return l;
}

// camera looks down its local -Z, so lights sit on the +Z side of the rig
rigLight(0xf2f6ff, 1.35, [ 0.45,  0.85,  1.0]);  // key, high and slightly left
rigLight(0xa8b8d2, 0.95, [-0.9,  -0.45,  0.8]);  // fill from the opposite side
rigLight(0xff9b52, 0.55, [-0.4,   0.15, -1.0]);  // warm rim from behind

/* --- station orientation maths -------------------------------------------- */

const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _o = new THREE.Vector3(0, 0, 0);
const _u = new THREE.Vector3();

function quatFor(name) {
  const st = STATIONS[name];
  _v.set(st.dir[0], st.dir[1], st.dir[2]).normalize();
  _u.set(st.up[0], st.up[1], st.up[2]);
  _m.lookAt(_v, _o, _u);
  return new THREE.Quaternion().setFromRotationMatrix(_m);
}

const QUAT = {};
for (const name of Object.keys(STATIONS)) QUAT[name] = quatFor(name);

/* --- state ---------------------------------------------------------------- */

const state = {
  auto: false,
  seqIndex: 0,
  current: 'starboard',
  from: QUAT.starboard.clone(),
  to: QUAT.starboard.clone(),
  t: 1,            // 0..1 through the current transition
  holdUntil: 0,
  mode: 'solid',
  fovFrom: 20,
  fovTo: 20
};

rig.quaternion.copy(QUAT.starboard);

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function goTo(name, { fromAuto = false } = {}) {
  if (!STATIONS[name]) return;
  if (!fromAuto) stopAuto();
  hideStills();
  state.from.copy(rig.quaternion);
  state.to.copy(QUAT[name]);
  state.fovFrom = camera.fov;
  state.fovTo = fovFor(spanOf(name));
  state.current = name;
  state.t = 0;
  setViewLabel(name);
  markActive(name);
  anno.refresh();      // t is 0 now, so this clears until the station settles
}

function stopAuto() {
  if (!state.auto) return;
  state.auto = false;
  document.getElementById('btn-auto').classList.remove('is-active');
  setScan(false);
  syncReadoutButtons();
  if (!anno.active) anno.set('hull');
  syncReadoutButtons();
}

function startAuto() {
  state.auto = true;
  document.getElementById('btn-auto').classList.add('is-active');
  setScan(true);
  // resume from wherever we are, continuing the sequence in order
  const idx = SEQUENCE.indexOf(state.current);
  state.seqIndex = idx >= 0 ? idx : 0;
  state.holdUntil = performance.now() + HOLD_MS;
  syncReadoutButtons();
}

/* --- chrome bindings ------------------------------------------------------ */

function setViewLabel(name, suffix) {
  const tail = suffix || 'SCAN 75747';
  document.getElementById('view-label').innerHTML =
    `${STATIONS[name].label} <span>&nbsp;/&nbsp;${tail}</span>`;
}

function setScan(live) {
  const el = document.getElementById('scanstate');
  el.innerHTML = live
    ? 'SURVEY SEQUENCE <span class="live">ACTIVE</span> &nbsp;•&nbsp; AUTOMATIC STATION ADVANCE'
    : 'SURVEY SEQUENCE HELD &nbsp;•&nbsp; MANUAL STATION SELECT';
}

function markActive(name) {
  document.querySelectorAll('.pill[data-view]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.view === name);
  });
}

document.querySelectorAll('.pill[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    sfx.play('button-press-work');
    sfx.play('change-view-or-display-readout');
    if (typeof deck !== 'undefined' && deck.on && btn.dataset.view !== 'top') exitDecks();
    goTo(btn.dataset.view);
  });
});

document.getElementById('btn-auto').addEventListener('click', () => {
  sfx.play('button-press-work');
  sfx.play('enable-or-disable-auto-camera');
  if (state.auto) stopAuto(); else startAuto();
});

const btnMode = document.getElementById('btn-mode');
btnMode.addEventListener('click', () => {
  sfx.play('button-press-work');
  sfx.play('wireframe');
  state.mode = state.mode === 'solid' ? 'wireframe' : 'solid';
  ship.userData.setMode(state.mode);
  hideStills();
  if (state.mode === 'solid' && state.t >= 1) showStill(state.current);
  btnMode.textContent = state.mode === 'solid' ? 'LCARS WIREFRAME' : 'EXTERNAL VIEW';
  btnMode.classList.toggle('is-active', state.mode === 'wireframe');
});

/* --- resize --------------------------------------------------------------- */

/** Field of view that frames `span` metres across the stage. */
function fovFor(span) {
  const fitH = 2 * Math.atan((span * 0.54) / RADIUS);
  const fitW = 2 * Math.atan((span * 0.54) / (RADIUS * camera.aspect));
  return THREE.MathUtils.radToDeg(Math.max(fitH, fitW));
}

function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  state.fovFrom = fovFor(spanOf(state.current));
  state.fovTo = state.fovFrom;
  camera.fov = state.fovFrom;
  camera.updateProjectionMatrix();
  layoutStills();
  layoutDecks();
  anno.refresh();
}


/* --- orthographic stills -------------------------------------------------- */
/* Once a station settles, cross-fade from the model to the rendered ortho for
   that aspect. A scanline sweep covers the handoff so any silhouette mismatch
   reads as a render effect. Bow and stern have no render yet, so they stay on
   the model. */

const stills = Array.from(document.querySelectorAll('.still'));
for (const el of stills) el.addEventListener('load', () => layoutStills());
const sweep = document.getElementById('sweep');
const hasStill = (name) => stills.some((s) => s.dataset.view === name);

function hideStills() {
  for (const s of stills) s.classList.remove('shown');
  if (!deck.on) ship.visible = true;
}

/** Size each still so its hull spans exactly what the model's hull spanned:
    the crops are cut to the hull bounding box, so one dimension maps directly
    to the ship's length (plan and elevation) or beam (bow and stern). */
function layoutStills() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  const visW = 2 * RADIUS * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect;
  for (const el of document.querySelectorAll('.still')) {
    const span = el.dataset.span === 'beam' ? SHIP.beam : SHIP.length;
    const px = (span / visW) * w;
    const ar = (el.naturalWidth && el.naturalHeight) ? el.naturalHeight / el.naturalWidth : 0.5;
    el.style.width = px + 'px';
    el.style.height = (px * ar) + 'px';
  }
}

function showStill(name) {
  if (state.mode === 'wireframe' || deck.on) return;
  const el = stills.find((s) => s.dataset.view === name);
  if (!el) return;
  sweep.classList.remove('run');
  void sweep.offsetWidth;
  sweep.classList.add('run');
  setTimeout(() => {
    if (state.current !== name || state.t < 1 || state.mode === 'wireframe') return;
    el.classList.add('shown');
    // once the render is fully opaque the model behind it is only visible
    // through the cut-outs, so retire it until the next transition
    setTimeout(() => {
      if (el.classList.contains('shown')) ship.visible = false;
    }, 340);
  }, 190);
}

/* --- loop ----------------------------------------------------------------- */

let last = performance.now();

function frame(now) {
  const dt = now - last;
  last = now;

  if (state.t < 1) {
    state.t = Math.min(1, state.t + dt / TRANSITION_MS);
    const k = easeInOutCubic(state.t);
    rig.quaternion.slerpQuaternions(state.from, state.to, k);
    camera.fov = state.fovFrom + (state.fovTo - state.fovFrom) * k;
    camera.updateProjectionMatrix();
    layoutStills();
    layoutDecks();
    if (state.t >= 1) {
      if (state.auto) state.holdUntil = now + HOLD_MS;
      showStill(state.current);
      anno.refresh();
      if (deck.entering && state.current === 'top') startDissolve();
    }
  } else if (state.auto && now >= state.holdUntil) {
    state.seqIndex = (state.seqIndex + 1) % SEQUENCE.length;
    goTo(SEQUENCE[state.seqIndex], { fromAuto: true });
  }

  if (deck.on || Math.abs(deck.pos - deck.target) > 0.001) {
    const k = dragging ? 0.35 : 0.16;
    deck.pos += (deck.target - deck.pos) * Math.min(1, k * dt / 16.7);
    if (!dragging && Math.abs(deck.target - deck.pos) < 0.004) deck.pos = deck.target;
    paintDecks();
  }

  syncChrome();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* --- deck browser ----------------------------------------------------------

   Pushes the survey to the dorsal station, locks it there, and lays the
   registered deck plates over the hull. Plates are pre-fitted to the top view's
   plan silhouette by tools/register-decks.py, so they hold still as you scrub.
   The slider is continuous but settles on a deck: adjacent plates cross-fade
   through the travel and the position eases onto the nearest whole deck.
--------------------------------------------------------------------------- */

const DECK_NAMES = [
  'Dorsal Equipment Space',
  'Command',
  'Senior Officers / Upper Aft Machinery',
  'Medical / Armory / Engineering Overlook',
  'Habitation / Engineering Control',
  'Crew Support / Core Centerline',
  'Engineering Floor / Computer / Cloak',
  'Security / Primary Forward Weapons',
  'Heavy Ordnance',
  'Deflector / Interdiction / Stores',
  'Auxiliary Power / Fuel',
  'Ventral Sensors / Transport / Antimatter',
  'Thermal & Structural Management',
  'Ventral Equipment Space'
];

const deckLayer = document.getElementById('decks');
const deckRail = document.getElementById('deck-rail');
const deckTrack = document.getElementById('deck-track');
const btnDecks = document.getElementById('btn-decks');

const deck = { on: false, entering: false, shown: 0, pos: 1, target: 1,
               frame: 1.25, plates: [], ticks: [] };

/* The outline is its own layer in the source art, so it stays put while the
   interiors cross-fade over it — nothing to register per deck. */
const deckHull = document.createElement('img');
deckHull.className = 'deck-hull';
deckHull.alt = '';
deckHull.src = 'refs/decks/hull-outline.webp';
deckHull.addEventListener('load', layoutDecks);
deckLayer.appendChild(deckHull);

for (let i = 1; i <= DECK_NAMES.length; i++) {
  const img = document.createElement('img');
  img.className = 'deck-plate';
  img.alt = '';
  img.loading = i <= 2 ? 'eager' : 'lazy';
  img.src = `refs/decks/deck-${String(i).padStart(2, '0')}.webp`;
  img.addEventListener('load', layoutDecks);
  deckLayer.appendChild(img);
  deck.plates.push(img);

  const tick = document.createElement('button');
  tick.className = 'deck-tick';
  tick.textContent = String(i).padStart(2, '0');
  tick.addEventListener('click', () => { sfx.play('button-press-work'); deck.target = i; });
  deckTrack.appendChild(tick);
  deck.ticks.push(tick);
}

/* Deck contents reuse the systems overlay, resolved from the zone tags in
   deck-data.js. Items in the same zone fan out vertically so their pins do not
   stack on one point. */
const deckAnno = createAnnotations({
  id: 'deck-anno',
  stage,
  getRect: () => hullRect('top'),
  getItems: () => {
    if (!deck.on || deck.entering) return [];
    const d = DECKS[Math.min(13, Math.max(0, Math.round(deck.pos) - 1))];
    if (!d) return [];
    const perZone = {};
    for (const it of d.items) (perZone[it.zone] = perZone[it.zone] || []).push(it);
    const out = [];
    for (const [zone, list] of Object.entries(perZone)) {
      list.forEach((it, k) => {
        const spread = (list.length - 1) / 2;
        out.push({
          label: it.label,
          lines: it.lines,
          u: ZONE_U[zone] ?? 0.5,
          v: 0.5 + (k - spread) * 0.26
        });
      });
    }
    return out;
  },
  isEnabled: () => deck.on && !deck.entering,
  unit: unitPx,
  // keep captions clear of the deck selector down the right-hand edge
  inset: () => ({ left: 0, right: (deckRail.offsetWidth || 0) + 16 * unitPx() })
});

fetch('refs/decks/registration.json')
  .then((r) => r.json())
  .then((j) => { if (j.hullFraction) { deck.frame = 1 / j.hullFraction; layoutDecks(); } })
  .catch(() => {});

/** Plates are registered to the hull's plan, so they scale with the hull. */
function layoutDecks() {
  const w = stage.clientWidth;
  if (!w || !deck.plates.length) return;
  const visW = 2 * RADIUS * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect;
  const px = (SHIP.length / visW) * w * deck.frame;
  for (const img of [deckHull, ...deck.plates]) {
    if (!img.naturalWidth) continue;
    img.style.width = px + 'px';
    img.style.height = (px * img.naturalHeight / img.naturalWidth) + 'px';
  }
}

function paintDecks() {
  const n = DECK_NAMES.length;
  const lo = Math.floor(deck.pos);
  const frac = deck.pos - lo;
  for (let i = 1; i <= n; i++) {
    let o = 0;
    if (i === lo) o = 1 - frac;
    else if (i === lo + 1) o = frac;
    const img = deck.plates[i - 1];
    img.style.opacity = o;
    img.style.visibility = o > 0.002 ? 'visible' : 'hidden';
  }
  const nearest = Math.min(n, Math.max(1, Math.round(deck.pos)));
  if (nearest !== deck.shown) {
    deck.shown = nearest;
    deckAnno.refresh();
  }
  document.getElementById('deck-no').textContent = String(nearest).padStart(2, '0');
  document.getElementById('deck-name').textContent = DECK_NAMES[nearest - 1];
  setViewLabel('top', `DECK ${String(nearest).padStart(2, '0')}`);
  deck.ticks.forEach((t, k) => {
    t.classList.toggle('is-active', k + 1 === nearest);
    t.classList.toggle('near', Math.abs(k + 1 - deck.pos) < 1 && k + 1 !== nearest);
  });
}

function enterDecks() {
  deck.on = true;
  deck.entering = true;
  deck.target = 1;
  deck.pos = 1;
  deck.shown = 0;
  anno.off();
  hideStills();
  goTo('top');            // fly in from wherever the survey was
  deckRail.classList.add('on');
  document.body.classList.add('decks');
  btnDecks.classList.add('is-active');
  btnDecks.textContent = 'EXIT DECKS';
  syncReadoutButtons();
  paintDecks();
  setScan(false);
}

function exitDecks() {
  deck.on = false;
  deck.entering = false;
  deckAnno.clear();
  stopDissolve();
  deckLayer.classList.remove('on');
  deckRail.classList.remove('on');
  document.body.classList.remove('decks');
  btnDecks.classList.remove('is-active');
  btnDecks.textContent = 'EXPLORE DECKS';
  ship.visible = true;
  showStill(state.current);
  if (!anno.active) anno.set('hull');
  syncReadoutButtons();
  anno.refresh();
}

btnDecks.addEventListener('click', () => {
  sfx.play('button-press-work');
  sfx.play('decks-view');
  if (deck.on) exitDecks(); else enterDecks();
});

/* --- hull strip-away ------------------------------------------------------

   Entering the deck browser, the exterior render is drawn onto a canvas over
   the deck plate and then erased triangle by triangle, so the hull comes off
   in plates rather than fading as a whole. The order is shuffled once so it
   reads as panels being pulled rather than a wipe.
--------------------------------------------------------------------------- */

const dissolve = { canvas: null, raf: 0, cells: [], i: 0 };

function stopDissolve() {
  if (dissolve.raf) cancelAnimationFrame(dissolve.raf);
  dissolve.raf = 0;
  if (dissolve.canvas) dissolve.canvas.remove();
  dissolve.canvas = null;
}

function startDissolve() {
  stopDissolve();
  const img = stills.find((s) => s.dataset.view === 'top' || s.src.includes('still-dorsal'));
  const plate = deck.plates[0];
  if (!img || !img.naturalWidth || !plate || !plate.naturalWidth) {
    finishDissolve();
    return;
  }

  layoutDecks();
  deckLayer.classList.add('on');
  ship.visible = false;
  hideStills();

  const w = parseFloat(plate.style.width) || plate.clientWidth;
  const h = parseFloat(plate.style.height) || plate.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const c = document.createElement('canvas');
  c.className = 'deck-dissolve';
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  c.style.width = w + 'px';
  c.style.height = h + 'px';
  c.style.marginLeft = getComputedStyle(plate).marginLeft;
  stage.appendChild(c);
  dissolve.canvas = c;

  // the plate frame is padded around the hull; the still is the hull alone
  const g = c.getContext('2d');
  const hullW = w / deck.frame;
  const hullH = hullW * (img.naturalHeight / img.naturalWidth);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.drawImage(img, (w - hullW) / 2, (h - hullH) / 2, hullW, hullH);

  // triangulate the frame and shuffle, so plates come away out of order
  const COLS = 26, ROWS = 16;
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      const x0 = col * w / COLS, x1 = (col + 1) * w / COLS;
      const y0 = r * h / ROWS, y1 = (r + 1) * h / ROWS;
      cells.push([[x0, y0], [x1, y0], [x0, y1]]);
      cells.push([[x1, y0], [x1, y1], [x0, y1]]);
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  dissolve.cells = cells;
  dissolve.i = 0;

  g.globalCompositeOperation = 'destination-out';
  const PER_FRAME = Math.ceil(cells.length / 78);   // ~1.3 s at 60fps

  const step = () => {
    const gg = dissolve.canvas && dissolve.canvas.getContext('2d');
    if (!gg) return;
    for (let k = 0; k < PER_FRAME && dissolve.i < cells.length; k++, dissolve.i++) {
      const t = cells[dissolve.i];
      gg.beginPath();
      gg.moveTo(t[0][0], t[0][1]);
      gg.lineTo(t[1][0], t[1][1]);
      gg.lineTo(t[2][0], t[2][1]);
      gg.closePath();
      gg.fill();
    }
    if (dissolve.i < cells.length) dissolve.raf = requestAnimationFrame(step);
    else finishDissolve();
  };
  dissolve.raf = requestAnimationFrame(step);
}

function finishDissolve() {
  stopDissolve();
  deck.entering = false;
  deckLayer.classList.add('on');
  ship.visible = false;
  layoutDecks();
  paintDecks();
  deckAnno.refresh();
}

function nudgeDeck(d) {
  deck.target = Math.min(DECK_NAMES.length, Math.max(1, Math.round(deck.target) + d));
}

/* drag the track to scrub */
let dragging = false;
function scrubTo(clientY) {
  const r = deckTrack.getBoundingClientRect();
  const k = (clientY - r.top) / Math.max(1, r.height);
  deck.target = 1 + Math.min(1, Math.max(0, k)) * (DECK_NAMES.length - 1);
}
deckTrack.addEventListener('pointerdown', (e) => {
  dragging = true;
  deckTrack.setPointerCapture(e.pointerId);
  scrubTo(e.clientY);
});
deckTrack.addEventListener('pointermove', (e) => { if (dragging) scrubTo(e.clientY); });
deckTrack.addEventListener('pointerup', () => {
  dragging = false;
  deck.target = Math.round(deck.target);   // settle on a whole deck
});

stage.addEventListener('wheel', (e) => {
  if (!deck.on) return;
  e.preventDefault();
  nudgeDeck(Math.sign(e.deltaY));
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (!deck.on) return;
  if (e.key === 'ArrowDown') { nudgeDeck(1); e.preventDefault(); }
  if (e.key === 'ArrowUp') { nudgeDeck(-1); e.preventDefault(); }
  if (e.key === 'Escape') exitDecks();
});

/* --- annotation overlay ---------------------------------------------------

   Readouts pin to hardware in the current view. They are only meaningful on a
   settled station with the model or its render actually facing the viewer, so
   the selector is disabled while the survey is running and while the deck
   browser has the stage.
--------------------------------------------------------------------------- */

/* width:height of the hull in each view, measured off the reference art */
const VIEW_ASPECT = {
  top: HULL.planAspect,
  ventral: HULL.planAspect,
  starboard: HULL.sideAspect,
  forward: HULL.elevationAspect.front,
  aft: HULL.elevationAspect.rear
};

function hullRect(view) {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return null;
  const visW = 2 * RADIUS * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect;
  const pw = (spanOf(view) / visW) * w;
  const ph = pw / (VIEW_ASPECT[view] || 1.5);
  return { x: (w - pw) / 2, y: (h - ph) / 2, w: pw, h: ph };
}

const annoEnabled = () => !state.auto && !deck.on && state.t >= 1;

let activeReadout = null;

const anno = createAnnotations({
  id: 'anno',
  stage,
  getRect: () => hullRect(state.current),
  getItems: () => {
    const g = READOUTS.find((r) => r.id === activeReadout);
    if (!g) return [];
    return g.items
      .filter((it) => it.at[state.current])
      .map((it) => ({ label: it.label, lines: it.lines,
                      u: it.at[state.current][0], v: it.at[state.current][1] }));
  },
  isEnabled: annoEnabled,
  unit: unitPx
});

anno.set = (id) => { activeReadout = (activeReadout === id) ? null : id; anno.refresh(); return activeReadout; };
anno.off = () => { activeReadout = null; anno.clear(); };
Object.defineProperty(anno, 'active', { get: () => activeReadout });

const readoutBar = document.getElementById('readout-buttons');
const readoutButtons = READOUTS.map((g) => {
  const b = document.createElement('button');
  b.className = 'readout-btn';
  b.innerHTML = g.button;
  b.addEventListener('click', () => {
    if (b.classList.contains('is-disabled')) { sfx.play('button-press-fail'); return; }
    sfx.play('button-press-work');
    sfx.play('change-view-or-display-readout');
    anno.set(g.id);
    syncReadoutButtons();
  });
  readoutBar.appendChild(b);
  return b;
});

function syncReadoutButtons() {
  const usable = !state.auto && !deck.on;
  readoutButtons.forEach((b, i) => {
    b.classList.toggle('is-disabled', !usable);
    b.setAttribute('aria-disabled', String(!usable));
    b.classList.toggle('is-active', usable && anno.active === READOUTS[i].id);
  });
  if (!usable && anno.active) anno.off();
}

/* --- chrome sync ---------------------------------------------------------- */

let lastSynced = null;
function syncChrome() {
  if (deck.on || state.current === lastSynced) return;
  lastSynced = state.current;
  setViewLabel(state.current);
  markActive(state.current);
}

/* --- boot ----------------------------------------------------------------- */

const boot = document.getElementById('boot');
let booted = false;
function dismissBoot() {
  if (booted) return;
  booted = true;
  boot.classList.add('gone');
  sfx.startEngine();
  startAuto();
  showStill(state.current);
}
boot.addEventListener('click', dismissBoot);
setTimeout(dismissBoot, 3000);

/* --- mute -------------------------------------------------------------- */

const btnMute = document.getElementById('btn-mute');
function syncMute() {
  btnMute.classList.toggle('is-active', sfx.muted);   // lit = currently muted
}
btnMute.addEventListener('click', () => {
  sfx.toggleMuted();
  syncMute();
  if (!sfx.muted) sfx.play('button-press-work');   // audible confirmation only when unmuting
});
syncMute();

/* --- non-interactive-press feedback ----------------------------------------

   Anything that isn't one of the console's actual controls — decorative rail
   filler, the ship render, empty stage, a soft-disabled readout button — gets
   the fail sound. Real controls already play their own work/secondary sounds
   in the handlers above, so this only needs to catch what nothing else did.
--------------------------------------------------------------------------- */

// .readout-btn is listed regardless of its disabled state: its own handler
// already plays work/secondary or fail, so the catch-all must not double it.
const INTERACTIVE_SELECTOR =
  '.pill[data-view], #btn-auto, #btn-mode, #btn-decks, #btn-mute, ' +
  '.readout-btn, .deck-tick, #deck-track, #boot';

document.getElementById('console').addEventListener('click', (e) => {
  if (!e.target.closest(INTERACTIVE_SELECTOR)) sfx.play('button-press-fail');
});

// wired last: resize() touches the deck layer, declared above
new ResizeObserver(resize).observe(stage);
window.addEventListener('resize', resize);
resize();

setViewLabel('starboard');
markActive('starboard');
setScan(false);
syncReadoutButtons();
requestAnimationFrame(frame);
