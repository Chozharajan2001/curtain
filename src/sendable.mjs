// Shared image prep: EXIF-strip, downscale >1600px wide, normalize format.
// Same bytes the model saw in every pinned run (scripts/locate.mjs shape).
// Sharp first so orientation/format match what the model actually receives.
import sharp from "sharp";

export const MAX_SEND_WIDTH = 1600;

export function toDataUrl(bytes, mime = "image/png") {
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

export async function toSendable(input) {
  const meta = await sharp(input).metadata();
  let bytes = input;
  let w = meta.width;
  let h = meta.height;
  if (w > MAX_SEND_WIDTH) {
    bytes = await sharp(input).rotate().resize({ width: MAX_SEND_WIDTH }).png().toBuffer();
    const m2 = await sharp(bytes).metadata();
    w = m2.width;
    h = m2.height;
    return { dataUrl: toDataUrl(bytes), imgW: w, imgH: h };
  }
  const fmt = meta.format === "jpeg" ? "jpeg" : "png";
  bytes = await sharp(input).rotate().toFormat(fmt).toBuffer();
  return { dataUrl: toDataUrl(bytes, `image/${fmt}`), imgW: w, imgH: h };
}
