// S4 retry/backoff tests. Stub fetch — no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { backoffMs, postJson } from "./http.mjs";

const noSleep = async () => {};
const res = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

test("backoff grows and caps", () => {
  assert.equal(backoffMs(0), 500);
  assert.equal(backoffMs(1), 1000);
  assert.equal(backoffMs(2), 2000);
  assert.equal(backoffMs(99), 30000);
});

test("429 then 200: two attempts, second body returned", async () => {
  let n = 0;
  const fetchImpl = async () => (++n === 1 ? res(429, { error: "slow" }) : res(200, { ok: 1 }));
  const r = await postJson("http://x", { body: {}, fetchImpl, sleep: noSleep, now: () => 1e6 });
  assert.equal(r.attempts, 2);
  assert.deepEqual(r.json, { ok: 1 });
});

test("always 429: throws with status and attempt count", async () => {
  const fetchImpl = async () => res(429, { error: "slow" });
  await assert.rejects(
    () => postJson("http://x", { body: {}, fetchImpl, sleep: noSleep, now: () => 1e6, maxAttempts: 3 }),
    (e) => e.status === 429 && e.attempts === 3
  );
});

test("thrown network error is retried, then succeeds", async () => {
  let n = 0;
  const fetchImpl = async () => {
    if (++n === 1) throw new TypeError("fetch failed");
    return res(200, { ok: 1 });
  };
  const r = await postJson("http://x", { body: {}, fetchImpl, sleep: noSleep, now: () => 1e6 });
  assert.equal(r.attempts, 2);
  assert.equal(n, 2);
});

test("thrown network error exhausted: throws with attempt count", async () => {
  const fetchImpl = async () => {
    throw new TypeError("fetch failed");
  };
  await assert.rejects(
    () => postJson("http://x", { body: {}, fetchImpl, sleep: noSleep, now: () => 1e6, maxAttempts: 3 }),
    (e) => e.attempts === 3 && /http-fetch failed/.test(e.message)
  );
});

test("400 is not retried", async () => {
  let n = 0;
  const fetchImpl = async () => (n++, res(400, { error: "bad" }));
  await assert.rejects(
    () => postJson("http://x", { body: {}, fetchImpl, sleep: noSleep, now: () => 1e6 }),
    (e) => e.status === 400 && e.attempts === 1
  );
  assert.equal(n, 1);
});

test("rate cap waits between calls", async () => {
  const waits = [];
  const sleep = async (ms) => waits.push(ms);
  let t = 0;
  const now = () => t;
  const fetchImpl = async () => {
    t += 10;
    return res(200, { ok: 1 });
  };
  const post = () => postJson("http://x", { body: {}, fetchImpl, sleep, now, minIntervalMs: 400 });
  await post();
  await post();
  assert.ok(waits.some((ms) => ms > 0), "second call should wait for the cap");
});
