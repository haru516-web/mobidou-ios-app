import { configureTexture, type GL } from './pullMeshCore';

/**
 * Relief renderer for a character cut out of its turnaround sheet.
 *
 * The artwork itself is the surface: each view (front / side / back) is a flat
 * cut-out lifted into a soft relief by a baked height map, so it keeps the
 * original colours and fur exactly. Turning cross-fades between the four
 * keyframes (front, left, back, right). Touching pulls the body like stuffing,
 * a tap pokes it in, and the fur under a finger is ruffled in the shader.
 *
 * Plain WebGL1 only, so the same code runs in a web canvas and in expo-gl.
 */
export type { GL } from './pullMeshCore';
export type ReliefViewKey = 'front' | 'side' | 'back';
export type ReliefTextureLoader = (gl: GL, source: unknown) => Promise<WebGLTexture | null>;
export type ReliefSources = Record<ReliefViewKey, { color: unknown; height: unknown }>;
export type ReliefViewMeta = {
  w: number;
  h: number;
  bbox: { x0: number; x1: number; y0: number; y1: number };
  /** Silhouette bits (maskW x maskH, row-major, 8 cells per byte, base64) for hit-testing. */
  mask: string;
  maskW: number;
  maskH: number;
};
export type ReliefMeta = { worldHeight: number; rimPx: number; unit: number; views: Record<ReliefViewKey, ReliefViewMeta> };

export type ReliefOptions = {
  /** CSS-pixel size of the drawing surface; pointer coordinates are relative to it. */
  width: number;
  height: number;
  sources: ReliefSources;
  meta: ReliefMeta;
  loadTexture: ReliefTextureLoader;
  /** Called after each draw (expo-gl needs `gl.endFrameEXP()`). */
  present?: () => void;
  onError?: (error: unknown) => void;
  /** 0 = flat art, 1 = full shading. */
  shade?: number;
  depth?: number;
};

export type ReliefController = {
  pointerDown: (x: number, y: number) => void;
  pointerMove: (x: number, y: number) => void;
  pointerUp: () => void;
  /** Jump to a turn angle in radians (0 = facing the viewer). */
  setSpin: (radians: number) => void;
  dispose: () => void;
};

const KEYS: { view: ReliefViewKey; angle: number; flip: number }[] = [
  { view: 'front', angle: 0, flip: 1 },
  { view: 'side', angle: -Math.PI / 2, flip: 1 },
  { view: 'back', angle: Math.PI, flip: 1 },
  { view: 'side', angle: Math.PI / 2, flip: -1 },
];

const SEG_X = 90;
const SEG_Y = 112;
const CAM_DIST = 8;
const FIT = 1.18;          // vertical margin around the character
const NORMAL_STEP = 3;     // texels either side when deriving the surface normal

