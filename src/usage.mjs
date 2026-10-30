// Cost meter. Prices from the Standard tier (D4). Unknown model => null.
import { appendFileSync } from "node:fs";

export const PRICES = {
  "muse-spark-1.3": { in: 1.25, cached: 0.15, out: 4.25 },
  "meta-models/muse-spark-open-1026": { in: 1.25, cached: 0.15, out: 4.25 },
};

export function costUsd(model, usage) {
  const p = PRICES[model];
  if (!p || !usage) return null;
  const pin = usage.prompt_tokens;
  const pout = usage.completion_tokens;
  if (!Number.isFinite(pin) || !Number.isFinite(pout)) return null;
  const raw = usage.prompt_tokens_details?.cached_tokens;
  const cached = Number.isFinite(raw) ? raw : 0;
  const fresh = Math.max(0, pin - cached);
  return (fresh * p.in + cached * p.cached + pout * p.out) / 1e6;
}

export function usageRecord({ model, usage, tag }) {
  return {
    ts: new Date().toISOString(),
    model,
    tag,
    usage: usage ?? null,
    usd: costUsd(model, usage),
  };
}

export function appendUsage(path, rec) {
  appendFileSync(path, JSON.stringify(rec) + "\n");
}
