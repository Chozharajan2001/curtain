// Scorer harness. Proves recall math on the real key: perfect run = 1.0,
// empty run = 0.0 with all 22 misses named. No network, no model call.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreImage } from "../src/recall.mjs";

const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));

test("harness: key against itself scores 1.0 on every image", () => {
  for (const im of key.images) {
    const r = scoreImage(im.items, im.items, im.width, im.height);
    assert.equal(r.recall, 1, `${im.name} self-score`);
    assert.deepEqual(r.misses, [], `${im.name} should have no misses`);
  }
});

test("harness: empty run scores 0.0 and names all 22 misses", () => {
  let misses = 0;
  for (const im of key.images) {
    const r = scoreImage(im.items, [], im.width, im.height);
    assert.equal(r.recall, 0, `${im.name} empty run`);
    misses += r.misses.length;
  }
  assert.equal(misses, 22);
});

test("pinned run2 scores 0.864 coverage / 0.500 strict with zero API calls", () => {
  const runs = JSON.parse(readFileSync("runs/locate-2026-10-30-run2.json", "utf8"));
  const byName = new Map(runs.map((r) => [r.name, r]));
  let hits = 0;
  let strict = 0;
  let planted = 0;
  for (const im of key.images) {
    const run = byName.get(im.name);
    assert.ok(run, `${im.name} must be in the pinned run`);
    const s = scoreImage(im.items, run.boxes, run.w, run.h);
    hits += s.hits;
    strict += s.strictHits;
    planted += s.planted;
  }
  assert.equal(hits, 19);
  assert.equal(strict, 11);
  assert.equal(planted, 22);
});

test("pinned run3 scores 0.909 coverage / 0.636 strict with zero API calls", () => {
  const runs = JSON.parse(readFileSync("runs/locate-2026-10-30-run3.json", "utf8"));
  const byName = new Map(runs.map((r) => [r.name, r]));
  let hits = 0;
  let strict = 0;
  let planted = 0;
  for (const im of key.images) {
    const run = byName.get(im.name);
    assert.ok(run, `${im.name} must be in the pinned run`);
    const s = scoreImage(im.items, run.boxes, run.w, run.h);
    hits += s.hits;
    strict += s.strictHits;
    planted += s.planted;
  }
  assert.equal(hits, 20);
  assert.equal(strict, 14);
  assert.equal(planted, 22);
});
