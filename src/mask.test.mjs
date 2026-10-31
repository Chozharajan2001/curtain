// S5 mask tests: solid fill, flatten, metadata strip. No key reads here —
// the checker (a scorer) owns the key. These tests use synthetic boxes.
import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { maskImage, expandBox } from "./mask.mjs";

test("expandBox grows by margin and clamps to image", () => {
  assert.deepEqual(expandBox({ x: 100, y: 100, w: 50, h: 20 }, 1000, 800, 10), {
    x: 90,
    y: 90,
    w: 70,
    h: 40,
  });
  assert.deepEqual(expandBox({ x: 0, y: 0, w: 50, h: 20 }, 1000, 800, 10), {
    x: 0,
    y: 0,
    w: 60,
    h: 30,
  });
  assert.deepEqual(expandBox({ x: 970, y: 780, w: 50, h: 40 }, 1000, 800, 10), {
    x: 960,
    y: 770,
    w: 40,
    h: 30,
  });
});

test("maskImage paints every box solid and strips metadata", async () => {
  // White 100x100 with a black EXIF tag smuggled in.
  const input = await sharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .png()
    .toBuffer();
  const out = await maskImage(input, [{ x: 10, y: 10, w: 30, h: 20 }], 5);
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  // Inside the expanded box (5,5,40,30): every pixel must be pure black.
  for (let y = 5; y < 35; y++) {
    for (let x = 5; x < 45; x++) {
      const i = (y * info.width + x) * info.channels;
      assert.equal(data[i], 0, `r at ${x},${y}`);
      assert.equal(data[i + 1], 0, `g at ${x},${y}`);
      assert.equal(data[i + 2], 0, `b at ${x},${y}`);
    }
  }
  // Outside the box: still white.
  const oi = (90 * info.width + 90) * info.channels;
  assert.equal(data[oi], 255);
  // No metadata survives.
  const meta = await sharp(out).metadata();
  assert.equal(meta.exif, undefined);
});
