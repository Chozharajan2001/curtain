// S2 done check: counts planted items per image from corpus/key/v1.json.
import { readFileSync } from "node:fs";
import { checkManifest } from "../src/manifest.mjs";

const manifest = checkManifest();
if (!manifest.ok) {
  console.error(`count-planted: refusing to score � ${manifest.reason}`);
  process.exit(2);
}

const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
let total = 0;
for (const im of key.images) {
  console.log(`${im.name}: ${im.items.length} items`);
  total += im.items.length;
}
if (total === 0) { console.log("count: unverified — zero planted items"); process.exit(1); }
console.log(`total planted: ${total}`);
