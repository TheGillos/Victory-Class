/* ==========================================================================
   USS VICTORY NCC-9754-A — scanned hull, surfaced from the reference art

   The hull is a scanned mesh generated from the plan view and surfaced with the
   reference orthographics, replacing the hand-lofted approximation that
   preceded it.

   js/hull-data.js supplies the measured aspect ratios of the reference views,
   which set the ship's proportions.

   Orientation: bow +X, dorsal +Y, starboard +Z.
   ========================================================================== */

import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/jsm/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/jsm/meshopt_decoder.module.js';
import { HULL } from './hull-data.js';

/* Proportions come from the reference elevations, anchored on length. The side
   and bow views take precedence, and they agree: beam:height derived this way
   is 3.00 against the bow render's 2.84. */
const LENGTH = 45.5;
export const SHIP = {
  length: LENGTH,
  beam:   LENGTH / HULL.planAspect,
  height: LENGTH / HULL.sideAspect
};

/* --- triplanar surfacing ---------------------------------------------------

   A single projection from overhead paints the flanks with whatever sits at the
   outer edge of the plan view, which is shadow — the hull rendered black from
   the beam. So each face samples the render that actually looks at it: dorsal
   and ventral from above and below, the flanks from the side elevation, the
   ends from the bow and stern renders, blended by the surface normal.
--------------------------------------------------------------------------- */

const VIEWS = ['dorsal', 'ventral', 'side', 'front', 'rear'];

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
    if (r > 105 && r - b > 45 && r - gg > 20) {
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

const TRIPLANAR_VERT_HEAD = `
varying vec3 vShipPos;
varying vec3 vShipNrm;
`;

const TRIPLANAR_VERT_BODY = `
vShipPos = transformed;
vShipNrm = normalize(objectNormal);
`;

const TRIPLANAR_FRAG_HEAD = `
varying vec3 vShipPos;
varying vec3 vShipNrm;
uniform sampler2D mapDorsal;
uniform sampler2D mapVentral;
uniform sampler2D mapSide;
uniform sampler2D mapFront;
uniform sampler2D mapRear;
uniform sampler2D emiDorsal;
uniform sampler2D emiVentral;
uniform sampler2D emiSide;
uniform sampler2D emiFront;
uniform sampler2D emiRear;
uniform vec3 shipSize;      // length, height, beam
uniform float blendSharp;
uniform float viewBias;

vec4 triplanar(sampler2D mDor, sampler2D mVen, sampler2D mSide,
               sampler2D mFront, sampler2D mRear) {
  vec3 p = vShipPos;
  vec3 n = normalize(vShipNrm);

  // The hull is a thin plate: seen from the beam, almost every normal still
  // points up or down, so pure normal-space triplanar keeps sampling the plan
  // view's shadowed rim. Lean the blend toward whichever render is looking at
  // the hull right now — the ship sits at the origin, so the camera position
  // is the view direction in ship space.
  vec3 blend = normalize(mix(n, normalize(cameraPosition), viewBias));
  vec3 w = pow(abs(blend), vec3(blendSharp));
  w /= max(1e-4, w.x + w.y + w.z);

  float u = (p.x + shipSize.x * 0.5) / shipSize.x;   // 0 at transom, 1 at bow
  float vY = (shipSize.y * 0.5 - p.y) / shipSize.y;  // 0 at the dorsal skin
  float zP = (p.z + shipSize.z * 0.5) / shipSize.z;

  vec4 plan = mix(texture2D(mVen, vec2(u, 1.0 - zP)),
                  texture2D(mDor, vec2(u, zP)), step(0.0, blend.y));
  vec4 flank = texture2D(mSide, vec2(u, vY));
  vec4 ends = mix(texture2D(mRear,  vec2(zP, vY)),
                  texture2D(mFront, vec2(1.0 - zP, vY)), step(0.0, blend.x));

  return w.y * plan + w.z * flank + w.x * ends;
}
`;

function triplanarMaterial(uniforms) {
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.62, metalness: 0.36,
    emissive: new THREE.Color(0xffffff), emissiveIntensity: 1.3,
    side: THREE.DoubleSide
  });

  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = TRIPLANAR_VERT_HEAD + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n' + TRIPLANAR_VERT_BODY
    );

    shader.fragmentShader = TRIPLANAR_FRAG_HEAD + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      'diffuseColor *= triplanar(mapDorsal, mapVentral, mapSide, mapFront, mapRear);'
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      'totalEmissiveRadiance *= triplanar(emiDorsal, emiVentral, emiSide, emiFront, emiRear).rgb;'
    );
  };

  m.customProgramCacheKey = () => 'victory-triplanar';
  return m;
}

