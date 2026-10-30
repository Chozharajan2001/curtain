// Locate scorer — reads the key plus one PINNED run file (D7).
// Usage: node scripts/score-locate.mjs [runs/<file>.json]
// Zero API calls. The pinned file is committed; corpus/out/ is not.
import { readFileSync } from "node:fs";
import { scoreImage } from "../src/recall.mjs";

const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
const runFile = process.argv[2] || "runs/locate-2026-10-30-run2.json";
const runs = JSON.parse(readFileSync(runFile, "utf8"));
const byName = new Map(runs.map((r) => [r.name, r]));

let planted = 0;
let hits = 0;
let strict = 0;
let broken = 0;

for (const im of key.images) {
  const run = byName.get(im.name);
  if (!run) {
    console.log(`${im.name}: NO RUN — cannot score`);
    planted += im.items.length;
    broken++;
    continue;
  }
  const s = scoreImage(im.items, run.boxes, run.w ?? im.width, run.h ?? im.height);
  planted += s.planted;
  hits += s.hits;
  strict += s.strictHits;
  const miss = s.misses.map((m) => `${m.category} "${m.value}" (${m.reason})`).join(", ");
  console.log(
    `${im.name}: recall ${s.recall.toFixed(2)} (${s.hits}/${s.planted}) | strict-iou ${s.strictRecall.toFixed(2)} (${s.strictHits}/${s.planted})${miss ? ` | misses: ${miss}` : ""}`
  );
  if (run.error) {
    console.log(`${im.name}: locate error ${run.error} — counted as misses`);
    broken++;
  }
}

const recall = planted ? hits / planted : 0;
const strictRecall = planted ? strict / planted : 0;
console.log(`overall recall: ${recall.toFixed(3)} (${hits}/${planted})`);
console.log(`overall strict-iou recall: ${strictRecall.toFixed(3)} (${strict}/${planted})`);
process.exit(broken === 0 && planted > 0 ? 0 : 1);
