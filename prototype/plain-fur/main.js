import * as THREE from 'three';
import { bodySDF, surfaceNets, surfaceZ, furAttributes, LAYOUT } from './sdf.js';
import { createFur, MAX_SHELLS } from './fur.js';

const params = { shells: 48, length: 0.13, density: 120, thickness: 0.72, gravity: 0.5, curl: 0.6 };
const q = new URLSearchParams(location.search);
for (const k of Object.keys(params)) if (q.has(k)) params[k] = Number(q.get(k));

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor('#f1d3b2');
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
camera.position.set(0, 0.1, 7.2);
camera.lookAt(0, 0.0, 0);

const key = new THREE.DirectionalLight('#fff3e6', 2.6);
key.position.set(-2.5, 3.5, 4);
scene.add(key, new THREE.HemisphereLight('#ffffff', '#c9c0b8', 1.4));

// ---- body ----------------------------------------------------------------------------
const geo = surfaceNets(bodySDF, [-1.3, -1.2, -0.95], [1.3, 1.25, 0.95], [104, 98, 76]);
const attrs = furAttributes(geo);
const fur = createFur(geo, attrs, params);

const pivot = new THREE.Group();
scene.add(pivot);
pivot.add(fur.mesh);

const proxyGeo = new THREE.BufferGeometry();
proxyGeo.setAttribute('position', new THREE.BufferAttribute(geo.position, 3));
proxyGeo.setIndex(new THREE.BufferAttribute(geo.index, 1));
const proxy = new THREE.Mesh(proxyGeo, new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
pivot.add(proxy);

// ---- accessories (plain meshes) ------------------------------------------------------
function knitTexture(base, line) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = line; g.lineWidth = 3;
  for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 8) {
    g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x + 4, y); g.lineTo(x + 8, y + 8); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const bumpOnly = (tex) => { const t = tex.clone(); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t; };
const knit = (color, line, rough = 1) => {
  const tex = knitTexture(color, line);
  return new THREE.MeshStandardMaterial({ map: tex, bumpMap: bumpOnly(tex), bumpScale: 1.5, roughness: rough });
};
const plain = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

const accessories = [];
const accessory = (obj) => { obj.userData.base = obj.position.clone(); pivot.add(obj); accessories.push(obj); return obj; };
const seat = (x, y, lift) => new THREE.Vector3(x, y, surfaceZ(x, y) + lift);

// eyes: big cream eye (left), camera lens (right)
const LIFT = 0.06;
const eyeL = new THREE.Group();
{
  const cream = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), knit('#f2dca4', '#e4c98a'));
  cream.scale.set(0.235, 0.235, 0.075);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), plain('#050505', 0.04, { metalness: 0.1 }));
  bead.scale.set(0.115, 0.115, 0.06); bead.position.set(0.02, -0.005, 0.045);
  const hi = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  hi.position.set(0.045, 0.045, 0.1);
  eyeL.add(cream, bead, hi);
  eyeL.userData.bead = bead;
  eyeL.position.copy(seat(LAYOUT.eye.x, LAYOUT.eye.y, LIFT));
  accessory(eyeL);
}
const lens = new THREE.Group();
{
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.12, 48), plain('#161616', 0.4, { metalness: 0.3 }));
  rim.rotation.x = Math.PI / 2;
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.022, 14, 48), plain('#262626', 0.35, { metalness: 0.6 }));
  rim2.position.z = 0.062;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 40), plain('#0a0a0a', 0.5));
  barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.04;
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshPhysicalMaterial({ color: '#12301a', roughness: 0.04, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 }));
  glass.scale.set(0.165, 0.165, 0.06); glass.position.z = 0.06;
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: '#c9f0ff' }));
  glint.position.set(0.06, 0.07, 0.115);
  lens.add(rim, rim2, barrel, glass, glint);
  lens.position.copy(seat(LAYOUT.lens.x, LAYOUT.lens.y, LIFT));
  accessory(lens);
}

