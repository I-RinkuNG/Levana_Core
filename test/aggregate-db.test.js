const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../parse.js");

const dbRun = (o) => Object.assign({ run_id: "2026-10-27-db", date: "2026-10-27", status: "running", handoffs: [], db: true, steps: [], handoff_count: null, tokens_total: null, bounce_count: 0 }, o);

test("G1: db-only run uses db tokens_total, not partial", () => {
  const a = P.aggregate([dbRun({ tokens_total: 12345 })], [], [], {});
  assert.equal(a.g1.length, 1);
  assert.equal(a.g1[0].total, 12345);
  assert.equal(a.g1[0].partial, false);
});

test("G1: db run with null tokens gives null total", () => {
  const a = P.aggregate([dbRun({ tokens_total: null })], [], [], {});
  assert.equal(a.g1[0].total, null);
});

test("G1: db tokens_total wins over md-derived total for merged run", () => {
  const hs = [{ to: "bona", from: "kesh", tokens: 100, bounce_round: 0 }];
  const a = P.aggregate([dbRun({ handoffs: hs, tokens_total: 999 })], [], [], {});
  assert.equal(a.g1[0].total, 999);
  assert.equal(a.g1[0].partial, false);
});

test("G3: bounced steps of a db-only run are attributed per agent", () => {
  const steps = [
    { i: 1, agent: "bona", label: "plan", status: "done" },
    { i: 2, agent: "Bochek (QA)", label: "check", status: "bounced" },
    { i: 3, agent: "bochek", label: "recheck", status: "bounced" },
    { i: 4, agent: "kesh", label: "publish", status: "pending" }
  ];
  const a = P.aggregate([dbRun({ steps, handoff_count: 4, bounce_count: 2 })], [], [], {});
  assert.equal(a.g3.length, 1);
  assert.equal(a.g3[0].agent, "bochek");
  assert.equal(a.g3[0].original, 2);
  assert.equal(a.g3[0].newCause, 0);
  assert.deepEqual(a.g3[0].causes.map((c) => [c.run_id, c.round, c.newCause, c.reason]), [
    ["2026-10-27-db", 1, false, "check"],
    ["2026-10-27-db", 1, false, "recheck"]
  ]);
});

test("G3: db run without bounced steps adds no bounce agents; null steps tolerated", () => {
  const a = P.aggregate([dbRun({ steps: [{ agent: "bona", status: "done" }, null, { status: "bounced" }], handoff_count: 3 })], [], [], {});
  assert.deepEqual(a.g3, []);
});

test("G6: db-only run uses handoff_count and bounce_count", () => {
  const a = P.aggregate([dbRun({ handoff_count: 4, bounce_count: 1 })], [], [], {});
  assert.deepEqual(a.g6, [{ run_id: "2026-10-27-db", date: "2026-10-27", rate: 0.25, bounces: 1, handoffs: 4 }]);
});

test("G6: db-only run with handoff_count 0 or null has rate null", () => {
  for (const hc of [0, null]) {
    const a = P.aggregate([dbRun({ handoff_count: hc, bounce_count: 3 })], [], [], {});
    assert.equal(a.g6[0].rate, null);
    assert.equal(a.g6[0].handoffs, 0);
    assert.equal(a.g6[0].bounces, 0);
  }
});

test("G6: md handoffs take precedence over db counts", () => {
  const hs = [
    { to: "bona", from: "kesh", bounce_round: 0 },
    { to: "bona", from: "kesh", bounce_round: 1, bounce_new_cause: true, reason: "x" }
  ];
  const a = P.aggregate([dbRun({ handoffs: hs, handoff_count: 10, bounce_count: 5 })], [], [], {});
  assert.equal(a.g6[0].handoffs, 2);
  assert.equal(a.g6[0].bounces, 1);
  assert.equal(a.g6[0].rate, 0.5);
  assert.equal(a.g3[0].newCause, 1);
});

test("db-only run does not leak into G2/G7", () => {
  const a = P.aggregate([dbRun({ tokens_total: 500, handoff_count: 2, bounce_count: 1, steps: [{ agent: "tak", status: "bounced" }] })], [], [], {});
  assert.deepEqual(a.g2, []);
  assert.deepEqual(a.g7, { self: 0, out_of_flow: 0, rin_feedback: 0 });
});
