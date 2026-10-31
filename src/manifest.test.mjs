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

test("empty run fails: scorer exits non-zero on zero planted items", async () => {
  // Real scorer subprocess in a temp cwd with a full key-dir layout.
  // Empty key + matching manifest: tamper guard passes, empty gate must fire.
  const { spawnSync } = await import("node:child_process");
  const { mkdtempSync, writeFileSync, mkdirSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join, resolve } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "empty-run-"));
  try {
    mkdirSync(join(dir, "corpus", "key"), { recursive: true });
    const emptyKey = JSON.stringify({ images: [{ name: "t", items: [] }] });
    writeFileSync(join(dir, "corpus", "key", "v1.json"), emptyKey);
    const { writeManifest } = await import("./manifest.mjs");
    writeManifest(join(dir, "corpus", "key", "v1.json"), join(dir, "corpus", "key", "manifest.json"));
    const repo = resolve(".");
    const script = join(repo, "scripts", "score-attack.mjs");
    const run = join(repo, "runs", "attack-2026-10-31.json");
    const r = spawnSync(process.execPath, [script, run], { encoding: "utf8", cwd: dir });
    assert.notEqual(r.status, 0, "empty key must not score exit 0");
    assert.match(r.stdout + r.stderr, /unverified|zero planted/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
