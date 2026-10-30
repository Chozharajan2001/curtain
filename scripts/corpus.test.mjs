// S2 guard: answer key exists, product code never reads it.
// Any non-scoring import of corpus/key fails this test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

test("key lists 22 planted items across 5 images", () => {
  const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
  assert.equal(key.images.length, 5);
  const total = key.images.reduce((n, im) => n + im.items.length, 0);
  assert.equal(total, 22);
});

test("no product import reads corpus/key", () => {
  const srcFiles = readdirSync("src").filter((f) => f.endsWith(".mjs"));
  for (const f of srcFiles) {
    const code = readFileSync(`src/${f}`, "utf8");
    assert.ok(!code.includes("corpus/key"), `${f} must not read the key`);
  }
});
