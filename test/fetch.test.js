const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");

test("classify: 401 auth, 404, plain 403 forbidden", () => {
  assert.equal(L.classify({ status: 401 }), "auth");
  assert.equal(L.classify({ status: 404 }), "404");
  assert.equal(L.classify({ status: 403, remaining: "4999", msg: "Resource not accessible" }), "forbidden");
});

test("classify: rate signals on 403/429", () => {
  assert.equal(L.classify({ status: 429 }), "rate");
  assert.equal(L.classify({ status: 403, retryAfter: 30, remaining: "10" }), "rate");
  assert.equal(L.classify({ status: 403, remaining: "0" }), "rate");
  assert.equal(L.classify({ status: 403, remaining: "10", msg: "You have exceeded a secondary rate limit" }), "rate");
  assert.equal(L.classify({ status: 500 }), "http");
});

test("retryDelay: backoff, caps, never auth/404, max 2 retries", () => {
  assert.equal(L.retryDelay({ code: "network" }, 0), 500);
  assert.equal(L.retryDelay({ code: "timeout" }, 1), 1000);
  assert.equal(L.retryDelay({ code: "network" }, 2), null);
  assert.equal(L.retryDelay({ code: "http", status: 502 }, 0), 500);
  assert.equal(L.retryDelay({ code: "http", status: 400 }, 0), null);
  assert.equal(L.retryDelay({ code: "rate", retryAfter: 3 }, 0), 3000);
  assert.equal(L.retryDelay({ code: "rate", retryAfter: 60 }, 0), null);
  assert.equal(L.retryDelay({ code: "rate", retryAfter: 10 }, 0), 10000);
  assert.equal(L.retryDelay({ code: "rate" }, 1), 1000);
  for (const code of ["auth", "404", "forbidden"]) assert.equal(L.retryDelay({ code }, 0), null);
});

test("pushLog keeps last 50", () => {
  let log = [];
  for (let i = 0; i < 55; i++) log = L.pushLog(log, { i });
  assert.equal(log.length, 50);
  assert.equal(log[0].i, 5);
  assert.equal(log[49].i, 54);
  assert.deepEqual(L.pushLog(null, { i: 1 }), [{ i: 1 }]);
});

test("memo caches success, evicts rejection", async () => {
  const c = {};
  let n = 0;
  const f = () => (++n === 1 ? Promise.reject(new Error("x")) : Promise.resolve(n));
  await assert.rejects(L.memo(c, "k", f));
  await new Promise((r) => setImmediate(r));
  assert.equal(await L.memo(c, "k", f), 2);
  assert.equal(await L.memo(c, "k", f), 2);
  assert.equal(n, 2);
});

const gqlData = {
  repository: {
    ref: { target: { history: { nodes: [{ oid: "abc1234567", message: "feat: x\n\nbody", author: { name: "Rin", date: "2026-10-28T01:00:00Z" } }] } } },
    runs: { entries: [
      { name: "r1.md", type: "blob", object: { text: "# r1", isTruncated: false, byteSize: 4 } },
      { name: "big.md", type: "blob", object: { text: "x", isTruncated: true, byteSize: 9e6 } },
      { name: "bin.md", type: "blob", object: { text: null, isTruncated: false, byteSize: 1 } },
      { name: "sub", type: "tree", object: {} },
      { name: "a.txt", type: "blob", object: { text: "t", isTruncated: false } }
    ] },
    agents: { entries: [{ name: "kotev.md", type: "blob", object: { text: "---\nname: kotev\n---", isTruncated: false } }] },
    lessons: null,
    issues: { nodes: [{ number: 7, title: "T", state: "CLOSED", body: null, createdAt: "2026-10-01T00:00:00Z", closedAt: "2026-10-02T00:00:00Z", url: "u", author: null, comments: { totalCount: 3 }, labels: { nodes: [{ name: "bug" }] } }] }
  }
};

test("mapGraphql: files, partial, issues, commits in REST shape", () => {
  const m = L.mapGraphql(gqlData);
  assert.deepEqual(m.files.map((f) => [f.dir, f.name]), [["runs", "r1"], ["agents", "kotev"]]);
  assert.deepEqual(m.partial, ["runs/big.md", "runs/bin.md"]);
  assert.deepEqual(m.issues[0], { number: 7, title: "T", state: "closed", body: "", created_at: "2026-10-01T00:00:00Z", closed_at: "2026-10-02T00:00:00Z", html_url: "u", user: { login: "ghost" }, comments: 3, labels: [{ name: "bug" }], assignee: "" });
  assert.deepEqual(m.commits, [{ sha: "abc1234567", commit: { message: "feat: x\n\nbody", author: { name: "Rin", date: "2026-10-28T01:00:00Z" } } }]);
  assert.equal(m.branchFound, true);
});

test("mapGraphql: missing ref or repository", () => {
  assert.equal(L.mapGraphql({ repository: null }), null);
  assert.equal(L.mapGraphql({ repository: { ref: null, runs: null, agents: null, lessons: null, issues: { nodes: [] } } }).branchFound, false);
});

test("gqlVars builds branch expressions", () => {
  assert.deepEqual(L.gqlVars("o", "r", "feat/x"), { owner: "o", name: "r", ref: "refs/heads/feat/x", runs: "feat/x:runs", agents: "feat/x:agents", lessons: "feat/x:lessons" });
});

test("classifyGql: error types map to existing codes", () => {
  const c = (o) => L.classifyGql(o).code;
  assert.equal(c({ status: 200, errors: [{ type: "RATE_LIMITED", message: "API rate limit exceeded" }] }), "rate");
  assert.equal(c({ status: 200, errors: [{ message: "API rate limit already exceeded for user" }] }), "rate");
  assert.equal(c({ status: 200, errors: [{ type: "FORBIDDEN", message: "x" }] }), "forbidden");
  assert.equal(c({ status: 200, errors: [{ type: "NOT_FOUND", message: "x" }] }), "404");
  assert.equal(c({ status: 401, errors: [{ message: "Bad credentials" }] }), "auth");
  assert.equal(c({ status: 200, errors: [{ message: "Bad credentials" }] }), "auth");
  assert.equal(c({ status: 403, retryAfter: 30, errors: [{ message: "x" }] }), "rate");
  assert.equal(c({ status: 502, errors: [{ message: "x" }] }), "http");
  assert.equal(c({ status: 200, errors: [{ type: "MAX_NODE_LIMIT_EXCEEDED", message: "x" }] }), "http");
});

test("classifyGql: message includes error path", () => {
  const c = L.classifyGql({ status: 200, errors: [{ type: "FORBIDDEN", path: ["repository", "issues"], message: "Resource not accessible" }] });
  assert.equal(c.code, "forbidden");
  assert.match(c.message, /repository\.issues: Resource not accessible/);
});

test("mapGraphql: partial errors give empty issues plus a note", () => {
  const d = { repository: { ref: { target: { history: { nodes: [] } } }, issues: null }, _errors: [{ type: "FORBIDDEN", path: ["repository", "issues", "nodes"], message: "denied" }] };
  const m = L.mapGraphql(d);
  assert.deepEqual(m.issues, []);
  assert.deepEqual(m.notes, ["โหลด repository.issues ไม่ได้: denied"]);
  assert.deepEqual(L.mapGraphql(gqlData).notes, []);
});
