// Blur probe: deterministic light-blur baseline for the S7 demo.
// Blurs ticket.png at sigma 2, attacks it. NEVER overwrites the pinned
// runs/attack-blur2-refusal.json — new runs go to corpus/out/ (gitignored).
// Refusal wording varies run to run; the pinned copy is the original.
// Usage: node scripts/blur-probe.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { attack } from "../src/attack.mjs";
import { toDataUrl } from "../src/locate.mjs";
import { appendUsage, usageRecord } from "../src/usage.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiKey = process.env.BASETEN_API_KEY;
const baseUrl = process.env.BASETEN_BASE_URL;
const model = process.env.BASETEN_MODEL || "meta-models/muse-spark-open-1026";

if (!apiKey || !baseUrl) {
  console.error("blur-probe: BASETEN_API_KEY and BASETEN_BASE_URL missing.");
  process.exit(2);
}

const buf = readFileSync(join(root, "corpus/img/ticket.png"));
const blurred = await sharp(buf).blur(2).png().toBuffer();
const r = await attack({
  dataUrl: toDataUrl(blurred),
  apiKey,
  baseUrl,
  model,
});
appendUsage(join(root, "usage.jsonl"), usageRecord({ model, usage: r.usage, tag: "attack:blur-probe" }));
const stamp = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(root, `corpus/out/attack-blur2-${stamp}.json`),
  JSON.stringify(
    { date: stamp, image: "ticket blur sigma 2", text: r.text, error: r.error },
    null,
    2
  )
);
console.log(`wrote corpus/out/attack-blur2-${stamp}.json (pinned runs/ copy untouched)`);
console.log(`chars=${r.text.length} error=${r.error ?? "none"}`);
console.log(r.text.slice(0, 200));
