// Margin sweep: does a wider mask margin rescue the styled set?
// Local only — sharp, zero API. Writes runs/mask-sweep-styled-<date>.json.
// Usage: node scripts/margin-sweep.mjs [runFile] [keyFile]
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const runFile = process.argv[2] || "runs/locate-styled-2026-11-01.json";
const keyFile = process.argv[3] || "corpus/key/v1-styled.json";
const margins = [16, 40, 64];
const results = [];
for (const m of margins) {
  const dir = `corpus/out/masked-sweep-${m}`;
  mkdirSync(dir, { recursive: true });
  const gen = spawnSync(process.execPath, ["scripts/mask-images.mjs", runFile, dir], {
    encoding: "utf8",
    env: { ...process.env, MASK_MARGIN: String(m) },
  });
  if (gen.status !== 0) {
    console.error(`margin ${m}: mask-images failed`);
    process.exit(1);
  }
  const chk = spawnSync(
    process.execPath,
    ["scripts/mask-check.mjs", runFile, keyFile, dir],
    { encoding: "utf8" }
  );
  const out = chk.stdout + chk.stderr;
  const pass = out.match(/mask: (\d+)\/(\d+) images pass/);
  const fails = out
    .split("\n")
    .filter((l) => l.includes(": FAIL"))
    .map((l) => l.trim());
  results.push({ margin: m, pass: pass ? Number(pass[1]) : null, of: pass ? Number(pass[2]) : null, fails });
  console.log(`margin ${m}: ${pass ? pass[1] + "/" + pass[2] : "?"} pass`);
  for (const f of fails) console.log(`  ${f}`);
}
const stamp = new Date().toISOString().slice(0, 10);
writeFileSync(`runs/mask-sweep-styled-${stamp}.json`, JSON.stringify({ runFile, keyFile, results }, null, 2));
console.log(`wrote runs/mask-sweep-styled-${stamp}.json`);
