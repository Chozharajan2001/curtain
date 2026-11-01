// Builds corpus/key/v1-styled.json from measured segments (measure-styled.mjs).
// Curated map: each item points at segment/word ranges measured from ink.
// Face is found by tan colour inside the illustration. No model involved.
// Usage: node scripts/measure-styled.mjs && node scripts/build-styled-key.mjs
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const segs = JSON.parse(readFileSync("corpus/out/styled-segments.json", "utf8"));

function boxFrom(parts) {
  // parts: [[segIdx, w0?, w1?, padRight?], ...]; whole segment when no word range
  const boxes = parts.map(([si, w0, w1, padRight]) => {
    const seg = segs[cur.name].segments[si];
    if (w0 === undefined) return { x: seg.x, y: seg.y, w: seg.w, h: seg.h };
    const ws = seg.words.slice(w0, w1 === undefined ? w0 + 1 : w1 + 1);
    const x = ws[0].x;
    const end = ws[ws.length - 1].x + ws[ws.length - 1].w + (padRight ?? 0);
    return { x, y: seg.y, w: end - x, h: seg.h };
  });
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const bt = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: r - x, h: bt - y };
}

async function tanFaceBox(name, region) {
  const { data, info } = await sharp(`corpus/img/${name}.jpg`)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = region.y; y < region.y + region.h; y++) {
    for (let x = region.x; x < region.x + region.w; x++) {
      const i = (y * info.width + x) * info.channels;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 150 && r < 235 && g > 110 && g < 190 && b > 70 && b < 160 && r > g && g > b) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const MAP = {
  "styled-ticket": [
    { category: "name", value: "Asha Rao", parts: [[2, 0, 1]] },
    { category: "email", value: "asha.rao@example.in", parts: [[2, 2]] },
    { category: "phone", value: "+91 98410 22334", parts: [[5]] },
    { category: "order", value: "ORD-88412", parts: [[7]] },
    { category: "card", value: "4111 1111 1111 1234", parts: [[8, 2, 13, 80]] },
  ],
  "styled-clinic": [
    { category: "name", value: "Divya Nair", parts: [[2]] },
    { category: "phone", value: "+91 99400 55667", parts: [[6], [7]] },
    { category: "govt", value: "AXPPI4821K", parts: [[10]] },
    { category: "note", value: "patient reports mild fever since Tuesday", parts: [[12], [13]] },
    { category: "sig", value: "Dr. S. Menon", parts: [[14], [15]] },
  ],
  "styled-bank": [
    { category: "name", value: "Karthik Iyer", parts: [[2, 1, 2]] },
    { category: "account", value: "50200099887711", parts: [[4, 1, 2]] },
    { category: "card", value: "5500 0000 0000 0004", parts: [[13, 1, 4]] },
    { category: "address", value: "14 Anna Salai, Chennai 600002", parts: [[3, 1, 3], [5]] },
  ],
  "styled-order": [
    { category: "name", value: "Priya Das", parts: [[2, 2, 4]] },
    { category: "order", value: "ORD-10293", parts: [[8, 1], [9, 0]] },
    { category: "address", value: "22 MG Road, Bengaluru 560001", parts: [[9, 3, 7]] },
    { category: "phone", value: "+91 98840 11223", parts: [[13], [14, 0]] },
    { category: "email", value: "priya.d@example.com", parts: [[14, 1]] },
  ],
  "styled-photo": [
    { category: "face", value: "SENTINEL:face-02", valueKind: "sentinel", face: true },
    { category: "name", value: "Ravi Kumar", parts: [[5]] },
    { category: "logo", value: "ACME Corp", parts: [[2], [3]] },
  ],
};

const key = { version: 1, source: "synthetic-styled", images: [] };
let cur;
for (const [name, items] of Object.entries(MAP)) {
  cur = { name };
  const r = segs[name];
  const out = [];
  for (const it of items) {
    let box;
    if (it.face) {
      const region = r.segments[4];
      box = await tanFaceBox(name, region);
      if (!box) throw new Error(`${name}: tan face not found`);
    } else {
      box = boxFrom(it.parts);
    }
    out.push({ category: it.category, value: it.value, valueKind: it.valueKind ?? "literal", box });
  }
  key.images.push({ name: `${name}`, file: `corpus/img/${name}.jpg`, width: r.w, height: r.h, source: "synthetic-styled", items: out });
}
writeFileSync("corpus/key/v1-styled.json", JSON.stringify(key, null, 2));
const total = key.images.reduce((n, im) => n + im.items.length, 0);
for (const im of key.images) console.log(`${im.name}: ${im.items.length} items`);
console.log(`styled total: ${total}`);