const VERTEX_SHADER = `
attribute vec2 a_uv;
uniform sampler2D u_height;
uniform vec2 u_size;
uniform vec2 u_texel;
uniform vec2 u_off;
uniform float u_flip;
uniform float u_zscale;
uniform vec3 u_pullC;
uniform vec3 u_pullD;
uniform float u_pullR;
uniform vec3 u_pokeC;
uniform float u_poke;
uniform float u_cs;
uniform float u_sn;
uniform float u_camDist;
uniform mat4 u_proj;
varying vec2 v_uv;
varying vec2 v_base;
varying vec3 v_n;
varying vec3 v_pos;

float hAt(vec2 uv) { return texture2D(u_height, uv).r; }

void main() {
  float h = hAt(a_uv);
  vec3 p = vec3((a_uv.x - 0.5) * u_size.x, (0.5 - a_uv.y) * u_size.y, h * u_zscale);

  // slope of the relief -> surface normal (v runs downward, y runs up)
  vec2 e = u_texel * ${NORMAL_STEP}.0;
  float dzdx = (hAt(a_uv + vec2(e.x, 0.0)) - hAt(a_uv - vec2(e.x, 0.0))) * u_zscale / (2.0 * e.x * u_size.x);
  float dzdy = -(hAt(a_uv + vec2(0.0, e.y)) - hAt(a_uv - vec2(0.0, e.y))) * u_zscale / (2.0 * e.y * u_size.y);
  vec3 n = normalize(vec3(-dzdx * u_flip, -dzdy, 1.0));

  vec2 q = vec2(p.x * u_flip, p.y) + u_off;          // shared pivot space
  vec2 d = q - u_pullC.xy;
  float w = exp(-dot(d, d) / (u_pullR * u_pullR));
  p += vec3(u_pullD.x * u_flip, u_pullD.y, u_pullD.z) * w;
  vec2 dc = q - u_pokeC.xy;
  float wp = exp(-dot(dc, dc) / 0.12);
  p.z -= u_poke * wp * 0.35;
  p.xy -= vec2(dc.x * u_flip, dc.y) * u_poke * wp * 0.35;

  vec3 m = vec3(p.x * u_flip + u_off.x, p.y + u_off.y, p.z);
  vec3 world = vec3(m.x * u_cs + m.z * u_sn, m.y, -m.x * u_sn + m.z * u_cs);
  v_n = vec3(n.x * u_cs + n.z * u_sn, n.y, -n.x * u_sn + n.z * u_cs);
  v_pos = world;
  v_uv = a_uv;
  v_base = q;
  gl_Position = u_proj * vec4(world.xy, world.z - u_camDist, 1.0);
}`;

const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_color;
uniform vec3 u_touchC;
uniform float u_touchAmt;
uniform float u_shade;
uniform float u_opacity;
varying vec2 v_uv;
varying vec2 v_base;
varying vec3 v_n;
varying vec3 v_pos;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  // touched fur is ruffled: pixels are jittered along short fibre-like streaks
  vec2 dd = v_base - u_touchC.xy;
  float tw = exp(-dot(dd, dd) / 0.06) * u_touchAmt;
  float n1 = vnoise(v_base * vec2(160.0, 60.0)) - 0.5;
  float n2 = vnoise(v_base * vec2(70.0, 190.0) + 7.0) - 0.5;
  vec2 dir = normalize(dd + vec2(0.0001));
  vec2 uv = v_uv + (dir * n1 * 0.016 + vec2(-dir.y, dir.x) * n2 * 0.01) * tw * vec2(1.0, -1.0);
  vec4 tex = texture2D(u_color, uv);
  if (tex.a < 0.02) discard;

  vec3 N = normalize(v_n);
  vec3 V = normalize(vec3(0.0, 0.0, ${CAM_DIST}.0) - v_pos);
  vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
  float shade = mix(1.0, 0.62 + 0.6 * clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0), u_shade);
  vec3 col = tex.rgb * shade;
  col *= 1.0 + (n1 + n2) * 0.5 * tw;
  float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  col += tex.rgb * rim * 0.28 * u_shade;
  float a = tex.a * u_opacity;
  gl_FragColor = vec4(col * a, a);
}`;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decodeBase64(text: string) {
  const out: number[] = [];
  let bits = 0, acc = 0;
  for (const ch of text) {
    const v = B64.indexOf(ch);
    if (v < 0) continue;
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); }
  }
  return Uint8Array.from(out);
}

function compile(gl: GL, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('createShader failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compile failed: ${log}`);
  }
  return shader;
}

type Layer = {
  view: ReliefViewKey;
  angle: number;
  flip: number;
  size: [number, number];
  off: [number, number];
  texel: [number, number];
  mask: Uint8Array;
  maskW: number;
  maskH: number;
};

