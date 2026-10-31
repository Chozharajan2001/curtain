// S7 attacker tests. No network — extract + match only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractText } from "./attack.mjs";
import { findLeaks } from "./leaks.mjs";

test("extractText reads string and part-array content", () => {
  assert.equal(extractText({ message: { content: "hello" } }), "hello");
  assert.equal(extractText({ message: { content: [{ text: "a" }, { text: "b" }] } }), "a\nb");
  assert.equal(extractText({}), "");
});

test("findLeaks names planted literals, ignores sentinels", () => {
  const items = [
    { category: "email", value: "asha.rao@example.in", valueKind: "literal" },
    { category: "face", value: "SENTINEL:face-01", valueKind: "sentinel" },
  ];
  assert.deepEqual(findLeaks("contact asha.rao@example.in today", items), ["asha.rao@example.in"]);
  assert.deepEqual(findLeaks("nothing here", items), []);
  assert.deepEqual(findLeaks("SENTINEL:face-01", items), []);
});
