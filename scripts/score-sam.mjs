// S6 scorer — the only module that checks SAM boxes against the key (D7).
// Metric: SAM box centre inside the planted region = correct placement.
// Usage: npm run mask:sam (runs live) or node scripts/score-sam.mjs [file].
import { readFileSync } from "node:fs";
import { checkManifest } from "../src/manifest.mjs";

const manifest = checkManifest();
if (!manifest.ok) {
  console.error(`score-sam: refusing to score � ${manifest.reason}`);
  process.exit(2);
}

const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));
const runFile = process.argv[2] || "corpus/out/sam.json";
let runs;
try {
  runs = JSON.parse(readFileSync(runFile, "utf8"));
} catch {
  console.log("sam: no run file — run mask:sam first (needs META_API_KEY)");
  process.exit(1);
}

const byName = new Map();
for (const im of key.images) for (const it of im.items) byName.set(`${im.name}:${it.category}`, it);

let placed = 0;
let refused = 0;
for (const r of runs) {
  // Map concept kind back to planted category.
  const cat = { face: "face", logo: "logo", card: "card", sig: "sig" }[r.kind];
  const it = byName.get(`${r.name}:${cat}`);
  if (!it) {
    console.log(`${r.name}/${r.kind}: no planted target — skip`);
    continue;
  }
  if (it.valueKind === "sentinel") {
    // Face box centre must land inside the planted face graphic box.
    if (!r.box) {
      console.log(`${r.name}/face: NO BOX — miss`);
      continue;
    }
    const cx = r.box.x + r.box.w / 2;
    const cy = r.box.y + r.box.h / 2;
    const inside = cx >= it.box.x && cx <= it.box.x + it.box.w && cy >= it.box.y && cy <= it.box.y + it.box.h;
    console.log(`${r.name}/face: centre (${Math.round(cx)},${Math.round(cy)}) ${inside ? "INSIDE" : "OUTSIDE"} ${JSON.stringify(it.box)}`);
    if (inside) placed++;
    continue;
  }
  if (!r.box) {
    const env = r.envelope ?? {};
    const proven =
      r.refused === true &&
      env.outputLen > 0 &&
      (env.contentTypes ?? []).includes("output_text");
    if (proven) {
      console.log(`${r.name}/${r.kind}: refused (envelope-proven, no object)`);
      refused++;
    } else {
      console.log(`${r.name}/${r.kind}: UNPROVEN refusal — miss (error=${r.error ?? "none"})`);
    }
    continue;
  }
  const cx = r.box.x + r.box.w / 2;
  const cy = r.box.y + r.box.h / 2;
  const inside = cx >= it.box.x && cx <= it.box.x + it.box.w && cy >= it.box.y && cy <= it.box.y + it.box.h;
  console.log(`${r.name}/${r.kind}: centre (${Math.round(cx)},${Math.round(cy)}) ${inside ? "INSIDE" : "OUTSIDE"} ${JSON.stringify(it.box)}`);
  if (inside) placed++;
}
console.log(`sam placement: ${placed}/1 placed, ${refused}/4 refused`);
process.exit(placed >= 1 && refused === 4 ? 0 : 1);
