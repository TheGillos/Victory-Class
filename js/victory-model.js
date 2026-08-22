/* ==========================================================================
   USS VICTORY NCC-9754-A — procedural hull
   Units: 1 unit = 10 metres. Length 45.5, beam 28.0, height ~4.9.
   Orientation: nose +X, dorsal +Y, starboard +Z.

   The hull is one continuous lifting-body outline — the nacelle cowlings are
   bulges on that outline, not separate wings — with raised cowling caps above
   and below. Plating comes from a canvas texture planar-projected from above,
   so the dorsal and ventral survey stations carry the detail.
   ========================================================================== */

import * as THREE from '../vendor/three.module.min.js';

export const SHIP = { length: 45.5, beam: 28.0, height: 4.9 };

const PAL = {
  hull:     0x767d86,
  hullDark: 0x0b0a09,
  seam:     0x3a4048,
  panel:    0x2b3037,
  wire:     0xffa24c,
  ember:    0xff3b1c,
  bussard:  0xff2d16,
  vane:     0xd9761c
};

/* --- plan outline --------------------------------------------------------- */
/* Half-outline, bow to stern down the starboard side. Beam peaks aft of
   midships; the transom scoops inboard between the two impulse blocks.       */

const HULL_HALF = [
  [ 22.75,  0.00],
  [ 21.90,  1.70],
  [ 20.10,  3.60],
  [ 17.30,  5.70],
  [ 13.80,  7.80],
  [  9.80,  9.70],
  [  5.40, 11.30],
  [  0.60, 12.60],
  [ -4.80, 13.50],
  [-10.20, 13.95],
  [-16.00, 14.00],
  [-20.00, 13.80],
  [-22.75, 13.40],
  [-22.75,  9.90],
  [-20.90,  8.90],
  [-19.60,  6.60],
  [-19.10,  3.80],
  [-19.90,  1.60],
  [-20.60,  0.00]
];

/* Raised nacelle cowling, sitting on the outboard shoulders. */
const COWL_HALF = [
  [  6.40,  9.60],
  [  8.60, 11.10],
  [  8.20, 13.20],
  [ -16.0, 13.60],
  [-22.60, 13.00],
  [-22.60,  9.60]
];

/* --- helpers -------------------------------------------------------------- */

function shapeFrom(points) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
  s.closePath();
  return s;
}

function mirrorY(half) {
  const out = half.slice();
  for (let i = half.length - 2; i >= 1; i--) out.push([half[i][0], -half[i][1]]);
  return out;
}

