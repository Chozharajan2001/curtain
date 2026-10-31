// Builds preview/marker.html from marker-template + photo list.
// Photos come from runs/photo-set.json (written when you drop JPGs in).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tpl = readFileSync(join(root, "preview", "marker-template.html"), "utf8");
let photos = [];
const setPath = join(root, "runs", "photo-set.json");
if (existsSync(setPath)) photos = JSON.parse(readFileSync(setPath, "utf8"));
const html = tpl.replace("/*__PHOTOS__*/", () => JSON.stringify(photos));
writeFileSync(join(root, "preview", "marker.html"), html);
console.log(`marker: ${photos.length} photos listed (drop JPGs in corpus/img/, update runs/photo-set.json)`);
