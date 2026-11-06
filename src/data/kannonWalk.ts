import { KANNON_CIRCLES, KANNON_RECTS } from './kannonColliders.ts';

/** Free-roam walking in the 願い観音もび寺 world. All distances are metres; x is right, -z is toward the hall. */
export const KANNON_BOUNDS = { x0: -26.5, z0: -27, x1: 26.5, z1: 19 } as const;
export const KANNON_SPAWN = { x: 0, z: 15.6, yaw: 0 } as const;
export const PLAYER_RADIUS = 0.32;
export const EYE_HEIGHT = 0.72;
/** Height of the hall floor above the ground. */
export const HALL_LIFT = 0.6;
/** Where bowing and clapping appear: in front of the hall's offering box. */
export const SHRINE_FRONT = { x: 0, z: -7.4, radius: 4.2 } as const;

/** Moves a circle of the player's size out of everything it overlaps (two passes settle corners). */
export function pushOut(x: number, z: number, radius = PLAYER_RADIUS): { x: number; z: number } {
  let px = x, pz = z;
  for (let pass = 0; pass < 3; pass++) {
    for (const [cx, cz, r] of KANNON_CIRCLES) {
      const dx = px - cx, dz = pz - cz, min = r + radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 1e-4;
      px = cx + dx / d * min; pz = cz + dz / d * min;
    }
    for (const [x0, z0, x1, z1] of KANNON_RECTS) {
      const nx = Math.max(x0, Math.min(px, x1)), nz = Math.max(z0, Math.min(pz, z1));
      const dx = px - nx, dz = pz - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        px = nx + dx / d * radius; pz = nz + dz / d * radius;
      } else {   // centre is inside the rectangle: leave by the nearest side
        const left = px - x0, right = x1 - px, back = pz - z0, front = z1 - pz;
        const m = Math.min(left, right, back, front);
        if (m === left) px = x0 - radius; else if (m === right) px = x1 + radius; else if (m === back) pz = z0 - radius; else pz = z1 + radius;
      }
    }
    px = Math.max(KANNON_BOUNDS.x0, Math.min(px, KANNON_BOUNDS.x1));
    pz = Math.max(KANNON_BOUNDS.z0, Math.min(pz, KANNON_BOUNDS.z1));
  }
  return { x: px, z: pz };
}

/** Walks from (x, z) by (dx, dz), sliding along whatever is in the way, in steps small enough never to jump a wall. */
export function walk(x: number, z: number, dx: number, dz: number): { x: number; z: number } {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  let px = x, pz = z;
  for (let i = 0; i < steps; i++) {
    const next = pushOut(px + dx / steps, pz + dz / steps);
    px = next.x; pz = next.z;
  }
  return { x: px, z: pz };
}

/** How far the eye is raised: up the three stair steps, then on the hall floor. */
export function floorLift(x: number, z: number): number {
  if (z <= -5.45 && Math.abs(x) <= 8.6 && z >= -17.4) return HALL_LIFT;
  if (Math.abs(x) <= 3.2 && z > -5.45 && z < -3.7) return HALL_LIFT * (-3.7 - z) / 1.75;
  return 0;
}

export function nearShrineFront(x: number, z: number): boolean {
  return Math.hypot(x - SHRINE_FRONT.x, z - SHRINE_FRONT.z) <= SHRINE_FRONT.radius && z <= -3.7;
}

/** Look direction as seen by the camera: yaw 0 faces -z (toward the hall). */
export function moveVector(yaw: number, forward: number, right: number, distance: number) {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  return { dx: (fx * forward + rx * right) * distance, dz: (fz * forward + rz * right) * distance };
}