function slab(points, depth, bevel) {
  const geo = new THREE.ExtrudeGeometry(shapeFrom(points), {
    depth, bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -depth / 2, 0);
  return geo;
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Squeeze toward a knife edge at the bow and thin the outboard shoulders. */
function sculpt(geo, fore) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const nose = 0.16 + 0.84 * smoothstep(fore, fore - 20, x);
    const edge = 0.45 + 0.55 * smoothstep(14.0, 8.0, Math.abs(z));
    p.setY(i, p.getY(i) * nose * edge);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Planar projection from directly above — the plating reads as a decal. */
function planarUV(geo) {
  const p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2]     = (p.getX(i) + SHIP.length / 2) / SHIP.length;
    uv[i * 2 + 1] = (p.getZ(i) + SHIP.beam / 2) / SHIP.beam;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/* --- plating texture ------------------------------------------------------ */

function platingTexture() {
  const W = 2048, H = 1260;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');

  g.fillStyle = '#7d858f';
  g.fillRect(0, 0, W, H);

  // irregular plate field
  let rnd = 20259;
  const rand = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  for (let row = 0; row < 44; row++) {
    const y = (row / 44) * H;
    const h = H / 44;
    let x = -rand() * 160;
    while (x < W) {
      const w = 70 + rand() * 190;
      const v = 0.86 + rand() * 0.26;
      const base = Math.round(126 * v);
      g.fillStyle = `rgb(${base},${base + 6},${base + 13})`;
      g.fillRect(x, y, w - 2, h - 2);
      x += w;
    }
  }

  // seams
  g.strokeStyle = 'rgba(52,58,66,0.55)';
  g.lineWidth = 1.5;
  for (let row = 0; row <= 44; row++) {
    const y = (row / 44) * H;
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }

  // heavier structural frames, fore to aft
  g.strokeStyle = 'rgba(40,45,52,0.6)';
  for (let i = 1; i < 34; i++) {
    const x = (i / 34) * W + (rand() - 0.5) * 22;
    g.lineWidth = (i % 4 === 0) ? 3 : 1.4;
    const y0 = (i % 3 === 0) ? H * 0.18 : 0;
    const y1 = (i % 5 === 0) ? H * 0.82 : H;
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke();
  }

  // greebles
  for (let i = 0; i < 320; i++) {
    const x = rand() * W, y = rand() * H;
    const w = 8 + rand() * 46, h = 5 + rand() * 16;
    g.fillStyle = rand() > 0.72 ? 'rgba(52,58,66,0.7)' : 'rgba(196,204,214,0.35)';
    g.fillRect(x, y, w, h);
  }

  // painted amber accent strips
  g.fillStyle = '#c8761f';
  for (const [x, y, w, h] of [
    [860, 300, 260, 13], [886, 322, 260, 13], [912, 344, 260, 13],
    [860, 916, 260, 13], [886, 894, 260, 13], [912, 872, 260, 13],
    [1180, 250, 190, 11], [1180, 268, 190, 11],
    [1180, 992, 190, 11], [1180, 974, 190, 11]
  ]) g.fillRect(x, y, w, h);

  // registry
  g.save();
  g.fillStyle = 'rgba(58,64,72,0.9)';
  g.font = 'bold 78px Arial, sans-serif';
  g.translate(1180, 430); g.rotate(-0.06);
  g.fillText('NCC-9754-A', 0, 0);
  g.restore();

  g.save();
  g.fillStyle = 'rgba(58,64,72,0.9)';
  g.font = 'bold 78px Arial, sans-serif';
  g.translate(1180, 880); g.rotate(0.06);
  g.fillText('NCC-9754-A', 0, 0);
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* --- build ---------------------------------------------------------------- */

export function buildVictory() {
  const root = new THREE.Group();
  root.name = 'USS_VICTORY';

  const plating = platingTexture();

  const MAT = {
    hull: new THREE.MeshStandardMaterial({
      color: 0xffffff, map: plating, roughness: 0.62, metalness: 0.38
    }),
    trim: new THREE.MeshStandardMaterial({
      color: PAL.panel, roughness: 0.8, metalness: 0.3
    }),
    ember:   new THREE.MeshBasicMaterial({ color: PAL.ember }),
    bussard: new THREE.MeshBasicMaterial({ color: PAL.bussard }),
    vane:    new THREE.MeshBasicMaterial({ color: PAL.vane }),
    line:    new THREE.LineBasicMaterial({ color: PAL.wire, transparent: true, opacity: 1.0 })
  };

  const glows = [];
  const edgeLines = [];

  function addSurface(geo, mat, name, withEdges = true) {
    planarUV(geo);
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    root.add(m);
    if (withEdges) {
      const ln = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 26), MAT.line);
      ln.name = name + '_edges';
      ln.visible = false;
      edgeLines.push(ln);
      root.add(ln);
    }
    return m;
  }

  function addGlow(geo, mat, pos, name) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.name = name;
    root.add(m);
    glows.push(m);
    return m;
  }

  /* main lifting body */
  addSurface(sculpt(slab(mirrorY(HULL_HALF), 3.4, 0.85), 22.75), MAT.hull, 'hull');

  /* nacelle cowlings, dorsal and ventral, port and starboard */
  for (const side of [1, -1]) {
    for (const y of [1.05, -1.05]) {
      const pts = COWL_HALF.map(([x, z]) => [x, z * side]);
      const geo = slab(side === 1 ? pts : pts.slice().reverse(), 2.1, 0.55);
      sculpt(geo, 9.5);
      geo.translate(0, y, 0);
      addSurface(geo, MAT.hull, `cowl_${side}_${y > 0 ? 'd' : 'v'}`);
    }
  }

  /* dorsal command module */
  addSurface(new THREE.BoxGeometry(6.4, 1.0, 4.6).translate(4.2, 1.62, 0), MAT.hull, 'cic_module');

  /* aft prong assembly — probe silos and the aft launcher */
  for (const z of [-2.9, -1.5, 1.5, 2.9]) {
    addSurface(new THREE.BoxGeometry(4.2, 0.46, 0.46).translate(-21.9, 0.25, z), MAT.hull, 'prong_' + z);
  }

  /* AID impulse blocks — aft outboard, the red glow */
  for (const side of [1, -1]) {
    for (const z of [10.5, 12.6]) {
      addGlow(new THREE.BoxGeometry(3.2, 3.0, 2.15), MAT.ember,
        [-22.3, 0.0, side * z], `aid_${side}_${z}`);
    }
    addGlow(new THREE.BoxGeometry(1.6, 1.9, 1.7), MAT.ember,
      [-20.4, -0.05, side * 3.0], `aid_centre_${side}`);
  }

  /* bussard collectors — forward ends of the cowlings */
  for (const side of [1, -1]) {
    addGlow(new THREE.BoxGeometry(1.6, 1.8, 1.6), MAT.bussard,
      [8.20, 0.0, side * 11.3], `bussard_${side}`);
  }

  /* thermal radiator vanes */
  addGlow(new THREE.BoxGeometry(19.0, 0.22, 0.55), MAT.vane, [-6.0, 1.36, 0], 'radiator_spine');
  for (const side of [1, -1]) {
    addGlow(new THREE.BoxGeometry(19.0, 0.20, 0.34), MAT.vane, [-6.0, 1.32, side * 1.15], `radiator_spine_${side}`);
  }
  for (const side of [1, -1]) {
    addGlow(new THREE.BoxGeometry(11.5, 0.18, 0.42), MAT.vane,
      [-8.0, 2.16, side * 11.4], `radiator_cowl_${side}`);
  }

  /* ------------------------------------------------------------------------ */

  root.userData.setMode = function (mode) {
    const wire = (mode === 'wireframe');
    MAT.hull.map = wire ? null : plating;
    MAT.hull.color.setHex(wire ? PAL.hullDark : PAL.hull);
    MAT.hull.metalness = wire ? 0.0 : 0.42;
    MAT.hull.roughness = wire ? 1.0 : 0.66;
    MAT.hull.needsUpdate = true;
    MAT.trim.color.setHex(wire ? PAL.hullDark : PAL.panel);
    for (const ln of edgeLines) ln.visible = wire;
  };

  root.userData.glows = glows;
  return root;
}
