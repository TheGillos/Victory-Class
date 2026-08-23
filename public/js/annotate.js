/* ==========================================================================
   LCARS annotation overlay.

   Pins each readout item to its hardware in the current view and runs a leader
   out to a caption stacked along the nearer edge of the screen. Captions never
   overlap the hull because they live in the margins; the leader does the work
   of connecting them.

   Sequence per item: the pin blooms, the leader draws itself, the caption
   wipes open from the leader's side. Items stagger so the panel assembles
   rather than appearing all at once.
   ========================================================================== */

import { READOUTS } from './annotations.js';

const NS = 'http://www.w3.org/2000/svg';
const STAGGER = 55;      // ms between items
const MARGIN = 10;       // px from the stage edge, in design units

export function createAnnotations({ stage, getRect, getView, isEnabled, unit }) {
  const svg = document.createElementNS(NS, 'svg');
  svg.id = 'anno-svg';
  svg.setAttribute('preserveAspectRatio', 'none');
  stage.appendChild(svg);

  const boxes = document.createElement('div');
  boxes.id = 'anno-boxes';
  stage.appendChild(boxes);

  let activeId = null;

  function clear() {
    svg.replaceChildren();
    boxes.replaceChildren();
  }

  function group() {
    return READOUTS.find((g) => g.id === activeId) || null;
  }

  function render() {
    clear();
    const g = group();
    if (!g || !isEnabled()) return;

    const view = getView();
    const rect = getRect(view);
    if (!rect || !rect.w) return;

    const s = unit();
    const W = stage.clientWidth, H = stage.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    const items = g.items
      .filter((it) => it.at[view])
      .map((it) => ({ it, u: it.at[view][0], v: it.at[view][1] }));

    // Side follows the anchor, but a lopsided split makes long leaders cross
    // the hull, so the fuller column sheds its most central items.
    const left = items.filter((d) => d.u < 0.5);
    const right = items.filter((d) => d.u >= 0.5);
    while (Math.abs(left.length - right.length) > 1) {
      const [from, to] = left.length > right.length ? [left, right] : [right, left];
      from.sort((a, b) => Math.abs(a.u - 0.5) - Math.abs(b.u - 0.5));
      to.push(from.shift());
    }

    layoutColumn(left.sort((a, b) => a.v - b.v), 'l', rect, s, W, H);
    layoutColumn(right.sort((a, b) => a.v - b.v), 'r', rect, s, W, H);
  }

  function layoutColumn(col, side, rect, s, W, H) {
    if (!col.length) return;

    const boxW = Math.min(330 * s, W * 0.24);
    const top = 96 * s;
    const bottom = H - 40 * s;
    const slot = (bottom - top) / col.length;

    col.forEach((d, i) => {
      const ax = rect.x + d.u * rect.w;
      const ay = rect.y + d.v * rect.h;

      const el = document.createElement('div');
      el.className = 'anno-box anno-' + side;
      el.style.width = boxW + 'px';
      el.innerHTML =
        `<b>${d.it.label}</b>` +
        d.it.lines.map((t) => `<span>${t}</span>`).join('');
      el.style.animationDelay = (i * STAGGER + 190) + 'ms';
      boxes.appendChild(el);

      // vertical centre of this slot, clamped so the box stays on screen
      const h = el.offsetHeight || 70 * s;
      let by = top + slot * (i + 0.5) - h / 2;
      by = Math.max(top, Math.min(bottom - h, by));
      el.style.top = by + 'px';
      const bx = side === 'l' ? MARGIN * s : W - boxW - MARGIN * s;
      el.style.left = bx + 'px';

      // leader: short stub off the pin, a diagonal, then into the caption
      const edge = side === 'l' ? bx + boxW : bx;
      const my = by + h / 2;
      const stub = side === 'l' ? -22 * s : 22 * s;
      const elbow = side === 'l' ? edge + 26 * s : edge - 26 * s;

      const line = document.createElementNS(NS, 'polyline');
      line.setAttribute('points',
        `${ax},${ay} ${ax + stub},${ay} ${elbow},${my} ${edge},${my}`);
      line.setAttribute('class', 'anno-line');
      line.style.animationDelay = (i * STAGGER) + 'ms';
      svg.appendChild(line);

      const ring = document.createElementNS(NS, 'circle');
      ring.setAttribute('cx', ax);
      ring.setAttribute('cy', ay);
      ring.setAttribute('r', 5.5 * s);
      ring.setAttribute('class', 'anno-pin');
      ring.style.animationDelay = (i * STAGGER) + 'ms';
      svg.appendChild(ring);

      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', ax);
      dot.setAttribute('cy', ay);
      dot.setAttribute('r', 2 * s);
      dot.setAttribute('class', 'anno-dot');
      dot.style.animationDelay = (i * STAGGER) + 'ms';
      svg.appendChild(dot);
    });
  }

  return {
    groups: READOUTS,
    get active() { return activeId; },
    set(id) {
      activeId = (activeId === id) ? null : id;
      render();
      return activeId;
    },
    off() { activeId = null; clear(); },
    refresh: render
  };
}
