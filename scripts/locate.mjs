// S4 locate run: every listed image -> boxes, written to corpus/out/locate.json.
// Never reads the answer key (D7). Needs META_API_KEY in .env.
// Image list comes from runs/<set>.json (default: synthetic v1).
// Any sharp-readable format (PNG, JPEG). EXIF stripped on load (R4/R8).
// Usage: node scripts/locate.mjs [runs/<set>.json]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { locate, toDataUrl } from "../src/locate.mjs";
import { appendUsage, usageRecord } from "../src/usage.mjs";
import { MAX_SEND_WIDTH, sendScale } from "../src/coords.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiKey = process.env.META_API_KEY;
const baseUrl = process.env.META_BASE_URL || "https://api.meta.ai/v1";
const model = process.env.META_MODEL || "muse-spark-1.3";

if (!apiKey) {
  console.error("locate: META_API_KEY missing. Put it in PROJECT/.env and rerun.");
  process.exit(2);
}

// Default set: the 5 synthetic images. S12 photo set passes its own file.
const setFile = process.argv[2] || "runs/locate-set-v1.json";
const names = JSON.parse(readFileSync(join(root, setFile), "utf8"));

const results = [];
let failed = 0;

for (const name of names) {
  // Find the file by stem (any extension). EXIF stripped on load.
  const { readdirSync } = await import("node:fs");
  const match = readdirSync(join(root, "corpus", "img")).find((n) => n.startsWith(name + "."));
  if (!match) {
    results.push({ name, boxes: [], dropped: 0, error: "no-such-image" });
    console.log(`${name}: error=no-such-image`);
    failed++;
    continue;
  }
  const raw = readFileSync(join(root, "corpus", "img", match));
  const meta = await sharp(raw).metadata();
  let bytes = raw;
  let w = meta.width;
  let h = meta.height;
  if (w > MAX_SEND_WIDTH) {
    const f = sendScale(w);
    bytes = await sharp(raw).rotate().resize({ width: MAX_SEND_WIDTH }).withMetadata({ exif: {}, icc: {} }).png().toBuffer();
    // Note: rotate() applies EXIF orientation then we strip metadata.
    const m2 = await sharp(bytes).metadata();
    w = m2.width;
    h = m2.height;
    void f;
  } else {
    // Normalise: strip metadata, keep pixels identical.
    const fmt = meta.format === "jpeg" ? "jpeg" : "png";
    bytes = await sharp(raw).rotate().toFormat(fmt).withMetadata({}).toBuffer();
  }
  const t0 = Date.now();
  try {
    const r = await locate({
      dataUrl: toDataUrl(bytes),
      imgW: w,
      imgH: h,
      apiKey,
      baseUrl,
      model,
    });
    appendUsage(join(root, "usage.jsonl"), usageRecord({ model, usage: r.usage, tag: `locate:${name}` }));
    results.push({ name, w, h, boxes: r.boxes, dropped: r.dropped, error: r.error });
    console.log(
      `${name}: boxes=${r.boxes.length} dropped=${r.dropped} error=${r.error ?? "none"} ms=${Date.now() - t0}`
    );
    if (r.error) failed++;
  } catch (e) {
    results.push({ name, w, h, boxes: [], dropped: 0, error: `http-${e.status ?? "unknown"}` });
    console.log(`${name}: error=http-${e.status ?? e.message}`);
    failed++;
  }
}

mkdirSync(join(root, "corpus", "out"), { recursive: true });
writeFileSync(join(root, "corpus", "out", "locate.json"), JSON.stringify(results, null, 2));
console.log(`locate: ${results.length - failed}/${results.length} images ok`);
process.exit(failed ? 1 : 0);
