// POST /api/verify — in-memory mask → attack → decide chain.
// Body: { imageBase64, boxes, secrets }. Never reads the answer key.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { maskImage } from "../../../../src/mask.mjs";
import { attack } from "../../../../src/attack.mjs";
import { findLeaks } from "../../../../src/leaks.mjs";
import { decide } from "../../../../src/decide.mjs";
import { toSendable } from "../../../../src/sendable.mjs";

const boxSchema = z.object({
  box: z.object({
    x: z.number().finite().min(0),
    y: z.number().finite().min(0),
    w: z.number().finite().positive(),
    h: z.number().finite().positive(),
  }),
  margin: z.number().finite().min(0).max(256).optional(),
});
const secretSchema = z.object({ category: z.string().min(1).max(64), value: z.string().min(1).max(500) });
const bodySchema = z.object({
  imageBase64: z.string().min(1),
  boxes: z.array(boxSchema).max(200).default([]),
  secrets: z.array(secretSchema).max(200).default([]),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ verdict: "refused", reason: "bad request body", leaks: [] }, { status: 400 });
  const { imageBase64, boxes, secrets } = parsed.data;
  if (!process.env.BASETEN_API_KEY || !process.env.BASETEN_BASE_URL)
    return NextResponse.json({ verdict: "refused", reason: "server missing BASETEN_API_KEY/BASETEN_BASE_URL" }, { status: 503 });
  try {
    const input = Buffer.from(imageBase64, "base64");
    const entries = boxes.map((b) => ({ box: b.box, margin: b.margin ?? 16 }));
    const masked = await maskImage(input, entries);
    const { dataUrl, imgW, imgH } = await toSendable(masked);
    const meta = { width: imgW, height: imgH };
    const r = await attack({
      dataUrl,
      apiKey: process.env.BASETEN_API_KEY ?? "",
      baseUrl: process.env.BASETEN_BASE_URL ?? "",
      model: process.env.BASETEN_MODEL ?? "meta-models/muse-spark-open-1026",
      fetchImpl: fetch,
      sleep: (ms: number) => new Promise((r2) => setTimeout(r2, ms)),
      now: () => Date.now(),
      maxAttempts: 3,
      timeoutMs: 90000,
    });
    if (r.error) return NextResponse.json({ verdict: "refused", reason: `attacker-error: ${r.error}`, leaks: [] });
    const items = secrets.map((s) => ({ category: s.category, value: s.value, valueKind: "literal" }));
    const leaks = findLeaks(r.text ?? "", items);
    const { verdict } = decide(leaks);
    return NextResponse.json({ verdict, leaks, replyChars: (r.text ?? "").length, imgW: meta.width, imgH: meta.height });
  } catch (e) {
    return NextResponse.json({ verdict: "refused", reason: `handler-error: ${String((e as Error)?.message ?? e)}`, leaks: [] }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ usage: "POST {imageBase64, boxes, secrets}" });
}
