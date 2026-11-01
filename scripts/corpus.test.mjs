// S2 guard: answer key exists, product code never reads it.
// Any reference to corpus/key outside scripts/ fails this test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

test("key v1 frozen: 22 planted items across 5 synthetic images", () => {
  // v1 never changes — pinned runs reproduce against it. S12 sets live elsewhere.
  const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
  assert.equal(key.images.length, 5);
  const total = key.images.reduce((n, im) => n + im.items.length, 0);
  assert.equal(total, 22);
  for (const im of key.images) {
    assert.ok(!im.source || im.source === "synthetic", `${im.name}: v1 is synthetic-only`);
  }
});

test("key values are scorable: valid kind, sentinel shape, no dup literal", () => {
  const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
  for (const im of key.images) {
    const seen = new Set();
    for (const it of im.items) {
      assert.ok(
        it.valueKind === "literal" || it.valueKind === "sentinel",
        `${im.name}: bad valueKind on ${it.category}`
      );
      if (it.valueKind === "sentinel") {
        assert.match(it.value, /^SENTINEL:\S+$/, `${im.name}: bad sentinel`);
      } else {
        assert.ok(it.value.trim().length > 0, `${im.name}: empty literal`);
        assert.ok(!seen.has(it.value), `${im.name}: dup literal ${it.value}`);
        seen.add(it.value);
      }
    }
  }
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
  // build-corpus.mjs writes the key; count-planted.mjs, score-locate.mjs,
  // compare-runs.mjs, mask-check.mjs, score-sam.mjs, score-attack.mjs,
  // build-screen.mjs and variance.mjs score against it; overlay.mjs draws it
  // for a human; manifest.mjs owns the hash paths. None is product code.
  const allowed = new Set([
    "scripts/build-corpus.mjs",
    "scripts/count-planted.mjs",
    "scripts/score-locate.mjs",
    "scripts/score-locate.test.mjs",
    "scripts/compare-runs.mjs",
    "scripts/mask-check.mjs",
    "scripts/score-sam.mjs",
    "scripts/score-attack.mjs",
    "scripts/build-screen.mjs",
    "scripts/variance.mjs",
    "scripts/overlay.mjs",
    "scripts/probe-pixels.mjs",
    "src/manifest.mjs",
  ]);
  for (const f of walk("src").concat(walk("scripts"))) {
    if (allowed.has(f.replace(/\\/g, "/"))) continue;
    const code = readFileSync(f, "utf8");
    assert.ok(!code.includes("corpus/key"), `${f} must not read the key`);
  }
});
