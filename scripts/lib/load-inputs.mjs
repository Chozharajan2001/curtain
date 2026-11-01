// Shared scorer preamble: manifest check + key/run loading with clear errors.
// Scorers call loadKeyAndRuns() instead of repeating checkManifest + JSON.parse.
// Exits 2 on tamper, 1 on missing/bad files or empty key — never throws raw.
import { readFileSync } from "node:fs";
import { checkManifest } from "../../src/manifest.mjs";

export function manifestFor(keyPath) {
  return keyPath === "corpus/key/v1.json"
    ? "corpus/key/manifest.json"
    : keyPath.replace(/[.]json$/, ".manifest.json");
}

function readJson(path, label, who) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.error(`${who}: no such ${label} — ${path}`);
    process.exit(1);
  }
  try {
    return JSON.parse(text);
  } catch {
    console.error(`${who}: bad JSON in ${label} — ${path}`);
    process.exit(1);
  }
}

export function loadKeyAndRuns(who, runFile, keyPath = "corpus/key/v1.json") {
  const manifest = checkManifest(keyPath, manifestFor(keyPath));
  if (!manifest.ok) {
    console.error(`${who}: refusing to score — ${manifest.reason}`);
    process.exit(2);
  }
  const key = readJson(keyPath, "key", who);
  const runs = readJson(runFile, "run", who);
  const planted = (key.images ?? []).reduce((n, im) => n + (im.items ?? []).length, 0);
  if (planted === 0) {
    console.log(`${who}: unverified — key has zero planted items, refusing to score`);
    process.exit(1);
  }
  return { key, runs, planted };
}
