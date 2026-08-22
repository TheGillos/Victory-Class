/* ==========================================================================
   USS VICTORY NCC-9754-A — hull lofted from the reference orthographics

   Geometry comes from js/hull-data.js, which tools/extract-hull.py measures
   directly off refs/topview.png and refs/sideview.png. Station 0 is the STERN
   — the blunt armoured transom carrying the AID impulse blocks — and station
   N is the bow, which tapers to the notched prow housing the pulse cannons.
   Maximum beam falls about 40% forward of the transom.

   The dorsal and ventral shells are separate material groups so each can
   carry its own orthographic render as a planar-projected texture, with an
   emissive map derived from the warm pixels so the engines and heat vanes
   actually glow.

   Orientation: bow +X, dorsal +Y, starboard +Z. 1 unit = 10 metres.
   ========================================================================== */

import * as THREE from '../vendor/three.module.min.js';
import { HULL } from './hull-data.js';

export const SHIP = { length: 45.5, beam: 28.0, height: 4.9 };

const SPAN_SEGMENTS = 48;
const CHINE_SHARPNESS = 0.30;   // lower = flatter deck, harder chine

/* --- section helpers ------------------------------------------------------ */

const L = SHIP.length, HB = SHIP.beam / 2, HH = SHIP.height / 2;
const N = HULL.n;

const xAt = (i) => -L / 2 + (i / N) * L;               // station 0 = stern, N = bow
const zAt = (i, s) => (s >= 0 ? HULL.zPos[i] : HULL.zNeg[i]) * s * HB;
const yTop = (i) => HULL.yUp[i] * HH;
const yBot = (i) => -HULL.yDn[i] * HH;
const yChine = (i) => (yTop(i) + yBot(i)) / 2;

/** Spanwise fullness: 1 on the centreline, 0 at the chine. */
const bulge = (a) => Math.pow(Math.max(0, 1 - a * a), CHINE_SHARPNESS);

/* --- shell construction --------------------------------------------------- */

function shell(sign) {
  const M = SPAN_SEGMENTS;
  const pos = [], uv = [], idx = [];

  for (let i = 0; i <= N; i++) {
    const x = xAt(i);
    const yc = yChine(i);
    const yEdge = sign > 0 ? yTop(i) : yBot(i);
    for (let j = 0; j <= M; j++) {
      const s = (j / M) * 2 - 1;
      const z = zAt(i, s);
      const y = yc + (yEdge - yc) * bulge(Math.abs(s));
      pos.push(x, y, z);
      // planar projection from directly above (dorsal) or below (ventral)
      const u = (x + L / 2) / L;
      const v = sign > 0 ? (z + HB) / SHIP.beam : (HB - z) / SHIP.beam;
      uv.push(u, v);
    }
  }

  const row = M + 1;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
      if (sign > 0) { idx.push(a, b, c, b, d, c); }
      else          { idx.push(a, c, b, b, c, d); }
    }
  }
  return { pos, uv, idx, count: (N + 1) * row };
}

/** Fan cap closing an open section at station i. */
function cap(i, sign) {
  const baseIndex = 0;
  const M = SPAN_SEGMENTS;
  const pos = [], uv = [], idx = [];
  const x = xAt(i), yc = yChine(i);

  pos.push(x, yc, 0);
  uv.push((x + L / 2) / L, 0.5);

  for (let j = 0; j <= M; j++) {
    const s = (j / M) * 2 - 1;
    const z = zAt(i, s);
    const a = Math.abs(s);
    const yE = (yTop(i) + yBot(i)) / 2 + (yTop(i) - yBot(i)) / 2 * (sign > 0 ? bulge(a) : -bulge(a));
    pos.push(x, yE, z);
    uv.push((x + L / 2) / L, (z + HB) / SHIP.beam);
  }
  for (let j = 0; j < M; j++) {
    const flip = (i === 0) === (sign > 0);
    if (flip) idx.push(baseIndex, baseIndex + 2 + j, baseIndex + 1 + j);
    else      idx.push(baseIndex, baseIndex + 1 + j, baseIndex + 2 + j);
  }
  return { pos, uv, idx, count: M + 2 };
}

