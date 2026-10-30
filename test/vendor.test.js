const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const dir = path.join(__dirname, "..", "vendor");
const sums = fs.readFileSync(path.join(dir, "SHA256SUMS"), "utf8").split("\n").filter(Boolean).map((l) => {
  const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(l);
  assert.ok(m, "bad line: " + l);
  return { hash: m[1], file: m[2] };
});

test("SHA256SUMS lists every vendor .js file", () => {
  const js = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).sort();
  assert.deepEqual(sums.map((s) => s.file).sort(), js);
  assert.ok(js.includes("force-graph.min.js"));
});

for (const { hash, file } of sums) {
  test("vendor hash matches: " + file, () => {
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, file))).digest("hex"), hash);
  });
}

test("force-graph is the pinned 1.52.0 build (173081 bytes)", () => {
  assert.equal(fs.statSync(path.join(dir, "force-graph.min.js")).size, 173081);
});
