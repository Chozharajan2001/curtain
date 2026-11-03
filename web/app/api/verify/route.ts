// POST /api/verify — in-memory mask → attack → decide chain.
// Body: { imageBase64, boxes, secrets }. Never touches corpus/key/.
import { NextRequest, NextResponse } from "next/server";
import { maskImage } from "../../../../src/mask.mjs";
import { attack } from "../../../../src/attack.mjs";
import { findLeaks } from "../../../../src/leaks.mjs";
import { decide } from "../../../../src/decide.mjs";

export async function POST(req: NextRequest) {
  const { imageBase64, boxes, secrets } = await req.json();
  if (!imageBase64) return NextResponse.json({ verdict: "refused", reason: "no image" }, { status: 400 });
  if (!process.env.BASETEN_API_KEY || !process.env.BASETEN_BASE_URL)
    return NextResponse.json({ verdict: "refused", reason: "server missing BASETEN_API_KEY/BASETEN_BASE_URL" }, { status: 503 });
  const input = Buffer.from(imageBase64, "base64");
  const entries = (boxes ?? []).map((b: { box?: { x: number; y: number; w: number; h: number }; margin?: number }) =>
    b.box ? { box: b.box, margin: b.margin ?? 16 } : { box: b, margin: 16 }
  );
  const masked = await maskImage(input, entries);
  const sharp = (await import("sharp")).default;
  const meta = await sharp(masked).metadata();
  const dataUrl = `data:image/png;base64,${masked.toString("base64")}`;
  const r = await attack({
    dataUrl,
    apiKey: process.env.BASETEN_API_KEY ?? "",
    baseUrl: process.env.BASETEN_BASE_URL ?? "",
    model: process.env.BASETEN_MODEL ?? "meta-models/muse-spark-open-1026",
    fetchImpl: fetch,
    sleep: (ms: number) => new Promise((r2) => setTimeout(r2, ms)),
    now: () => Date.now(),
    maxAttempts: 3,
  });
  if (r.error) return NextResponse.json({ verdict: "refused", reason: `attacker-error: ${r.error}`, leaks: [] });
  const items = (secrets ?? []).map((s: { category: string; value: string }) => ({
    category: s.category,
    value: s.value,
    valueKind: "literal",
  }));
  const leaks = findLeaks(r.text ?? "", items);
  const { verdict } = decide(leaks);
  return NextResponse.json({ verdict, leaks, replyChars: (r.text ?? "").length, imgW: meta.width, imgH: meta.height });
}

export async function GET() {
  return NextResponse.json({ usage: "POST {imageBase64, boxes, secrets}" });
}
