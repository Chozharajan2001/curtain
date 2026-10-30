// One-call calibration probe. NOT part of the product: it measures how the
// model maps our image onto coordinates, so we can tell a scale mistake from
// an imprecise model. Truth comes from getBoundingClientRect, so it is exact.
// Cost: 1 API call.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { locate, toDataUrl } from "../src/locate.mjs";
import { appendUsage, usageRecord } from "../src/usage.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "corpus", "out");
mkdirSync(outDir, { recursive: true });

const W = 1280;
const H = 900;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#fff;font-family:Arial,sans-serif}
.m{position:absolute;font-size:48px;color:#000;white-space:nowrap}
</style></head><body>
<span class="m" style="left:80px;top:60px">Asha Rao</span>
<span class="m" style="left:860px;top:60px">asha.rao@example.in</span>
<span class="m" style="left:80px;top:700px">+91 98410 22334</span>
<span class="m" style="left:860px;top:700px">ORD-88412</span>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(html);
const truth = await page.$$eval(".m", (els) =>
  els.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  })
);
const png = await page.screenshot();
await browser.close();

const apiKey = process.env.META_API_KEY;
if (!apiKey) {
  console.error("probe: META_API_KEY missing");
  process.exit(2);
}

const r = await locate({
  dataUrl: toDataUrl(png),
  imgW: W,
  imgH: H,
  apiKey,
  baseUrl: process.env.META_BASE_URL || "https://api.meta.ai/v1",
  model: process.env.META_MODEL || "muse-spark-1.3",
});

writeFileSync(
  join(outDir, "probe-raw.json"),
  JSON.stringify({ truth, boxes: r.boxes, raw: r.raw, usage: r.usage, error: r.error }, null, 2)
);
appendUsage(
  join(root, "usage.jsonl"),
  usageRecord({
    model: process.env.META_MODEL || "muse-spark-1.3",
    usage: r.usage,
    tag: "probe:calibration",
  })
);

console.log("truth:", JSON.stringify(truth));
console.log("model:", JSON.stringify(r.boxes));
console.log("raw text:", r.raw);

// Implied frame size per box. If the model used a 0-1000 grid over our
// 1280x900 image, implied frame = 1280 x 900. Anything else is a conversion
// mistake we can correct in one place.
const cx = (b) => b.x + b.w / 2;
const cy = (b) => b.y + b.h / 2;
for (const m of r.boxes) {
  const t = truth
    .map((t) => ({ t, d: Math.hypot(cx(t) - cx(m.box), cy(t) - cy(m.box)) }))
    .sort((a, b) => a.d - b.d)[0];
  if (!t) continue;
  const imp = {
    from_x: t.t.x / m.box.x,
    from_w: t.t.w / m.box.w,
    from_y: t.t.y / m.box.y,
    from_h: t.t.h / m.box.h,
  };
  console.log(
    `marker truth=(${t.t.x},${t.t.y},${t.t.w},${t.t.h}) model=(${m.box.x},${m.box.y},${m.box.w},${m.box.h})` +
      ` implied_frame_w_from_x=${(imp.from_x * 1000).toFixed(0)} from_w=${(imp.from_w * 1000).toFixed(0)}` +
      ` implied_frame_h_from_y=${(imp.from_y * 1000).toFixed(0)} from_h=${(imp.from_h * 1000).toFixed(0)}`
  );
}
