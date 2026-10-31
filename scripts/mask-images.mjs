// S5 runner: mask every corpus image with run3 located boxes.
// Reads runs/locate-*.json, never the key (D7). Output: corpus/out/masked/.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { maskImage, MARGIN } from "../src/mask.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runFile = process.argv[2] || "runs/locate-2026-10-30-run3.json";
const runs = JSON.parse(readFileSync(join(root, runFile), "utf8"));
const outDir = join(root, "corpus/out/masked");
mkdirSync(outDir, { recursive: true });

const manifest = [];
for (const r of runs) {
  const input = readFileSync(join(root, "corpus/img", `${r.name}.png`));
  const out = await maskImage(input, r.boxes.map((b) => b.box), MARGIN);
  writeFileSync(join(outDir, `${r.name}.png`), out);
  manifest.push({ name: r.name, boxes: r.boxes.length, margin: MARGIN, bytes: out.length });
  console.log(`${r.name}: masked ${r.boxes.length} boxes, ${out.length} bytes`);
}
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
