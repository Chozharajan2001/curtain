// Cost command: sums usage.jsonl. One real command for E9 (AGENTS rule 3).
// Usage: npm run cost  (or: node scripts/cost.mjs)
import { readFileSync, existsSync } from "node:fs";

if (!existsSync("usage.jsonl")) {
  console.log("calls=0 usd=0.0000");
  process.exit(0);
}
const lines = readFileSync("usage.jsonl", "utf8").trim().split("\n").filter(Boolean);
let sum = 0;
for (const l of lines) {
  const usd = JSON.parse(l).usd;
  if (typeof usd === "number") sum += usd;
}
console.log(`calls=${lines.length} usd=${sum.toFixed(4)}`);
