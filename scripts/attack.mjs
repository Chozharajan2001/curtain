// S7 runner: attack every masked image with Muse Spark Open on Baseten.
// Reads corpus/out/masked/, never the key (D7). Output: corpus/out/attack.json.
// Needs BASETEN_API_KEY + BASETEN_BASE_URL in .env. One call per image.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { attack, ATTACK_PROMPT } from "../src/attack.mjs";
import { toDataUrl } from "../src/locate.mjs";
import { appendUsage, usageRecord } from "../src/usage.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiKey = process.env.BASETEN_API_KEY;
const baseUrl = process.env.BASETEN_BASE_URL;
const model = process.env.BASETEN_MODEL || "meta-models/muse-spark-open-1026";

if (!apiKey || !baseUrl) {
  console.error("attack: BASETEN_API_KEY and BASETEN_BASE_URL missing. Put them in PROJECT/.env and rerun.");
  process.exit(2);
}

const maskedDir = process.argv[2] || "corpus/out/masked";
const names = readdirSync(join(root, maskedDir))
  .filter((n) => n.endsWith(".png"))
  .map((n) => n.slice(0, -4))
  .sort();

const outDir = join(root, "corpus/out");
mkdirSync(outDir, { recursive: true });

const results = [];
let failed = 0;
for (const name of names) {
  const bytes = readFileSync(join(root, maskedDir, `${name}.png`));
  const t0 = Date.now();
  try {
    const r = await attack({
      dataUrl: toDataUrl(bytes),
      apiKey,
      baseUrl,
      model,
    });
    appendUsage(join(root, "usage.jsonl"), usageRecord({ model, usage: r.usage, tag: `attack:${name}` }));
    results.push({ name, text: r.text, error: r.error });
    console.log(`${name}: chars=${r.text.length} error=${r.error ?? "none"} ms=${Date.now() - t0}`);
    if (r.error) failed++;
  } catch (e) {
    results.push({ name, text: "", error: `http-${e.status ?? e.message}` });
    console.log(`${name}: error=http-${e.status ?? e.message}`);
    failed++;
  }
}
writeFileSync(join(outDir, "attack.json"), JSON.stringify(results, null, 2));
console.log(`attack: ${results.length - failed}/${results.length} images ok`);
process.exit(failed ? 1 : 0);
void ATTACK_PROMPT;
