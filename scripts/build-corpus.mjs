// S2 corpus builder. Draws 5 fake artefacts as HTML, screenshots to PNG,
// writes corpus/key/v1.json with every planted item + its true pixel box.
// The viewport is cropped to the content: dead white space made the planted
// text ~2% of the image height and the model's boxes drifted off the text
// (proved by scripts/probe-calibration.mjs + scripts/overlay.mjs).
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
const PAD = 40;

const css = `
body{font-family:Arial,sans-serif;background:#fff;color:#111;margin:0;padding:${PAD}px}
.card{border:1px solid #ccc;padding:32px;max-width:900px}
h1{font-size:28px;margin:0 0 16px} p,li{font-size:20px;line-height:1.6}
table{border-collapse:collapse;font-size:20px} td{border:1px solid #999;padding:8px 16px}
.face{position:relative;width:160px;height:200px;background:#f2c99b;border-radius:80px 80px 40px 40px;margin:20px 0;overflow:hidden}
.face .eye{position:absolute;top:70px;width:22px;height:28px;background:#222;border-radius:50%}
.face .eye.l{left:38px}.face .eye.r{right:38px}
.face .mouth{position:absolute;bottom:40px;left:50px;width:60px;height:12px;background:#7a3b2e;border-radius:0 0 30px 30px}
.sig{display:inline-block;font-family:cursive;font-size:32px;color:#224}
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
<p><span class="sig" data-pii="sig">Dr. S. Menon</span></p>`,
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
    body: `<div class="face" data-pii="face" data-face-id="SENTINEL:face-01"><div class="eye l"></div><div class="eye r"></div><div class="mouth"></div></div>
<p><span data-pii="name">Ravi Kumar</span> (left) at the offsite.</p>
<p>Logo: <span data-pii="logo">ACME Corp</span></p>`,
  },
];

const key = { version: 3, images: [] };
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: W, height: 900 } });

// Ink boxes: a vision model targets the visible glyphs, but a CSS span rect is
// the line box (taller than the ink). Score against what a model can see.
async function inkBoxes(items, dataUrl, width, height) {
  return pg.evaluate(
    async ({ rects, dataUrl, width, height }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, width, height).data;
      const out = [];
      for (const r of rects) {
        const x0 = Math.max(0, Math.floor(r.x));
        const y0 = Math.max(0, Math.floor(r.y - 6));
        const x1 = Math.min(width, Math.ceil(r.x + r.w));
        const y1 = Math.min(height, Math.ceil(r.y + r.h + 6));
        let minX = x1;
        let minY = y1;
        let maxX = -1;
        let maxY = -1;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * width + x) * 4;
            if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        out.push(maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
      }
      return out;
    },
    { rects: items.map((i) => i.cssBox), dataUrl, width, height }
  );
}

for (const a of artefacts) {
  await pg.setContent(page(a.title, a.body));
  // Measure the content, then crop the viewport to it (plus the body padding).
  const card = await pg.$eval(".card", (el) => {
    const r = el.getBoundingClientRect();
    return { right: r.right, bottom: r.bottom };
  });
  const cropW = Math.ceil(card.right + PAD);
  const cropH = Math.ceil(card.bottom + PAD);
  await pg.setViewportSize({ width: cropW, height: cropH });
  await pg.setContent(page(a.title, a.body));

  const rects = await pg.$$eval("[data-pii]", (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        category: el.getAttribute("data-pii"),
        value: el.innerText.trim(),
        valueKind: el.getAttribute("data-face-id") ? "sentinel" : "literal",
        faceId: el.getAttribute("data-face-id"),
        cssBox: {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
      };
    })
  );
  const png = await pg.screenshot();
  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  const ink = await inkBoxes(rects, dataUrl, cropW, cropH);

  const items = rects.map((it, i) => ({
    category: it.category,
    value: it.faceId ? it.faceId : it.value,
    valueKind: it.valueKind,
    box: ink[i] ?? it.cssBox,
    cssBox: it.cssBox,
  }));

  await pg.screenshot({ path: join(imgDir, `${a.name}.png`) });
  key.images.push({
    name: a.name,
    file: `corpus/img/${a.name}.png`,
    width: cropW,
    height: cropH,
    items,
  });
}
await browser.close();
writeFileSync(join(keyDir, "v1.json"), JSON.stringify(key, null, 2));

const total = key.images.reduce((n, im) => n + im.items.length, 0);
for (const im of key.images) {
  console.log(`${im.name}: ${im.items.length} items, ${im.width}x${im.height}`);
}
console.log(`total planted: ${total}`);
