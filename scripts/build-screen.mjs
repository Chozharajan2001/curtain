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

function isRefusal(text) {
  return /can't (transcribe|provide|share|disclose)|personal (information|data|financial)|privacy|not able to (transcribe|share|provide)/i.test(text ?? "");
}

const cards = attack.map((a) => {
  const leaks = findLeaks(a.text, keyByName.get(a.name) ?? []);
  const { verdict } = decide(a.error ? ["attacker-error"] : leaks);
  return {
    name: a.name,
    verdict,
    leaks,
    located: locByName.get(a.name) ?? 0,
    reply: a.text,
    refusal: isRefusal(a.text),
  };
});

const stamp = {
  locateRun: "runs/locate-2026-10-30-run3.json",
  attackRun: "runs/attack-2026-10-31.json",
  built: new Date().toISOString().slice(0, 10),
  recall: "0.909 (20/22) run3 · every-run 0.727 (16/22) · median 0.864",
};

const imgDir = join(root, "preview", "img");
mkdirSync(imgDir, { recursive: true });
for (const c of cards) {
  copyFileSync(join(root, "corpus", "img", `${c.name}.png`), join(imgDir, `${c.name}-orig.png`));
  copyFileSync(join(root, "corpus", "out", "masked", `${c.name}.png`), join(imgDir, `${c.name}-masked.png`));
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cardHtml(it) {
  const badge = it.verdict.toUpperCase();
  const badgeCls = it.verdict === "refused" ? "badge refused" : "badge released";
  const leakLine = it.leaks.length > 0
    ? `<div class="leak">LEAKED: ${esc(it.leaks.join("; "))}</div>`
    : `<div class="clean">leaks: none recovered</div>`;
  const refusal = it.refusal
    ? `<div class="clean">refusal = capability: the attacker sees PII when present — our masks revealed nothing to trigger it (E5b).</div>`
    : "";
  return `<div class="card"><span class="${badgeCls}">${badge}</span> <b>${esc(it.name)}</b> `
    + `<span class="meta">located ${it.located} boxes · attacker reply ${it.reply.length} chars</span>`
    + `<div class="imgs"><figure><img src="img/${esc(it.name)}-orig.png" alt="${esc(it.name)} original"><figcaption>original</figcaption></figure>`
    + `<figure><img src="img/${esc(it.name)}-masked.png" alt="${esc(it.name)} masked"><figcaption>masked</figcaption></figure></div>`
    + `${leakLine}<pre class="reply">attacker says: ${esc(it.reply || "(nothing)")}</pre>${refusal}</div>`;
}

const preRendered = cards.map(cardHtml).join("\n");
let html = tpl.replace("/*__CARDS__*/", () => JSON.stringify(cards));
html = html.replace("/*__STAMP__*/", () => JSON.stringify(stamp));
html = html.replace("<!--__PRERENDERED__-->", () => preRendered);
writeFileSync(join(root, "preview", "index.html"), html);
console.log(`screen: ${cards.length} cards written to preview/index.html (+ img/ copies)`);
console.log(cards.map((c) => `${c.name}: ${c.verdict} leaks=[${c.leaks.join(";") || "none"}]`).join("\n"));
