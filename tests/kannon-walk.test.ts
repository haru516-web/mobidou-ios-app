import assert from "node:assert/strict";
import test from "node:test";
import { floorLift, KANNON_BOUNDS, KANNON_SPAWN, moveVector, nearShrineFront, pushOut, walk } from "../src/data/kannonWalk.ts";

test("the start point is free ground", () => {
  const p = pushOut(KANNON_SPAWN.x, KANNON_SPAWN.z);
  assert.ok(Math.hypot(p.x - KANNON_SPAWN.x, p.z - KANNON_SPAWN.z) < 1e-6);
});

test("the player can walk from the start through the gate and onto the hall floor by the stair", () => {
  let p: { x: number; z: number } = { x: KANNON_SPAWN.x, z: KANNON_SPAWN.z };
  for (let i = 0; i < 400; i++) p = walk(p.x, p.z, 0, -0.1);
  assert.ok(p.z < -7.0, `walked straight through to z=${p.z}`);
  assert.ok(floorLift(p.x, p.z) > 0.55);
  assert.ok(nearShrineFront(p.x, p.z));
});

test("ponds, gate walls and the platform edge stop the player, and sliding along them still works", () => {
  const pond = walk(5, 3, 0, 8);                     // toward the left pond from the paving
  assert.ok(!(pond.x > 3.2 && pond.x < 12 && pond.z > 5.6 && pond.z < 16.4));
  const wall = walk(8, 5, 0, -6);                    // straight at the precinct wall
  assert.ok(wall.z > 2.0, `stopped before the wall at z=${wall.z}`);
  const edge = walk(6, -3, 0, -6);                   // at the platform front, beside the stair
  assert.ok(edge.z > -5.4, `stopped at the platform edge z=${edge.z}`);
  const slid = walk(6, -3, 2, -6);
  assert.ok(slid.x > 6.5, "slides along the edge instead of sticking");
});

test("the world edge holds", () => {
  const p = walk(0, 0, 400, -400);
  assert.ok(p.x <= KANNON_BOUNDS.x1 && p.z >= KANNON_BOUNDS.z0);
});

test("the offering box and the throne are solid", () => {
  const box = walk(0, -7, 0, -3);
  assert.ok(box.z > -7.5 + 0.3 - 0.01, `stopped at the offering box z=${box.z}`);
  const throne = walk(5, -12, -5, -3);
  assert.ok(Math.hypot(throne.x, throne.z + 14.4) >= 3.1 + 0.3 - 0.02);
});

test("moving forward follows the look direction", () => {
  const a = moveVector(0, 1, 0, 2);
  assert.ok(Math.abs(a.dx) < 1e-9 && Math.abs(a.dz + 2) < 1e-9);
  const b = moveVector(Math.PI / 2, 1, 0, 2);              // turned left: forward is -x
  assert.ok(Math.abs(b.dx + 2) < 1e-9 && Math.abs(b.dz) < 1e-9);
  const c = moveVector(0, 0, 1, 2);                         // right is +x
  assert.ok(Math.abs(c.dx - 2) < 1e-9);
});

test("the ritual buttons belong to the front of the hall only", () => {
  assert.equal(nearShrineFront(0, 15), false);
  assert.equal(nearShrineFront(0, 1.5), false);
  assert.equal(nearShrineFront(0, -6.5), true);
  assert.equal(nearShrineFront(0, -4.5), true);
});
