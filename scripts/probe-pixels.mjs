// Probe: does the model place text better when asked for PIXELS instead of a
// 0-1000 grid? Runs the two images that drift. 2 API calls.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { postJson } from "../src/http.mjs";
import { parseBoxes } from "../src/locate.mjs";
import { toDataUrl } from "../src/locate.mjs";
import { appendUsage, usageRecord } from "../src/usage.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Literal key path so the D7 guard in corpus.test.mjs sees this file.
const key = JSON.parse(readFileSync("corpus/key/v1.json", "utf8"));

function pixelPrompt(w, h) {
  return [
    "You are a privacy locator. Find every piece of personal data in the image.",
    'Return strict JSON only: {"boxes":[{"category":"<slug>","box":{"x":0,"y":0,"w":0,"h":0},"value":"<exact text>"}]}',
    "category must be one of: name, phone, email, address, order, card, govt, account, face, note, sig, logo.",
    `The image is exactly ${w} pixels wide and ${h} pixels tall.`,
    "box x,y,w,h are PIXELS in that image, not a 0-1000 grid. x,y is the top-left corner of the text.",
    "Measure each box tightly around the exact characters. Do not estimate line positions from the top - place each box on the actual ink.",
  ].join("\n");
}

const apiKey = process.env.META_API_KEY;
const baseUrl = process.env.META_BASE_URL || "https://api.meta.ai/v1";
const model = process.env.META_MODEL || "muse-spark-1.3";

for (const name of ["ticket", "clinic"]) {
  const im = key.images.find((i) => i.name === name);
  const bytes = readFileSync(join(root, "corpus/img", `${name}.png`));
  const body = {
    model,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: pixelPrompt(im.width, im.height) },
          { type: "image_url", image_url: { url: toDataUrl(bytes) } },
        ],
      },
    ],
  };
  const r = await postJson(`${baseUrl}/chat/completions`, {
    headers: { authorization: `Bearer ${apiKey}` },
    body,
  });
  appendUsage(
    join(root, "usage.jsonl"),
    usageRecord({ model, usage: r.json?.usage ?? null, tag: `probe:pixels:${name}` })
  );
  const content = r.json?.choices?.[0]?.message?.content ?? "";
  const text = typeof content === "string" ? content : JSON.stringify(content);
  const parsed = parseBoxes(text);
  console.log(`\n=== ${name} (${im.width}x${im.height})`);
  for (const it of im.items) {
    const m = parsed.boxes.find((b) => b.category === it.category);
    if (!m) {
      console.log(`  ${it.category.padEnd(8)} key=(${it.box.x},${it.box.y})  none`);
      continue;
    }
    const dy = m.box.y - it.box.y;
    const dx = m.box.x - it.box.x;
    console.log(
      `  ${it.category.padEnd(8)} key=(${it.box.x},${it.box.y}) model=(${m.box.x},${m.box.y}) dx=${dx} dy=${dy}`
    );
  }
  writeFileSync(join(root, "corpus/out", `probe-pixels-${name}.json`), text);
}
