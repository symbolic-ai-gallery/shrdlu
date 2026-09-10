import fs from "node:fs";
import { createGroundedEngine } from "../src/engine/grounded.ts";
import { createEngine } from "../src/engine/generated/legacy.js";
const print = console.log;
console.log = () => {};
console.warn = () => {};
console.error = () => {};
const resources = Object.fromEntries(
  ["shrdluontology.xml", "nlpatternrules.xml", "blocksworld-kb.xml"].map(
    (f) => [f, fs.readFileSync("public/engine/" + f, "utf8")],
  ),
);
const e = process.argv.includes("--upstream")
  ? createEngine(resources)
  : createGroundedEngine(createEngine(resources));
const classic = JSON.parse(fs.readFileSync("src/engine/classic.json", "utf8"));
const results = [];
for (const [index, t] of classic.entries()) {
  const started = Date.now();
  let steps = 0;
  let error = null;
  try {
    e.submit(t.en);
    while (steps++ < 10000) {
      if (e.step()) break;
      if (Date.now() - started > 10000) {
        error = "Timeout";
        break;
      }
    }
  } catch (err) {
    error = String(err);
  }
  const actual = e.drain();
  const row = {
    turn: index + 1,
    input: t.en,
    expected: t.answer,
    actual,
    error,
    held: e.snapshot().held,
  };
  results.push(row);
  print(JSON.stringify(row));
  if (error) break;
}
fs.writeFileSync(
  process.argv.includes("--upstream")
    ? "documents/upstream-audit.json"
    : "documents/compatibility-audit.json",
  JSON.stringify(results, null, 2),
);
