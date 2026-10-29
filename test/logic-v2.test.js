const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");
const P = require("../parse.js");

const log = (flow, rows, done) => P.parseRunLog(`# Run: t (2026-10-29)\n\n**Flow ที่อนุมัติ:** ${flow}\n\n## Handoffs\n| # | จาก → ถึง | เหตุผล | ผล | tokens |\n|---|---|---|---|---|\n${rows.map((r, i) => `| ${i + 1} | ${r.join(" | ")} |`).join("\n")}\n${done ? "\n## ผลสุดท้าย\n- ok\n" : ""}`, "2026-10-29-t.md");
const open = log("Kesh → Tzayar → Amet → Kotev → Bochek", [
  ["Kesh → Tzayar", "a", "ok", "10,000"],
  ["Tzayar → Amet", "b", "ok", "30,000"],
  ["Tzayar → Amet (ตีกลับรอบ 1, สาเหตุ: ตัวเลขไม่ตรงแหล่ง)", "c", "ok", "20,000"],
  ["Amet → Kotev", "d", "", "5,000"]
]);
const done = log("Kesh → Kotev", [["Kesh → Kotev", "a", "ok", "58,000"]], true);

test("parseRoute: defaults, args, odd chars", () => {
  assert.deepEqual(L.parseRoute(""), { page: "today", arg: null });
  assert.deepEqual(L.parseRoute("#nope"), { page: "today", arg: null });
  assert.deepEqual(L.parseRoute("#agents"), { page: "agents", arg: null });
  assert.deepEqual(L.parseRoute("#run/2026-10-29-a%20b"), { page: "run", arg: "2026-10-29-a b" });
  assert.deepEqual(L.parseRoute("#run/%E0%A4%A"), { page: "run", arg: "%E0%A4%A" });
  assert.deepEqual(L.parseRoute("#run"), { page: "runs", arg: null });
  assert.deepEqual(L.parseRoute("#issue/41"), { page: "issue", arg: "41" });
});

test("navModel: bottom 5, rail 3 groups, active mapping", () => {
  const n = L.navModel({ runs: 29 }, "run");
  assert.equal(n.bottom.length, 5);
  assert.equal(n.rail.length, 3);
  assert.equal(n.activeKey, "runs");
  assert.equal(n.rail[1][0].count, 29);
  assert.equal(L.navModel({}, "lessons").activeBottom, "more");
  assert.equal(L.navModel({}, "lessons").activeKey, "lessons");
  assert.equal(L.navModel({}, "issue").activeKey, "issues");
});

test("bounceLevel: exactly 20% ok, above bad", () => {
  assert.equal(L.bounceLevel(0.2), "ok");
  assert.equal(L.bounceLevel(6 / 30), "ok");
  assert.equal(L.bounceLevel(0.21), "bad");
  assert.equal(L.bounceLevel(0), "ok");
});

test("bounceBarPct: 0-50% scale, clamps, tick at 40", () => {
  assert.equal(L.bounceBarPct(0), 0);
  assert.equal(L.bounceBarPct(0.2), 40);
  assert.equal(L.bounceBarPct(0.24), 48);
  assert.equal(L.bounceBarPct(0.9), 100);
  assert.equal(L.BOUNCE_TICK, 40);
});

test("meterSegments: sums to 100 and clamps", () => {
  assert.deepEqual(L.meterSegments(62, 8), { used: 62, reserved: 8, rest: 30 });
  assert.deepEqual(L.meterSegments(120, 8), { used: 100, reserved: 0, rest: 0 });
  assert.deepEqual(L.meterSegments(95, 20), { used: 95, reserved: 5, rest: 0 });
  assert.deepEqual(L.meterSegments(-5, undefined), { used: 0, reserved: 0, rest: 100 });
});

