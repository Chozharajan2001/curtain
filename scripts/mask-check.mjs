// S5 checker — the only scorer that reads the key for masking (D7).
// For each planted box: region must be one flat colour (variance ~ 0) and no
// planted literal may appear in the output metadata.
// Prints per-image pass/fail + area removed. Usage: npm run mask:check
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { maskedVariance } from "../src/mask.mjs";

const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));

let pass = 0;
let totalArea = 0;
let imgArea = 0;
for (const im of key.images) {
  const path = `corpus/out/masked/${im.name}.png`;
  let buf;
  try {
    buf = readFileSync(path);
  } catch {
    console.log(`${im.name}: FAIL — no masked file (run mask-images first)`);
    continue;
  }
  const meta = await sharp(buf).metadata();
  imgArea += meta.width * meta.height;
  const metaText = JSON.stringify({ exif: meta.exif, xmp: meta.xmp, icc: meta.icc });
  const badMeta = im.items.some(
    (it) => it.valueKind === "literal" && it.value.length > 2 && metaText.includes(it.value)
  );
  let badVar = null;
  let area = 0;
  for (const it of im.items) {
    // Sentinel faces have no ink to check; coverage is S6's job.
    if (it.valueKind === "sentinel") continue;
    // Test the ink itself, not padding: the mask (model box + margin) must
    // fully cover the planted ink. Padding around the ink is not the secret.
    area += it.box.w * it.box.h;
    const v = await maskedVariance(buf, it.box);
    if (v > 1) badVar = `${it.category} var=${v.toFixed(2)}`;
  }
  totalArea += area;
  if (badMeta) {
    console.log(`${im.name}: FAIL — planted string in metadata`);
  } else if (badVar) {
    console.log(`${im.name}: FAIL — ${badVar}`);
  } else {
    console.log(`${im.name}: pass`);
    pass++;
  }
}
console.log(`mask: ${pass}/${key.images.length} images pass`);
console.log(`area removed: ${((totalArea / imgArea) * 100).toFixed(1)}% of pixels`);
process.exit(pass === key.images.length ? 0 : 1);
