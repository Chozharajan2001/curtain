// Stability over pinned locate runs. Zero API calls.
// Usage: node scripts/compare-runs.mjs [runA] [runB]
import { readFileSync } from "node:fs";
import { scoreImage } from "../src/recall.mjs";

const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
const a = JSON.parse(
  readFileSync(process.argv[2] || "runs/locate-2026-10-30-run2.json", "utf8")
);
const b = JSON.parse(
  readFileSync(process.argv[3] || "runs/locate-2026-10-30-run3.json", "utf8")
);

let every = 0;
let either = 0;
let planted = 0;
const never = [];
const flip = [];
for (const im of key.images) {
  const ra = a.find((r) => r.name === im.name);
  const rb = b.find((r) => r.name === im.name);
  const ba = new Map((ra ? ra.boxes : []).map((x) => [x.category, x]));
  const bb = new Map((rb ? rb.boxes : []).map((x) => [x.category, x]));
  for (const it of im.items) {
    planted++;
    const sa = scoreImage([it], ba.has(it.category) ? [ba.get(it.category)] : [], im.width, im.height);
    const sb = scoreImage([it], bb.has(it.category) ? [bb.get(it.category)] : [], im.width, im.height);
    const ha = sa.hits > 0;
    const hb = sb.hits > 0;
    if (ha && hb) every++;
    if (ha || hb) either++;
    if (!ha && !hb) never.push(`${im.name} ${it.category} ${JSON.stringify(it.value)}`);
    if (ha !== hb) flip.push(`${im.name} ${it.category} runA=${ha} runB=${hb}`);
  }
}
console.log(`every-run: ${(every / planted).toFixed(3)} (${every}/${planted})`);
console.log(`either-run: ${(either / planted).toFixed(3)} (${either}/${planted})`);
console.log("never covered:");
for (const n of never) console.log(`  ${n}`);
console.log("flip-flopping:");
for (const f of flip) console.log(`  ${f}`);
