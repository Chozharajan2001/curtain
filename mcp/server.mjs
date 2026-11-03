// Curtain MCP server — the agent door onto the engine.
// Three tools, stdio transport. No key file, no pinned runs, no shell.
// Secrets arrive as call args (the agent's own list), never from disk.
// Env: META_API_KEY (+META_BASE_URL/META_MODEL) for locate,
//       BASETEN_API_KEY (+BASETEN_BASE_URL/BASETEN_MODEL) for attack.
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import sharp from "sharp";
import { locate } from "../src/locate.mjs";
import { maskImage } from "../src/mask.mjs";
import { attack } from "../src/attack.mjs";
import { findLeaks } from "../src/leaks.mjs";
import { decide } from "../src/decide.mjs";
import { appendUsage, usageRecord, costUsd } from "../src/usage.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_SEND_WIDTH = 1600;

function env(name, fallback) {
  return process.env[name] ?? fallback;
}

async function toSendable(input) {
  const meta = await sharp(input).metadata();
  let bytes = input;
  let w = meta.width;
  let h = meta.height;
  if (w > MAX_SEND_WIDTH) {
    bytes = await sharp(input).rotate().resize({ width: MAX_SEND_WIDTH }).png().toBuffer();
    const m2 = await sharp(bytes).metadata();
    w = m2.width;
    h = m2.height;
  } else {
    const fmt = meta.format === "jpeg" ? "jpeg" : "png";
    bytes = await sharp(input).rotate().toFormat(fmt).toBuffer();
  }
  const mime = bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : "image/png";
  return { dataUrl: `data:${mime};base64,${bytes.toString("base64")}`, imgW: w, imgH: h };
}

const server = new McpServer({ name: "curtain", version: "0.1.0" });

server.registerTool(
  "inspect",
  {
    description: "Locate PII boxes in an image (names, numbers, faces). Returns labelled boxes.",
    inputSchema: { imageBase64: z.string().describe("PNG or JPEG bytes, base64") },
  },
  async ({ imageBase64 }) => {
    const input = Buffer.from(imageBase64, "base64");
    const { dataUrl, imgW, imgH } = await toSendable(input);
    const r = await locate({
      dataUrl, imgW, imgH,
      apiKey: env("META_API_KEY", ""),
      baseUrl: env("META_BASE_URL", "https://api.meta.ai/v1"),
      model: env("META_MODEL", "muse-spark-1.3"),
    });
    appendUsage(join(root, "usage.jsonl"), usageRecord({ model: env("META_MODEL", "muse-spark-1.3"), usage: r.usage, tag: "mcp:inspect" }));
    return { content: [{ type: "text", text: JSON.stringify({ w: imgW, h: imgH, boxes: r.boxes, dropped: r.dropped, error: r.error ?? null }) }] };
  }
);

server.registerTool(
  "mask",
  {
    description: "Paint solid black boxes over an image. Returns the masked PNG as base64.",
    inputSchema: {
      imageBase64: z.string().describe("PNG or JPEG bytes, base64"),
      boxes: z.array(z.any()).describe("Boxes to cover: [{category, box:{x,y,w,h}}]"),
    },
  },
  async ({ imageBase64, boxes }) => {
    const input = Buffer.from(imageBase64, "base64");
    const entries = (boxes ?? []).map((b) => (b.box ? { box: b.box, margin: b.margin ?? 16 } : { box: b, margin: 16 }));
    const out = await maskImage(input, entries);
    return { content: [{ type: "text", text: JSON.stringify({ maskedBase64: out.toString("base64"), boxes: entries.length }) }] };
  }
);

server.registerTool(
  "verify",
  {
    description: "Mask an image, attack the masked image with a second model, refuse on leaks. Secrets arrive as args.",
    inputSchema: {
      imageBase64: z.string().describe("Original PNG or JPEG bytes, base64"),
      boxes: z.array(z.any()).describe("Boxes to mask"),
      secrets: z.array(z.any()).describe("Planted secrets to check: [{category, value}]"),
    },
  },
  async ({ imageBase64, boxes, secrets }) => {
    const input = Buffer.from(imageBase64, "base64");
    const entries = (boxes ?? []).map((b) => (b.box ? { box: b.box, margin: b.margin ?? 16 } : { box: b, margin: 16 }));
    const masked = await maskImage(input, entries);
    const { dataUrl, imgW, imgH } = await toSendable(masked);
    const r = await attack({
      dataUrl,
      apiKey: env("BASETEN_API_KEY", ""),
      baseUrl: env("BASETEN_BASE_URL", ""),
      model: env("BASETEN_MODEL", "meta-models/muse-spark-open-1026"),
    });
    appendUsage(join(root, "usage.jsonl"), usageRecord({ model: env("BASETEN_MODEL", "meta-models/muse-spark-open-1026"), usage: r.usage, tag: "mcp:verify" }));
    if (r.error) return { content: [{ type: "text", text: JSON.stringify({ verdict: "refused", reason: `attacker-error: ${r.error}`, leaks: [] }) }] };
    const items = (secrets ?? []).map((s) => ({ category: s.category, value: s.value, valueKind: "literal" }));
    const leaks = findLeaks(r.text ?? "", items);
    const { verdict } = decide(leaks);
    return { content: [{ type: "text", text: JSON.stringify({ verdict, leaks, replyChars: (r.text ?? "").length, imgW, imgH }) }] };
  }
);

await server.connect(new StdioServerTransport());
