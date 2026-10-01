// Shell-texture fur: the base mesh is drawn `shells` times (instanced), each copy pushed
// a little further out along the fur direction. Each shell keeps only the pixels that fall
// inside a strand, so the stack reads as individual hairs without any hair geometry.
import * as THREE from 'three';

export const MAX_SHELLS = 64;

const vertexShader = /* glsl */ `
uniform float uShells, uLength, uGravity, uCurl, uTime;
uniform vec3 uGravityObj, uLag;
uniform vec3 uPullC, uPullD;
uniform float uPullR;
uniform vec3 uTouchC;
uniform float uTouchAmt;

attribute vec3 aDir, aRoot, aTip;
attribute float aLen, aShell;

varying vec3 vBase, vN0, vN, vPos, vRoot, vTip;
varying float vT;

void main() {
  float t = aShell / max(uShells - 1.0, 1.0);
  vec3 p = position;
  vec3 d = p - uPullC;
  float w = exp(-dot(d, d) / (uPullR * uPullR));
  p += uPullD * w;

  float len = uLength * aLen;
  vec3 off = aDir * t * len;

  // droop under gravity, inertia lag from motion, and a slow static curl
  float t2 = t * t;
  off += (uGravityObj * uGravity + uLag) * t2 * len;
  vec3 curlDir = vec3(sin(position.y * 23.0 + position.z * 11.0), cos(position.x * 19.0 + position.y * 7.0), sin(position.z * 17.0 + position.x * 13.0));
  off += curlDir * uCurl * 0.12 * t2 * len + curlDir * 0.01 * sin(uTime * 1.3 + position.y * 5.0) * t2 * len;

  // fingertip parts the fur around the touch point; the pull drags the coat along with it
  vec3 td = position - uTouchC;
  float tw = exp(-dot(td, td) / 0.045) * uTouchAmt;
  off += normalize(td + vec3(0.0001)) * tw * t * len * 1.6;
  off += uPullD * 0.6 * w * t * len * 4.0;

  p += off;
  vBase = position;
  vN0 = normal;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vPos = p;
  vRoot = aRoot;
  vTip = aTip;
  vT = t;
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform float uDensity, uThickness, uBright, uRim;
uniform vec3 uLightObj, uCamObj, uGravityObj;
uniform vec3 uSheen;

varying vec3 vBase, vN0, vN, vPos, vRoot, vTip;
varying float vT;

vec3 hash33(vec3 p) {
  p = fract(p * vec3(.1031, .1030, .0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

void main() {
  vec3 cell = floor(vBase * uDensity);
  vec3 h = hash33(cell);
  vec3 c = (cell + 0.15 + 0.7 * h) / uDensity;
  vec3 n0 = normalize(vN0);
  // strands grow in clumps: each clump leans its hairs the same way and has its own tone
  vec3 ch = hash33(floor(vBase * uDensity / 6.0) + 17.0);
  vec3 t1 = normalize(cross(n0, vec3(0.0, 1.0, 0.0013)));
  vec3 t2 = cross(n0, t1);
  vec3 lean = (t1 * (ch.x - 0.5) + t2 * (ch.y - 0.5)) * 2.2;
  vec3 dv = vBase - c - lean * vT / uDensity;
  dv -= n0 * dot(dv, n0);
  float dist = length(dv) * uDensity;

  float strandLen = mix(0.5, 1.0, h.y);
  float tt = vT / strandLen;
  float radius = uThickness * (1.0 - 0.85 * pow(clamp(tt, 0.0, 1.0), 1.3));
  if (vT > 0.0 && (tt > 1.0 || dist > radius)) discard;

  vec3 N = normalize(vN);
  vec3 V = normalize(uCamObj - vPos);
  vec3 L = normalize(uLightObj);

  float depth = vT == 0.0 ? 0.0 : clamp(tt, 0.0, 1.0);
  float wrap = clamp((dot(normalize(vN0), L) + 0.7) / 1.7, 0.0, 1.0);
  wrap *= wrap;

  float ao = mix(0.5, 1.0, pow(depth, 0.9));
  float sky = mix(0.75, 1.0, dot(n0, -uGravityObj) * 0.5 + 0.5);
  vec3 base = mix(vRoot, vTip, depth) * (0.93 + 0.1 * h.x) * (0.84 + 0.32 * ch.z);
  vec3 col = base * (0.6 * uBright * sky + 1.2 * wrap) * ao;

  float edge = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  col += mix(uSheen, vec3(1.0), 0.4) * edge * smoothstep(0.25, 1.0, depth) * uRim;

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export function createFur(geo, attrs, opts) {
  const g = new THREE.InstancedBufferGeometry();
  g.index = new THREE.BufferAttribute(geo.index, 1);
  g.setAttribute('position', new THREE.BufferAttribute(geo.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(geo.normal, 3));
  g.setAttribute('aDir', new THREE.BufferAttribute(attrs.aDir, 3));
  g.setAttribute('aLen', new THREE.BufferAttribute(attrs.aLen, 1));
  g.setAttribute('aRoot', new THREE.BufferAttribute(attrs.aRoot, 3));
  g.setAttribute('aTip', new THREE.BufferAttribute(attrs.aTip, 3));
  g.setAttribute('aShell', new THREE.InstancedBufferAttribute(Float32Array.from({ length: MAX_SHELLS }, (_, i) => i), 1));
  g.instanceCount = opts.shells;

  const u = {
    uShells: { value: opts.shells },
    uLength: { value: opts.length },
    uDensity: { value: opts.density },
    uThickness: { value: opts.thickness },
    uGravity: { value: opts.gravity },
    uCurl: { value: opts.curl },
    uTime: { value: 0 },
    uGravityObj: { value: new THREE.Vector3(0, -1, 0) },
    uLag: { value: new THREE.Vector3() },
    uPullC: { value: new THREE.Vector3() },
    uPullD: { value: new THREE.Vector3() },
    uPullR: { value: 0.36 },
    uTouchC: { value: new THREE.Vector3(0, 0, 9) },
    uTouchAmt: { value: 0 },
    uLightObj: { value: new THREE.Vector3(0.4, 0.8, 0.6) },
    uCamObj: { value: new THREE.Vector3() },
    uSheen: { value: new THREE.Color('#8a7060') },
    uBright: { value: 1 },
    uRim: { value: 0.55 },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: u });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  return { mesh, uniforms: u, geometry: g };
}
