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

const NS = 'http://www.w3.org/2000/svg';
const STAGGER = 55;      // ms between items
const MARGIN = 10;       // px from the stage edge, in design units

/**
 * @param getItems  () => [{ label, lines, u, v }]  resolved for the current view
 * @param getRect   () => { x, y, w, h }            the hull's box on stage
 */
export function createAnnotations({ stage, getRect, getItems, isEnabled, unit, id, inset, tag }) {
  let generation = 0;
  const svg = document.createElementNS(NS, 'svg');
  svg.id = (id || 'anno') + '-svg';
  svg.classList.add('anno-svg');
  svg.setAttribute('preserveAspectRatio', 'none');
  stage.appendChild(svg);

  const boxes = document.createElement('div');
  boxes.id = (id || 'anno') + '-boxes';
  boxes.classList.add('anno-boxes');
  stage.appendChild(boxes);

  function clear() {
    svg.replaceChildren();
    boxes.replaceChildren();
  }

  function render() {
    const gen = ++generation;
    clear();
    if (!isEnabled()) return;

    const items = getItems() || [];
    if (!items.length) return;

    const rect = getRect();
    if (!rect || !rect.w) return;

    const s = unit();
    const W = stage.clientWidth, H = stage.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    // Side follows the anchor, but a lopsided split makes long leaders cross
    // the hull, so the fuller column sheds its most central items.
    const left = items.filter((d) => d.u < 0.5);
    const right = items.filter((d) => d.u >= 0.5);
    while (Math.abs(left.length - right.length) > 1) {
      const [from, to] = left.length > right.length ? [left, right] : [right, left];
      from.sort((a, b) => Math.abs(a.u - 0.5) - Math.abs(b.u - 0.5));
      to.push(from.shift());
    }

    const pad = (inset && inset()) || { left: 0, right: 0 };
    layoutColumn(left.sort((a, b) => a.v - b.v), 'l', rect, s, W, H, pad, gen);
    layoutColumn(right.sort((a, b) => a.v - b.v), 'r', rect, s, W, H, pad, gen);
  }

  function layoutColumn(col, side, rect, s, W, H, pad, gen) {
    if (!col.length) return;

    const avail = W - pad.left - pad.right;
    const boxW = Math.min(330 * s, avail * 0.28);
    const top = 96 * s;
    const bottom = H - 40 * s;
    const slot = (bottom - top) / col.length;
    const placed = [];

    col.forEach((d, i) => {
      const ax = rect.x + d.u * rect.w;
      const ay = rect.y + d.v * rect.h;

      const el = document.createElement('div');
      el.className = 'anno-box anno-' + side;
      el.style.width = boxW + 'px';
      el.innerHTML =
        `<b>${d.label}</b>` +
        (d.lines || []).map((t) => `<span>${t}</span>`).join('');
      el.style.animationDelay = (i * STAGGER + 190) + 'ms';
      boxes.appendChild(el);

      // vertical centre of this slot, clamped so the box stays on screen
      const h = el.offsetHeight || 70 * s;
      let by = top + slot * (i + 0.5) - h / 2;
      by = Math.max(top, Math.min(bottom - h, by));
      el.style.top = by + 'px';
      const bx = side === 'l'
        ? pad.left + MARGIN * s
        : W - pad.right - boxW - MARGIN * s;
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
      placed.push({ el, line, side, ax, ay, bx, boxW, s });
    });

    settle(placed, top, bottom, s);

    // Google Fonts is unavailable in some environments, and the fallback swap
    // can land after this first settle — a caption sized in the wrong font
    // reports the wrong offsetHeight, so columns can end up overlapping. Once
    // the font situation is final, re-settle to correct it. Guarded by
    // generation so a stale callback from a superseded render never touches
    // elements that render() has already torn down.
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(() => {
        if (gen === generation) settle(placed, top, bottom, s);
      });
    }
  }

  /** Captions are slotted by anchor order, which can still collide when a few
      of them run long. Push down through the column, then lift the tail back
      inside the stage, and redraw each leader to wherever its box ended up. */
  function settle(placed, top, bottom, s) {
    const GAP = 6 * s;
    let y = top;
    for (const p of placed) {
      const h = p.el.offsetHeight;
      const by = Math.max(parseFloat(p.el.style.top), y);
      p.el.style.top = by + 'px';
      y = by + h + GAP;
    }
    const overflow = y - GAP - bottom;
    if (overflow > 0 && placed.length) {
      // Cap the shift so the first box never rises above `top`; if the column
      // still doesn't fit after that, the last box runs past `bottom` — worse
      // than ideal, but never overlapping, which a per-item clamp cannot
      // guarantee once the shift outstrips any one box's headroom.
      const firstTop = parseFloat(placed[0].el.style.top);
      const shift = Math.min(overflow, firstTop - top);
      if (shift > 0) {
        for (const p of placed) {
          p.el.style.top = (parseFloat(p.el.style.top) - shift) + 'px';
        }
      }
    }
    for (const p of placed) {
      const h = p.el.offsetHeight;
      const my = parseFloat(p.el.style.top) + h / 2;
      const edge = p.side === 'l' ? p.bx + p.boxW : p.bx;
      const stub = p.side === 'l' ? -22 * p.s : 22 * p.s;
      const elbow = p.side === 'l' ? edge + 26 * p.s : edge - 26 * p.s;
      p.line.setAttribute('points',
        `${p.ax},${p.ay} ${p.ax + stub},${p.ay} ${elbow},${my} ${edge},${my}`);
    }
  }

  return { refresh: render, clear };
}
