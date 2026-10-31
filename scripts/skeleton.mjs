// S3 walking skeleton. Ugly on purpose. No model calls, no key reads (D7).
// Fake locate: hardcoded boxes. Fake mask: covers everything except one
// item. Fake attack: reads the uncovered item. S4/S5/S7 replace each fake.
// Usage: node scripts/skeleton.mjs [image-name]
// Prints: <name>: verdict=<released|refused> leaks=[...]
// Also rewrites preview/skeleton.html with the results inlined, so the S3
// preview works from file:// (no fetch, no server). Never preview/index.html.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gridToPixels } from "../src/coords.mjs";
import { decide } from "../src/decide.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Hardcoded fake locate results. Obviously fake values — real scoring
// starts in S4 with the model. Never import the key here (D7).
const FAKE_UNCOVERED = {
  ticket: ["FAKE-LEAK-1"],
  clinic: ["FAKE-LEAK-1"],
  bank: ["FAKE-LEAK-1"],
  order: ["FAKE-LEAK-1"],
  photo: [],
};

const names = process.argv[2] ? [process.argv[2]] : Object.keys(FAKE_UNCOVERED);
const outDir = join(root, "corpus/out");
mkdirSync(outDir, { recursive: true });

const results = [];
for (const name of names) {
  if (!(name in FAKE_UNCOVERED)) {
    console.error(`unknown image: ${name}`);
    process.exit(1);
  }
  const leaks = FAKE_UNCOVERED[name];
  const { verdict } = decide(leaks);
  // Prove gridToPixels is wired: convert a full-grid box at key viewport size.
  const px = gridToPixels({ x: 0, y: 0, w: 1000, h: 1000 }, 1280, 900);
  void px;
  console.log(`${name}: verdict=${verdict} leaks=[${leaks.join("; ")}]`);
  results.push({ name, verdict, leaks });
}
writeFileSync(join(outDir, "skeleton.json"), JSON.stringify(results, null, 2));

// Inline the full 5-image results into its OWN preview file so it renders
// from file:// with zero network. Never touches preview/index.html (S10 owns
// that). Single-image runs skip the rewrite.
if (!process.argv[2]) {
  const tpl = readFileSync(join(root, "preview", "template.html"), "utf8");
  writeFileSync(
    join(root, "preview", "skeleton.html"),
    tpl.replace("/*__RESULTS__*/", () => JSON.stringify(results))
  );
}
