// Measures text boxes on styled renders by pixel projection.
// Independent of any model: ink = dark pixels; bands = text lines;
// segments = x-runs within a band. Prints candidates for curation.
// Usage: node scripts/measure-styled.mjs
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const IMAGES = ["styled-ticket", "styled-clinic", "styled-bank", "styled-order", "styled-photo"];
const INK = 140;      // luminance below this counts as ink
const ROW_GAP = 3;    // rows closer than this merge into one line
const COL_GAP = 24;   // x-gaps wider than this split a line into segments
const MIN_ROW_INK = 20;
const WORD_GAP = 6;  // ignore rows with only a hairline border
const MIN_SEG_W = 8;    // ignore hairline vertical borders

function segmentsFor(width, height, data, channels) {
  const rowInk = new Uint8Array(height);
  for (let y = 0; y < height; y++) {
    let n = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < INK) n++;
    }
    if (n >= MIN_ROW_INK) rowInk[y] = 1;
  }
  const bands = [];
  let start = -1;
  for (let y = 0; y <= height; y++) {
    const on = y < height && rowInk[y];
    if (on && start < 0) start = y;
    if (!on && start >= 0) {
      bands.push([start, y - 1]);
      start = -1;
    }
  }
  const merged = [];
  for (const b of bands) {
    const last = merged[merged.length - 1];
    if (last && b[0] - last[1] <= ROW_GAP) last[1] = b[1];
    else merged.push([...b]);
  }
  const WORD_GAP = 6;
  const out = [];
  for (const [y0, y1] of merged) {
    const colInk = new Uint8Array(width);
    for (let x = 0; x < width; x++) {
      for (let y = y0; y <= y1; y++) {
        const i = (y * width + x) * channels;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum < INK) { colInk[x] = 1; break; }
      }
    }
    let sx = -1;
    for (let x = 0; x <= width; x++) {
      const on = x < width && colInk[x];
      if (on && sx < 0) sx = x;
      if (!on && sx >= 0) {
        const lastSeg = out[out.length - 1];
        const seg = { x: sx, y: y0, w: x - sx, h: y1 - y0 + 1 };
        if (seg.w < MIN_SEG_W || seg.h <= 3) {
          // hairline border: drop
        } else if (lastSeg && lastSeg.y === y0 && seg.x - (lastSeg.x + lastSeg.w) < COL_GAP) {
          lastSeg.w = seg.x + seg.w - lastSeg.x;
          lastSeg.lastWordEnd = seg.x + seg.w;
        } else out.push(seg);
        sx = -1;
      }
    }
  }
  return out;
}

// Split a segment into words by internal column gaps.
function wordsFor(data, channels, width, seg) {
  const colInk = new Uint8Array(width);
  for (let x = seg.x; x < seg.x + seg.w; x++) {
    for (let y = seg.y; y < seg.y + seg.h; y++) {
      const i = (y * width + x) * channels;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < INK) { colInk[x] = 1; break; }
    }
  }
  const words = [];
  let sx = -1;
  for (let x = seg.x; x <= seg.x + seg.w; x++) {
    const on = x < seg.x + seg.w && colInk[x];
    if (on && sx < 0) sx = x;
    if (!on && sx >= 0) {
      const last = words[words.length - 1];
      if (last && sx - (last.x + last.w) < WORD_GAP) last.w = x - last.x;
      else words.push({ x: sx, y: seg.y, w: x - sx, h: seg.h });
      sx = -1;
    }
  }
  return words;
}

const report = {};
for (const name of IMAGES) {
  const buf = readFileSync(`corpus/img/${name}.jpg`);
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const segs = segmentsFor(info.width, info.height, data, info.channels);
  for (const s of segs) s.words = wordsFor(data, info.channels, info.width, s);
  report[name] = { w: info.width, h: info.height, segments: segs };
  console.log(`\n=== ${name} (${info.width}x${info.height}) ${segs.length} segments`);
  segs.forEach((s, i) =>
    console.log(
      `  [${i}] x=${s.x} y=${s.y} w=${s.w} h=${s.h} words=${s.words.map((w) => `(${w.x},${w.w})`).join(" ")}`
    )
  );
}
writeFileSync("corpus/out/styled-segments.json", JSON.stringify(report, null, 2));
console.log("\nwrote corpus/out/styled-segments.json");
