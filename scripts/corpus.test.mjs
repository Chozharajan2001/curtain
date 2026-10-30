// S2 guard: answer key exists, product code never reads it.
// Any reference to corpus/key outside scripts/ fails this test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

test("key lists 22 planted items across 5 images", () => {
  const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
  assert.equal(key.images.length, 5);
  const total = key.images.reduce((n, im) => n + im.items.length, 0);
  assert.equal(total, 22);
});

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (n === "node_modules" || n === ".git") continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith(".mjs") || p.endsWith(".ts") || p.endsWith(".tsx")) {
      if (p.includes("corpus.test.mjs")) continue;
      out.push(p);
    }
  }
  return out;
}

test("no product import reads corpus/key", () => {
  // build-corpus.mjs writes the key; count-planted.mjs is the scorer.
  const allowed = new Set(["scripts/build-corpus.mjs", "scripts/count-planted.mjs"]);
  for (const f of walk("src").concat(walk("scripts"))) {
    if (allowed.has(f.replace(/\\/g, "/"))) continue;
    const code = readFileSync(f, "utf8");
    assert.ok(!code.includes("corpus/key"), `${f} must not read the key`);
  }
});
