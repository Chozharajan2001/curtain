// Locate stage: one image -> labelled boxes on the 0-1000 grid.
// Temperature 0. Unparseable output fails closed: zero boxes + an error string.
import { postJson } from "./http.mjs";

export const CATEGORIES = [
  "name",
  "phone",
  "email",
  "address",
  "order",
  "card",
  "govt",
  "account",
  "face",
  "note",
  "sig",
  "logo",
];

export function buildPrompt(imgW, imgH) {
  return [
    "You are a privacy locator. Find every piece of personal data in the image.",
    'Return strict JSON only, no prose, no markdown: {"boxes":[{"category":"<slug>","box":{"x":0,"y":0,"w":0,"h":0},"value":"<exact text or short label>"}]}',
    `category must be exactly one of: ${CATEGORIES.join(", ")}.`,
    `The image is exactly ${imgW} pixels wide and ${imgH} pixels tall.`,
    "box x,y,w,h are PIXELS in that image. x,y is the top-left corner of the text.",
    "Measure each box tightly around the exact characters or object edges. No padding, no whole-line boxes.",
    "Place every box on the actual ink. Do not estimate positions by counting lines from the top.",
    'Include every face, name, phone, email, address, account or order number, payment card, government ID, handwritten note, signature and company logo you can see. If there are none, return {"boxes":[]}.',
  ].join("\n");
}

export function parseBoxes(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { boxes: [], dropped: 0, error: "no-json" };

  let json;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { boxes: [], dropped: 0, error: "bad-json" };
  }
  if (!json || !Array.isArray(json.boxes)) {
    return { boxes: [], dropped: 0, error: "no-boxes-array" };
  }

  const boxes = [];
  let dropped = 0;
  for (const b of json.boxes) {
    const box = b?.box;
    const ok =
      b &&
      CATEGORIES.includes(b.category) &&
      box &&
      ["x", "y", "w", "h"].every((k) => Number.isFinite(box[k])) &&
      box.w > 0 &&
      box.h > 0;
    if (!ok) {
      dropped++;
      continue;
    }
    boxes.push({
      category: b.category,
      value: typeof b.value === "string" ? b.value : "",
      box: { x: box.x, y: box.y, w: box.w, h: box.h },
    });
  }
  return { boxes, dropped, error: null };
}

export function toDataUrl(bytes, mime = "image/png") {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

export async function locate({
  dataUrl,
  imgW,
  imgH,
  apiKey,
  baseUrl,
  model = "muse-spark-1.3",
  fetchImpl,
  sleep,
  now,
  maxAttempts,
}) {
  const body = {
    model,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildPrompt(imgW, imgH) },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  };

  const r = await postJson(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    headers: { authorization: `Bearer ${apiKey}` },
    body,
    fetchImpl,
    sleep,
    now,
    maxAttempts,
  });

  const content = r.json?.choices?.[0]?.message?.content ?? "";
  const text = typeof content === "string" ? content : JSON.stringify(content);
  const parsed = parseBoxes(text);
  return { ...parsed, usage: r.json?.usage ?? null, raw: text, status: r.status };
}