// chest controls: d-pad (bevelled cross) + two round buttons
const pad = new THREE.Group();
{
  const m = plain('#2a2a2a', 0.5);
  const arm = (w, h) => new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), m);
  const a = arm(0.45, 0.15), b = arm(0.15, 0.45);
  pad.add(a, b);
  pad.position.copy(seat(LAYOUT.dpad.x, LAYOUT.dpad.y, LIFT + 0.01));
  accessory(pad);
}
for (const bt of LAYOUT.buttons) {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.105, 0.07, 32), plain('#303030', 0.45));
  b.rotation.x = Math.PI / 2;
  b.position.copy(seat(bt.x, bt.y, LIFT + 0.01));
  accessory(b);
}

// soft ground shadow
{
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(60,50,45,0.45)'); grad.addColorStop(1, 'rgba(60,50,45,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = -1.02;
  scene.add(sh);
}

// ---- interaction ---------------------------------------------------------------------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointer = { x: 0, y: 0 };
let drag = null;               // { mode: 'pull'|'orbit', ... }
const pull = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), target: new THREE.Vector3(), held: false };
let touchAmt = 0;
let annoy = 0;
let yaw = 0, pitch = 0, yawVel = 0;
const lag = { pos: new THREE.Vector3(), vel: new THREE.Vector3() };
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();

function setNdc(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  pointer.x = ndc.x; pointer.y = ndc.y;
}
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  setNdc(e);
  pivot.updateMatrixWorld(true);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(proxy)[0];
  if (hit) {
    const local = pivot.worldToLocal(hit.point.clone());
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), hit.point);
    drag = { mode: 'pull', local, world: hit.point.clone(), plane };
    fur.uniforms.uPullC.value.copy(local);
    fur.uniforms.uTouchC.value.copy(local);
    pull.held = true;
  } else {
    drag = { mode: 'orbit', lastX: e.clientX, lastY: e.clientY };
  }
});
canvas.addEventListener('pointermove', (e) => {
  setNdc(e);
  if (!drag) return;
  if (drag.mode === 'orbit') {
    yawVel += (e.clientX - drag.lastX) * 0.004;
    pitch = THREE.MathUtils.clamp(pitch + (e.clientY - drag.lastY) * 0.003, -0.35, 0.35);
    drag.lastX = e.clientX; drag.lastY = e.clientY;
    return;
  }
  ray.setFromCamera(ndc, camera);
  const p = ray.ray.intersectPlane(drag.plane, new THREE.Vector3());
  if (!p) return;
  const dw = p.sub(drag.world);
  const dl = pivot.worldToLocal(dw.clone().add(pivot.getWorldPosition(new THREE.Vector3()))).clone();
  const max = 0.55;
  if (dl.length() > max) dl.setLength(max);
  pull.target.copy(dl);
  annoy = Math.min(1.5, annoy + dl.length() * 0.02);
});
const release = () => { drag = null; pull.held = false; pull.target.set(0, 0, 0); };
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

