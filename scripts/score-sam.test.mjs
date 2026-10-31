// score-sam gate test: envelope proof enforced. No network, no key.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

function runWith(runs) {
  writeFileSync("corpus/out/sam-gate-fixture.json", JSON.stringify(runs));
  return spawnSync(process.execPath, ["scripts/score-sam.mjs", "corpus/out/sam-gate-fixture.json"], {
    encoding: "utf8",
  });
}

test("gate: envelope-backed refusal passes", () => {
  const r = runWith([
    { name: "photo", kind: "face", box: { x: 73, y: 126, w: 159, h: 197 }, error: null },
    { name: "photo", kind: "logo", box: null, error: null, refused: true, raw: "", envelope: { outputLen: 1, contentTypes: ["output_text"] } },
    { name: "ticket", kind: "card", box: null, error: null, refused: true, raw: "", envelope: { outputLen: 1, contentTypes: ["output_text"] } },
    { name: "bank", kind: "card", box: null, error: null, refused: true, raw: "", envelope: { outputLen: 1, contentTypes: ["output_text"] } },
    { name: "clinic", kind: "sig", box: null, error: null, refused: true, raw: "", envelope: { outputLen: 1, contentTypes: ["output_text"] } },
  ]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /1\/1 placed, 4\/4 refused/);
  rmSync("corpus/out/sam-gate-fixture.json", { force: true });
});

test("gate: stripped envelope fails closed", () => {
  const r = runWith([
    { name: "photo", kind: "face", box: { x: 73, y: 126, w: 159, h: 197 }, error: null },
    { name: "photo", kind: "logo", box: null, error: null, refused: true, raw: "" },
  ]);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /UNPROVEN/);
  rmSync("corpus/out/sam-gate-fixture.json", { force: true });
});
