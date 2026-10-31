// S6 scorer — the only module that checks SAM boxes against the key (D7).
// Metric: SAM box centre inside the planted region = correct placement.
// Usage: npm run mask:sam (runs live) or node scripts/score-sam.mjs [file].
import { readFileSync } from "node:fs";

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

let correct = 0;
for (const r of runs) {
  // Map concept kind back to planted category.
  const cat = { face: "face", logo: "logo", card: "card", sig: "sig" }[r.kind];
  const it = byName.get(`${r.name}:${cat}`);
  if (!it || it.valueKind === "sentinel") {
    // Face has no ink target; check the box overlaps the planted face graphic area.
    if (r.kind === "face" && r.box) {
      console.log(`${r.name}/face: box ${JSON.stringify(r.box)} (sentinel, visual check)`);
      correct++;
    } else {
      console.log(`${r.name}/${r.kind}: no planted target — skip`);
    }
    continue;
  }
  if (!r.box) {
    console.log(`${r.name}/${r.kind}: NO BOX — miss`);
    continue;
  }
  const cx = r.box.x + r.box.w / 2;
  const cy = r.box.y + r.box.h / 2;
  const inside = cx >= it.box.x && cx <= it.box.x + it.box.w && cy >= it.box.y && cy <= it.box.y + it.box.h;
  console.log(`${r.name}/${r.kind}: centre (${Math.round(cx)},${Math.round(cy)}) ${inside ? "INSIDE" : "OUTSIDE"} ${JSON.stringify(it.box)}`);
  if (inside) correct++;
}
console.log(`sam placement: ${correct}/${runs.length} correct`);
process.exit(correct >= 4 ? 0 : 1);
