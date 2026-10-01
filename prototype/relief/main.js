// Relief prototype: the character is the original artwork itself (cut out of the 3-view sheet),
// lifted into a soft 3D relief so it tilts with real depth, and it reacts to being touched.
import * as THREE from 'three';

const SHEET = './mobibou-sheet.webp';
const VIEWS = {
  front: { x: 0, y: 160, w: 541, h: 670 },
  side: { x: 541, y: 160, w: 402, h: 670 },
  back: { x: 943, y: 160, w: 505, h: 670 },
};
const WORLD_H = 2.6;                              // character height in world units
const RIM_PX = 120;                               // how far in from the edge the surface reaches full height

const settings = { depth: 0.55, shade: 0.55 };

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor('#efeeec');
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
camera.position.set(0, 0, 8);

// ---- cut out + height field ---------------------------------------------------------------
function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

function cutout(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const isBg = (i) => {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    return Math.max(r, g, b) - Math.min(r, g, b) < 16 && (r + g + b) / 3 > 178;
  };
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => { const i = y * w + x; if (!bg[i] && isBg(i)) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const i = stack.pop(), x = i % w, y = (i / w) | 0;
    if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
  }
  // keep only the biggest connected piece of foreground (drops specks and neighbouring figures)
  const comp = new Int32Array(w * h).fill(-1);
  let best = -1, bestSize = 0, id = 0;
  for (let s0 = 0; s0 < w * h; s0++) {
    if (bg[s0] || comp[s0] >= 0) continue;
    let size = 0; const st = [s0]; comp[s0] = id;
    while (st.length) {
      const i = st.pop(); size++;
      const x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && !bg[j] && comp[j] < 0) { comp[j] = id; st.push(j); }
      }
    }
    if (size > bestSize) { bestSize = size; best = id; }
    id++;
  }
  for (let i = 0; i < w * h; i++) if (!bg[i] && comp[i] !== best) bg[i] = 1;

  // erode one pixel to drop the light halo, then feather
  let a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    let v = bg[i] ? 0 : 1;
    if (v && (x === 0 || y === 0 || x === w - 1 || y === h - 1 || bg[i - 1] || bg[i + 1] || bg[i - w] || bg[i + w])) v = 0;
    a[i] = v;
  }
  const blur = (src, r) => {
    const out = new Float32Array(src.length), tmp = new Float32Array(src.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += src[y * w + xx]; n++; } }
      tmp[y * w + x] = s / n;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++; } }
      out[y * w + x] = s / n;
    }
    return out;
  };
  const soft = blur(a, 1);
  for (let i = 0; i < w * h; i++) d[i * 4 + 3] = Math.round(Math.min(1, soft[i] * 1.15) * 255);
  ctx.putImageData(img, 0, 0);
  return a;
}

function heightField(mask, w, h) {
  // chamfer distance to the nearest background pixel
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? INF : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (d[i] === 0) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (d[i] === 0) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
  }
  const hgt = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const t = Math.min(1, d[i] / RIM_PX);
    hgt[i] = Math.sqrt(1 - (1 - t) * (1 - t));
  }
  // smooth so the surface has no creases
  const r = 7, tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += hgt[y * w + xx]; n++; } }
    tmp[y * w + x] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++; } }
    out[y * w + x] = s / n;
  }
  return out;
}

// ---- shaders -----------------------------------------------------------------------------
const vertexShader = /* glsl */ `
uniform vec3 uPullC, uPullD;
uniform float uPullR, uDepth, uPoke, uFlip;
uniform vec3 uPokeC;
uniform vec2 uOff;
varying vec2 vUv, vBase;
varying vec3 vN, vV;
void main() {
  vec3 p = position;
  p.z *= uDepth;
  vec2 q = vec2(p.x * uFlip, p.y) + uOff;          // position in the shared pivot space
  vec2 d = q - uPullC.xy;
  float w = exp(-dot(d, d) / (uPullR * uPullR));
  p += vec3(uPullD.x * uFlip, uPullD.y, uPullD.z) * w;
  vec2 dc = q - uPokeC.xy;
  float wp = exp(-dot(dc, dc) / 0.12);
  p.z -= uPoke * wp * 0.35;
  p.xy -= vec2(dc.x * uFlip, dc.y) * uPoke * wp * 0.35;
  vUv = uv;
  vBase = q;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uTouchC, uPullD;
uniform float uTouchAmt, uShade, uOpacity;
varying vec2 vUv, vBase;
varying vec3 vN, vV;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  // touched fur is ruffled: pixels are jittered along short fibre-like streaks
  vec2 dd = vBase - uTouchC.xy;
  float tw = exp(-dot(dd, dd) / 0.06) * uTouchAmt;
  float n1 = vnoise(vBase * vec2(160.0, 60.0)) - 0.5;
  float n2 = vnoise(vBase * vec2(70.0, 190.0) + 7.0) - 0.5;
  vec2 dir = normalize(dd + vec2(0.0001));
  vec2 uv = vUv + (dir * n1 * 0.016 + vec2(-dir.y, dir.x) * n2 * 0.01) * tw;
  vec4 tex = texture2D(uMap, uv);
  if (tex.a < 0.02) discard;

  vec3 N = normalize(vN);
  vec3 V = normalize(vV);
  vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
  float ndl = dot(N, L);
  float shade = mix(1.0, 0.62 + 0.5 * clamp(ndl * 0.5 + 0.5, 0.0, 1.0) * 1.2, uShade);
  vec3 col = tex.rgb * shade;
  col *= 1.0 + (n1 + n2) * 0.5 * tw;
  float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  col += tex.rgb * rim * 0.28 * uShade;
  gl_FragColor = vec4(col, tex.a * uOpacity);
  #include <colorspace_fragment>
}
`;

