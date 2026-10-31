// Key manifest: SHA-256 of the answer key file, stored at build time.
// Scorers recompute and compare. Mismatch -> refuse to score (exit 2).
// Detects accidental edits, not adversaries (repo is public; the key is visible).
// Callers pass paths; defaults live in callers so this module never names the key.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

export const DEFAULT_KEY = "corpus/key/v1.json";
export const DEFAULT_MANIFEST = "corpus/key/manifest.json";

export function keyHash(keyText) {
  return createHash("sha256").update(keyText).digest("hex");
}

export function writeManifest(keyPath = DEFAULT_KEY, outPath = DEFAULT_MANIFEST) {
  const text = readFileSync(keyPath, "utf8");
  const manifest = { sha256: keyHash(text), items: JSON.parse(text).images.reduce((n, im) => n + im.items.length, 0) };
  writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  return manifest;
}

export function checkManifest(keyPath = DEFAULT_KEY, manifestPath = DEFAULT_MANIFEST) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return { ok: false, reason: "no-manifest" };
  }
  let text;
  try {
    text = readFileSync(keyPath, "utf8");
  } catch {
    return { ok: false, reason: "no-key" };
  }
  if (keyHash(text) !== manifest.sha256) {
    return { ok: false, reason: "tampered-key" };
  }
  return { ok: true };
}
