// Locate scorer — the only module that reads the answer key (D7).
// Prints recall per image, every miss by name, then the overall number.
import { readFileSync } from "node:fs";
import { scoreImage } from "../src/recall.mjs";

const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
const runs = JSON.parse(readFileSync("corpus/out/locate.json", "utf8"));
const byName = new Map(runs.map((r) => [r.name, r]));

let planted = 0;
let hits = 0;
let broken = 0;

for (const im of key.images) {
  const run = byName.get(im.name);
  if (!run) {
    console.log(`${im.name}: NO RUN — cannot score`);
    planted += im.items.length;
    broken++;
    continue;
  }
  const s = scoreImage(im.items, run.boxes, run.w ?? key.viewport.w, run.h ?? key.viewport.h);
  planted += s.planted;
  hits += s.hits;
  const miss = s.misses.map((m) => `${m.category} "${m.value}" (${m.reason})`).join(", ");
  console.log(`${im.name}: recall ${s.recall.toFixed(2)} (${s.hits}/${s.planted})${miss ? ` misses: ${miss}` : ""}`);
  if (run.error) {
    console.log(`${im.name}: locate error ${run.error} — counted as misses`);
    broken++;
  }
}

const recall = planted ? hits / planted : 0;
console.log(`overall recall: ${recall.toFixed(3)} (${hits}/${planted})`);
process.exit(broken === 0 && planted > 0 ? 0 : 1);