function loadViewTextures(onReady) {
  const uniforms = {
    shipSize: { value: new THREE.Vector3(SHIP.length, SHIP.height, SHIP.beam) },
    blendSharp: { value: 3.0 },
    viewBias: { value: 0.78 }
  };
  const blank = new THREE.Texture();
  for (const v of VIEWS) {
    uniforms['map' + v[0].toUpperCase() + v.slice(1)] = { value: blank };
    uniforms['emi' + v[0].toUpperCase() + v.slice(1)] = { value: blank };
  }

  let pending = VIEWS.length;
  const loader = new THREE.TextureLoader();
  for (const v of VIEWS) {
    loader.load(`refs/tex-${v}.png`, (tex) => {
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      const key = v[0].toUpperCase() + v.slice(1);
      uniforms['map' + key].value = tex;
      uniforms['emi' + key].value = emissiveFrom(tex.image);
      if (--pending === 0 && onReady) onReady();
    });
  }
  return uniforms;
}

/* --- hull mesh -------------------------------------------------------------

   The hull is a photogrammetry-style mesh (Meshy, meshopt-compressed) that
   carries no UVs and no materials — which suits the triplanar surface, since
   it derives coordinates from position and never reads a UV channel.

   Normalisation: the export points bow at -X, is centred arbitrarily and is
   ~40% flatter than the elevations imply, because it was generated from the
   plan view alone. So it is centred, yawed 180 degrees, and scaled
   non-uniformly onto the dimensions derived from the reference art.
--------------------------------------------------------------------------- */

/** Convert quantised integer attributes to plain floats.
    KHR_mesh_quantization stores positions as normalised integers; transforming
    such an attribute in place writes the results back through the integer
    range, clamping the whole hull into a unit cube. */
function dequantise(geo) {
  for (const name of ['position', 'normal']) {
    const a = geo.getAttribute(name);
    if (!a || a.array instanceof Float32Array) continue;
    const out = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) {
      out[i * 3] = a.getX(i);
      out[i * 3 + 1] = a.getY(i);
      out[i * 3 + 2] = a.getZ(i);
    }
    geo.setAttribute(name, new THREE.BufferAttribute(out, 3));
  }
  return geo;
}

function normaliseHull(geo) {
  dequantise(geo);
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const size = new THREE.Vector3().subVectors(bb.max, bb.min);
  const mid = new THREE.Vector3().addVectors(bb.max, bb.min).multiplyScalar(0.5);

  const m = new THREE.Matrix4()
    .makeScale(-SHIP.length / size.x, SHIP.height / size.y, -SHIP.beam / size.z)
    .multiply(new THREE.Matrix4().makeTranslation(-mid.x, -mid.y, -mid.z));

  geo.applyMatrix4(m);            // negating x and z is the 180-degree yaw
  geo.computeVertexNormals();     // the non-uniform scale invalidates the originals
  return geo;
}

export function buildVictory(onTexturesReady, onHullReady) {
  const root = new THREE.Group();
  root.name = 'USS_VICTORY';

  const uniforms = loadViewTextures(onTexturesReady);
  const surface = triplanarMaterial(uniforms);

  let hull = null;

  const wireMat = new THREE.LineBasicMaterial({
    color: 0xffa24c, transparent: true, opacity: 0.85
  });
  let wire = null;
  let wireWanted = false;

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

  function firstGeometry(gltf) {
    gltf.scene.updateWorldMatrix(true, true);
    let geo = null;
    gltf.scene.traverse((o) => {
      if (o.isMesh && !geo) {
        geo = dequantise(o.geometry.clone());
        geo.applyMatrix4(o.matrixWorld);
      }
    });
    return geo;
  }

  /** Schematic wireframe, taken from a decimated copy of the same hull so it
      matches the solid form. Edges off the full mesh would be unreadable. */
  loader.load('models/victory-lowpoly.glb', (gltf) => {
    const geo = firstGeometry(gltf);
    if (!geo) return;
    wire = new THREE.LineSegments(new THREE.EdgesGeometry(normaliseHull(geo), 20), wireMat);
    wire.name = 'hull_wireframe';
    wire.visible = wireWanted;
    root.add(wire);
  });

  loader.load('models/victory.glb', (gltf) => {
    const geo = firstGeometry(gltf);
    if (!geo) return;
    hull = new THREE.Mesh(normaliseHull(geo), surface);
    hull.name = 'hull';
    hull.visible = !wireWanted;
    root.add(hull);
    if (onHullReady) onHullReady();
  });

  root.userData.setMode = function (mode) {
    wireWanted = (mode === 'wireframe');
    if (hull) hull.visible = !wireWanted;
    if (wire) wire.visible = wireWanted;
  };

  return root;
}
