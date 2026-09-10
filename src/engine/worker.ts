import { createEngine } from "./generated/legacy";
import { createGroundedEngine } from "./grounded";
import type { Engine, Resources } from "./types";
let engine: Engine;
let busy = false;
// Upstream traces are extremely verbose; keep errors, but do not flood devtools.
console.log = () => {};
self.onmessage = async (
  event: MessageEvent<{ type: string; text?: string; base?: string }>,
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
        world: engine.snapshot(),
        messages: engine.drain(),
      });
    } else if (event.data.type === "submit" && engine && !busy) {
      busy = true;
      engine.submit(event.data.text!);
      const started = performance.now();
      const tick = () => {
        try {
          let idle = false;
          const batch = performance.now();
          for (let i = 0; i < 1 && performance.now() - batch < 25; i++) {
            if (engine.step()) {
              idle = true;
              break;
            }
          }
          self.postMessage({
            type: idle ? "done" : "state",
            world: engine.snapshot(),
            messages: engine.drain(),
          });
          if (idle) busy = false;
          else if (performance.now() - started > 30000)
            throw new Error(
              "Planning exceeded 30 seconds. Reset the world to continue.",
            );
          else setTimeout(tick, 16);
        } catch (error) {
          busy = false;
          self.postMessage({ type: "error", message: String(error) });
        }
      };
      tick();
    }
  } catch (error) {
    busy = false;
    self.postMessage({ type: "error", message: String(error) });
  }
};
