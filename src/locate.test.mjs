// S4 locate parsing tests. Unparseable output must fail closed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, parseBoxes, CATEGORIES } from "./locate.mjs";

test("prompt names every category and the 0-1000 grid", () => {
  const p = buildPrompt(1280, 900);
  for (const c of CATEGORIES) assert.ok(p.includes(c), `prompt missing ${c}`);
  assert.match(p, /0-1000/);
  assert.match(p, /1280x900/);
  assert.match(p, /strict JSON/);
});

test("parses plain JSON", () => {
  const r = parseBoxes('{"boxes":[{"category":"name","box":{"x":1,"y":2,"w":30,"h":4},"value":"A"}]}');
  assert.equal(r.boxes.length, 1);
  assert.equal(r.error, null);
  assert.equal(r.boxes[0].category, "name");
});

test("parses fenced JSON", () => {
  const r = parseBoxes('here you go\n```json\n{"boxes":[]}\n```');
  assert.equal(r.error, null);
  assert.deepEqual(r.boxes, []);
});

test("garbage fails closed: no boxes, error set", () => {
  const r = parseBoxes("I cannot see any personal data here.");
  assert.deepEqual(r.boxes, []);
  assert.ok(r.error);
});

test("unknown category is dropped and counted, never guessed", () => {
  const r = parseBoxes(
    '{"boxes":[{"category":"person name","box":{"x":0,"y":0,"w":10,"h":10}},{"category":"email","box":{"x":0,"y":0,"w":10,"h":10}}]}'
  );
  assert.equal(r.boxes.length, 1);
  assert.equal(r.boxes[0].category, "email");
  assert.equal(r.dropped, 1);
  assert.equal(r.error, null);
});

test("zero-size box is dropped", () => {
  const r = parseBoxes('{"boxes":[{"category":"face","box":{"x":5,"y":5,"w":0,"h":10}}]}');
  assert.equal(r.boxes.length, 0);
  assert.equal(r.dropped, 1);
});

test("boxes array missing fails closed", () => {
  const r = parseBoxes('{"result":"none"}');
  assert.deepEqual(r.boxes, []);
  assert.ok(r.error);
});
