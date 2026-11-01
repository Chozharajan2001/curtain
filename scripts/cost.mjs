// Cost command: sums usage.jsonl. One real command for E9 (AGENTS rule 3).
// Usage: npm run cost  (or: node scripts/cost.mjs)
import { readFileSync, existsSync } from "node:fs";

if (!existsSync("usage.jsonl")) {
  console.log("calls=0 usd=0.0000");
  process.exit(0);
}
const lines = readFileSync("usage.jsonl", "utf8").trim().split("\n").filter(Boolean);
let sum = 0;
let product = 0;
let probe = 0;
let unpriced = 0;
for (const l of lines) {
  const r = JSON.parse(l);
  if (typeof r.usd === "number") sum += r.usd;
  else unpriced++;
  if ((r.tag ?? "").startsWith("probe") || (r.tag ?? "").includes("sweep") || (r.tag ?? "").includes("blur")) probe++;
  else product++;
}
console.log(`calls=${lines.length} usd=${sum.toFixed(4)} (product=${product} probe=${probe} unpriced=${unpriced})`);
