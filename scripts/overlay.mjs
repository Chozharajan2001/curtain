// Draws key boxes (red) and located boxes (blue) over a corpus image.
// Visual check: does the model's box sit on the text, or is the key wrong?
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv[2] || "ticket";
const key = JSON.parse(readFileSync(join(root, "corpus/key/v1.json"), "utf8"));
const runs = JSON.parse(readFileSync(join(root, "corpus/out/locate.json"), "utf8"));

const im = key.images.find((i) => i.name === name);
const run = runs.find((r) => r.name === name);
const b64 = readFileSync(join(root, "corpus/img", `${name}.png`)).toString("base64");

const rects = im.items
  .map((it) => {
    const b = it.box;
    return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="none" stroke="red" stroke-width="3"/>`;
  })
  .join("");

const modelRects = (run?.boxes ?? [])
  .map((m) => {
    const p = m.box;
    return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="none" stroke="blue" stroke-width="3"/>`;
  })
  .join("");

const html = `<!doctype html><html><body style="margin:0">
<img src="data:image/png;base64,${b64}" style="display:block">
<svg width="1280" height="900" style="position:absolute;left:0;top:0">${rects}${modelRects}</svg>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.setContent(html);
mkdirSync(join(root, "corpus/out"), { recursive: true });
const out = join(root, "corpus/out", `overlay-${name}.png`);
await page.screenshot({ path: out });
await browser.close();
console.log(out);