// ---- ui ------------------------------------------------------------------------------
const panel = document.getElementById('panel');
const sliders = [
  ['shells', 8, MAX_SHELLS, 1], ['length', 0.01, 0.2, 0.005], ['density', 40, 260, 1],
  ['thickness', 0.15, 0.9, 0.01], ['gravity', 0, 1, 0.01], ['curl', 0, 3, 0.05],
];
for (const [k, min, max, step] of sliders) {
  const row = document.createElement('label');
  row.innerHTML = `<span>${k}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${params[k]}"><b>${params[k]}</b>`;
  const input = row.querySelector('input'), out = row.querySelector('b');
  input.addEventListener('input', () => {
    params[k] = Number(input.value); out.textContent = input.value; applyParams();
  });
  panel.appendChild(row);
}
const fpsEl = document.createElement('div'); fpsEl.id = 'fps'; panel.appendChild(fpsEl);
function applyParams() {
  const u = fur.uniforms;
  u.uShells.value = params.shells; fur.geometry.instanceCount = params.shells;
  u.uLength.value = params.length; u.uDensity.value = params.density;
  u.uThickness.value = params.thickness; u.uGravity.value = params.gravity; u.uCurl.value = params.curl;
}
applyParams();

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 28 / (w / h / 0.8) : 28;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---- loop ----------------------------------------------------------------------------
const clock = new THREE.Clock();
let frames = 0, acc = 0;
const pullBase = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  const u = fur.uniforms;

  // orbit with inertia, gentle idle sway
  yaw += yawVel; yawVel *= 0.9;
  const prevYaw = pivot.rotation.y;
  pivot.rotation.set(pitch * 0.6, yaw * 0.9 + Math.sin(time * 0.6) * 0.06, 0);
  const yv = (pivot.rotation.y - prevYaw) / Math.max(dt, 1e-3);
  const bob = Math.sin(time * 1.6) * 0.012;
  pivot.position.y = bob;

  // spring for the pulled cheek: stretches while held, wobbles back on release
  const k = pull.held ? 70 : 38, damp = pull.held ? 14 : 5.5;
  tmpV.copy(pull.target).sub(pull.pos).multiplyScalar(k * dt);
  pull.vel.add(tmpV).multiplyScalar(Math.exp(-damp * dt));
  pull.pos.addScaledVector(pull.vel, dt);
  u.uPullD.value.copy(pull.pos);
  touchAmt += ((pull.held ? 1 : 0) - touchAmt) * Math.min(1, dt * 8);
  u.uTouchAmt.value = touchAmt;
  annoy = Math.max(0, annoy - dt * 0.15);

  // inertia lag in object space (hair trails behind rotation and bobbing)
  pivot.updateMatrixWorld(true);
  tmpQ.copy(pivot.quaternion).invert();
  const lagTarget = tmpV.set(-yv * 0.05, -Math.cos(time * 1.6) * 0.02 * 1.6 * 8, 0).applyQuaternion(tmpQ);
  lag.vel.addScaledVector(lagTarget.sub(lag.pos), 60 * dt).multiplyScalar(Math.exp(-9 * dt));
  lag.pos.addScaledVector(lag.vel, dt);
  u.uLag.value.copy(lag.pos).clampLength(0, 0.5);
  u.uTime.value = time;

  u.uGravityObj.value.set(0, -1, 0).applyQuaternion(tmpQ);
  u.uLightObj.value.copy(key.position).normalize().applyQuaternion(tmpQ);
  u.uCamObj.value.copy(camera.position).applyMatrix4(pivot.matrixWorld.clone().invert());

  // accessories follow the pulled skin
  for (const a of accessories) {
    const d = pullBase.copy(a.userData.base).sub(u.uPullC.value);
    const w = Math.exp(-d.lengthSq() / (u.uPullR.value ** 2));
    a.position.copy(a.userData.base).addScaledVector(u.uPullD.value, w);
  }
  // eyes track the pointer; being fussed with squints the big eye
  const bead = eyeL.userData.bead;
  bead.position.x += (pointer.x * 0.05 - bead.position.x) * 0.2;
  bead.position.y += (pointer.y * 0.05 - bead.position.y) * 0.2;
  eyeL.scale.y += ((1 - Math.min(annoy, 1) * 0.55) - eyeL.scale.y) * 0.2;

  renderer.render(scene, camera);

  frames++; acc += dt;
  if (acc > 0.5) { fpsEl.textContent = `${Math.round(frames / acc)} fps  tris ${(geo.index.length / 3 * params.shells / 1000).toFixed(0)}k`; frames = 0; acc = 0; }
  requestAnimationFrame(frame);
}
frame();
window.__fur = { params, fur, pull, camera, pivot, renderer };
