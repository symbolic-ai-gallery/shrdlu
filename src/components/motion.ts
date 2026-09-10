import type { World } from "../engine/types";
export const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export function sampleMotion(from: World, to: World, progress: number): World {
  const t = smooth(Math.max(0, Math.min(1, progress)));
  const arc = to.motion?.phase === "transfer" ? Math.sin(Math.PI * t) * 3 : 0;
  return {
    ...to,
    objects: to.objects.map((b) => {
      const a = from.objects.find((o) => o.ID === b.ID) ?? b;
      const lifted = arc && (b.type === "arm" || b.ID === to.held) ? arc : 0;
      return {
        ...b,
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t + lifted,
        z: a.z + (b.z - a.z) * t,
      };
    }),
  };
}
// Analytic two-bone IK in the vertical plane through shoulder and target.
export function elbowPosition(
  shoulder: readonly number[],
  target: readonly number[],
  upper = 35,
  forearm = 36,
): [number, number, number] {
  const dx = target[0] - shoulder[0],
    dz = target[2] - shoulder[2],
    dy = target[1] - shoulder[1],
    radius = Math.hypot(dx, dz);
  const distance = Math.min(
    upper + forearm - 0.001,
    Math.max(0.001, Math.hypot(radius, dy)),
  );
  const angle =
    Math.atan2(dy, radius) +
    Math.acos(
      Math.max(
        -1,
        Math.min(
          1,
          (upper * upper + distance * distance - forearm * forearm) /
            (2 * upper * distance),
        ),
      ),
    );
  return [
    shoulder[0] + (dx / Math.max(0.001, radius)) * upper * Math.cos(angle),
    shoulder[1] + upper * Math.sin(angle),
    shoulder[2] + (dz / Math.max(0.001, radius)) * upper * Math.cos(angle),
  ];
}
