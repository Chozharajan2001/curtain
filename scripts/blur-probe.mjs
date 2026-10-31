// Blur probe: deterministic light-blur baseline for the S7 demo.
// Blurs ticket.png at sigma 2, attacks it, pins the reply. All calls logged.
// Usage: node scripts/blur-probe.mjs
import { readFileSync, writeFileSync } from "node:fs";
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
writeFileSync(
  join(root, "runs/attack-blur2-refusal.json"),
  JSON.stringify(
    { date: new Date().toISOString().slice(0, 10), image: "ticket blur sigma 2", text: r.text, error: r.error },
    null,
    2
  )
);
console.log(`chars=${r.text.length} error=${r.error ?? "none"}`);
console.log(r.text.slice(0, 200));
