/* ==========================================================================
   LCARS audio manager.

   Browsers block audio-with-sound until the page has seen a user gesture, so
   the boot sequence (accessing-library -> security-accepted) is attempted
   immediately on load and, if that's rejected, retried on the first gesture
   anywhere on the page — a click to skip the boot screen, or, if someone
   lets the 3-second auto-dismiss run instead, whatever they touch first.
   The engine loop and every button sound route through the same unlock, so
   nothing needs its own gesture-handling logic.
   ========================================================================== */

const FILES = {
  'background-engine': 'audio/background-engine.mp3',
  'button-press-work': 'audio/button-press-work.mp3',
  'button-press-fail': 'audio/button-press-fail.mp3',
  'change-view-or-display-readout': 'audio/change-view-or-display-readout.mp3',
  'enable-or-disable-auto-camera': 'audio/enable-or-disable-auto-camera.mp3',
  'wireframe': 'audio/wireframe.mp3',
  'decks-view': 'audio/decks-view.mp3',
  'accessing-library': 'audio/accessing-library.mp3',
  'security-accepted': 'audio/security-accepted.mp3'
};

const VOLUME = {
  'background-engine': 0.32,
  'accessing-library': 0.7,
  'security-accepted': 0.7
};
const DEFAULT_VOLUME = 0.55;

let muted = false;
let unlocked = false;
let bootStarted = false;
let bootDone = false;
const listeners = new Set();

const engine = new Audio(FILES['background-engine']);
engine.loop = true;
engine.volume = VOLUME['background-engine'];
let engineWanted = false;

function notify() {
  for (const fn of listeners) fn({ muted });
}

/** One-shot effects use a fresh element per call so rapid presses overlap
    cleanly instead of cutting each other off. */
function fire(name) {
  if (muted || !FILES[name]) return;
  const el = new Audio(FILES[name]);
  el.volume = VOLUME[name] ?? DEFAULT_VOLUME;
  el.play().catch(() => {});
}

function playBootSequence() {
  if (bootDone) return;
  bootStarted = true;
  const first = new Audio(FILES['accessing-library']);
  first.volume = VOLUME['accessing-library'];
  first.addEventListener('ended', () => {
    if (muted) { bootDone = true; return; }
    const second = new Audio(FILES['security-accepted']);
    second.volume = VOLUME['security-accepted'];
    second.play().catch(() => {});
    bootDone = true;
  });
  first.play().then(() => { unlocked = true; }).catch(() => {
    bootStarted = false;   // autoplay was blocked; retry on the first gesture
  });
}

function unlock() {
  if (unlocked) {
    if (engineWanted) engine.play().catch(() => {});
    return;
  }
  unlocked = true;
  if (!bootStarted) playBootSequence();
  if (engineWanted) engine.play().catch(() => {});
}

for (const evt of ['pointerdown', 'keydown']) {
  window.addEventListener(evt, unlock, { capture: true });
}

// Best-effort immediate attempt — succeeds on browsers that permit it.
playBootSequence();

export const sfx = {
  play: fire,

  startEngine() {
    engineWanted = true;
    if (unlocked && !muted) engine.play().catch(() => {});
  },

  stopEngine() {
    engineWanted = false;
    engine.pause();
  },

  get muted() { return muted; },

  setMuted(v) {
    muted = v;
    if (muted) engine.pause();
    else if (engineWanted && unlocked) engine.play().catch(() => {});
    notify();
  },

  toggleMuted() {
    sfx.setMuted(!muted);
    return muted;
  },

  onChange(fn) { listeners.add(fn); }
};