function buildHullGeometry() {
  const dorsal = shell(+1);
  const ventral = shell(-1);

  const pos = [], uv = [], idx = [];
  const groups = [];
  let vOff = 0, iOff = 0;

  function append(part, group) {
    pos.push(...part.pos);
    uv.push(...part.uv);
    for (const k of part.idx) idx.push(k + vOff);
    groups.push({ start: iOff, count: part.idx.length, group });
    vOff += part.count;
    iOff += part.idx.length;
  }

  append(dorsal, 0);
  append(ventral, 1);
  // close the armoured transom and the tail
  append(cap(0, +1), 0);
  append(cap(0, -1), 1);
  append(cap(N, +1), 0);
  append(cap(N, -1), 1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  for (const g of groups) geo.addGroup(g.start, g.count, g.group);
  geo.computeVertexNormals();
  return geo;
}

/* --- technical wireframe -------------------------------------------------- */

function buildWireGeometry() {
  const pts = [];
  const push = (a, b) => pts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  const P = (i, s, sign) => {
    const x = xAt(i), yc = yChine(i);
    const yE = sign > 0 ? yTop(i) : yBot(i);
    return [x, yc + (yE - yc) * bulge(Math.abs(s)), zAt(i, s)];
  };

  // chine — the plan outline
  for (let i = 0; i < N; i++) {
    push(P(i, 1, 1), P(i + 1, 1, 1));
    push(P(i, -1, 1), P(i + 1, -1, 1));
  }
  // longitudinals
  for (const s of [-0.82, -0.55, -0.28, 0, 0.28, 0.55, 0.82]) {
    for (const sign of [1, -1]) {
      for (let i = 0; i < N; i++) push(P(i, s, sign), P(i + 1, s, sign));
    }
  }
  // frames
  for (let i = 0; i <= N; i += 8) {
    for (const sign of [1, -1]) {
      for (let j = 0; j < SPAN_SEGMENTS; j++) {
        const s0 = (j / SPAN_SEGMENTS) * 2 - 1;
        const s1 = ((j + 1) / SPAN_SEGMENTS) * 2 - 1;
        push(P(i, s0, sign), P(i, s1, sign));
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/* --- textures ------------------------------------------------------------- */

/** Isolate the warm pixels — engines, bussards, heat vanes — as an emissive map. */
function emissiveFrom(image) {
  const c = document.createElement('canvas');
  c.width = image.width; c.height = image.height;
  const g = c.getContext('2d');
  g.drawImage(image, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  for (let k = 0; k < p.length; k += 4) {
    const r = p[k], gg = p[k + 1], b = p[k + 2];
    const warm = (r > 105 && r - b > 45 && r - gg > 20);
    if (warm) {
      const f = Math.min(1, (r - b) / 140);
      p[k] = r * f; p[k + 1] = gg * f * 0.8; p[k + 2] = b * f * 0.5;
    } else {
      p[k] = p[k + 1] = p[k + 2] = 0;
    }
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function loadShellTexture(url, material, onReady) {
  new THREE.TextureLoader().load(url, (tex) => {
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    material.map = tex;
    material.transparent = false;
    material.alphaTest = 0.5;   // the crops carry the hull silhouette in their alpha channel
    material.emissiveMap = emissiveFrom(tex.image);
    material.emissive = new THREE.Color(0xffffff);
    material.emissiveIntensity = 1.25;
    material.color.setHex(0xffffff);
    material.needsUpdate = true;
    if (onReady) onReady();
  });
}

/* --- build ---------------------------------------------------------------- */

export function buildVictory(onTexturesReady) {
  const root = new THREE.Group();
  root.name = 'USS_VICTORY';

  const base = () => new THREE.MeshStandardMaterial({
    color: 0x5b6169, roughness: 0.66, metalness: 0.36, side: THREE.DoubleSide
  });

  const matDorsal = base();
  const matVentral = base();

  const hull = new THREE.Mesh(buildHullGeometry(), [matDorsal, matVentral]);
  hull.name = 'hull';
  root.add(hull);

  const wireMat = new THREE.LineBasicMaterial({
    color: 0xffa24c, transparent: true, opacity: 0.9
  });
  const wire = new THREE.LineSegments(buildWireGeometry(), wireMat);
  wire.name = 'hull_wireframe';
  wire.visible = false;
  root.add(wire);

  let pending = 2;
  const done = () => { if (--pending === 0 && onTexturesReady) onTexturesReady(); };
  loadShellTexture('refs/tex-dorsal.png', matDorsal, done);
  loadShellTexture('refs/tex-ventral.png', matVentral, done);

  root.userData.setMode = function (mode) {
    const isWire = (mode === 'wireframe');
    hull.visible = !isWire;
    wire.visible = isWire;
  };

  root.userData.hull = hull;
  return root;
}
