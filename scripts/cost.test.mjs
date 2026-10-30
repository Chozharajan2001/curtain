// cost.mjs prints calls + usd from usage.jsonl. No network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("cost prints calls and usd lines", () => {
  const r = spawnSync(process.execPath, ["scripts/cost.mjs"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^calls=\d+ usd=\d+\.\d{4}\n$/);
});
