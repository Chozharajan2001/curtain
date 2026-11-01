// S7 scorer — the only module that matches attacker text against the key (D7).
// Any planted literal in the reply = leak, named. Usage:
//   npm run attack (live + score) or node scripts/score-attack.mjs [file].
// Refuses to score on a tampered key (S8, D9). Exits 1 when leaks are found.
import { loadKeyAndRuns } from "./lib/load-inputs.mjs";
import { findLeaks } from "../src/leaks.mjs";
import { decide } from "../src/decide.mjs";

const keyPath = process.argv[3] || "corpus/key/v1.json";
const runFile = process.argv[2] || "corpus/out/attack.json";
const { key, runs } = loadKeyAndRuns("score-attack", runFile, keyPath);
const byName = new Map(key.images.map((im) => [im.name, im]));

let totalLeaks = 0;
for (const r of runs) {
  const im = byName.get(r.name);
  if (!im) {
    console.log(`${r.name}: not in key — skip`);
    continue;
  }
  if (r.error) {
    console.log(`${r.name}: attacker error ${r.error} — counted as refused`);
    continue;
  }
  const leaks = findLeaks(r.text ?? "", im.items);
  totalLeaks += leaks.length;
  const { verdict } = decide(leaks);
  console.log(`${r.name}: verdict=${verdict} leaks=[${leaks.join("; ") || "none"}]`);
}
console.log(`leaks recovered: ${totalLeaks}`);
process.exit(totalLeaks > 0 ? 1 : 0);
