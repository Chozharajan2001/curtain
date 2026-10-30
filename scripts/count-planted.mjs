// S2 done check: counts planted items per image from corpus/key/v1.json.
import { readFileSync } from "node:fs";

const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
let total = 0;
for (const im of key.images) {
  console.log(`${im.name}: ${im.items.length} items`);
  total += im.items.length;
}
console.log(`total planted: ${total}`);