// ---- build -------------------------------------------------------------------------------
const pivot = new THREE.Group();
scene.add(pivot);
// Four keyframes around the character: facing us, turned to its left/right side, and its back.
const KEYS = [
  { name: 'front', view: 'front', angle: 0, flip: 1 },
  { name: 'sideL', view: 'side', angle: -Math.PI / 2, flip: 1 },
  { name: 'back', view: 'back', angle: Math.PI, flip: 1 },
  { name: 'sideR', view: 'side', angle: Math.PI / 2, flip: -1 },
];
const layers = [];   // one mesh per key

function buildView(img, crop) {
  const c = document.createElement('canvas');
  c.width = crop.w; c.height = crop.h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  const mask = cutout(ctx, crop.w, crop.h);
  const hf = heightField(mask, crop.w, crop.h);
  let x0 = crop.w, x1 = 0, y1 = 0, y0 = crop.h;
  for (let y = 0; y < crop.h; y++) for (let x = 0; x < crop.w; x++) if (mask[y * crop.w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { c, hf, crop, bbox: { x0, x1, y0, y1 } };
}

async function build() {
  const img = await loadImage(SHEET);
  const built = {};
  for (const k of ['front', 'side', 'back']) built[k] = buildView(img, VIEWS[k]);
  const unit = WORLD_H / (built.front.bbox.y1 - built.front.bbox.y0);
  window.__baked = { built, unit };

  for (const key of KEYS) {
    const v = built[key.view];
    const { crop, hf, bbox } = v;
    const tex = new THREE.CanvasTexture(v.c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const geo = new THREE.PlaneGeometry(crop.w * unit, crop.h * unit, 150, 186);
    const pos = geo.attributes.position, uvA = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const u = uvA.getX(i), vv = uvA.getY(i);
      const px = Math.min(crop.w - 1, Math.round(u * (crop.w - 1)));
      const py = Math.min(crop.h - 1, Math.round((1 - vv) * (crop.h - 1)));
      pos.setZ(i, hf[py * crop.w + px] * RIM_PX * unit);
    }
    geo.computeVertexNormals();
    // centre the silhouette on the pivot axis and stand every view on the same floor
    const cx = ((bbox.x0 + bbox.x1) / 2 - crop.w / 2) * unit;
    const off = new THREE.Vector2(-cx * key.flip, -WORLD_H / 2 - (crop.h / 2 - bbox.y1) * unit);
    const uniforms = {
      uMap: { value: tex },
      uPullC: { value: new THREE.Vector3() }, uPullD: { value: new THREE.Vector3() }, uPullR: { value: 0.42 },
      uPokeC: { value: new THREE.Vector3() }, uPoke: { value: 0 },
      uTouchC: { value: new THREE.Vector3(0, 0, 9) }, uTouchAmt: { value: 0 },
      uDepth: { value: settings.depth }, uShade: { value: settings.shade },
      uOpacity: { value: 1 }, uFlip: { value: key.flip }, uOff: { value: off },
    };
    const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    mesh.scale.x = key.flip;
    mesh.position.set(off.x, off.y, 0);
    mesh.visible = false;
    const holder = new THREE.Group();   // turns the view to its keyframe angle
    holder.add(mesh);
    pivot.add(holder);
    layers.push({ key, mesh, uniforms, holder });
  }

  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const g = sc.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(60,50,45,0.4)'); grad.addColorStop(1, 'rgba(60,50,45,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  sh.position.set(0, -WORLD_H / 2 + 0.02, -0.05);
  scene.add(sh);
  const panel = document.getElementById('panel');
  panel.appendChild(slider('depth', 0, 1.2, 0.01, (v) => layers.forEach((l) => (l.uniforms.uDepth.value = v))));
  panel.appendChild(slider('shade', 0, 1, 0.01, (v) => layers.forEach((l) => (l.uniforms.uShade.value = v))));
}

function slider(name, min, max, step, on) {
  const row = document.createElement('label');
  row.innerHTML = `<span>${name}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${settings[name]}"><b>${settings[name]}</b>`;
  const input = row.querySelector('input'), out = row.querySelector('b');
  input.addEventListener('input', () => { out.textContent = input.value; on(Number(input.value)); });
  return row;
}

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const need = Math.max(3.0, 3.1 / camera.aspect);
  camera.fov = 2 * Math.atan(need / 2 / camera.position.z) * 180 / Math.PI;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---- view blending -----------------------------------------------------------------------
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let dominant = null;

// Pick the two nearest keyframes for the current spin and cross-fade between them.
function updateLayers(spin) {
  const ws = layers.map((l) => smooth(Math.PI * 0.31, Math.PI * 0.19, Math.abs(wrap(spin - l.key.angle))));
  const order = ws.map((w, i) => [w, i]).sort((a, b) => b[0] - a[0]);
  const total = order[0][0] + order[1][0] || 1;
  for (const l of layers) { l.mesh.visible = false; l.holder.rotation.y = wrap(spin - l.key.angle); }
  const first = layers[order[0][1]], second = layers[order[1][1]];
  first.mesh.visible = true; first.uniforms.uOpacity.value = 1; first.mesh.renderOrder = 0;
  first.mesh.material.depthWrite = true; first.mesh.material.depthTest = true;
  dominant = first;
  if (order[1][0] > 0.001) {
    second.mesh.visible = true;
    second.uniforms.uOpacity.value = order[1][0] / total;
    second.mesh.renderOrder = 1; second.mesh.material.depthWrite = false; second.mesh.material.depthTest = false;
  }
}

// ---- interaction -------------------------------------------------------------------------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pull = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), target: new THREE.Vector3(), held: false };
const poke = { v: 0, vel: 0 };
const shared = { pullC: new THREE.Vector3(), pokeC: new THREE.Vector3(), touchC: new THREE.Vector3(0, 0, 9) };
let drag = null, touchAmt = 0, touchTarget = 0, lastMove = 0, lastSpinInput = 0;
let spin = 0, spinVel = 0, pitch = 0, pitchT = 0;
const tmp = new THREE.Vector3();

function setNdc(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}
function hitBody() {
  if (!dominant) return null;
  pivot.updateMatrixWorld(true);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObject(dominant.mesh)[0] ?? null;
}
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture?.(e.pointerId);
  setNdc(e);
  const hit = hitBody();
  if (hit) {
    const local = pivot.worldToLocal(hit.point.clone());
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), hit.point);
    drag = { mode: 'body', local, world: hit.point.clone(), plane, t0: performance.now(), x0: e.clientX, y0: e.clientY, moved: 0 };
    shared.pullC.copy(local); shared.touchC.copy(local);
    pull.held = true; touchTarget = 1;
  } else {
    drag = { mode: 'orbit', x: e.clientX, y: e.clientY };
  }
});
canvas.addEventListener('pointermove', (e) => {
  setNdc(e);
  if (drag?.mode === 'orbit') {
    spinVel += (e.clientX - drag.x) * -0.0045;
    pitchT = THREE.MathUtils.clamp(pitchT + (e.clientY - drag.y) * 0.004, -0.3, 0.3);
    drag.x = e.clientX; drag.y = e.clientY; lastSpinInput = performance.now();
    return;
  }
  if (drag?.mode === 'body') {
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
    ray.setFromCamera(ndc, camera);
    const p = ray.ray.intersectPlane(drag.plane, new THREE.Vector3());
    if (!p) return;
    const d = pivot.worldToLocal(p.clone()).sub(drag.local);
    d.z = 0;
    if (d.length() > 0.6) d.setLength(0.6);
    pull.target.copy(d);
    shared.touchC.copy(pivot.worldToLocal(p.clone()));
    return;
  }
  const hit = hitBody();
  if (hit) {
    shared.touchC.copy(pivot.worldToLocal(hit.point.clone()));
    touchTarget = 0.8; lastMove = performance.now();
  } else touchTarget = 0;
});
const release = () => {
  if (drag?.mode === 'body' && drag.moved < 8 && performance.now() - drag.t0 < 260) {
    shared.pokeC.copy(drag.local);
    poke.vel += 9;
  }
  drag = null; pull.held = false; pull.target.set(0, 0, 0); touchTarget = 0;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('pointerleave', () => { if (!drag) touchTarget = 0; });

// ---- loop --------------------------------------------------------------------------------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  if (layers.length) {
    // free spin with inertia; when let go it settles on the nearest keyframe so it always looks its best
    spin += spinVel; spinVel *= Math.exp(-6 * dt);
    if (!drag && !window.__hold && performance.now() - lastSpinInput > 350 && Math.abs(spinVel) < 0.01) {
      const nearest = Math.round(spin / (Math.PI / 2)) * (Math.PI / 2);
      spin += (nearest - spin) * Math.min(1, dt * 5);
    }
    pitch += (pitchT - pitch) * Math.min(1, dt * 8);
    if (!drag) pitchT *= Math.exp(-1.5 * dt);
    pivot.rotation.set(pitch, 0, 0);
    pivot.scale.y = 1 + Math.sin(time * 1.5) * 0.004;
    updateLayers(spin);

    const k = pull.held ? 80 : 40, damp = pull.held ? 14 : 5.5;
    tmp.copy(pull.target).sub(pull.pos).multiplyScalar(k * dt);
    pull.vel.add(tmp).multiplyScalar(Math.exp(-damp * dt));
    pull.pos.addScaledVector(pull.vel, dt);
    poke.vel += (-150 * poke.v) * dt; poke.vel *= Math.exp(-7 * dt); poke.v += poke.vel * dt;
    if (performance.now() - lastMove > 250 && !drag) touchTarget = 0;
    touchAmt += (touchTarget - touchAmt) * Math.min(1, dt * (touchTarget > touchAmt ? 14 : 4));
    for (const l of layers) {
      const u = l.uniforms;
      u.uPullC.value.copy(shared.pullC); u.uPullD.value.copy(pull.pos);
      u.uPokeC.value.copy(shared.pokeC); u.uPoke.value = poke.v;
      u.uTouchC.value.copy(shared.touchC); u.uTouchAmt.value = touchAmt;
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
build().then(frame);
window.__relief = { settings, pull, poke, layers, get spin() { return spin; }, set spin(v) { spin = v; } };

// Dev-only: bake the cut-out colour, height field and hit mask of each view into assets/mobies/relief.
window.__exportAssets = async () => {
  const { built, unit } = window.__baked;
  const MASK_W = 64, MASK_H = 80;
  const meta = { worldHeight: WORLD_H, rimPx: RIM_PX, unit, views: {} };
  const post = (name, body) => fetch('/save/' + name, { method: 'POST', body });
  for (const [name, v] of Object.entries(built)) {
    const { crop, hf, bbox, c } = v;
    await post('mobibou-' + name + '.png', await new Promise((r) => c.toBlob(r, 'image/png')));
    const hc = document.createElement('canvas'); hc.width = crop.w; hc.height = crop.h;
    const hctx = hc.getContext('2d');
    const img = hctx.createImageData(crop.w, crop.h);
    for (let i = 0; i < hf.length; i++) { const q = Math.round(hf[i] * 255); img.data[i * 4] = q; img.data[i * 4 + 1] = q; img.data[i * 4 + 2] = q; img.data[i * 4 + 3] = 255; }
    hctx.putImageData(img, 0, 0);
    await post('mobibou-' + name + '-height.png', await new Promise((r) => hc.toBlob(r, 'image/png')));
    // silhouette bits for hit-testing on device (row-major, 8 cells per byte, v measured downward)
    const alpha = c.getContext('2d').getImageData(0, 0, crop.w, crop.h).data;
    const bytes = new Uint8Array(Math.ceil((MASK_W * MASK_H) / 8));
    for (let my = 0; my < MASK_H; my++) for (let mx = 0; mx < MASK_W; mx++) {
      const px = Math.min(crop.w - 1, Math.floor(((mx + 0.5) / MASK_W) * crop.w));
      const py = Math.min(crop.h - 1, Math.floor(((my + 0.5) / MASK_H) * crop.h));
      if (alpha[(py * crop.w + px) * 4 + 3] > 128) { const bit = my * MASK_W + mx; bytes[bit >> 3] |= 1 << (bit & 7); }
    }
    meta.views[name] = { w: crop.w, h: crop.h, bbox, mask: btoa(String.fromCharCode(...bytes)), maskW: MASK_W, maskH: MASK_H };
  }
  await post('relief-meta.json', JSON.stringify(meta));
  return Object.keys(built);
};
