// S4 recall scoring tests. Pure math — no network, no key file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { iou, scoreImage, IOU_HIT } from "./recall.mjs";

const px = (x, y, w, h) => ({ x, y, w, h });

test("iou: identical boxes = 1, disjoint = 0", () => {
  assert.equal(iou(px(0, 0, 10, 10), px(0, 0, 10, 10)), 1);
  assert.equal(iou(px(0, 0, 10, 10), px(20, 20, 10, 10)), 0);
});

test("iou: known half overlap", () => {
  // 10x10 shifted by 5 on x: inter 50, union 150
  assert.ok(Math.abs(iou(px(0, 0, 10, 10), px(5, 0, 10, 10)) - 50 / 150) < 1e-9);
});

test("hit needs iou >= 0.5 and the same category", () => {
  assert.equal(IOU_HIT, 0.5);
  const planted = [{ category: "card", value: "4111", box: px(100, 100, 200, 40) }];
  // grid box covering the same pixels on a 1000x1000 image = same numbers
  const located = [{ category: "card", box: { x: 100, y: 100, w: 200, h: 40 } }];
  const r = scoreImage(planted, located, 1000, 1000);
  assert.equal(r.hits, 1);
  assert.equal(r.recall, 1);
  assert.deepEqual(r.misses, []);
});

test("category mismatch is a miss even with perfect overlap", () => {
  const planted = [{ category: "phone", value: "+91 98410 22334", box: px(100, 100, 200, 40) }];
  const located = [{ category: "order", box: { x: 100, y: 100, w: 200, h: 40 } }];
  const r = scoreImage(planted, located, 1000, 1000);
  assert.equal(r.hits, 0);
  assert.equal(r.recall, 0);
  assert.equal(r.misses[0].reason, "no-box");
  assert.match(r.misses[0].value, /98410/);
});

test("loose box is a low-iou miss, named", () => {
  const planted = [{ category: "name", value: "Asha Rao", box: px(0, 0, 100, 20) }];
  const located = [{ category: "name", box: { x: 80, y: 0, w: 100, h: 20 } }];
  const r = scoreImage(planted, located, 1000, 1000);
  assert.equal(r.hits, 0);
  assert.equal(r.misses[0].reason, "low-iou");
  assert.equal(r.misses[0].value, "Asha Rao");
});

test("matching is one-to-one: two planted, one box = one hit", () => {
  const planted = [
    { category: "name", value: "A", box: px(0, 0, 100, 20) },
    { category: "name", value: "B", box: px(0, 0, 100, 20) },
  ];
  const located = [{ category: "name", box: { x: 0, y: 0, w: 100, h: 20 } }];
  const r = scoreImage(planted, located, 1000, 1000);
  assert.equal(r.hits, 1);
  assert.equal(r.misses.length, 1);
});

test("grid boxes are converted to pixels before comparing", () => {
  // 500 on the grid = 640px on a 1280-wide image
  const planted = [{ category: "logo", value: "ACME", box: px(640, 450, 128, 90) }];
  const located = [{ category: "logo", box: { x: 500, y: 500, w: 100, h: 100 } }];
  const r = scoreImage(planted, located, 1280, 900);
  assert.equal(r.hits, 1);
});
