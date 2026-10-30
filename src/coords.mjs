// One coordinate function. Key, model boxes, pixels all live on the 0-1000 grid.
// Convert in exactly one place, clamped to the image. (TECH_STACK Section 7, D12)
export function gridToPixels(box, imgW, imgH) {
  const x = Math.round((box.x / 1000) * imgW);
  const y = Math.round((box.y / 1000) * imgH);
  const w = Math.round((box.w / 1000) * imgW);
  const h = Math.round((box.h / 1000) * imgH);
  const cx = Math.min(Math.max(x, 0), imgW);
  const cy = Math.min(Math.max(y, 0), imgH);
  return {
    x: cx,
    y: cy,
    w: Math.min(Math.max(w, 0), imgW - cx),
    h: Math.min(Math.max(h, 0), imgH - cy),
  };
}

// Shrink big images to max 1600px wide before sending.
// Boxes come back on the grid relative to the bytes sent, so convert with
// the sent dimensions — never multiply by this factor after converting.
export const MAX_SEND_WIDTH = 1600;

export function sendScale(imgW) {
  if (imgW <= MAX_SEND_WIDTH) return 1;
  return MAX_SEND_WIDTH / imgW;
}
