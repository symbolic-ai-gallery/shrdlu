import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createEngine } from "../src/engine/generated/legacy";
import { createGroundedEngine } from "../src/engine/grounded";
import { elbowPosition, sampleMotion } from "../src/components/motion";
import type { World } from "../src/engine/types";

beforeAll(() => vi.spyOn(console, "log").mockImplementation(() => {}));
afterAll(() => vi.restoreAllMocks());

it("clears the obstructing pyramid before grasping the cube, with contact and release phases", () => {
  const resources = Object.fromEntries(
    ["shrdluontology.xml", "nlpatternrules.xml", "blocksworld-kb.xml"].map(
      (name) => [name, readFileSync(`public/engine/${name}`, "utf8")],
    ),
  );
  const engine = createGroundedEngine(createEngine(resources));
  const initial = engine.snapshot();
  engine.submit("Pick up the red cube.");
  const frames: World[] = [];
  for (let count = 0; count < 100 && !engine.step(); count++)
    frames.push(engine.snapshot());
  expect(frames.map((frame) => frame.motion?.phase)).toEqual([
    "approach",
    "descend",
    "grasp",
    "lift",
    "transfer",
    "lower",
    "release",
    "retreat",
    "approach",
    "descend",
    "grasp",
    "lift",
  ]);
  const pyramid = frames[0].motion!.objectId;
  const object = (frame: World, id = pyramid) =>
    frame.objects.find((b) => b.ID === id)!;
  for (const frame of frames.slice(0, 3)) {
    expect(object(frame)).toEqual(object(initial));
    expect(frame.held).toBeNull();
  }
  expect(frames[3].held).toBe(pyramid);
  expect(object(frames[3]).y).toBeGreaterThan(object(initial).y);
  expect(frames[6].held).toBeNull();
  expect(object(frames[7])).toEqual(object(frames[6]));
  expect(engine.snapshot().held).toBe(frames[11].motion!.objectId);
  expect(engine.snapshot().motion).toBeUndefined();

  // A carried block follows the same curved path as the wrist, with no slipping.
  const from = frames[3],
    to = frames[4];
  const offset = (world: World) => {
    const arm = world.objects.find((b) => b.type === "arm")!,
      block = object(world);
    return [arm.x - block.x, arm.y - block.y, arm.z - block.z];
  };
  expect(sampleMotion(from, to, 0).objects).toEqual(from.objects);
  for (const fraction of [0.25, 0.5, 0.75, 1]) {
    const sampled = sampleMotion(from, to, fraction);
    offset(sampled).forEach((value, i) =>
      expect(value).toBeCloseTo(offset(from)[i]),
    );
  }
  expect(object(sampleMotion(from, to, 0.5)).y).toBeGreaterThan(
    Math.max(object(from).y, object(to).y),
  );
  expect(object(sampleMotion(from, to, 1)).x).toBeCloseTo(object(to).x);
});

it("keeps both articulated arm segments at their fixed lengths across reachable poses", () => {
  const shoulder = [-7, 10, 18];
  for (const wrist of [
    [14, 34, 18],
    [3, 15, 8],
    [33, 45, 33],
    [25, 7, 25],
  ]) {
    const elbow = elbowPosition(shoulder, wrist);
    const distance = (a: number[], b: number[]) =>
      Math.hypot(...a.map((v, i) => v - b[i]));
    expect(distance(shoulder, elbow)).toBeCloseTo(35);
    expect(distance(elbow, wrist)).toBeCloseTo(36);
  }
});
