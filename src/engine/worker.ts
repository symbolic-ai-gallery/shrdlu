import { createEngine } from "./generated/legacy";
import { createGroundedEngine } from "./grounded";
import type { Engine, Resources } from "./types";
let engine: Engine,
  busy = false,
  waitingFor: number | null = null,
  sequence = 0,
  computeMs = 0;
console.log = () => {};
function fail(error: unknown) {
  busy = false;
  waitingFor = null;
  self.postMessage({ type: "error", message: String(error) });
}
function advance() {
  try {
    const started = performance.now();
    const done = engine.step();
    computeMs += performance.now() - started;
    if (computeMs > 30000)
      throw new Error("Reasoning exceeded its time budget. Reset to continue.");
    const frameId = ++sequence;
    waitingFor = done ? null : frameId;
    self.postMessage({
      type: done ? "done" : "state",
      world: { ...engine.snapshot(), frameId },
      messages: engine.drain(),
    });
    if (done) busy = false;
  } catch (error) {
    fail(error);
  }
}
self.onmessage = async (
  event: MessageEvent<{
    type: string;
    text?: string;
    base?: string;
    frameId?: number;
  }>,
) => {
  try {
    if (event.data.type === "init") {
      const resources: Resources = {};
      await Promise.all(
        ["shrdluontology.xml", "nlpatternrules.xml", "blocksworld-kb.xml"].map(
          async (name) => {
            const response = await fetch(`${event.data.base}engine/${name}`);
            if (!response.ok)
              throw new Error(`Cannot load ${name}: ${response.status}`);
            resources[name] = await response.text();
          },
        ),
      );
      engine = createGroundedEngine(createEngine(resources));
      self.postMessage({
        type: "ready",
        world: { ...engine.snapshot(), frameId: 0 },
        messages: engine.drain(),
      });
    } else if (event.data.type === "submit" && engine && !busy) {
      busy = true;
      computeMs = 0;
      const started = performance.now();
      engine.submit(event.data.text!);
      computeMs += performance.now() - started;
      advance();
    } else if (
      event.data.type === "ack" &&
      busy &&
      event.data.frameId === waitingFor
    ) {
      // Back-pressure: the next logical pose cannot overwrite an unfinished animation.
      waitingFor = null;
      advance();
    }
  } catch (error) {
    fail(error);
  }
};
