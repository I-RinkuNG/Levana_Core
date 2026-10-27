const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const P = require("../parse.js");

const ROOT = process.env.KESH_ROOT || path.join(__dirname, "..", "..", "claude-dotfiles");
const skip = fs.existsSync(path.join(ROOT, "runs")) ? false : "KESH_ROOT (claude-dotfiles checkout) not found";
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const run = (name) => P.parseRunLog(read("runs/" + name + ".md"), name + ".md");
const fixture = (name) => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
const fixtureJson = (name) => JSON.parse(fixture(name));

test("subagent-frontmatter run", { skip }, () => {
  const r = run("2026-10-22-subagent-frontmatter");
  assert.equal(r.run_id, "2026-10-22-subagent-frontmatter");
  assert.equal(r.title, "subagent-frontmatter");
  assert.equal(r.date, "2026-10-22");
  assert.equal(r.handoffs.length, 6);
  assert.equal(r.bounce_count, 2);
  const b = r.handoffs.filter((h) => h.bounce_round > 0);
  assert.deepEqual(b.map((h) => [h.to, h.bounce_round, h.bounce_new_cause]), [
    ["rosh", 1, false],
    ["rosh", 2, true]
  ]);
  assert.equal(r.tokens_total, 220225);
  assert.equal(r.declared_total, 220225);
  const t = P.computeTokens(r.handoffs);
  assert.equal(t.perAgent.rosh, 127753);
  assert.equal(t.perAgent.cheker, 14061);
  assert.equal(t.perAgent.amet, 78411);
  assert.equal(r.status, "done");
  assert.equal(r.flow.length, 5);
});

test("claude-skills-top10 run", { skip }, () => {
  const r = run("2026-10-22-claude-skills-top10");
  assert.equal(r.handoffs.length, 12);
  assert.deepEqual(r.handoffs.map((h) => h.n), ["1", "2", "3", "4", "5", "6", "7", "8a", "8", "9", "10", "11"]);
  const byN = (n) => r.handoffs.find((h) => h.n === n);
  assert.ok(byN("1").self && byN("6").self);
  assert.equal(r.handoffs.filter((h) => h.self).length, 2);
  assert.equal(byN("8a").from, "rin");
  assert.equal(byN("8a").to, "kesh");
  assert.equal(byN("7").out_of_flow, true);
  assert.equal(byN("7").to, "oseh");
  assert.equal(byN("3").to, "cheker");
  assert.equal(byN("10").bounce_round, 0);
  assert.equal(byN("10").to, "amet");
  assert.equal(r.bounce_count, 2);
  assert.equal(byN("9").bounce_round, 1);
  assert.equal(byN("9").to, "rosh");
  assert.equal(byN("11").bounce_round, 2);
  assert.equal(byN("11").to, "rosh");
  assert.equal(byN("11").bounce_new_cause, true);
  assert.equal(byN("9").bounce_new_cause, false);
  assert.equal(byN("8").tokens, null);
  assert.ok(byN("8").tokens_note.includes("ok"));
  assert.equal(r.tokens_total, 293408);
  assert.equal(r.flow.length, 5);
  assert.equal(r.flow[0].parallel, true);
  assert.deepEqual(r.flow[0].members.map((m) => m.agent), ["kesh", "rosh"]);
  assert.equal(r.flow[1].members[0].agent, "cheker");
  assert.equal(r.flow[1].members[0].times, 2);
  assert.equal(r.status, "open");
});

test("fb-post-reader run: table continues across a blank line, or has none", { skip }, () => {
  const r = run("2026-10-27-fb-post-reader");
  assert.equal(r.handoffs.length, 5);
  assert.equal(r.bounce_count, 1);
  const b = r.handoffs.find((h) => h.bounce_round > 0);
  assert.equal(b.to, "kotev");
  assert.equal(b.bounce_round, 1);
  assert.equal(r.tokens_total, 105358);
  assert.equal(r.pending_items.length, 2);
  assert.equal(r.status, "pending");
  assert.equal(r.handoffs[4].to, "cheker");
});

test("fb-post-reader: no blank line left inside the handoff table", { skip }, () => {
  const lines = read("runs/2026-10-27-fb-post-reader.md").split("\n");
  const first = lines.findIndex((l) => l.startsWith("| #"));
  let last = first;
  while (lines[last + 1] && lines[last + 1].startsWith("|")) last++;
  assert.equal(last - first, 6);
});

test("blank-line fixture still parses across the blank line", () => {
  const r = P.parseRunLog(fixture("blank-line-run.md"), "2026-01-05-synthetic-blank.md");
  assert.equal(r.handoffs.length, 3);
  assert.equal(r.handoffs[0].result, "ได้แผน `a | b`");
  assert.equal(r.handoffs[0].tokens, 1000);
  assert.equal(r.handoffs[1].n, "2");
  assert.equal(r.bounce_count, 1);
  assert.equal(r.tokens_total, 3600);
  assert.equal(r.status, "done");
  assert.equal(r.flow.length, 3);
});

