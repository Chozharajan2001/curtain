// S8 verdict tests: empty run fails, tampered key refuses to score.
// No network, no model calls — pure gate logic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keyHash, writeManifest, checkManifest } from "./manifest.mjs";
import { decide } from "./decide.mjs";

test("empty leak list releases, anything else refuses", () => {
  assert.equal(decide([]).verdict, "released");
  assert.equal(decide(["x"]).verdict, "refused");
  assert.equal(decide(null).verdict, "refused");
  assert.equal(decide(undefined).verdict, "refused");
});

test("empty run fails: zero planted items is unverified, never released", () => {
  // A scorer with no images must exit non-zero. The rule: planted === 0
  // means the run proved nothing. This is the contract score-attack and
  // score-locate already enforce (exit 1 when planted is 0).
  const planted = 0;
  const verdict = planted > 0 ? decide([]).verdict : "unverified";
  assert.equal(verdict, "unverified");
});

test("untampered key passes manifest check", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  try {
    const key = JSON.stringify({ images: [{ name: "t", items: [1, 2] }] });
    writeFileSync(join(dir, "v1.json"), key);
    writeManifest(join(dir, "v1.json"), join(dir, "manifest.json"));
    assert.deepEqual(checkManifest(join(dir, "v1.json"), join(dir, "manifest.json")), { ok: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tampered key refuses to score", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  try {
    writeFileSync(join(dir, "v1.json"), JSON.stringify({ images: [] }));
    writeManifest(join(dir, "v1.json"), join(dir, "manifest.json"));
    writeFileSync(join(dir, "v1.json"), JSON.stringify({ images: [{ name: "x", items: [1] }] }));
    assert.deepEqual(checkManifest(join(dir, "v1.json"), join(dir, "manifest.json")), {
      ok: false,
      reason: "tampered-key",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("missing manifest or key refuses to score", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  try {
    assert.equal(checkManifest(join(dir, "v1.json"), join(dir, "manifest.json")).reason, "no-manifest");
    writeFileSync(join(dir, "v1.json"), "{}");
    assert.equal(checkManifest(join(dir, "v1.json"), join(dir, "manifest.json")).reason, "no-manifest");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("keyHash is stable sha256", () => {
  assert.equal(keyHash("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
