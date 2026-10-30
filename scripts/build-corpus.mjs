// S2 corpus builder. Draws 5 fake artefacts as HTML, screenshots to PNG,
// writes corpus/key/v1.json with every planted item + its true pixel box.
// Boxes: planted with known CSS rects at fixed 1280x900 viewport → box math is exact.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const imgDir = join(root, "corpus", "img");
const keyDir = join(root, "corpus", "key");
mkdirSync(imgDir, { recursive: true });
mkdirSync(keyDir, { recursive: true });

const W = 1280;
const H = 900;

const css = `
body{font-family:Arial,sans-serif;background:#fff;color:#111;margin:0;padding:40px}
.card{border:1px solid #ccc;padding:32px;max-width:900px}
h1{font-size:28px;margin:0 0 16px} p,li{font-size:18px;line-height:1.6}
table{border-collapse:collapse;font-size:18px} td{border:1px solid #999;padding:8px 16px}
.face{width:160px;height:200px;background:#f2c99b;border-radius:80px 80px 40px 40px;margin:20px 0}
.sig{font-family:cursive;font-size:32px;color:#224}
`;

// Each item: id, category, value, and the CSS rect of its <span data-pii>.
function page(title, bodyHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
<body><div class="card"><h1>${title}</h1>${bodyHtml}</div></body></html>`;
}

const artefacts = [
  {
    name: "ticket",
    title: "Support ticket #4821",
    body: `<p>From: <span data-pii="name">Asha Rao</span> &lt;<span data-pii="email">asha.rao@example.in</span>&gt;</p>
<p>Phone: <span data-pii="phone">+91 98410 22334</span></p>
<p>Order: <span data-pii="order">ORD-88412</span></p>
<p>My card <span data-pii="card">4111 1111 1111 1234</span> was charged twice.</p>`,
  },
  {
    name: "clinic",
    title: "Clinic letter — Meera Clinic",
    body: `<p>Patient: <span data-pii="name">Divya Nair</span>, DOB 14-02-1988</p>
<p>Phone: <span data-pii="phone">+91 99400 55667</span></p>
<p>Govt ID: <span data-pii="govt">AXPPI4821K</span></p>
<p>Note: <span data-pii="note">patient reports mild fever since Tuesday</span></p>
<p class="sig" data-pii="sig">Dr. S. Menon</p>`,
  },
  {
    name: "bank",
    title: "Bank statement — Jan 2026",
    body: `<p>Holder: <span data-pii="name">Karthik Iyer</span></p>
<p>Account: <span data-pii="account">50200099887711</span></p>
<table><tr><td>01-03</td><td>UPI</td><td>Rs 4,200</td></tr>
<tr><td>02-15</td><td>Card <span data-pii="card">5500 0000 0000 0004</span></td><td>Rs 12,900</td></tr></table>
<p>Branch: <span data-pii="address">14 Anna Salai, Chennai 600002</span></p>`,
  },
  {
    name: "order",
    title: "Order page — order confirmed",
    body: `<p>Thanks <span data-pii="name">Priya Das</span>!</p>
<p>Order <span data-pii="order">ORD-10293</span> ships to <span data-pii="address">22 MG Road, Bengaluru 560001</span></p>
<p>Contact: <span data-pii="phone">+91 98840 11223</span>, <span data-pii="email">priya.d@example.com</span></p>`,
  },
  {
    name: "photo",
    title: "Team photo",
    body: `<div class="face" data-pii="face"></div>
<p><span data-pii="name">Ravi Kumar</span> (left) at the offsite.</p>
<p>Logo: <span data-pii="logo">ACME Corp</span></p>`,
  },
];

const key = { version: 1, viewport: { w: W, h: H }, images: [] };
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: W, height: H } });

for (const a of artefacts) {
  await pg.setContent(page(a.title, a.body));
  const items = await pg.$$eval("[data-pii]", (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        category: el.getAttribute("data-pii"),
        value: el.innerText.trim(),
        box: {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
      };
    })
  );
  await pg.screenshot({ path: join(imgDir, `${a.name}.png`) });
  key.images.push({ name: a.name, file: `corpus/img/${a.name}.png`, items });
}
await browser.close();
writeFileSync(join(keyDir, "v1.json"), JSON.stringify(key, null, 2));

const total = key.images.reduce((n, im) => n + im.items.length, 0);
for (const im of key.images) {
  console.log(`${im.name}: ${im.items.length} items`);
}
console.log(`total planted: ${total}`);
