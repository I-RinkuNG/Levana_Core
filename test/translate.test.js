const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../translate.js");

test("direction: Thai-heavy text goes to EN, otherwise to TH", () => {
  assert.deepEqual(T.direction("ใช้ grep ก่อนเปิดไฟล์ทั้งหมด"), { source: "th", target: "en", label: "แปลเป็น EN" });
  assert.equal(T.direction("Use grep before opening files").target, "th");
  assert.equal(T.direction("").source, "en");
  assert.equal(T.thaiRatio("12 3 .,"), 0);
  assert.ok(T.thaiRatio("abc กขค") > 0.2 && T.thaiRatio("abc กขค") < 0.6);
});

test("translatable: skips whitespace, numbers, punctuation only", () => {
  for (const s of ["", "  \n", "123", "12.5%", "—", "(1)"]) assert.equal(T.translatable(s), false, s);
  for (const s of ["a", "ไทย", "v2 ok"]) assert.equal(T.translatable(s), true, s);
});

const el = (tag, attrs, parent) => ({ tag, attrs: attrs || {}, parentNode: parent || null, nodeType: 1 });
const txt = (v, parent) => ({ nodeValue: v, parentNode: parent, nodeType: 3 });
const matches = (n) => n.nodeType === 1 && (["pre", "code", "kbd", "samp", "script", "style"].includes(n.tag) || n.attrs.translate === "no");

test("pickNodes: skips code/pre/kbd/samp/translate=no ancestors on a fake tree", () => {
  const root = el("article"), p = el("p", {}, root), code = el("code", {}, p), pre = el("pre", {}, root), pcode = el("code", {}, pre), no = el("span", { translate: "no" }, p), em = el("em", {}, no);
  const nodes = [txt("hello", p), txt("grep", code), txt("block", pcode), txt("Kotev", em), txt("  ", p), txt("42", p), txt("world", root)];
  assert.deepEqual(T.pickNodes(nodes, matches).map((n) => n.nodeValue), ["hello", "world"]);
});

test("cacheKey includes direction; lru caps and keeps newest", () => {
  assert.notEqual(T.cacheKey("th>en", "a"), T.cacheKey("en>th", "a"));
  const o = {};
  for (let i = 0; i < 5; i++) T.lru(o, "k" + i, i, 3);
  assert.deepEqual(Object.keys(o), ["k2", "k3", "k4"]);
  T.lru(o, "k2", 9, 3);
  assert.deepEqual(Object.keys(o), ["k3", "k4", "k2"]);
});

test("sha1 gives 12 hex chars, stable", async () => {
  const a = await T.sha1("hello"), b = await T.sha1("hello");
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{12}$/);
  assert.equal(a, "aaf4c61ddcc5");
});
