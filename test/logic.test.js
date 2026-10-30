const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../parse.js");
const L = require("../logic.js");

const run = (id, hs) => ({ run_id: id, handoffs: hs });
const hd = (to, tokens, bounce_round = 0) => ({ from: "x", to, tokens, bounce_round });

test("isToday matches run_id prefix", () => {
  assert.ok(L.isToday({ run_id: "2026-10-28-x" }, "2026-10-28"));
  assert.ok(!L.isToday({ run_id: "2026-10-27-x" }, "2026-10-28"));
});

test("tokensByAgent sums across runs, null counts as 0, sorted desc", () => {
  const rs = [run("a", [hd("rosh", 100), hd("kotev", 50)]), run("b", [hd("rosh", 20), hd("kotev", null)])];
  assert.deepEqual(L.tokensByAgent(rs, P.computeTokens), [{ agent: "rosh", tokens: 120 }, { agent: "kotev", tokens: 50 }]);
});

test("parseTokens treats n/a and dash as null", () => {
  assert.equal(P.parseTokens("n/a (เหตุผล)").value, null);
  assert.equal(P.parseTokens("–").value, null);
});

test("rejectRates counts bounce rows per agent", () => {
  const r = L.rejectRates([run("a", [hd("rosh", 1), hd("rosh", null, 1), hd("kotev", 1)])]);
  assert.deepEqual(r[0], { agent: "rosh", handoffs: 2, rejects: 1, rate: 0.5 });
  assert.equal(r[1].rate, 0);
});
