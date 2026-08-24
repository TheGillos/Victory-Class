/* ==========================================================================
   LCARS audio manager.

   Browsers block audio-with-sound until the page has seen a user gesture, so
   the boot sequence (accessing-library -> security-accepted) is attempted
   immediately on load and, if that's rejected, retried on the first gesture
   anywhere on the page — a click to skip the boot screen, or, if someone
   lets the 3-second auto-dismiss run instead, whatever they touch first.
   The engine loop and every button sound route through the same unlock, so
   nothing needs its own gesture-handling logic.

   The engine loop gets an extra trick: muted autoplay is permitted without a
   gesture in every major browser, so once it's "wanted" (boot dismissed) it
   starts immediately, muted, rather than sitting idle until someone clicks —
   the loop is genuinely already running by the time the first gesture simply
   unmutes it, instead of only starting at that point.

   That same first gesture is also the one narrow case worth guarding
   against: the global pointerdown listener below runs in the capture phase,
   before any button's own click handler, so on the very first press of any
   button — including MUTE — the engine has *just* been unmuted a few
   statements earlier in the same tick. If that first press happens to be
   MUTE, its own toggle (starting from "unmuted") would immediately silence
   the loop that had just started. `consumeWasUnlockGesture()` lets the mute
   button detect that this exact click was the one that woke the system up
   and skip its own toggle for that single press — every press after that
   behaves as a plain toggle.
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
let audibleUnlocked = false;   // a real gesture has occurred
let bootStarted = false;
let bootDone = false;
let wasUnlockGesture = false;  // one-shot: set true for the click that unlocks
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
  first.play().catch(() => {
    bootStarted = false;   // autoplay was blocked; retry on the first gesture
  });
}

/** Start the loop immediately, muted — permitted without a gesture, so the
    engine is truly already running once "wanted" rather than idle. */
function primeEngineMuted() {
  if (!engineWanted) return;
  engine.muted = true;
  engine.play().catch(() => {});
}

/** Reveal the (already-running) loop once real playback is allowed. */
function revealEngine() {
  if (!engineWanted || muted) return;
  engine.muted = false;
  engine.play().catch(() => {});
}

function unlock() {
  const isFirst = !audibleUnlocked;
  if (isFirst) {
    audibleUnlocked = true;
    wasUnlockGesture = true;
    if (!bootStarted) playBootSequence();
  }
  revealEngine();
}

for (const evt of ['pointerdown', 'keydown']) {
  window.addEventListener(evt, unlock, { capture: true });
}

// Best-effort immediate attempts — succeed on browsers that permit it.
playBootSequence();

export const sfx = {
  play: fire,

  startEngine() {
    engineWanted = true;
    if (muted) return;
    if (audibleUnlocked) revealEngine();
    else primeEngineMuted();
  },

  stopEngine() {
    engineWanted = false;
    engine.pause();
  },

  get muted() { return muted; },

  setMuted(v) {
    muted = v;
    if (muted) {
      engine.pause();
    } else if (engineWanted) {
      if (audibleUnlocked) revealEngine();
      else primeEngineMuted();
    }
    notify();
  },

  toggleMuted() {
    sfx.setMuted(!muted);
    return muted;
  },

  /** True exactly once, for the click whose pointerdown just unlocked audio.
      Consuming it clears it, so every later call reports false. */
  consumeWasUnlockGesture() {
    const v = wasUnlockGesture;
    wasUnlockGesture = false;
    return v;
  },

  onChange(fn) { listeners.add(fn); }
};
