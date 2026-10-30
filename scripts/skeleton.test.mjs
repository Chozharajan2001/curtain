// S3 preview: static HTML reading corpus/out/skeleton.json. No server.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { gridToPixels, sendScale, MAX_SEND_WIDTH } from "../src/coords.mjs";
import { decide } from "../src/decide.mjs";

test("gridToPixels maps 0-1000 grid to pixels", () => {
  assert.deepEqual(gridToPixels({ x: 0, y: 0, w: 1000, h: 1000 }, 1280, 900), {
    x: 0,
    y: 0,
    w: 1280,
    h: 900,
  });
  assert.deepEqual(gridToPixels({ x: 500, y: 250, w: 100, h: 200 }, 1280, 900), {
    x: 640,
    y: 225,
    w: 128,
    h: 180,
  });
});

test("sendScale caps at 1600px wide", () => {
  assert.equal(MAX_SEND_WIDTH, 1600);
  assert.equal(sendScale(1280), 1);
  assert.equal(sendScale(3200), 0.5);
});

test("decide is fail-closed", () => {
  assert.equal(decide([]).verdict, "released");
  assert.equal(decide(["4111 1111"]).verdict, "refused");
  assert.deepEqual(decide(["x"]).leaks, ["x"]);
  assert.equal(decide(null).verdict, "refused");
  assert.equal(decide("oops").verdict, "refused");
  assert.equal(decide(undefined).verdict, "refused");
});

test("skeleton output exists after run", () => {
  spawnSync(process.execPath, ["scripts/skeleton.mjs"], { encoding: "utf8" });
  assert.ok(existsSync("corpus/out/skeleton.json"));
  const r = JSON.parse(readFileSync("corpus/out/skeleton.json", "utf8"));
  assert.equal(r.length, 5);
});