test("fmtCountdown / projection / ageText / fmtTok", () => {
  assert.equal(L.fmtCountdown(6500000), "01:48:20");
  assert.equal(L.fmtCountdown(-5), "00:00:00");
  assert.equal(L.fmtCountdown(5 * 3600000), "05:00:00");
  assert.equal(L.projection(50, 2.5 * 3600000).pctAtReset, 100);
  assert.equal(L.projection(40, 0).pctAtReset, 40);
  assert.equal(L.ageText(30000), "เมื่อครู่");
  assert.equal(L.ageText(2 * 60000), "2 นาทีที่แล้ว");
  assert.equal(L.ageText(3 * 3600000), "3 ชั่วโมงที่แล้ว");
  assert.equal(L.ageText(2 * 86400000), "2 วันที่แล้ว");
  assert.equal(L.fmtTok(482000), "482k");
  assert.equal(L.fmtTok(1460000), "1.46M");
  assert.equal(L.fmtTok(900), "900");
  assert.equal(L.fmtTok(null), "0");
});

test("window5h: estimated block from midnight; reset edge; started_at path", () => {
  const now = new Date(2026, 9, 29, 7, 30).getTime();
  const w = L.window5h([{ run_id: "2026-10-29-a", tokens_total: 150000 }, { run_id: "2026-10-28-b", tokens_total: 999 }], now);
  assert.equal(w.estimated, true);
  assert.equal(w.startMs, new Date(2026, 9, 29, 5, 0).getTime());
  assert.equal(w.remainingMs, 2.5 * 3600000);
  assert.equal(w.usedTokens, 150000);
  assert.equal(w.usedPct, 10);
  const edge = new Date(2026, 9, 29, 10, 0).getTime();
  assert.equal(L.window5h([], edge).remainingMs, 5 * 3600000);
  const t = L.window5h([{ run_id: "x", started_at: new Date(now - 3600000).toISOString(), tokens_total: 30000 }, { run_id: "y", started_at: new Date(now - 6 * 3600000).toISOString(), tokens_total: 50000 }], now);
  assert.equal(t.estimated, false);
  assert.equal(t.startMs, now - 3600000);
  assert.equal(t.usedTokens, 30000);
  assert.equal(L.window5h(null, now).usedTokens, 0);
});

test("activeRun: newest non-done, null when none", () => {
  assert.equal(L.activeRun([done]), null);
  assert.equal(L.activeRun([]), null);
  assert.equal(L.activeRun([done, open]).run_id, open.run_id);
});

test("stageModel: done/bounced/now/todo", () => {
  const s = L.stageModel(open);
  assert.deepEqual(s.map((x) => x.state), ["done", "done", "bounced", "now", "todo"]);
  assert.equal(s[2].bounces, 1);
  assert.equal(s[0].agent, "kesh");
  assert.equal(L.stageModel(done)[0].state, "done");
  assert.deepEqual(L.stageModel(null), []);
});

test("stageModel: parallel flow gives one stage per member; falls back to handoffs", () => {
  const par = log("Kesh → Cheker ∥ Amet → Rosh", [["Kesh → Cheker", "a", "ok", "1"]]);
  assert.deepEqual(L.stageModel(par).map((x) => x.agent), ["kesh", "cheker", "amet", "rosh"]);
  const nof = { status: "open", flow: [], handoffs: [{ to: "kotev", status: "done" }, { to: "bochek", status: "running" }] };
  assert.deepEqual(L.stageModel(nof).map((x) => x.state), ["done", "now"]);
});

test("handoffRows: relPct vs largest, bounce reason folded, zero/single token", () => {
  const r = L.handoffRows(open);
  assert.equal(r.length, 4);
  assert.equal(r[1].relPct, 100);
  assert.equal(r[0].relPct, (10 / 30) * 100);
  assert.equal(r[2].bounced, true);
  assert.equal(r[2].why, "ตัวเลขไม่ตรงแหล่ง");
  assert.equal(r[1].why, null);
  assert.equal(r[3].running, true);
  assert.equal(L.handoffRows(done)[0].relPct, 100);
  assert.deepEqual(L.handoffRows(null), []);
  assert.equal(L.handoffRows({ handoffs: [{ to: "a", tokens: 0, bounce_round: 0 }] })[0].relPct, 0);
});

test("bounceReasons and agentTokens", () => {
  assert.deepEqual(L.bounceReasons(open), [{ reason: "ตัวเลขไม่ตรงแหล่ง", count: 1 }]);
  assert.deepEqual(L.bounceReasons(done), []);
  const t = L.agentTokens(open);
  assert.equal(t[0].agent, "amet");
  assert.equal(t[0].tokens, 50000);
  assert.equal(t[0].pct, 100);
  assert.equal(t[1].pct, 20);
  assert.deepEqual(L.agentTokens(null), []);
});