test("workspace-dashboard run (growing file): tolerant assertions only", { skip }, () => {
  const r = run("2026-10-27-workspace-dashboard");
  assert.ok(Object.keys(r.meta).some((k) => k.startsWith("ตัดสินผ่าน")));
  assert.ok(Object.keys(r.meta).some((k) => k.startsWith("Flow ที่อนุมัติ") && k.includes("(P1)")));
  assert.equal(r.flow.length, 5);
  const lastGroup = r.flow[r.flow.length - 1];
  assert.equal(lastGroup.members[lastGroup.members.length - 1].agent, "rin");
});

test("empty table does not throw", () => {
  const r = P.parseRunLog("# Run: e (2026-01-01)\n\n**คำขอ:** x\n\n## Handoffs\n| # | จาก → ถึง | เหตุผล | ผล | tokens |\n|---|---|---|---|---|\n", "2026-01-01-e.md");
  assert.deepEqual(r.handoffs, []);
  assert.equal(r.tokens_total, null);
  assert.equal(r.status, "open");
});

test("splitRow respects backticks", () => {
  assert.deepEqual(P.splitRow("| 1 | a `x | y` | b |"), ["1", "a `x | y`", "b"]);
});

test("parseTokens variants", () => {
  assert.deepEqual(P.parseTokens("12,867"), { value: 12867, cumulative: false, note: "" });
  assert.deepEqual(P.parseTokens("113,466 (สะสม)"), { value: 113466, cumulative: true, note: "" });
  assert.equal(P.parseTokens("–").value, null);
  assert.equal(P.parseTokens("").value, null);
  const f = P.parseTokens('Rin ตอบ "ok" ให้ตรวจต่อ');
  assert.equal(f.value, null);
  assert.ok(f.note.includes("ok"));
});

test("normalizeAgent", () => {
  assert.equal(P.normalizeAgent("Cheker A"), "cheker");
  assert.equal(P.normalizeAgent("Cheker (sonnet)"), "cheker");
  assert.equal(P.normalizeAgent("Rin"), "rin");
  assert.equal(P.normalizeAgent("Someone"), "other");
  assert.equal(P.normalizeAgent(""), "other");
});

test("agents/*.md frontmatter", { skip }, () => {
  const dir = path.join(ROOT, "agents");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  assert.equal(files.length, 9);
  for (const f of files) {
    const fm = P.parseFrontmatter(fs.readFileSync(path.join(dir, f), "utf8"));
    assert.equal(fm.name, f.replace(/\.md$/, ""));
    assert.ok(fm.model && fm.model.length > 0, f + " model");
    assert.ok(P.parseList(fm.tools).length > 0, f + " tools");
    assert.ok(fm.description && fm.description.length > 0, f + " description");
  }
  const kotev = P.parseFrontmatter(read("agents/kotev.md"));
  assert.deepEqual(P.parseList(kotev.tools), ["Read", "Grep", "Glob", "Write", "Edit", "Bash"]);
});

test("parseFrontmatter yaml subset", () => {
  const fm = P.parseFrontmatter("---\nname: x\ndescription: \"a: b\"\ntools:\n  - A\n  - B\n---\nbody");
  assert.equal(fm.name, "x");
  assert.equal(fm.description, "a: b");
  assert.deepEqual(fm.tools, ["A", "B"]);
  assert.deepEqual(P.parseFrontmatter("no frontmatter"), {});
});

test("lessons counts", { skip }, () => {
  const n = (a) => {
    const p = path.join(ROOT, "lessons", a + ".md");
    return P.countLessons(fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);
  };
  assert.equal(n("bona") >= 1, true);
  assert.equal(n("rosh") >= 2, true);
  assert.equal(n("cheker") >= 2, true);
  assert.equal(n("kotev-does-not-exist"), 0);
});

test("extractPayload: pure JSON and bare text", () => {
  const r = P.extractPayload(fixtureJson("list_sessions.bare.json"), (v) => v && v.ccr && v.ccr.data);
  assert.equal(r.ok, true);
  assert.equal(r.data.ccr.data[0].id, "session_TEST2");
});

test("extractPayload: untrusted envelope with prose before and after, braces in strings", () => {
  const r = P.extractPayload(fixtureJson("list_sessions.envelope.json"), (v) => v && v.ccr && v.ccr.data);
  assert.equal(r.ok, true);
  assert.equal(r.data.ccr.data[0].title, 'Title with {braces} and "quotes"');
});

