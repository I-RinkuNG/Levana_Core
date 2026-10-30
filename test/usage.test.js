const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");

const NOW = Date.parse("2026-10-30T06:00:00Z");
const u = (o) => Object.assign({ schema: 1, five_hour: { used_percentage: 21, resets_at: (NOW + 3600000) / 1000 }, seven_day: null, captured_at: new Date(NOW - 120000).toISOString() }, o);

test("usageState: live", () => {
  const s = L.usageState(u(), NOW);
  assert.equal(s.state, "live");
  assert.equal(s.pct, 21);
  assert.equal(s.resetsAt, NOW + 3600000);
  assert.equal(s.capturedAt, NOW - 120000);
});

test("usageState: stale by age, boundary exactly 15 min is still live", () => {
  assert.equal(L.USAGE_STALE_MS, 15 * 60 * 1000);
  assert.equal(L.usageState(u({ captured_at: new Date(NOW - 15 * 60000).toISOString() }), NOW).state, "live");
  const s = L.usageState(u({ captured_at: new Date(NOW - 15 * 60000 - 1).toISOString() }), NOW);
  assert.equal(s.state, "stale");
  assert.equal(s.resetPassed, false);
});

test("usageState: stale by reset", () => {
  const s = L.usageState(u({ five_hour: { used_percentage: 21, resets_at: (NOW - 1000) / 1000 } }), NOW);
  assert.equal(s.state, "stale");
  assert.equal(s.resetPassed, true);
  assert.equal(L.usageState(u({ five_hour: { used_percentage: 21, resets_at: NOW / 1000 } }), NOW).state, "live");
});

test("usageState: missing", () => {
  assert.equal(L.usageState(null, NOW).state, "missing");
  assert.equal(L.usageState({}, NOW).state, "missing");
  assert.equal(L.usageState({ five_hour: {} }, NOW).state, "missing");
  assert.equal(L.usageState({ five_hour: null, captured_at: "x" }, NOW).state, "missing");
});

test("usageState: clamp 0-100, null resets_at, bad captured_at is stale", () => {
  assert.equal(L.usageState(u({ five_hour: { used_percentage: 140, resets_at: null } }), NOW).pct, 100);
  assert.equal(L.usageState(u({ five_hour: { used_percentage: -3, resets_at: null } }), NOW).pct, 0);
  assert.equal(L.usageState(u({ five_hour: { used_percentage: 3, resets_at: null } }), NOW).resetsAt, null);
  assert.equal(L.usageState(u({ captured_at: "garbage" }), NOW).state, "stale");
});

const day = (n) => L.ymd(NOW - n * 86400000);
const run = (id, date, hs, status) => ({ run_id: id, date, status: status || "done", handoffs: hs });
const hd = (to, tokens, b) => ({ from: "kesh", to, tokens, bounce_round: b || 0 });

test("kpis7d: tokens per handoff and delta vs previous 7 days", () => {
  const runs = [run("a", day(1), [hd("kotev", 1000), hd("rosh", 3000, 1)]), run("b", day(10), [hd("kotev", 1000)]), run("c", day(2), [hd("kotev", null)], "open")];
  const k = L.kpis7d(runs, [], NOW);
  assert.equal(k.handoffs, 3);
  assert.equal(k.tph, 4000 / 3);
  assert.equal(k.prevTph, 1000);
  assert.equal(k.deltaPct, 33);
  assert.equal(k.bounces, 1);
  assert.equal(k.bouncePct, 33);
  assert.deepEqual(k.worst, { agent: "rosh", rejects: 1, handoffs: 1 });
  assert.equal(k.done, 2);
  assert.equal(k.open, 1);
});

test("kpis7d: no data gives nulls, lessons counted by date in last 7 days", () => {
  const k = L.kpis7d([], [{ name: "kotev", md: "- a " + day(1) + "\n- b " + day(20) + "\n- c no date" }, { name: "_proposed", md: "- x " + day(1) }, { name: "rosh", md: "- y " + day(2) }], NOW);
  assert.equal(k.tph, null);
  assert.equal(k.deltaPct, null);
  assert.equal(k.worst, null);
  assert.deepEqual(k.lessons, { count: 2, agents: 2 });
});

test("agentTable: 10 agents sorted by tokens, share, hot only over 20%", () => {
  const runs = [run("a", day(1), [hd("kotev", 3000), hd("kotev", 1000, 1), hd("rosh", 1000)])];
  const t = L.agentTable(runs, 7, NOW);
  assert.equal(t.length, 10);
  assert.equal(t[0].agent, "kotev");
  assert.equal(t[0].tokens, 4000);
  assert.equal(t[0].handoffs, 2);
  assert.equal(t[0].tph, 2000);
  assert.equal(t[0].share, 80);
  assert.equal(t[0].hot, true);
  assert.equal(t[1].agent, "rosh");
  assert.equal(t[1].hot, false);
  assert.equal(t[9].tokens, 0);
});

test("issueRows: open only, newest first, limited", () => {
  const is = [{ number: 1, state: "open", created_at: "2026-10-01" }, { number: 2, state: "closed", created_at: "2026-10-05" }, { number: 3, state: "open", created_at: "2026-10-03" }, { number: 4, state: "open", created_at: "2026-10-04" }];
  assert.deepEqual(L.issueRows(is, 2).map((i) => i.number), [4, 3]);
});

test("excerpt strips markdown and clips", () => {
  assert.equal(L.excerpt("## Head\n\n- [link](http://x) `code` text", 100), "Head link code text");
  assert.equal(L.excerpt("a".repeat(10), 5), "aaaaa…");
});
