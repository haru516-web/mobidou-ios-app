import type { ImageSourcePropType } from 'react-native';

/**
 * Shared cheek-pull renderer. The same WebGL code drives the web canvas and the
 * expo-gl view on device: a soft spring mesh deforms the body art, and the
 * character's alpha silhouette is applied in the shader (smooth, never
 * binarized) so the outline stays clean while the body stretches.
 */
export type GL = WebGLRenderingContext;
export type PullTextureLoader = (gl: GL, source: ImageSourcePropType) => Promise<WebGLTexture | null>;

/** Local deformation of the body at a point: where it moved, and its 2x2 linear part. */
export type PullSample = { dx: number; dy: number; m11: number; m12: number; m21: number; m22: number };

export type PullMeshController = {
  begin: (x: number, y: number) => void;
  /** Deformation at a point in sprite coordinates (0..size), for pieces that ride the body. */
  sample: (x: number, y: number) => PullSample;
  update: (dx: number, dy: number) => void;
  release: () => void;
  reset: () => void;
  setSources: (body: ImageSourcePropType, mask?: ImageSourcePropType) => void;
  dispose: () => void;
};

export type PullMeshOptions = {
  size: number;
  padding: number;
  dpr: number;
  loadTexture: PullTextureLoader;
  /** Called after each draw (expo-gl needs `gl.endFrameEXP()`). */
  present?: () => void;
  /** Called after every draw, so overlays (eyes, buttons) can follow the body. */
  onFrame?: () => void;
  onError?: (error: unknown) => void;
};

// Mesh density and deformation envelope. The falloff radius is wide and the
// pull is soft-capped so the triangles never fold over while pulling hard.
const DIVISIONS = 24;
const PULL_RADIUS_RATIO = 0.45;
const SOFT_MAX_RATIO = 0.3;
const LEAN_RATIO = 0.1;

const VERTEX_SHADER = `
attribute vec2 a_pos;
attribute vec2 a_uv;
uniform vec2 u_res;
varying vec2 v_uv;
void main() {
  vec2 clip = vec2(a_pos.x / u_res.x * 2.0 - 1.0, 1.0 - a_pos.y / u_res.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  v_uv = a_uv;
}`;

