// One coordinate function. Key, model boxes, pixels all live on the 0-1000 grid.
// Convert in exactly one place. (TECH_STACK Section 7, D12)
export function gridToPixels(box, imgW, imgH) {
  return {
    x: Math.round((box.x / 1000) * imgW),
    y: Math.round((box.y / 1000) * imgH),
    w: Math.round((box.w / 1000) * imgW),
    h: Math.round((box.h / 1000) * imgH),
  };
}

// Shrink big images to max 1600px wide before sending.
// Returns the factor; map boxes with it to the bytes actually sent.
export const MAX_SEND_WIDTH = 1600;

export function sendScale(imgW) {
  if (imgW <= MAX_SEND_WIDTH) return 1;
  return MAX_SEND_WIDTH / imgW;
}
