// S12 hard synthetics: rotated, tiny, low-contrast, split-number.
// Separate key (v1-hard.json) — v1 stays frozen. Same ink-box pipeline.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const imgDir = join(root, "corpus", "img");
const keyDir = join(root, "corpus", "key");
mkdirSync(imgDir, { recursive: true });
mkdirSync(keyDir, { recursive: true });

const css = `
body{font-family:Arial,sans-serif;background:#fff;color:#111;margin:0;padding:40px}
.card{border:1px solid #ccc;padding:32px;max-width:900px}
p{font-size:18px;line-height:1.6}
.rot{transform:rotate(-12deg);display:inline-block}
.tiny{font-size:9px}
.low{color:#b0b0b0}
.split{letter-spacing:2px}
`;

function page(title, bodyHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
<body><div class="card"><h1>${title}</h1>${bodyHtml}</div></body></html>`;
}

const artefacts = [
  {
    name: "hard-rotated",
    title: "Skewed scan",
    body: `<p class="rot">Name: <span data-pii="name">Meera Krishnan</span></p>
<p class="rot">Card: <span data-pii="card">4111 1111 1111 4321</span></p>`,
  },
  {
    name: "hard-tiny",
    title: "Fine print",
    body: `<p class="tiny">Holder <span data-pii="name">Arun Prakash</span>, acct <span data-pii="account">60987654321098</span></p>
<p class="tiny">call <span data-pii="phone">+91 97654 32109</span></p>`,
  },
  {
    name: "hard-lowcontrast",
    title: "Faded receipt",
    body: `<p class="low">Email: <span data-pii="email">faded.user@example.com</span></p>
<p class="low">Order <span data-pii="order">ORD-55501</span> total Rs 899</p>`,
  },
  {
    name: "hard-split",
    title: "Wrapped number",
    body: `<p>Card: <span data-pii="card">5500 0000</span><br><span data-pii="card">0000 0009</span></p>
<p>Ref: <span data-pii="order">ORD-77881</span></p>`,
  },
];

const key = { version: 1, source: "synthetic-hard", images: [] };
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 1280, height: 900 } });

for (const a of artefacts) {
  await pg.setContent(page(a.title, a.body));
  const card = await pg.$eval(".card", (el) => {
    const r = el.getBoundingClientRect();
    return { right: r.right, bottom: r.bottom };
  });
  const cropW = Math.ceil(card.right + 40);
  const cropH = Math.ceil(card.bottom + 40);
  await pg.setViewportSize({ width: cropW, height: cropH });
  await pg.setContent(page(a.title, a.body));
  const items = await pg.$$eval("[data-pii]", (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        category: el.getAttribute("data-pii"),
        value: el.innerText.trim(),
        valueKind: "literal",
        box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      };
    })
  );
  await pg.screenshot({ path: join(imgDir, `${a.name}.png`) });
  key.images.push({ name: a.name, file: `corpus/img/${a.name}.png`, width: cropW, height: cropH, source: "synthetic-hard", items });
}
await browser.close();
writeFileSync(join(keyDir, "v1-hard.json"), JSON.stringify(key, null, 2));
const total = key.images.reduce((n, im) => n + im.items.length, 0);
for (const im of key.images) console.log(`${im.name}: ${im.items.length} items, ${im.width}x${im.height}`);
console.log(`hard total: ${total}`);