test("reservedTokens: mean of next agent's last 10 handoffs", () => {
  const mk = (id, v) => ({ run_id: id, handoffs: [{ to: "bochek", tokens: v, bounce_round: 0 }] });
  const hist = Array.from({ length: 12 }, (_, i) => mk("2026-10-" + String(10 + i).padStart(2, "0"), i < 2 ? 1000000 : 10000));
  const r = L.reservedTokens(open, hist, 10);
  assert.equal(r.agent, "bochek");
  assert.equal(r.tokens, 10000);
  assert.ok(Math.abs(r.pct - 10000 / 15000) < 1e-9);
  assert.equal(L.reservedTokens(open, [], 10), null);
  assert.equal(L.reservedTokens(done, hist, 10), null);
  assert.equal(L.reservedTokens(null, hist, 10), null);
});

test("actionQueue: order approve > alert > issue, cap 3, danger", () => {
  const issues = [{ number: 41, title: "t", state: "open", created_at: "2026-10-27T00:00:00Z" }, { number: 50, title: "n", state: "open", created_at: "2026-10-28T00:00:00Z" }, { number: 3, title: "c", state: "closed", created_at: "2026-01-01T00:00:00Z" }];
  const now = Date.parse("2026-10-29T00:00:00Z");
  const q = L.actionQueue({ runs: [open], issues, apiStatus: { ok: true }, rates: [{ agent: "bochek", handoffs: 25, rejects: 6, rate: 0.24 }, { agent: "amet", handoffs: 10, rejects: 1, rate: 0.1 }], now });
  assert.deepEqual(q.map((x) => x.kind), ["APPROVE", "ALERT", "ISSUE"]);
  assert.equal(q[1].danger, true);
  assert.equal(q[2].title, "Issue #41 เปิดค้าง 2 วัน");
  const many = L.actionQueue({ runs: [open], issues, apiStatus: { ok: false, checkedAt: 0 }, rates: [{ agent: "a", handoffs: 5, rejects: 3, rate: 0.6 }, { agent: "b", handoffs: 5, rejects: 3, rate: 0.6 }], now });
  assert.equal(many.length, 3);
  assert.equal(many[1].title, "GitHub token API ใช้ไม่ได้");
  assert.deepEqual(L.actionQueue({ runs: [], issues: [], apiStatus: { ok: true }, rates: [], now }), []);
});

test("agentCards: 10 cards, groups, 7-day window, bounce level", () => {
  const w = {
    runs: [
      { run_id: "2026-10-29-a", handoffs: [{ to: "bochek", tokens: 100000, bounce_round: 0 }, { to: "bochek", tokens: 50000, bounce_round: 1 }, { to: "kotev", tokens: 200000, bounce_round: 0 }] },
      { run_id: "2026-09-01-old", handoffs: [{ to: "amet", tokens: 999999, bounce_round: 0 }] }
    ],
    lessons: { kotev: 36 }
  };
  const c = L.agentCards(w, 7, new Date(2026, 9, 29, 12).getTime());
  assert.equal(c.length, 10);
  assert.equal(c.filter((x) => x.group === "BUILD").length, 5);
  assert.equal(c[0].name, "kotev");
  assert.equal(c[0].rank, 1);
  assert.equal(c[0].relPct, 100);
  assert.equal(c[0].lessons, 36);
  const b = c.find((x) => x.name === "bochek");
  assert.equal(b.bounceRate, 0.5);
  assert.equal(b.level, "bad");
  assert.equal(b.rank, 6);
  assert.equal(c.find((x) => x.name === "amet").tokens, 0);
  assert.equal(c.find((x) => x.name === "tak").level, "ok");
});

