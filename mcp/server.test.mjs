// MCP server tests — offline. The server wraps engine functions; these prove
// the wrapped logic the tools depend on. Live probe via MCP Inspector.
import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { maskImage, maskedVariance } from "../src/mask.mjs";
import { findLeaks } from "../src/leaks.mjs";
import { decide } from "../src/decide.mjs";

async function whitePng(w = 100, h = 60) {
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer();
}

test("mask tool path: box region becomes flat black", async () => {
  const input = await whitePng();
  const out = await maskImage(input, [{ box: { x: 10, y: 10, w: 30, h: 20 }, margin: 0 }]);
  const v = await maskedVariance(out, { x: 10, y: 10, w: 30, h: 20 });
  assert.equal(v, 0, "masked region must be variance-free");
});

test("verify tool path: planted leak refuses", () => {
  const items = [{ category: "email", value: "leak.me@example.com", valueKind: "literal" }];
  const leaks = findLeaks("contact leak.me@example.com today", items);
  assert.deepEqual(decide(leaks), { verdict: "refused" });
});

test("verify tool path: clean text releases", () => {
  const items = [{ category: "email", value: "leak.me@example.com", valueKind: "literal" }];
  const leaks = findLeaks("nothing to see here", items);
  assert.deepEqual(decide(leaks), { verdict: "released" });
});
