// S4 cost-meter tests. Unknown model or missing usage must be null, never 0.
import { test } from "node:test";
import assert from "node:assert/strict";
import { costUsd, PRICES } from "./usage.mjs";

test("standard price: 1M in + 1M out on muse-spark-1.3 = $5.50", () => {
  const c = costUsd("muse-spark-1.3", { prompt_tokens: 1e6, completion_tokens: 1e6 });
  assert.ok(Math.abs(c - (PRICES["muse-spark-1.3"].in + PRICES["muse-spark-1.3"].out)) < 1e-9);
});

test("cached tokens are cheaper than fresh input", () => {
  const withCache = costUsd("muse-spark-1.3", {
    prompt_tokens: 1000,
    completion_tokens: 0,
    prompt_tokens_details: { cached_tokens: 400 },
  });
  const noCache = costUsd("muse-spark-1.3", { prompt_tokens: 1000, completion_tokens: 0 });
  assert.ok(withCache < noCache);
});

test("unknown model returns null — fail closed, not zero", () => {
  assert.equal(costUsd("not-a-model", { prompt_tokens: 10, completion_tokens: 10 }), null);
});

test("missing usage returns null — fail closed, not zero", () => {
  assert.equal(costUsd("muse-spark-1.3", undefined), null);
  assert.equal(costUsd("muse-spark-1.3", {}), null);
});

test("contributor model is never priced inside the product (D4)", () => {
  assert.equal(costUsd("muse-spark-1.3-contributor", { prompt_tokens: 10, completion_tokens: 10 }), null);
});