test("runRows: sort desc, filters", () => {
  const rs = [{ run_id: "2026-10-01-a", title: "Alpha", status: "done", bounce_count: 0, handoffs: [{ to: "kotev" }] }, { run_id: "2026-10-03-b", title: "Beta", status: "open", bounce_count: 1, handoffs: [] }, { run_id: "2026-10-02-c", title: "Gamma", status: "pending", bounce_count: 0, handoffs: [] }];
  assert.deepEqual(L.runRows(rs).map((r) => r.title), ["Beta", "Gamma", "Alpha"]);
  assert.deepEqual(L.runRows(rs, { q: "ALP" }).map((r) => r.title), ["Alpha"]);
  assert.deepEqual(L.runRows(rs, { status: "bounce" }).map((r) => r.title), ["Beta"]);
  assert.deepEqual(L.runRows(rs, { status: "done" }).map((r) => r.title), ["Alpha"]);
  assert.deepEqual(L.runRows(rs, { agent: "kotev" }).map((r) => r.title), ["Alpha"]);
  assert.deepEqual(L.runRows(rs, { q: "zzz" }), []);
  assert.deepEqual(L.runRows(null), []);
  assert.equal(L.runChip(rs[1]).text, "ตีกลับ 1");
  assert.equal(L.runChip(rs[0]).kind, "ok");
});

test("usageSeries: last 10 runs, lessons > 0 only", () => {
  const agg = { g1: Array.from({ length: 12 }, (_, i) => ({ run_id: "r" + i, total: i })), g2: [{ agent: "a", tokens: 1 }], g5: [{ agent: "a", handoffs: 1, lessons: 0 }, { agent: "b", handoffs: 1, lessons: 4 }] };
  const u = L.usageSeries(agg, [{ agent: "a", rate: 0.1 }]);
  assert.equal(u.perRun.length, 10);
  assert.equal(u.perRun[0].id, "r2");
  assert.deepEqual(u.lessonsByAgent.map((x) => x.agent), ["b"]);
  assert.equal(u.bounceByAgent.length, 1);
});

test("groupFiles: folder order, sort by name/date, skips empty", () => {
  const f = [{ dir: "lessons", name: "kotev", size: 1 }, { dir: "runs", name: "2026-10-01-a", size: 5 }, { dir: "runs", name: "2026-10-09-b", size: 7 }, { dir: "other", name: "x" }];
  const byName = L.groupFiles(f, "name");
  assert.deepEqual(byName.map((g) => g.folder), ["runs", "lessons"]);
  assert.deepEqual(byName[0].items.map((i) => i.name), ["2026-10-01-a", "2026-10-09-b"]);
  assert.deepEqual(L.groupFiles(f, "date")[0].items.map((i) => i.name), ["2026-10-09-b", "2026-10-01-a"]);
  assert.deepEqual(L.groupFiles([], "name"), []);
});

test("lessonGroups: <=7 then rest, query and agent filter; highlight", () => {
  const md = "# t\n" + Array.from({ length: 9 }, (_, i) => "- item " + i + (i === 8 ? " NEEDLE" : "")).join("\n");
  const g = L.lessonGroups([{ name: "kotev", md }, { name: "bona", md: "- other" }], "", null);
  assert.equal(g.length, 2);
  assert.equal(g[0].items.length, 7);
  assert.equal(g[0].rest.length, 2);
  assert.equal(g[0].total, 9);
  const q = L.lessonGroups([{ name: "kotev", md }, { name: "bona", md: "- other" }], "needle", null);
  assert.equal(q.length, 1);
  assert.equal(q[0].items[0], "item 8 NEEDLE");
  assert.equal(L.lessonGroups([{ name: "kotev", md }, { name: "bona", md: "- other" }], "", "bona").length, 1);
  assert.deepEqual(L.highlight("a NEEDLE b", "needle"), [{ t: "a ", hit: false }, { t: "NEEDLE", hit: true }, { t: " b", hit: false }]);
  assert.deepEqual(L.highlight("abc", ""), [{ t: "abc", hit: false }]);
});

test("bounceSummary: totals, sorted rates, empty", () => {
  const s = L.bounceSummary([{ name: "a", handoffs: 25, bounceRate: 0.24 }, { name: "b", handoffs: 5, bounceRate: 0 }, { name: "c", handoffs: 0, bounceRate: 0 }]);
  assert.equal(s.handoffs, 30);
  assert.equal(s.bounces, 6);
  assert.equal(s.rate, 0.2);
  assert.equal(s.rates[0].agent, "a");
  assert.equal(s.rates.length, 2);
  assert.deepEqual(L.bounceSummary([]), { handoffs: 0, bounces: 0, rate: 0, rates: [] });
});

test("normalizeAgent knows tzayar", () => {
  assert.equal(P.normalizeAgent("Tzayar"), "tzayar");
});
