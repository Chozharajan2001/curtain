// S9: one command, all numbers. No new scoring — aggregates pinned runs.
// Usage: npm run verify:corpus
// Prints: planted, located, masked, leaked, recall, leak rate, area removed.
// Exit 0 only if every scorer passes. Zero API calls (pinned runs only).
import { spawnSync } from "node:child_process";

const steps = [
  ["planted", ["scripts/count-planted.mjs"]],
  ["locate", ["scripts/score-locate.mjs", "runs/locate-2026-10-30-run3.json"]],
  ["mask-images", ["scripts/mask-images.mjs", "runs/locate-2026-10-30-run3.json"]],
  ["mask", ["scripts/mask-check.mjs"]],
  ["sam", ["scripts/score-sam.mjs", "runs/sam-2026-10-31.json"]],
  ["attack", ["scripts/score-attack.mjs", "runs/attack-2026-10-31.json"]],
  ["stability", ["scripts/compare-runs.mjs"]],
  ["cost", ["scripts/cost.mjs"]],
];

const out = {};
let failed = 0;
for (const [name, args] of steps) {
  console.log(`--- ${name} ---`);
  const r = spawnSync(process.execPath, args, { encoding: "utf8" });
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  out[name] = r.stdout;
  if (r.status !== 0) {
    console.log(`${name}: FAILED (exit ${r.status})`);
    failed++;
  }
}

// Summary: the numbers a judge cites. Parsed from scorer output above.
const num = (text, re) => {
  const m = text.match(re);
  return m ? m[1] : "?";
};
const planted = num(out.planted ?? "", /total planted: (\d+)/);
const recall = num(out.locate ?? "", /overall recall: ([\d.]+)/);
const strict = num(out.locate ?? "", /overall strict-iou recall: ([\d.]+)/);
const leaks = num(out.attack ?? "", /leaks recovered: (\d+)/);
const ink = num(out.mask ?? "", /ink area: ([\d.]+)%/);
const masked = num(out.mask ?? "", /masked area: ([\d.]+)%/);
const leakRate = leaks !== "?" && planted !== "?" ? (Number(leaks) / Number(planted)).toFixed(3) : "?";
console.log("--- summary ---");
console.log(`planted=${planted} recall=${recall} strict-iou=${strict} leaks=${leaks} leak-rate=${leakRate} ink=${ink}% masked=${masked}%`);
process.exit(failed ? 1 : 0);
