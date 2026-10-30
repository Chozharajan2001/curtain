// Recall scoring. Pure math: no fs, no network, no key file (D7).
// Planted boxes are ink pixels; located boxes are pixels too — the model is
// asked for pixel coordinates (measured: pixel space beats the 0-1000 grid).
//
// Two numbers, never one:
//   recall       — the located region COVERS the planted secret (>=50% of it).
//                   This is what the product needs: a mask that covers it.
//   strictRecall — COCO-style IoU >= 0.5 against the ink box. Harsher, and
//                   reported next to the first so nothing is hidden.
export const IOU_HIT = 0.5;
export const COVERAGE_HIT = 0.5;

export function intersection(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
}

export function iou(a, b) {
  const inter = intersection(a, b);
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

export function coverage(a, b) {
  const area = a.w * a.h;
  return area > 0 ? intersection(a, b) / area : 0;
}

export function scoreImage(planted, located, imgW, imgH) {
  const boxes = located.map((b) => ({ category: b.category, box: b.box }));

  const pairs = [];
  planted.forEach((it, i) =>
    boxes.forEach((b, j) => {
      if (b.category !== it.category) return;
      const cov = coverage(it.box, b.box);
      if (cov >= COVERAGE_HIT) pairs.push({ i, j, cov, iou: iou(it.box, b.box) });
    })
  );
  pairs.sort((a, b) => b.cov - a.cov);

  const usedPlanted = new Set();
  const usedLocated = new Set();
  const assigned = new Map();
  for (const p of pairs) {
    if (usedPlanted.has(p.i) || usedLocated.has(p.j)) continue;
    usedPlanted.add(p.i);
    usedLocated.add(p.j);
    assigned.set(p.i, p);
  }

  const misses = [];
  let strictHits = 0;
  planted.forEach((it, i) => {
    const a = assigned.get(i);
    if (a) {
      if (a.iou >= IOU_HIT) strictHits++;
      return;
    }
    const sameCategory = boxes.some((b) => b.category === it.category);
    misses.push({
      category: it.category,
      value: it.value,
      reason: sameCategory ? "low-coverage" : "no-box",
    });
  });

  const hits = assigned.size;
  return {
    planted: planted.length,
    hits,
    recall: planted.length ? hits / planted.length : 0,
    strictHits,
    strictRecall: planted.length ? strictHits / planted.length : 0,
    misses,
  };
}
