// Relief prototype: the character is the original artwork itself (cut out of the 3-view sheet),
// lifted into a soft 3D relief so it tilts with real depth, and it reacts to being touched.
import * as THREE from 'three';

const SHEET = './mobibou-sheet.webp';
const CROP = { x: 0, y: 160, w: 545, h: 670 };   // front view on the sheet
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
uniform float uPullR, uDepth, uPoke;
uniform vec3 uPokeC;
varying vec2 vUv, vBase;
varying vec3 vN, vV;
void main() {
  vec3 p = position;
  p.z *= uDepth;
  vec2 d = p.xy - uPullC.xy;
  float w = exp(-dot(d, d) / (uPullR * uPullR));
  p += uPullD * w;
  vec2 dc = p.xy - uPokeC.xy;
  float wp = exp(-dot(dc, dc) / 0.12);
  p.z -= uPoke * wp * 0.35;
  p.xy -= dc * uPoke * wp * 0.35;
  vUv = uv;
  vBase = position.xy;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uTouchC, uPullD;
uniform float uTouchAmt, uShade;
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
  gl_FragColor = vec4(col, tex.a);
  #include <colorspace_fragment>
}
`;

// ---- build -------------------------------------------------------------------------------
const pivot = new THREE.Group();
scene.add(pivot);
let uniforms, mesh;

async function build() {
  const img = await loadImage(SHEET);
  const c = document.createElement('canvas');
  c.width = CROP.w; c.height = CROP.h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, CROP.w, CROP.h);
  const mask = cutout(ctx, CROP.w, CROP.h);
  const hf = heightField(mask, CROP.w, CROP.h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const unit = WORLD_H / CROP.h;
  const W = CROP.w * unit, H = CROP.h * unit;
  const segX = 150, segY = 186;
  const geo = new THREE.PlaneGeometry(W, H, segX, segY);
  const pos = geo.attributes.position, uvA = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uvA.getX(i), v = uvA.getY(i);
    const px = Math.min(CROP.w - 1, Math.round(u * (CROP.w - 1)));
    const py = Math.min(CROP.h - 1, Math.round((1 - v) * (CROP.h - 1)));
    pos.setZ(i, hf[py * CROP.w + px] * RIM_PX * unit);
  }
  geo.computeVertexNormals();

  uniforms = {
    uMap: { value: tex },
    uPullC: { value: new THREE.Vector3(0, 0, 0) }, uPullD: { value: new THREE.Vector3() }, uPullR: { value: 0.42 },
    uPokeC: { value: new THREE.Vector3() }, uPoke: { value: 0 },
    uTouchC: { value: new THREE.Vector3(0, 0, 9) }, uTouchAmt: { value: 0 },
    uDepth: { value: settings.depth }, uShade: { value: settings.shade },
  };
  mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, side: THREE.DoubleSide }));
  pivot.add(mesh);
  pivot.position.y = 0.05;

  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const g = sc.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(60,50,45,0.4)'); grad.addColorStop(1, 'rgba(60,50,45,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  sh.position.set(0, -H / 2 + 0.02, -0.05);
  scene.add(sh);
  scene.add(sh);
  document.getElementById('panel').appendChild(slider('depth', 0, 1.2, 0.01, (v) => (uniforms.uDepth.value = v)));
  document.getElementById('panel').appendChild(slider('shade', 0, 1, 0.01, (v) => (uniforms.uShade.value = v)));
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

// ---- interaction -------------------------------------------------------------------------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pull = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), target: new THREE.Vector3(), held: false };
const poke = { v: 0, vel: 0 };
let drag = null, touchAmt = 0, touchTarget = 0, lastMove = 0;
let yaw = 0, pitch = 0, yawT = 0, pitchT = 0;
const tmp = new THREE.Vector3();

function setNdc(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}
function hitBody() {
  if (!mesh) return null;
  pivot.updateMatrixWorld(true);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObject(mesh)[0] ?? null;
}
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture?.(e.pointerId);
  setNdc(e);
  const hit = hitBody();
  if (hit) {
    const local = pivot.worldToLocal(hit.point.clone());
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), hit.point);
    drag = { mode: 'body', local, world: hit.point.clone(), plane, t0: performance.now(), x0: e.clientX, y0: e.clientY, moved: 0 };
    uniforms.uPullC.value.copy(local);
    uniforms.uTouchC.value.copy(local);
    pull.held = true; touchTarget = 1;
  } else {
    drag = { mode: 'orbit', x: e.clientX, y: e.clientY };
  }
});
canvas.addEventListener('pointermove', (e) => {
  setNdc(e);
  if (drag?.mode === 'orbit') {
    yawT = THREE.MathUtils.clamp(yawT + (e.clientX - drag.x) * 0.006, -0.6, 0.6);
    pitchT = THREE.MathUtils.clamp(pitchT + (e.clientY - drag.y) * 0.004, -0.35, 0.35);
    drag.x = e.clientX; drag.y = e.clientY;
    return;
  }
  if (drag?.mode === 'body') {
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
    ray.setFromCamera(ndc, camera);
    const p = ray.ray.intersectPlane(drag.plane, new THREE.Vector3());
    if (!p) return;
    const d = pivot.worldToLocal(p).sub(drag.local);
    d.z = 0;
    if (d.length() > 0.6) d.setLength(0.6);
    pull.target.copy(d);
    uniforms.uTouchC.value.copy(pivot.worldToLocal(p));
    return;
  }
  // stroking without pressing: ruffle the fur under the pointer
  const hit = hitBody();
  if (hit) {
    uniforms.uTouchC.value.copy(pivot.worldToLocal(hit.point.clone()));
    touchTarget = 0.8; lastMove = performance.now();
  } else touchTarget = 0;
});
const release = () => {
  if (drag?.mode === 'body') {
    if (drag.moved < 8 && performance.now() - drag.t0 < 260) {
      uniforms.uPokeC.value.copy(drag.local);
      poke.vel += 9;
    }
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
  if (uniforms) {
    yaw += (yawT - yaw) * Math.min(1, dt * 8); pitch += (pitchT - pitch) * Math.min(1, dt * 8);
    pivot.rotation.set(pitch, yaw + Math.sin(time * 0.5) * 0.015, 0);
    pivot.scale.y = 1 + Math.sin(time * 1.5) * 0.004;

    const k = pull.held ? 80 : 40, damp = pull.held ? 14 : 5.5;
    tmp.copy(pull.target).sub(pull.pos).multiplyScalar(k * dt);
    pull.vel.add(tmp).multiplyScalar(Math.exp(-damp * dt));
    pull.pos.addScaledVector(pull.vel, dt);
    uniforms.uPullD.value.copy(pull.pos);

    poke.vel += (-150 * poke.v) * dt; poke.vel *= Math.exp(-7 * dt); poke.v += poke.vel * dt;
    uniforms.uPoke.value = poke.v;

    if (performance.now() - lastMove > 250 && !drag) touchTarget = 0;
    touchAmt += (touchTarget - touchAmt) * Math.min(1, dt * (touchTarget > touchAmt ? 14 : 4));
    uniforms.uTouchAmt.value = touchAmt;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
build().then(frame);
window.__relief = { settings, pull, poke, get uniforms() { return uniforms; } };
