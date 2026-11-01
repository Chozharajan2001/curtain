// E7: variance over N pinned locate runs. Zero API calls.
// Usage: npm run variance
// Prints min/median/max recall, plus hit-in-all-runs and hit-in-any-run.
import { readFileSync, existsSync } from "node:fs";
import { scoreImage } from "../src/recall.mjs";

const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
const RUNS = [
  "runs/locate-2026-10-30-run2.json",
  "runs/locate-2026-10-30-run3.json",
  "runs/locate-2026-10-31-run4.json",
].filter((f) => existsSync(f));

if (RUNS.length < 2) {
  console.log(`variance: unverified — need >= 2 pinned runs, found ${RUNS.length}`);
  process.exit(1);
}

const runs = RUNS.map((f) => JSON.parse(readFileSync(f, "utf8")));
const recalls = runs.map((r) => {
  let hits = 0;
  let planted = 0;
  for (const im of key.images) {
    const run = r.find((x) => x.name === im.name);
    const s = scoreImage(im.items, run.boxes, run.w, run.h);
    hits += s.hits;
    planted += s.planted;
  }
  return hits / planted;
});

let all = 0;
let any = 0;
let planted = 0;
const never = [];
for (const im of key.images) {
  const per = runs.map((r) => {
    const run = r.find((x) => x.name === im.name);
    return new Map(run.boxes.map((b) => [b.category, b]));
  });
  for (const it of im.items) {
    planted++;
    const hits = per.map((m) => {
      const b = m.get(it.category);
      return scoreImage([it], b ? [b] : [], im.width, im.height).hits > 0;
    });
    if (hits.every(Boolean)) all++;
    if (hits.some(Boolean)) any++;
    if (!hits.some(Boolean)) never.push(`${im.name} ${it.category} ${JSON.stringify(it.value)}`);
  }
}

const sorted = [...recalls].sort((a, b) => a - b);
const median =
  sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

console.log(`runs=${recalls.length} ${recalls.map((r) => r.toFixed(3)).join(" ")}`);
console.log(`min=${sorted[0].toFixed(3)} median=${median.toFixed(3)} max=${sorted[sorted.length - 1].toFixed(3)}`);
console.log(`hit in every run: ${all}/${planted} (${(all / planted).toFixed(3)})`);
console.log(`hit in any run:   ${any}/${planted} (${(any / planted).toFixed(3)})`);
console.log("never found:");
for (const n of never) console.log(`  ${n}`);
