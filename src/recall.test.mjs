// S4 recall scoring tests. Pure math — no network, no key file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { iou, coverage, scoreImage, IOU_HIT, COVERAGE_HIT } from "./recall.mjs";

const px = (x, y, w, h) => ({ x, y, w, h });

test("iou: identical boxes = 1, disjoint = 0", () => {
  assert.equal(iou(px(0, 0, 10, 10), px(0, 0, 10, 10)), 1);
  assert.equal(iou(px(0, 0, 10, 10), px(20, 20, 10, 10)), 0);
});

test("iou: known half overlap", () => {
  // 10x10 shifted by 5 on x: inter 50, union 150
  assert.ok(Math.abs(iou(px(0, 0, 10, 10), px(5, 0, 10, 10)) - 50 / 150) < 1e-9);
});

test("coverage: fraction of the planted box the located box covers", () => {
  assert.equal(coverage(px(0, 0, 10, 10), px(0, 0, 10, 10)), 1);
  assert.equal(coverage(px(0, 0, 10, 10), px(0, 5, 10, 10)), 0.5);
  assert.equal(coverage(px(0, 0, 10, 10), px(20, 20, 10, 10)), 0);
});

test("thresholds are published, not tuned per image", () => {
  assert.equal(IOU_HIT, 0.5);
  assert.equal(COVERAGE_HIT, 0.5);
});

test("a full cover counts as recall even when strict IoU fails", () => {
  const planted = [{ category: "card", value: "4111", box: px(100, 100, 200, 20) }];
  const located = [{ category: "card", box: px(100, 100, 300, 60) }];
  const r = scoreImage(planted, located, 1000, 1000);
  assert.equal(r.hits, 1);
  assert.equal(r.recall, 1);
  assert.equal(r.strictHits, 0);
  assert.equal(r.strictRecall, 0);
  assert.deepEqual(r.misses, []);
});

test("category mismatch is a miss even with perfect overlap", () => {
  const planted = [{ category: "phone", value: "+91 98410 22334", box: px(100, 100, 200, 40) }];
  const located = [{ category: "order", box: px(100, 100, 200, 40) }];
  const r = scoreImage(planted, located, 1000, 1000);
  assert.equal(r.hits, 0);
  assert.equal(r.recall, 0);
  assert.equal(r.misses[0].reason, "no-box");
  assert.match(r.misses[0].value, /98410/);
});

test("a box that misses the text is a low-coverage miss, named", () => {
  const planted = [{ category: "name", value: "Asha Rao", box: px(0, 0, 100, 20) }];
  const located = [{ category: "name", box: px(80, 0, 100, 20) }];
  const r = scoreImage(planted, located, 1000, 1000);
  assert.equal(r.hits, 0);
  assert.equal(r.misses[0].reason, "low-coverage");
  assert.equal(r.misses[0].value, "Asha Rao");
});

test("matching is one-to-one: two planted, one box = one hit", () => {
  const planted = [
    { category: "name", value: "A", box: px(0, 0, 100, 20) },
    { category: "name", value: "B", box: px(0, 0, 100, 20) },
  ];
  const located = [{ category: "name", box: px(0, 0, 100, 20) }];
  const r = scoreImage(planted, located, 1000, 1000);
  assert.equal(r.hits, 1);
  assert.equal(r.misses.length, 1);
});

test("located boxes are pixels, so they are compared as-is", () => {
  const planted = [{ category: "logo", value: "ACME", box: px(640, 450, 128, 90) }];
  const located = [{ category: "logo", box: px(640, 450, 128, 90) }];
  const r = scoreImage(planted, located, 1280, 900);
  assert.equal(r.hits, 1);
  assert.equal(r.recall, 1);
});

test("a box shifted one line down is a miss, not a hit", () => {
  const planted = [{ category: "name", value: "Asha Rao", box: px(124, 127, 79, 16) }];
  const located = [{ category: "name", box: px(121, 166, 77, 16) }];
  const r = scoreImage(planted, located, 1280, 900);
  assert.equal(r.hits, 0);
  assert.equal(r.misses[0].reason, "low-coverage");
});
