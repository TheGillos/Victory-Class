/* ==========================================================================
   VICTORY CLASS — interactive brief, overview stage
   Auto-rotating orthographic survey with manual view stations.
   ========================================================================== */

import * as THREE from '../vendor/three.module.min.js';
import { buildVictory, SHIP } from './victory-model.js';

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
}

function stopAuto() {
  if (!state.auto) return;
  state.auto = false;
  document.getElementById('btn-auto').classList.remove('is-active');
  setScan(false);
}

function startAuto() {
  state.auto = true;
  document.getElementById('btn-auto').classList.add('is-active');
  setScan(true);
  // resume from wherever we are, continuing the sequence in order
  const idx = SEQUENCE.indexOf(state.current);
  state.seqIndex = idx >= 0 ? idx : 0;
  state.holdUntil = performance.now() + HOLD_MS;
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
    if (typeof deck !== 'undefined' && deck.on && btn.dataset.view !== 'top') exitDecks();
    goTo(btn.dataset.view);
  });
});

document.getElementById('btn-auto').addEventListener('click', () => {
  if (state.auto) stopAuto(); else startAuto();
});

const btnMode = document.getElementById('btn-mode');
btnMode.addEventListener('click', () => {
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
    const wasRunning = state.t > 0;
    state.t = Math.min(1, state.t + dt / TRANSITION_MS);
    const k = easeInOutCubic(state.t);
    rig.quaternion.slerpQuaternions(state.from, state.to, k);
    camera.fov = state.fovFrom + (state.fovTo - state.fovFrom) * k;
    camera.updateProjectionMatrix();
    layoutStills();
    layoutDecks();
    if (state.t >= 1) {
      if (state.auto) state.holdUntil = now + HOLD_MS;
      if (wasRunning) showStill(state.current);
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

const deck = { on: false, pos: 1, target: 1, frame: 1.25, plates: [], ticks: [] };

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
  tick.addEventListener('click', () => { deck.target = i; });
  deckTrack.appendChild(tick);
  deck.ticks.push(tick);
}

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
  for (const img of deck.plates) {
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
  stopAuto();
  hideStills();
  goTo('top');
  ship.visible = false;
  deckLayer.classList.add('on');
  deckRail.classList.add('on');
  document.body.classList.add('decks');
  btnDecks.classList.add('is-active');
  btnDecks.textContent = 'EXIT DECKS';
  layoutDecks();
  paintDecks();
  setScan(false);
}

function exitDecks() {
  deck.on = false;
  deckLayer.classList.remove('on');
  deckRail.classList.remove('on');
  document.body.classList.remove('decks');
  btnDecks.classList.remove('is-active');
  btnDecks.textContent = 'EXPLORE DECKS';
  ship.visible = true;
  showStill(state.current);
}

btnDecks.addEventListener('click', () => (deck.on ? exitDecks() : enterDecks()));

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
  startAuto();
  showStill(state.current);
}
boot.addEventListener('click', dismissBoot);
setTimeout(dismissBoot, 3000);

// wired last: resize() touches the deck layer, declared above
new ResizeObserver(resize).observe(stage);
window.addEventListener('resize', resize);
resize();

setViewLabel('starboard');
markActive('starboard');
setScan(false);
requestAnimationFrame(frame);
