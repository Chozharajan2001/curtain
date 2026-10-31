// S6 SAM box tests. No network — parse + math only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSamBox } from "./sam.mjs";

test("parseSamBox reads the box record", () => {
  const r = parseSamBox("<0f>0<|box;x1=73;y1=126;x2=232;y2=323;w=1046;h=522|><|mask;x=0;y=0;data=198,160,~xx|>");
  assert.equal(r.error, null);
  assert.deepEqual(r.box, { x: 73, y: 126, w: 159, h: 197 });
});

test("parseSamBox fails closed on garbage", () => {
  assert.equal(parseSamBox("hello").error, "no-box");
  assert.equal(parseSamBox("<|box;x1=5;y1=5;x2=5;y2=9;|>").error, "bad-box");
});

test("parseSamBox treats empty response as clean refusal", () => {
  for (const t of ["", "   ", null, undefined]) {
    const r = parseSamBox(t);
    assert.equal(r.box, null);
    assert.equal(r.error, null);
    assert.equal(r.refused, true);
  }
});
