// S4 locate run: every corpus image -> boxes, written to corpus/out/locate.json.
// Never reads the answer key (D7). Needs META_API_KEY in .env.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { locate, toDataUrl } from "../src/locate.mjs";
import { appendUsage, usageRecord } from "../src/usage.mjs";
import { MAX_SEND_WIDTH } from "../src/coords.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiKey = process.env.META_API_KEY;
const baseUrl = process.env.META_BASE_URL || "https://api.meta.ai/v1";
const model = process.env.META_MODEL || "muse-spark-1.3";

if (!apiKey) {
  console.error("locate: META_API_KEY missing. Put it in PROJECT/.env and rerun.");
  process.exit(2);
}

function pngSize(buf) {
  if (buf.length < 24) return null;
  if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const names = readdirSync(join(root, "corpus", "img"))
  .filter((n) => n.endsWith(".png"))
  .map((n) => n.slice(0, -4))
  .sort();

const results = [];
let failed = 0;

for (const name of names) {
  const bytes = readFileSync(join(root, "corpus", "img", `${name}.png`));
  const size = pngSize(bytes);
  if (!size) {
    results.push({ name, boxes: [], dropped: 0, error: "not-a-png" });
    console.log(`${name}: error=not-a-png`);
    failed++;
    continue;
  }
  if (size.w > MAX_SEND_WIDTH) {
    // Resize lands in S5 with sharp. Fail closed rather than send the wrong bytes.
    results.push({ name, w: size.w, h: size.h, boxes: [], dropped: 0, error: "needs-resize" });
    console.log(`${name}: error=needs-resize (${size.w}px > ${MAX_SEND_WIDTH})`);
    failed++;
    continue;
  }

  const t0 = Date.now();
  try {
    const r = await locate({
      dataUrl: toDataUrl(bytes),
      imgW: size.w,
      imgH: size.h,
      apiKey,
      baseUrl,
      model,
    });
    appendUsage(join(root, "usage.jsonl"), usageRecord({ model, usage: r.usage, tag: `locate:${name}` }));
    results.push({ name, w: size.w, h: size.h, boxes: r.boxes, dropped: r.dropped, error: r.error });
    console.log(
      `${name}: boxes=${r.boxes.length} dropped=${r.dropped} error=${r.error ?? "none"} ms=${Date.now() - t0}`
    );
    if (r.error) failed++;
  } catch (e) {
    results.push({ name, w: size.w, h: size.h, boxes: [], dropped: 0, error: `http-${e.status ?? "unknown"}` });
    console.log(`${name}: error=http-${e.status ?? e.message}`);
    failed++;
  }
}

mkdirSync(join(root, "corpus", "out"), { recursive: true });
writeFileSync(join(root, "corpus", "out", "locate.json"), JSON.stringify(results, null, 2));
console.log(`locate: ${results.length - failed}/${results.length} images ok`);
process.exit(failed ? 1 : 0);
