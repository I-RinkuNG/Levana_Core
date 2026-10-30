const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");

const files = [
  { path: "README.md", text: "# r\nsee [kotev](lessons/kotev.md#top) and [web](https://x.com/a.md) and `lessons/rosh.md` code" },
  { path: "lessons/kotev.md", text: "- link [rosh](rosh.md) and [up](../README.md)\n- mentions agents/bochek.md and rosh.md\n```\nlessons/amet.md Kotev #41\n```" },
  { path: "lessons/rosh.md", text: "Rosh wrote this. See issue #41 and issues/99." },
  { path: "agents/bochek.md", text: "bochek" },
  { path: "lessons/amet.md", text: "amet" },
  { path: "logo.png", text: "" }
];
const has = (g, s, t, k) => g.links.some((l) => l.source === s && l.target === t && l.kind === k);

test("mode A: relative links, anchors, parent dirs, external ignored", () => {
  const g = L.buildGraph(files, [], [], "a");
  assert.equal(g.nodes.length, 5);
  assert.ok(g.nodes.every((n) => n.kind === "file"));
  assert.ok(has(g, "f:README.md", "f:lessons/kotev.md", "link"));
  assert.ok(has(g, "f:lessons/kotev.md", "f:lessons/rosh.md", "link"));
  assert.ok(has(g, "f:lessons/kotev.md", "f:README.md", "link"));
  assert.equal(g.links.some((l) => /x\.com/.test(l.target)), false);
});

test("mode A: bare mentions resolve; code spans and fences skipped; link wins over mention", () => {
  const g = L.buildGraph(files, [], [], "a");
  assert.ok(has(g, "f:lessons/kotev.md", "f:agents/bochek.md", "mention"));
  assert.equal(has(g, "f:lessons/kotev.md", "f:lessons/rosh.md", "mention"), false);
  assert.equal(g.links.some((l) => l.source === "f:README.md" && l.target === "f:lessons/rosh.md"), false);
  assert.equal(g.links.some((l) => l.target === "f:lessons/amet.md"), false);
});

test("mode B: agent and issue nodes, relations, always-related agent files", () => {
  const g = L.buildGraph(files, ["kotev", "rosh", "bochek", "amet"], [{ number: 41 }, { number: 7 }], "b");
  assert.equal(g.nodes.filter((n) => n.kind === "agent").length, 4);
  assert.equal(g.nodes.filter((n) => n.kind === "issue").length, 2);
  assert.ok(has(g, "f:lessons/kotev.md", "a:kotev", "relation"));
  assert.ok(has(g, "f:agents/bochek.md", "a:bochek", "relation"));
  assert.ok(has(g, "f:lessons/rosh.md", "a:rosh", "relation"));
  assert.ok(has(g, "f:lessons/rosh.md", "i:41", "relation"));
  assert.equal(g.links.some((l) => l.target === "i:99"), false);
  assert.equal(g.links.some((l) => l.source === "f:lessons/kotev.md" && l.target === "i:41"), false);
});

test("dedupe and no self links", () => {
  const g = L.buildGraph([{ path: "a.md", text: "[a](a.md) [b](b.md) [b](b.md) a.md" }, { path: "b.md", text: "" }], [], [], "a");
  assert.equal(g.links.length, 1);
});
