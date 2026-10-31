// S6 runner: one SAM concept per image that has it. Face->photo, card->ticket+bank,
// sig->clinic, logo->photo. Writes corpus/out/sam.json. Needs META_API_KEY.
// Never reads the key (D7): concepts are hardcoded per image.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { samLocate, SAM_CONCEPTS } from "../src/sam.mjs";
import { toDataUrl } from "../src/locate.mjs";
import { appendUsage, usageRecord } from "../src/usage.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiKey = process.env.META_API_KEY;
const baseUrl = process.env.META_BASE_URL || "https://api.meta.ai/v1";
const model = process.env.META_MODEL || "muse-spark-1.3";

if (!apiKey) {
  console.error("mask:sam: META_API_KEY missing. Put it in PROJECT/.env and rerun.");
  process.exit(2);
}

// Which concept to ask on which image. Hardcoded, not from the key.
const PLAN = [
  ["photo", "face"],
  ["photo", "logo"],
  ["ticket", "card"],
  ["bank", "card"],
  ["clinic", "sig"],
];

const outDir = join(root, "corpus/out");
mkdirSync(outDir, { recursive: true });

const results = [];
let failed = 0;
for (const [name, kind] of PLAN) {
  const bytes = readFileSync(join(root, "corpus/img", `${name}.png`));
  const size = { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
  const t0 = Date.now();
  try {
    const r = await samLocate({
      dataUrl: toDataUrl(bytes),
      concept: SAM_CONCEPTS[kind],
      apiKey,
      baseUrl,
    });
    appendUsage(join(root, "usage.jsonl"), usageRecord({ model: "sam-3.1", usage: r.usage, tag: `sam:${name}:${kind}` }));
    // Store raw + refused flag so "correctly refused" is verifiable.
    const entry = { name, kind, box: r.box, w: size.w, h: size.h, error: r.error };
    if (!r.box) {
      entry.raw = typeof r.raw === "string" ? r.raw.slice(0, 200) : r.raw;
      if (r.refused) entry.refused = true;
    }
    results.push(entry);
    console.log(`${name}/${kind}: box=${r.box ? JSON.stringify(r.box) : "NONE"} error=${r.error ?? "none"} ms=${Date.now() - t0}`);
    if (r.error) failed++;
  } catch (e) {
    results.push({ name, kind, box: null, error: `http-${e.status ?? e.message}` });
    console.log(`${name}/${kind}: error=http-${e.status ?? e.message}`);
    failed++;
  }
}
writeFileSync(join(outDir, "sam.json"), JSON.stringify(results, null, 2));
console.log(`sam: ${results.length - failed}/${results.length} concepts ok`);
process.exit(failed ? 1 : 0);