export function createRelief(gl: GL, options: ReliefOptions): ReliefController {
  const { width, height, sources, meta, loadTexture, present, onError } = options;
  const shade = options.shade ?? 0.55;
  const depth = options.depth ?? 0.55;
  const unit = meta.unit;

  const program = gl.createProgram();
  if (!program) throw new Error('createProgram failed');
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`program link failed: ${gl.getProgramInfoLog(program)}`);
  gl.useProgram(program);

  const loc: Record<string, WebGLUniformLocation | null> = {};
  const u = (name: string) => (loc[name] ??= gl.getUniformLocation(program, name));
  const uvLocation = gl.getAttribLocation(program, 'a_uv');

  // shared grid of uv coordinates + indices
  const cols = SEG_X + 1, rows = SEG_Y + 1;
  const uvs = new Float32Array(cols * rows * 2);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    uvs[(j * cols + i) * 2] = i / SEG_X;
    uvs[(j * cols + i) * 2 + 1] = j / SEG_Y;
  }
  const indices = new Uint16Array(SEG_X * SEG_Y * 6);
  let k = 0;
  for (let j = 0; j < SEG_Y; j++) for (let i = 0; i < SEG_X; i++) {
    const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
    indices[k++] = a; indices[k++] = c; indices[k++] = b;
    indices[k++] = b; indices[k++] = c; indices[k++] = d;
  }
  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  const layers: Layer[] = KEYS.map((key) => {
    const v = meta.views[key.view];
    const cx = ((v.bbox.x0 + v.bbox.x1) / 2 - v.w / 2) * unit;
    return {
      ...key,
      size: [v.w * unit, v.h * unit],
      off: [-cx * key.flip, -meta.worldHeight / 2 - (v.h / 2 - v.bbox.y1) * unit],
      texel: [1 / v.w, 1 / v.h],
      mask: decodeBase64(v.mask),
      maskW: v.maskW,
      maskH: v.maskH,
    };
  });

  const textures: Partial<Record<ReliefViewKey, { color: WebGLTexture | null; height: WebGLTexture | null }>> = {};
  let ready = false;
  let disposed = false;
  Promise.all((['front', 'side', 'back'] as ReliefViewKey[]).map(async (view) => {
    const [color, heightTex] = await Promise.all([loadTexture(gl, sources[view].color), loadTexture(gl, sources[view].height)]);
    textures[view] = { color, height: heightTex };
  })).then(() => {
    if (disposed) return;
    ready = true;
    kick();
  }).catch((error) => onError?.(error));

  // ---- state -------------------------------------------------------------------------------
  const pull = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, held: false };
  const poke = { v: 0, vel: 0 };
  const shared = { pullX: 0, pullY: 0, pokeX: 0, pokeY: 0, touchX: 0, touchY: 0, touchZ: 9 };
  let touchAmt = 0, touchTarget = 0;
  let spin = 0, spinVel = 0, lastSpinInput = 0;
  let drag: null | { mode: 'body' | 'orbit'; x0: number; y0: number; lx: number; ly: number; t0: number; moved: number; qx: number; qy: number } = null;
  let dominant: Layer = layers[0];
  let raf: ReturnType<typeof requestAnimationFrame> | null = null;
  let last = 0;

  const aspect = width / height;
  const tanHalf = (meta.worldHeight * FIT) / 2 / CAM_DIST;
  const proj = new Float32Array(16);
  {
    const f = 1 / tanHalf, near = 0.1, far = 50;
    proj[0] = f / aspect; proj[5] = f;
    proj[10] = (far + near) / (near - far); proj[11] = -1;
    proj[14] = (2 * far * near) / (near - far);
  }
  const worldPerPx = (2 * tanHalf * CAM_DIST) / height;

  // ---- hit testing -------------------------------------------------------------------------
  // Intersects the camera ray with the mid-height of the dominant view, in that view's own frame.
  function hit(px: number, py: number): { qx: number; qy: number } | null {
    const ndcX = (px / width) * 2 - 1, ndcY = 1 - (py / height) * 2;
    const dir = [ndcX * tanHalf * aspect, ndcY * tanHalf, -1];
    const o = [0, 0, CAM_DIST];
    const delta = wrapAngle(spin - dominant.angle);
    const cs = Math.cos(delta), sn = Math.sin(delta);
    // inverse of the holder rotation (rotate by -delta about Y)
    const inv = (x: number, y: number, z: number) => [x * cs - z * sn, y, x * sn + z * cs];
    const oo = inv(o[0], o[1], o[2]), dd = inv(dir[0], dir[1], dir[2]);
    const zc = 0.22;
    if (Math.abs(dd[2]) < 1e-5) return null;
    const t = (zc - oo[2]) / dd[2];
    const qx = oo[0] + dd[0] * t, qy = oo[1] + dd[1] * t;
    const lx = (qx - dominant.off[0]) * dominant.flip, ly = qy - dominant.off[1];
    const mu = lx / dominant.size[0] + 0.5, mv = 0.5 - ly / dominant.size[1];
    if (mu < 0 || mu >= 1 || mv < 0 || mv >= 1) return null;
    const mx = Math.floor(mu * dominant.maskW), my = Math.floor(mv * dominant.maskH);
    const bit = my * dominant.maskW + mx;
    if (!(dominant.mask[bit >> 3] & (1 << (bit & 7)))) return null;
    return { qx, qy };
  }

  // ---- drawing -----------------------------------------------------------------------------
  function bindTexture(unitIndex: number, tex: WebGLTexture | null, name: string) {
    gl.activeTexture(gl.TEXTURE0 + unitIndex);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(u(name), unitIndex);
  }

  function drawLayer(layer: Layer, opacity: number, useDepth: boolean) {
    const tex = textures[layer.view];
    if (!tex) return;
    if (useDepth) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
    const delta = wrapAngle(spin - layer.angle);
    bindTexture(0, tex.color, 'u_color');
    bindTexture(1, tex.height, 'u_height');
    gl.uniform2f(u('u_size'), layer.size[0], layer.size[1]);
    gl.uniform2f(u('u_texel'), layer.texel[0], layer.texel[1]);
    gl.uniform2f(u('u_off'), layer.off[0], layer.off[1]);
    gl.uniform1f(u('u_flip'), layer.flip);
    gl.uniform1f(u('u_zscale'), meta.rimPx * unit * depth);
    gl.uniform1f(u('u_cs'), Math.cos(delta));
    gl.uniform1f(u('u_sn'), Math.sin(delta));
    gl.uniform1f(u('u_opacity'), opacity);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  }

  function draw() {
    if (!ready) return;
    const w = (gl as unknown as { drawingBufferWidth: number }).drawingBufferWidth;
    const h = (gl as unknown as { drawingBufferHeight: number }).drawingBufferHeight;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthFunc(gl.LEQUAL);

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    gl.uniformMatrix4fv(u('u_proj'), false, proj);
    gl.uniform1f(u('u_camDist'), CAM_DIST);
    gl.uniform3f(u('u_pullC'), shared.pullX, shared.pullY, 0);
    gl.uniform3f(u('u_pullD'), pull.x, pull.y, 0);
    gl.uniform1f(u('u_pullR'), 0.42);
    gl.uniform3f(u('u_pokeC'), shared.pokeX, shared.pokeY, 0);
    gl.uniform1f(u('u_poke'), poke.v);
    gl.uniform3f(u('u_touchC'), shared.touchX, shared.touchY, shared.touchZ);
    gl.uniform1f(u('u_touchAmt'), touchAmt);
    gl.uniform1f(u('u_shade'), shade);

    // the two nearest keyframes: the closest is drawn solid, the next fades over it
    const ws = layers.map((l) => smoothstep(Math.PI * 0.31, Math.PI * 0.19, Math.abs(wrapAngle(spin - l.angle))));
    const order = ws.map((wgt, i) => [wgt, i] as const).sort((a, b) => b[0] - a[0]);
    const total = order[0][0] + order[1][0] || 1;
    dominant = layers[order[0][1]];
    drawLayer(dominant, 1, true);
    if (order[1][0] > 0.001) drawLayer(layers[order[1][1]], order[1][0] / total, false);
    present?.();
  }

  // ---- animation ---------------------------------------------------------------------------
  function step(dt: number) {
    spin += spinVel; spinVel *= Math.exp(-6 * dt);
    if (!drag && Date.now() - lastSpinInput > 350 && Math.abs(spinVel) < 0.01) {
      const nearest = Math.round(spin / (Math.PI / 2)) * (Math.PI / 2);
      spin += (nearest - spin) * Math.min(1, dt * 5);
    }
    const kk = pull.held ? 80 : 40, damp = pull.held ? 14 : 5.5;
    const decay = Math.exp(-damp * dt);
    pull.vx = (pull.vx + (pull.tx - pull.x) * kk * dt) * decay;
    pull.vy = (pull.vy + (pull.ty - pull.y) * kk * dt) * decay;
    pull.x += pull.vx * dt; pull.y += pull.vy * dt;
    poke.vel = (poke.vel + -150 * poke.v * dt) * Math.exp(-7 * dt);
    poke.v += poke.vel * dt;
    touchAmt += (touchTarget - touchAmt) * Math.min(1, dt * (touchTarget > touchAmt ? 14 : 4));
  }

  function settled() {
    const nearest = Math.round(spin / (Math.PI / 2)) * (Math.PI / 2);
    return !drag
      && Math.abs(spinVel) < 0.0005 && Math.abs(spin - nearest) < 0.002
      && Math.abs(pull.x) + Math.abs(pull.y) + Math.abs(pull.vx) + Math.abs(pull.vy) < 0.0008
      && Math.abs(poke.v) + Math.abs(poke.vel) < 0.002
      && touchAmt < 0.002;
  }

  function frame(now: number) {
    raf = null;
    if (disposed) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    step(dt);
    draw();
    if (settled()) { last = 0; return; }   // nothing is moving: stop drawing until the next touch
    raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (disposed || raf !== null) return;
    raf = requestAnimationFrame(frame);
  }

  // ---- input -------------------------------------------------------------------------------
  return {
    pointerDown(x, y) {
      const h = hit(x, y);
      if (h) {
        drag = { mode: 'body', x0: x, y0: y, lx: x, ly: y, t0: Date.now(), moved: 0, qx: h.qx, qy: h.qy };
        shared.pullX = h.qx; shared.pullY = h.qy; shared.touchX = h.qx; shared.touchY = h.qy; shared.touchZ = 0;
        pull.held = true; touchTarget = 1;
      } else {
        drag = { mode: 'orbit', x0: x, y0: y, lx: x, ly: y, t0: Date.now(), moved: 0, qx: 0, qy: 0 };
      }
      kick();
    },
    pointerMove(x, y) {
      if (!drag) return;
      if (drag.mode === 'orbit') {
        spinVel += (x - drag.lx) * -0.0045;
        drag.lx = x; drag.ly = y; lastSpinInput = Date.now();
      } else {
        drag.moved = Math.max(drag.moved, Math.hypot(x - drag.x0, y - drag.y0));
        let dx = (x - drag.x0) * worldPerPx, dy = -(y - drag.y0) * worldPerPx;
        const len = Math.hypot(dx, dy);
        if (len > 0.6) { dx *= 0.6 / len; dy *= 0.6 / len; }
        pull.tx = dx; pull.ty = dy;
        shared.touchX = drag.qx + dx; shared.touchY = drag.qy + dy;
      }
      kick();
    },
    pointerUp() {
      if (drag?.mode === 'body' && drag.moved < 8 && Date.now() - drag.t0 < 260) {
        shared.pokeX = drag.qx; shared.pokeY = drag.qy;
        poke.vel += 9;
      }
      drag = null; pull.held = false; pull.tx = 0; pull.ty = 0; touchTarget = 0;
      kick();
    },
    setSpin(radians) { spin = radians; spinVel = 0; kick(); },
    dispose() {
      disposed = true;
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      for (const view of Object.values(textures)) {
        if (view?.color) gl.deleteTexture(view.color);
        if (view?.height) gl.deleteTexture(view.height);
      }
      gl.deleteBuffer(uvBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteProgram(program);
    },
  };
}

export { configureTexture };