const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform sampler2D u_body;
uniform sampler2D u_mask;
uniform float u_useMask;
void main() {
  vec4 c = texture2D(u_body, v_uv);
  float a = c.a;
  if (u_useMask > 0.5) {
    // Keep the silhouette's antialiasing, but drop the faint fringe left by
    // the exported art's checkerboard pixels.
    a *= smoothstep(0.3, 0.7, texture2D(u_mask, v_uv).a);
  }
  gl_FragColor = vec4(c.rgb * a, a);
}`;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

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

export function createPullMesh(gl: GL, options: PullMeshOptions): PullMeshController {
  const { size, padding, dpr, loadTexture, present, onFrame, onError } = options;
  const canvasSize = size + padding * 2;
  const count = (DIVISIONS + 1) * (DIVISIONS + 1);

  const program = gl.createProgram();
  if (!program) throw new Error('createProgram failed');
  const vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`program link failed: ${gl.getProgramInfoLog(program)}`);
  gl.useProgram(program);

  const posLocation = gl.getAttribLocation(program, 'a_pos');
  const uvLocation = gl.getAttribLocation(program, 'a_uv');
  gl.uniform2f(gl.getUniformLocation(program, 'u_res'), canvasSize, canvasSize);
  gl.uniform1i(gl.getUniformLocation(program, 'u_body'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'u_mask'), 1);
  const useMaskLocation = gl.getUniformLocation(program, 'u_useMask');

  const baseX = new Float32Array(count);
  const baseY = new Float32Array(count);
  const uvs = new Float32Array(count * 2);
  const positions = new Float32Array(count * 2);
  const offX = new Float32Array(count);
  const offY = new Float32Array(count);
  const velX = new Float32Array(count);
  const velY = new Float32Array(count);
  const tgtX = new Float32Array(count);
  const tgtY = new Float32Array(count);
  const weight = new Float32Array(count);
  const lean = new Float32Array(count);
  const gate = new Float32Array(count);
  const indices = new Uint16Array(DIVISIONS * DIVISIONS * 6);

  for (let row = 0; row <= DIVISIONS; row += 1) {
    for (let column = 0; column <= DIVISIONS; column += 1) {
      const index = row * (DIVISIONS + 1) + column;
      const u = column / DIVISIONS;
      const v = row / DIVISIONS;
      baseX[index] = u * size;
      baseY[index] = v * size;
      uvs[index * 2] = u;
      uvs[index * 2 + 1] = v;
      // Soft body gate (superellipse) instead of an on/off test, so vertices
      // near the silhouette ease in rather than tearing away from neighbours.
      const level = ((u - 0.5) / 0.47) ** 6 + ((v - 0.48) / 0.49) ** 6;
      gate[index] = 1 - smoothstep(0.85, 1.25, level);
      // The top of the body follows the pull a little; the feet stay planted.
      lean[index] = LEAN_RATIO * (1 - v);
    }
  }
  let cursor = 0;
  for (let row = 0; row < DIVISIONS; row += 1) {
    for (let column = 0; column < DIVISIONS; column += 1) {
      const a = row * (DIVISIONS + 1) + column;
      const b = a + 1;
      const c = a + DIVISIONS + 1;
      const d = c + 1;
      indices[cursor++] = a; indices[cursor++] = b; indices[cursor++] = c;
      indices[cursor++] = b; indices[cursor++] = d; indices[cursor++] = c;
    }
  }

  const positionBuffer = gl.createBuffer();
  const uvBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(uvLocation);
  gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(posLocation);
  gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.viewport(0, 0, Math.round(canvasSize * dpr), Math.round(canvasSize * dpr));
  gl.clearColor(0, 0, 0, 0);

  let bodyTexture: WebGLTexture | null = null;
  let maskTexture: WebGLTexture | null = null;
  let wantsMask = false;
  let sourceToken = 0;
  let frame = 0;
  let dragging = false;
  let lastAt = 0;
  let disposed = false;

  const draw = () => {
    if (disposed || !bodyTexture || (wantsMask && !maskTexture)) return;
    for (let index = 0; index < count; index += 1) {
      positions[index * 2] = baseX[index] + offX[index] + padding;
      positions[index * 2 + 1] = baseY[index] + offY[index] + padding;
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bodyTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, maskTexture ?? bodyTexture);
    gl.uniform1f(useMaskLocation, wantsMask ? 1 : 0);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    present?.();
    onFrame?.();
  };

  const offsetAt = (px: number, py: number) => {
    const gx = clamp(px / size * DIVISIONS, 0, DIVISIONS - 1e-4);
    const gy = clamp(py / size * DIVISIONS, 0, DIVISIONS - 1e-4);
    const column = Math.floor(gx);
    const row = Math.floor(gy);
    const fx = gx - column;
    const fy = gy - row;
    const i00 = row * (DIVISIONS + 1) + column;
    const i10 = i00 + 1;
    const i01 = i00 + DIVISIONS + 1;
    const i11 = i01 + 1;
    const mix = (a: Float32Array) => (a[i00] * (1 - fx) + a[i10] * fx) * (1 - fy) + (a[i01] * (1 - fx) + a[i11] * fx) * fy;
    return { x: mix(offX), y: mix(offY) };
  };

  const tick = (now: number) => {
    const delta = Math.min((now - lastAt) / 1000, 0.034);
    lastAt = now;
    const steps = Math.max(1, Math.ceil(delta / (1 / 120)));
    const step = delta / steps;
    // Following the finger is snappy and well damped; letting go is loose and
    // underdamped, so the cheek wobbles back like jelly.
    const stiffness = dragging ? 260 : 170;
    const damping = dragging ? 17 : 6.2;
    const limit = size * 0.5;
    let settling = false;
    for (let s = 0; s < steps; s += 1) {
      const decay = Math.exp(-step * damping);
      for (let index = 0; index < count; index += 1) {
        velX[index] = (velX[index] + (tgtX[index] - offX[index]) * stiffness * step) * decay;
        velY[index] = (velY[index] + (tgtY[index] - offY[index]) * stiffness * step) * decay;
        offX[index] = clamp(offX[index] + velX[index] * step, -limit, limit);
        offY[index] = clamp(offY[index] + velY[index] * step, -limit, limit);
        if (Math.abs(offX[index] - tgtX[index]) > 0.05 || Math.abs(offY[index] - tgtY[index]) > 0.05
          || Math.abs(velX[index]) > 0.5 || Math.abs(velY[index]) > 0.5) settling = true;
      }
    }
    draw();
    frame = dragging || settling ? requestAnimationFrame(tick) : 0;
  };

  const start = () => {
    if (frame || disposed) return;
    lastAt = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const clearAll = () => {
    offX.fill(0); offY.fill(0); velX.fill(0); velY.fill(0); tgtX.fill(0); tgtY.fill(0);
  };

  const deleteTextures = () => {
    if (bodyTexture) gl.deleteTexture(bodyTexture);
    if (maskTexture) gl.deleteTexture(maskTexture);
    bodyTexture = null;
    maskTexture = null;
  };

  return {
    sample(px, py) {
      const h = size * 0.03;
      const center = offsetAt(px, py);
      const right = offsetAt(px + h, py);
      const left = offsetAt(px - h, py);
      const down = offsetAt(px, py + h);
      const up = offsetAt(px, py - h);
      return {
        dx: center.x,
        dy: center.y,
        m11: 1 + (right.x - left.x) / (2 * h),
        m21: (right.y - left.y) / (2 * h),
        m12: (down.x - up.x) / (2 * h),
        m22: 1 + (down.y - up.y) / (2 * h),
      };
    },
    begin(x, y) {
      const originX = clamp(x, 0, size);
      const originY = clamp(y, 0, size);
      const radius = size * PULL_RADIUS_RATIO;
      for (let index = 0; index < count; index += 1) {
        const t = clamp(1 - Math.hypot(baseX[index] - originX, baseY[index] - originY) / radius, 0, 1);
        // Cosine falloff: the gentlest slope for a given reach, so it can't fold.
        weight[index] = (0.5 - 0.5 * Math.cos(Math.PI * t)) * gate[index];
      }
      dragging = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clearAll();
      draw();
    },
    update(dx, dy) {
      const distance = Math.hypot(dx, dy);
      const softMax = size * SOFT_MAX_RATIO;
      // Rubber band: the further you pull, the harder it resists.
      const effective = distance > 0 ? softMax * Math.tanh(distance / softMax) : 0;
      const ratio = distance > 0 ? effective / distance : 0;
      const ox = dx * ratio;
      const oy = dy * ratio;
      for (let index = 0; index < count; index += 1) {
        const follow = weight[index] + lean[index];
        tgtX[index] = ox * follow;
        tgtY[index] = oy * follow;
      }
      start();
    },
    release() {
      dragging = false;
      tgtX.fill(0);
      tgtY.fill(0);
      start();
    },
    reset() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      dragging = false;
      clearAll();
      draw();
    },
    setSources(body, mask) {
      const token = sourceToken += 1;
      wantsMask = !!mask;
      Promise.all([loadTexture(gl, body), mask ? loadTexture(gl, mask) : Promise.resolve(null)]).then(([bodyNext, maskNext]) => {
        if (disposed || token !== sourceToken) {
          if (bodyNext) gl.deleteTexture(bodyNext);
          if (maskNext) gl.deleteTexture(maskNext);
          return;
        }
        deleteTextures();
        bodyTexture = bodyNext;
        maskTexture = maskNext;
        draw();
      }).catch(error => onError?.(error));
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      deleteTextures();
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(uvBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    },
  };
}

/** Shared texture setup: clamped, smooth, mipmapped when the context allows. */
export function configureTexture(gl: GL) {
  const isGL2 = typeof (gl as unknown as { texStorage2D?: unknown }).texStorage2D === 'function';
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (isGL2) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
}
