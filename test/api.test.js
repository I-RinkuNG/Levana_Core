const test = require("node:test");
const assert = require("node:assert/strict");

const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
globalThis.KeshParse = require("../parse.js");
globalThis.KeshLogic = require("../logic.js");
const A = require("../api.js");

const resp = (body, init) => ({ ok: !init || init.status == null || init.status < 400, status: (init && init.status) || 200, headers: { get: () => null }, json: async () => body, text: async () => JSON.stringify(body) });
const issue = (n) => ({ number: n, title: "t" + n, state: "OPEN", body: "", createdAt: "2026-10-01T00:00:00Z", closedAt: null, url: "u", author: null, comments: { totalCount: 0 }, labels: { nodes: [] } });
const page = (nums, next) => ({ rateLimit: {}, repository: { ref: { target: { history: { nodes: [] } } }, runs: null, agents: null, lessons: null, issues: { pageInfo: { hasNextPage: !!next, endCursor: next || null }, nodes: nums.map(issue) } } });

test("no token: no fetch call, code auth", async () => {
  delete store.levana_token;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return resp({}); };
  await assert.rejects(A.api("/contents/x"), (e) => e.code === "auth");
  await assert.rejects(A.snap(), (e) => e.code === "auth");
  assert.equal(calls, 0);
  A.clear();
});

test("token set: Authorization header is sent, never 'Bearer null'", async () => {
  store.levana_token = "tkn";
  let headers;
  globalThis.fetch = async (u, o) => { headers = o.headers; return resp({ ok: 1 }); };
  await A.api("/contents/x");
  assert.equal(headers.Authorization, "Bearer tkn");
  A.clear();
});

test("issues paging: follows endCursor and merges both pages", async () => {
  store.levana_token = "tkn";
  const bodies = [];
  globalThis.fetch = async (u, o) => {
    const b = JSON.parse(o.body);
    bodies.push(b.variables);
    return resp({ data: b.variables.after === "c1" ? page([3, 4], null) : page([1, 2], "c1") });
  };
  A.clear();
  const is = await A.issues();
  assert.deepEqual(is.map((i) => i.number), [1, 2, 3, 4]);
  assert.equal(bodies.length, 2);
  assert.equal(bodies[1].after, "c1");
  A.clear();
});

test("issues paging: stops at 10 pages", async () => {
  store.levana_token = "tkn";
  let n = 0;
  globalThis.fetch = async () => { n++; return resp({ data: page([n], "c" + n) }); };
  A.clear();
  const is = await A.issues();
  assert.equal(n, 10);
  assert.equal(is.length, 10);
  A.clear();
});

test("recheck clears cached snapshot and workspace", async () => {
  store.levana_token = "tkn";
  globalThis.fetch = async (u, o) => (o && o.body ? resp({ data: page([1], null) }) : resp({}));
  A.clear();
  const a = await A.snap();
  await A.recheck();
  const b = await A.snap();
  assert.notEqual(a, b);
  A.clear();
});

test("partial GraphQL errors do not mark the API as OK", async () => {
  store.levana_token = "tkn";
  A.apiStatus.ok = null;
  globalThis.fetch = async () => resp({ data: { rateLimit: {}, repository: { ref: { target: { history: { nodes: [] } } }, issues: null } }, errors: [{ type: "FORBIDDEN", path: ["repository", "issues"], message: "denied" }] });
  A.clear();
  const m = await A.snap();
  assert.equal(A.apiStatus.ok, null);
  assert.equal(m.notes.length, 1);
  A.clear();
});

test("usage: 404 and bad JSON give null, good JSON parsed, no throw", async () => {
  store.levana_token = "tkn";
  A.clear();
  globalThis.fetch = async () => resp({ message: "Not Found" }, { status: 404 });
  assert.equal(await A.usage(), null);
  globalThis.fetch = async () => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => "{not json" });
  assert.equal(await A.usage(true), null);
  let url;
  globalThis.fetch = async (u) => { url = u; return { ok: true, status: 200, headers: { get: () => null }, text: async () => '{"schema":1,"five_hour":{"used_percentage":5,"resets_at":1}}' }; };
  const u = await A.usage(true);
  assert.equal(u.five_hour.used_percentage, 5);
  assert.match(url, /contents\/usage\.json\?ref=levana-usage$/);
  A.clear();
});
