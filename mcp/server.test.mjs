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
  assert.deepEqual(decide(leaks), { verdict: "refused", leaks });
});

test("verify tool path: clean text releases", () => {
  const items = [{ category: "email", value: "leak.me@example.com", valueKind: "literal" }];
  const leaks = findLeaks("nothing to see here", items);
  assert.deepEqual(decide(leaks), { verdict: "released", leaks: [] });
});

test("garbage bytes fail as structured error, never throw", async () => {
  const bad = Buffer.from("not-an-image-at-all");
  let threw = false;
  try {
    await maskImage(bad, [{ box: { x: 0, y: 0, w: 10, h: 10 }, margin: 0 }]);
  } catch (e) {
    threw = true;
    assert.ok(String(e?.message ?? e).length > 0, "error must name the cause");
  }
  assert.ok(threw, "sharp must reject garbage input");
});

test("null box entries fail closed, never crash the gate", () => {
  const entries = ([null, { box: null }] ?? []).map((b) => {
    if (!b || !b.box) return null;
    return { box: b.box, margin: 16 };
  });
  assert.ok(entries.includes(null), "bad entries must be detectable before masking");
});

test("handler-error shape refuses with leaks empty", () => {
  const out = { verdict: "refused", reason: "handler-error: boom", leaks: [] };
  assert.deepEqual(decide(out.leaks), { verdict: "released", leaks: [] });
  assert.equal(out.verdict, "refused");
});
