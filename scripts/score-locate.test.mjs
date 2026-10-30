// Scorer harness. Proves recall math on the real key: perfect run = 1.0,
// empty run = 0.0 with all 22 misses named. No network, no model call.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreImage } from "../src/recall.mjs";

const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
const { w: W, h: H } = key.viewport;

function toGrid(items) {
  return items.map((it) => ({
    category: it.category,
    box: {
      x: (it.box.x / W) * 1000,
      y: (it.box.y / H) * 1000,
      w: (it.box.w / W) * 1000,
      h: (it.box.h / H) * 1000,
    },
  }));
}

test("harness: key against itself scores 1.0 on every image", () => {
  for (const im of key.images) {
    const r = scoreImage(im.items, toGrid(im.items), W, H);
    assert.equal(r.recall, 1, `${im.name} self-score`);
    assert.deepEqual(r.misses, [], `${im.name} should have no misses`);
  }
});

test("harness: empty run scores 0.0 and names all 22 misses", () => {
  let misses = 0;
  for (const im of key.images) {
    const r = scoreImage(im.items, [], W, H);
    assert.equal(r.recall, 0, `${im.name} empty run`);
    misses += r.misses.length;
  }
  assert.equal(misses, 22);
});
