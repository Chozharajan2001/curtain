// S5 mask by box: solid fill, flatten, metadata strip. Reads located boxes
// (run3), never the key (D7). One sharp pipeline does all three.
import sharp from "sharp";

// Covers the measured locate drift (dy <= 13px on S4 run3). Verified by hand
// on the worst case (ticket card): margin 8 misses by 1px, 16 covers.
export const MARGIN = 16;
export const FILL = { r: 0, g: 0, b: 0 };

export function expandBox(box, imgW, imgH, margin = MARGIN, rightBias = 0) {
  const x = Math.max(box.x - margin, 0);
  const y = Math.max(box.y - margin, 0);
  return {
    x,
    y,
    w: Math.min(box.x + box.w + margin + rightBias, imgW) - x,
    h: Math.min(box.y + box.h + margin, imgH) - y,
  };
}

export async function maskImage(input, boxes, margin = MARGIN) {
  const base = sharp(input);
  const meta = await base.metadata();
  const imgW = meta.width;
  const imgH = meta.height;
  // Each entry is a box or {box, margin, rightBias}. SAM-tight boxes carry margin 4.
  const fills = boxes.map((entry) => {
    const b = entry.box ? entry.box : entry;
    const m = entry.box ? (entry.margin ?? margin) : margin;
    const rb = entry.box ? (entry.rightBias ?? 0) : 0;
    const e = expandBox(b, imgW, imgH, m, rb);
    return {
      input: {
        create: { width: e.w, height: e.h, channels: 3, background: FILL },
      },
      left: e.x,
      top: e.y,
    };
  });
  // flatten merges transparency, removeAlpha drops the channel; no exif/xmp written out.
  return base
    .composite(fills)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .removeAlpha()
    .png()
    .toBuffer();
}

export async function maskedVariance(png, box) {
  // Drop alpha first: opaque black (0,0,0,255) must read as variance 0.
  // The mask paints RGB; the alpha channel is always 255 and would fake a failure.
  const { data, info } = await sharp(png)
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let mean = 0;
  let m2 = 0;
  for (let i = 0; i < data.length; i++) {
    const d = data[i] - mean;
    mean += d / (i + 1);
    m2 += d * (data[i] - mean);
  }
  return data.length > 1 ? m2 / data.length : 0;
}
