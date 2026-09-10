import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { build } from "esbuild";
const root = "vendor/shrdlu/src/";
const core = [
  "auxiliar/auxiliar.ts",
  "auxiliar/auxiliar-gfx.ts",
  "auxiliar/Expression.ts",
  "ai/Sort.ts",
  "ai/Ontology.ts",
  "ai/Term.ts",
  "ai/Sentence.ts",
  "ai/Inference.ts",
  "ai/TermContainer.ts",
  "ai/SentenceContainer.ts",
  "ai/AIDates.ts",
  "ai/nlp/NLPos.ts",
  "ai/nlp/NLPatternRule.ts",
  "ai/nlp/NLPattern.ts",
  "ai/nlp/NLParser.ts",
  "ai/nlp/CompiledNLPatternRules.ts",
  "ai/nlp/NLContext.ts",
  "ai/nlp/nlg.ts",
  "ai/TimeInference.ts",
  "ai/RuleBasedAI.ts",
];
for (const dir of ["ai/actions", "ai/inferences", "blocksworld"]) {
  for (const file of (await readdir(root + dir)).sort()) {
    if (
      file.endsWith(".ts") &&
      !["main.ts", "BlocksWorldApp.ts"].includes(file)
    )
      core.push(dir + "/" + file);
  }
}
// The upstream sources use a shared script scope. Preserve it inside an ESM boundary.
const source =
  (await Promise.all(core.map((f) => readFile(root + f, "utf8")))).join("\n") +
  "\n" +
  (await readFile("scripts/engine-bridge.ts", "utf8"));
await mkdir("src/engine/generated", { recursive: true });
await build({
  stdin: { contents: source, loader: "ts", resolveDir: process.cwd() },
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: "src/engine/generated/legacy.js",
  logLevel: "warning",
});
await writeFile(
  "src/engine/generated/legacy.d.ts",
  `import type { Engine, Resources } from '../types';\nexport function createEngine(resources: Resources): Engine;\n`,
);
console.log("Bundled " + core.length + " upstream TypeScript files.");