test("extractPayload: first candidate fails expect, second passes", () => {
  const r = P.extractPayload(fixtureJson("list_issues.prose.json"), (v) => Array.isArray(v && v.issues));
  assert.equal(r.ok, true);
  assert.equal(r.data.issues[0].title, "Fake issue");
  const any = P.extractPayload(fixtureJson("list_issues.prose.json"));
  assert.equal(any.ok, true);
  assert.deepEqual(any.data, [1]);
});

test("extractPayload: structuredContent and payload objects", () => {
  const s = P.extractPayload(fixtureJson("list_issues.structured.json"), (v) => Array.isArray(v.issues));
  assert.equal(s.data.issues[0].number, 2);
  const p = P.extractPayload({ payload: [1, 2] }, Array.isArray);
  assert.deepEqual(p.data, [1, 2]);
});

test("extractPayload: garbage and null", () => {
  const g = P.extractPayload(fixtureJson("garbage.json"), () => true);
  assert.equal(g.ok, false);
  assert.ok(g.raw.includes("no json here"));
  assert.equal(P.extractPayload(null).ok, false);
  assert.equal(P.extractPayload({ content: [] }).ok, false);
});

test("extractFileText: resource.text is read, not the status text", () => {
  const t = P.extractFileText(fixtureJson("file_contents.file.json"));
  assert.ok(t.startsWith("# Run: x"));
  assert.ok(t.includes("สวัสดี"));
});

test("extractFileText: resource.blob base64 Thai, payload base64", () => {
  assert.equal(P.extractFileText(fixtureJson("file_contents.blob.json")), "# Run: b64 (2026-01-02)\nภาษาไทย ✓\n");
  assert.equal(P.extractFileText(fixtureJson("file_contents.payload.json")), "# Run: b64 (2026-01-02)\nภาษาไทย ✓\n");
  assert.equal(P.extractFileText({ content: [{ type: "text", text: "plain" }] }), "plain");
  assert.equal(P.extractFileText(null), null);
});

test("extractDir", () => {
  const d = P.extractDir(fixtureJson("file_contents.dir.json"));
  assert.deepEqual(d.map((e) => [e.name, e.type, e.sha]), [
    ["a.md", "file", "s1"],
    ["sub", "dir", "s2"]
  ]);
  assert.equal(P.extractDir(fixtureJson("garbage.json")), null);
});

test("flowFromEvents", () => {
  const items = P.flowFromEvents(fixtureJson("list_events.json").ccr.data);
  const kinds = items.map((i) => i.kind);
  assert.deepEqual(kinds, ["event", "dispatch", "event", "return", "handoff_end", "event"]);
  assert.equal(items[1].agent, "bona");
  assert.ok(items[1].text.includes("bona"));
  assert.ok(items[1].text.includes("plan the thing"));
  assert.equal(items[2].text, "tool: Bash");
  assert.equal(items[3].agent, "bona");
  assert.equal(items[3].next.agent, "kotev");
  assert.equal(items[3].next.reason, "build it");
  assert.equal(items[4].next.agent, "other");
  assert.deepEqual(P.flowFromEvents(null), []);
  assert.equal(P.flowFromEvents([{ user: { internal_anthropic_catchall: { message: { content: "x".repeat(500) } } } }])[0].text.length, 141);
});

test("aggregate over real runs", { skip }, () => {
  const names = fs.readdirSync(path.join(ROOT, "runs")).filter((f) => f.endsWith(".md"));
  const runs = names.map((f) => P.parseRunLog(read("runs/" + f), f));
  const issues = [
    { created_at: "2026-10-26T00:00:00Z", closed_at: "2026-10-28T00:00:00Z" },
    { created_at: "2026-10-27T00:00:00Z", closed_at: null }
  ];
  const agg = P.aggregate(runs, issues, [{ name: "rosh" }, { name: "bona" }], { rosh: 2, bona: 1 });
  assert.ok(agg.g1.length >= 3 && agg.g1.length <= 12);
  assert.ok(agg.g1.some((x) => x.partial));
  const rosh = agg.g2.find((x) => x.agent === "rosh");
  assert.ok(rosh.tokens >= 127753);
  const g3 = agg.g3.find((x) => x.agent === "rosh");
  assert.equal(g3.original, 2);
  assert.equal(g3.newCause, 2);
  assert.equal(g3.causes.length, 4);
  const g5 = agg.g5.find((x) => x.agent === "rosh");
  assert.equal(g5.lessons, 2);
  assert.ok(g5.handoffs >= 6);
  assert.equal(agg.g4.reduce((a, w) => a + w.opened, 0), 2);
  assert.equal(agg.g4.reduce((a, w) => a + w.closed, 0), 1);
  assert.equal(agg.g6.length, runs.length);
  assert.ok(agg.g7.self >= 2 && agg.g7.out_of_flow >= 1 && agg.g7.rin_feedback >= 1);
  assert.deepEqual(P.aggregate([], [], [], {}).g1, []);
});
