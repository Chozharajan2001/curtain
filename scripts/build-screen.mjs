// S10 screen builder: inlines pinned runs into preview/index.html.
// Scorer-side (reads key to match leaks, like score-attack). D7 allowlisted.
// Copies originals + masked PNGs into preview/img/ so the screen is
// self-contained: no corpus/ or out/ needed, fresh-clone safe.
// Output works from file:// with zero network.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findLeaks } from "../src/leaks.mjs";
import { decide } from "../src/decide.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tpl = readFileSync(join(root, "preview", "screen-template.html"), "utf8");

const key = JSON.parse(readFileSync(join(root, "corpus/key/v1.json"), "utf8"));
const attack = JSON.parse(readFileSync(join(root, "runs/attack-2026-10-31.json"), "utf8"));
const locate = JSON.parse(readFileSync(join(root, "runs/locate-2026-10-30-run3.json"), "utf8"));
const locByName = new Map(locate.map((r) => [r.name, r.boxes.length]));
const keyByName = new Map(key.images.map((im) => [im.name, im.items]));

const cards = attack.map((a) => {
  const leaks = findLeaks(a.text, keyByName.get(a.name) ?? []);
  const { verdict } = decide(a.error ? ["attacker-error"] : leaks);
  return {
    name: a.name,
    verdict,
    leaks,
    located: locByName.get(a.name) ?? 0,
    reply: a.text,
  };
});

const imgDir = join(root, "preview", "img");
mkdirSync(imgDir, { recursive: true });
for (const c of cards) {
  copyFileSync(join(root, "corpus", "img", `${c.name}.png`), join(imgDir, `${c.name}-orig.png`));
  copyFileSync(join(root, "corpus", "out", "masked", `${c.name}.png`), join(imgDir, `${c.name}-masked.png`));
}

const html = tpl.replace("/*__CARDS__*/", () => JSON.stringify(cards));
writeFileSync(join(root, "preview", "index.html"), html);
console.log(`screen: ${cards.length} cards written to preview/index.html (+ img/ copies)`);
console.log(cards.map((c) => `${c.name}: ${c.verdict} leaks=[${c.leaks.join(";") || "none"}]`).join("\n"));
