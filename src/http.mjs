// Retry, backoff and rate cap for model calls. Hand-rolled on built-in fetch.
const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function backoffMs(attempt) {
  return Math.min(30000, 500 * 2 ** attempt);
}

let lastCall = null;

export async function postJson(url, opts = {}) {
  const {
    headers = {},
    body,
    fetchImpl = fetch,
    sleep = defaultSleep,
    now = Date.now,
    maxAttempts = 5,
    minIntervalMs = 400,
  } = opts;

  let attempts = 0;
  for (;;) {
    if (lastCall !== null) {
      const wait = minIntervalMs - (now() - lastCall);
      if (wait > 0) await sleep(wait);
    }
    attempts++;
    lastCall = now();

    let res;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (attempts >= maxAttempts) {
        const err = new Error(`http-fetch failed after ${attempts} attempt(s): ${e.message}`);
        err.attempts = attempts;
        err.cause = e;
        throw err;
      }
      await sleep(backoffMs(attempts - 1));
      continue;
    }

    if (res.ok) return { json: await res.json(), status: res.status, attempts };

    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempts >= maxAttempts) {
      const err = new Error(`http ${res.status} after ${attempts} attempt(s)`);
      err.status = res.status;
      err.attempts = attempts;
      throw err;
    }
    await sleep(backoffMs(attempts - 1));
  }
}
