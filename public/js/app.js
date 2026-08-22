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

function setViewLabel(name) {
  document.getElementById('view-label').innerHTML =
    `${STATIONS[name].label} <span>&nbsp;/&nbsp;SCAN 75747</span>`;
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
  btn.addEventListener('click', () => goTo(btn.dataset.view));
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
}

new ResizeObserver(resize).observe(stage);
window.addEventListener('resize', resize);
resize();

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
  ship.visible = true;
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
  if (state.mode === 'wireframe') return;
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
    if (state.t >= 1) {
      if (state.auto) state.holdUntil = now + HOLD_MS;
      if (wasRunning) showStill(state.current);
    }
  } else if (state.auto && now >= state.holdUntil) {
    state.seqIndex = (state.seqIndex + 1) % SEQUENCE.length;
    goTo(SEQUENCE[state.seqIndex], { fromAuto: true });
  }

  syncChrome();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* --- chrome sync ---------------------------------------------------------- */

let lastSynced = null;
function syncChrome() {
  if (state.current === lastSynced) return;
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

setViewLabel('starboard');
markActive('starboard');
setScan(false);
requestAnimationFrame(frame);
