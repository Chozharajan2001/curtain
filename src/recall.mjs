// Recall scoring. Pure math: no fs, no network, no key file (D7).
// Planted boxes are pixels; located boxes are on the 0-1000 grid.
import { gridToPixels } from "./coords.mjs";

export const IOU_HIT = 0.5;

export function iou(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

export function scoreImage(planted, located, imgW, imgH) {
  const boxes = located.map((b) => ({
    category: b.category,
    box: gridToPixels(b.box, imgW, imgH),
  }));

  const pairs = [];
  planted.forEach((it, i) =>
    boxes.forEach((b, j) => {
      if (b.category !== it.category) return;
      const v = iou(it.box, b.box);
      if (v >= IOU_HIT) pairs.push({ i, j, v });
    })
  );
  pairs.sort((a, b) => b.v - a.v);

  const usedPlanted = new Set();
  const usedLocated = new Set();
  for (const p of pairs) {
    if (usedPlanted.has(p.i) || usedLocated.has(p.j)) continue;
    usedPlanted.add(p.i);
    usedLocated.add(p.j);
  }

  const misses = [];
  planted.forEach((it, i) => {
    if (usedPlanted.has(i)) return;
    const sameCategory = boxes.some((b) => b.category === it.category);
    misses.push({
      category: it.category,
      value: it.value,
      reason: sameCategory ? "low-iou" : "no-box",
    });
  });

  return {
    planted: planted.length,
    hits: usedPlanted.size,
    recall: planted.length ? usedPlanted.size / planted.length : 0,
    misses,
  };
}
