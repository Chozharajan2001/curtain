// Prints "<n> checks" using TAP output: "# pass N".
// Fail-closed: zero test files, zero passes, or any failing test → exit 1.
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walkTests(dir, out = []) {
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const n of names) {
    const p = join(dir, n);
    if (n === "node_modules" || n === ".git") continue;
    if (statSync(p).isDirectory()) walkTests(p, out);
    else if (n.endsWith(".test.mjs")) out.push(p);
  }
  return out;
}

const files = [...walkTests("src"), ...walkTests("scripts")];

if (files.length === 0) {
  console.log("0 checks");
  console.error("verify: no test files found — failing closed");
  process.exit(1);
}

const r = spawnSync(
  process.execPath,
  ["--test-reporter=tap", "--test", ...files],
  { encoding: "utf8" }
);
process.stdout.write(r.stdout);
process.stderr.write(r.stderr);
const out = r.stdout + r.stderr;
const pass = Number(out.match(/# pass (\d+)/)?.[1] ?? 0);
const fail = Number(out.match(/# fail (\d+)/)?.[1] ?? 0);
console.log(`${pass} checks`);
process.exit(pass > 0 && fail === 0 && (r.status ?? 1) === 0 ? 0 : 1);
