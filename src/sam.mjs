// S6: SAM 3.1 concept prompts via /v1/responses. One noun per request.
// Ruling Oct 30: mask payload is a custom 85-char encoding; decode cut per
// D10 fallback. We use SAM's <|box|> (tight, measured) which already beats
// grounding boxes. Polygon decode is future work, not this card.
// Reads images, never the key (D7). One call per concept per image.
import { postJson } from "./http.mjs";

export const SAM_MODEL = "sam-3.1";
export const SAM_CONCEPTS = {
  face: "face",
  card: "payment card",
  sig: "signature",
  logo: "company logo",
};

export function parseSamBox(text) {
  // Empty response = SAM matched nothing: clean refusal, not an error.
  if (!text || !text.trim()) return { box: null, error: null, refused: true };
  const m = text.match(/<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);/);
  if (!m) return { box: null, error: "no-box" };
  const [, x1, y1, x2, y2] = m.map(Number);
  if (!(x2 > x1 && y2 > y1)) return { box: null, error: "bad-box" };
  return { box: { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, error: null };
}

export async function samLocate({ dataUrl, concept, apiKey, baseUrl, fetchImpl, sleep, now, maxAttempts }) {
  const body = {
    model: SAM_MODEL,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: concept },
          { type: "input_image", image_url: dataUrl },
        ],
      },
    ],
  };
  const r = await postJson(`${baseUrl.replace(/\/$/, "")}/responses`, {
    headers: { authorization: `Bearer ${apiKey}` },
    body,
    fetchImpl,
    sleep,
    now,
    maxAttempts,
  });
  const out0 = r.json?.output?.[0];
  const content = out0?.content ?? [];
  const text = content[0]?.text ?? "";
  const parsed = parseSamBox(typeof text === "string" ? text : "");
  // Envelope proof: an empty text with a real message envelope behind it is a
  // genuine "nothing found". A missing envelope means the reader path is wrong.
  const envelope = {
    outputLen: Array.isArray(r.json?.output) ? r.json.output.length : 0,
    contentTypes: content.map((c) => c.type),
  };
  return { ...parsed, usage: r.json?.usage ?? null, raw: text, envelope, status: r.status };
}
