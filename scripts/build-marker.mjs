// Builds preview/marker.html from marker-template + photo list.
// Photos come from runs/photo-set.json (written when you drop JPGs in).
// Copies them to preview/img/ so the marker is self-contained (file://).
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tpl = readFileSync(join(root, "preview", "marker-template.html"), "utf8");
let photos = [];
const setPath = join(root, "runs", "photo-set.json");
if (existsSync(setPath)) photos = JSON.parse(readFileSync(setPath, "utf8"));
const imgDir = join(root, "preview", "img");
mkdirSync(imgDir, { recursive: true });
const copied = [];
for (const p of photos) {
  const src = join(root, "corpus", "img", basename(p));
  if (existsSync(src)) {
    copyFileSync(src, join(imgDir, basename(p)));
    copied.push(basename(p));
  } else {
    console.log(`marker: missing ${p} — drop it in corpus/img/ first`);
  }
}
const html = tpl.replace("/*__PHOTOS__*/", () => JSON.stringify(copied));
writeFileSync(join(root, "preview", "marker.html"), html);
console.log(`marker: ${copied.length}/${photos.length} photos ready (self-contained in preview/img/)`);
