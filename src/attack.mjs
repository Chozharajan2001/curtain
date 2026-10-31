// S7 attacker: Muse Spark Open on Baseten reads ONLY the masked image.
// No boxes, no original, no key. Fail-closed: unparseable = refused (D9).
// D23 applies: "nothing found" is a claim the scorer checks against the key.
import { postJson } from "./http.mjs";

export const ATTACK_PROMPT = [
  "Read every character, name, number, address and email visible in this image.",
  "Reply with exactly what you see, in plain text, nothing else.",
  "Do not guess what is hidden behind black boxes. Only transcribe visible text.",
].join("\n");

export function extractText(choice) {
  const c = choice?.message?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p) => p.text ?? "").join("\n");
  return "";
}

export async function attack({ dataUrl, apiKey, baseUrl, model, fetchImpl, sleep, now, maxAttempts }) {
  const body = {
    model,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: ATTACK_PROMPT },
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
  const text = extractText(r.json?.choices?.[0]);
  if (!text.trim()) return { text: "", error: "empty-reply", usage: r.json?.usage ?? null, status: r.status };
  return { text, error: null, usage: r.json?.usage ?? null, status: r.status };
}
