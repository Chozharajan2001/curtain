// Mask runner: run3 located boxes, with SAM tight boxes swapped in where SAM
// found an object (S6). Reads runs/ + corpus/out/sam.json, never the key (D7).
// Output: corpus/out/masked/.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { maskImage, MARGIN } from "../src/mask.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runFile = process.argv[2] || "runs/locate-2026-10-30-run3.json";
const runs = JSON.parse(readFileSync(join(root, runFile), "utf8"));
// SAM boxes replace grounding boxes for the same category (tighter, no margin needed).
let samByImg = new Map();
const samPath = join(root, "corpus/out/sam.json");
if (existsSync(samPath)) {
  for (const s of JSON.parse(readFileSync(samPath, "utf8"))) {
    if (s.box) samByImg.set(`${s.name}:${s.kind}`, s.box);
  }
}
const outDir = join(root, "corpus/out/masked");
mkdirSync(outDir, { recursive: true });

const manifest = [];
for (const r of runs) {
  const input = readFileSync(join(root, "corpus/img", `${r.name}.png`));
  const boxes = [];
  let samUsed = 0;
  for (const b of r.boxes) {
    const sb = samByImg.get(`${r.name}:${b.category}`);
    if (sb) {
      boxes.push({ box: sb, margin: 4 });
      samUsed++;
    } else {
      boxes.push({ box: b.box, margin: MARGIN });
    }
  }
  const out = await maskImage(input, boxes);
  writeFileSync(join(outDir, `${r.name}.png`), out);
  manifest.push({ name: r.name, boxes: r.boxes.length, samUsed, margin: MARGIN, bytes: out.length });
  console.log(`${r.name}: masked ${r.boxes.length} boxes, ${out.length} bytes`);
}
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
