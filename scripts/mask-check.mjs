// S5 checker — the only scorer that reads the key for masking (D7).
// For each planted box: region must be one flat colour (variance ~ 0) and no
// planted literal may appear in the output metadata.
// Prints per-image pass/fail + ink area + masked area. Usage:
//   npm run mask-images && npm run mask:check
import { readFileSync } from "node:fs";
import { checkManifest } from "../src/manifest.mjs";
import sharp from "sharp";
import { maskedVariance, expandBox, MARGIN } from "../src/mask.mjs";

const manifest = checkManifest();
if (!manifest.ok) {
  console.error(`mask-check: refusing to score � ${manifest.reason}`);
  process.exit(2);
}

const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
// Masked area comes from the same run the images were painted with.
const runFile = process.argv[2] || "runs/locate-2026-10-30-run3.json";
const runs = JSON.parse(readFileSync(runFile, "utf8"));
const runByName = new Map(runs.map((r) => [r.name, r]));

let pass = 0;
let inkArea = 0;
let maskedArea = 0;
let imgArea = 0;
const failures = [];
for (const im of key.images) {
  const path = `corpus/out/masked/${im.name}.png`;
  let buf;
  try {
    buf = readFileSync(path);
  } catch {
    console.log(`${im.name}: FAIL — no masked file (run mask-images first)`);
    failures.push(`${im.name}: no masked file`);
    continue;
  }
  const meta = await sharp(buf).metadata();
  imgArea += meta.width * meta.height;
  const run = runByName.get(im.name);
  if (run) {
    for (const b of run.boxes) {
      const e = expandBox(b.box, meta.width, meta.height, MARGIN);
      maskedArea += e.w * e.h;
    }
  }
  const metaText = JSON.stringify({ exif: meta.exif, xmp: meta.xmp, icc: meta.icc });
  const badMeta = im.items.some(
    (it) => it.valueKind === "literal" && it.value.length > 2 && metaText.includes(it.value)
  );
  const badItems = [];
  for (const it of im.items) {
    // Sentinel faces have no ink to check; coverage is S6's job.
    if (it.valueKind === "sentinel") continue;
    // Test the ink itself, not padding: the mask (model box + margin) must
    // fully cover the planted ink. Padding around the ink is not the secret.
    inkArea += it.box.w * it.box.h;
    const v = await maskedVariance(buf, it.box);
    if (v > 1) badItems.push(`${it.category} var=${v.toFixed(2)}`);
  }
  if (badMeta) {
    console.log(`${im.name}: FAIL — planted string in metadata`);
    failures.push(`${im.name}: planted string in metadata`);
  } else if (badItems.length > 0) {
    console.log(`${im.name}: FAIL — ${badItems.join("; ")}`);
    failures.push(`${im.name}: ${badItems.join("; ")}`);
  } else {
    console.log(`${im.name}: pass`);
    pass++;
  }
}
console.log(`mask: ${pass}/${key.images.length} images pass`);
console.log(`ink area: ${((inkArea / imgArea) * 100).toFixed(2)}% of pixels`);
console.log(`masked area: ${((maskedArea / imgArea) * 100).toFixed(2)}% of pixels`);
process.exit(pass === key.images.length ? 0 : 1);
