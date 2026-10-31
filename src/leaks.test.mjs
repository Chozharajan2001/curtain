// findLeaks tests: the release/refuse gate must be able to fail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findLeaks, norm } from "./leaks.mjs";

const items = [
  { category: "email", value: "asha.rao@example.in", valueKind: "literal" },
  { category: "face", value: "SENTINEL:face-01", valueKind: "sentinel" },
];

test("exact match leaks", () => {
  assert.deepEqual(findLeaks("contact asha.rao@example.in today", items), ["asha.rao@example.in"]);
});

test("caps transcription still leaks", () => {
  assert.deepEqual(findLeaks("ASHA RAO AND 4111 1111 1111 1234", [
    { category: "name", value: "Asha Rao", valueKind: "literal" },
    { category: "card", value: "4111 1111 1111 1234", valueKind: "literal" },
  ]).sort(), ["4111 1111 1111 1234", "Asha Rao"]);
});

test("whitespace variants still leak", () => {
  assert.deepEqual(findLeaks("card  4111   1111  1111 1234", [
    { category: "card", value: "4111 1111 1111 1234", valueKind: "literal" },
  ]), ["4111 1111 1111 1234"]);
});

test("sentinels never match", () => {
  assert.deepEqual(findLeaks("SENTINEL:face-01 sentinel:face-01", items), []);
});

test("clean text has no leaks", () => {
  assert.deepEqual(findLeaks("nothing here", items), []);
});
