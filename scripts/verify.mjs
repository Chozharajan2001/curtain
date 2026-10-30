// Prints "<n> checks" = number of passing tests in src/ and scripts/.
// S1: no test files yet, so this prints "0 checks" and exits 0.
// Later slices add *.test.mjs files; the count grows honestly.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const files = [];
for (const dir of ["src", "scripts"]) {
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    continue;
  }
  for (const n of names) {
    if (n.endsWith(".test.mjs")) files.push(join(dir, n));
  }
}

let pass = 0;
let code = 0;
if (files.length > 0) {
  const r = spawnSync(process.execPath, ["--test", ...files], {
    encoding: "utf8",
  });
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  const m = r.stdout.match(/# pass (\d+)/);
  pass = m ? Number(m[1]) : 0;
  code = r.status ?? 1;
}
console.log(`${pass} checks`);
process.exit(code);
