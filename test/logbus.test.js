const test = require("node:test");
const assert = require("node:assert/strict");

const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const K = require("../logbus.js");
const clear = () => { K._reset(); for (const k of Object.keys(store)) delete store[k]; };

test("entry shape: required fields, ISO with offset, no token fields", () => {
  const e = K.makeEntry("error", "fetch_error", "bad ghp_ABCDEF123456 token", { status: 401, token: "ghp_x", nested: { Authorization: "Bearer x", ok: 1 }, path: "graphql" });
  assert.deepEqual(Object.keys(e).sort(), ["app_version", "detail", "device", "event", "level", "message", "route", "session_id", "ts", "tz"]);
  assert.match(e.ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
  assert.equal(e.message, "bad [redacted] token");
  assert.deepEqual(e.detail, { status: 401, nested: { ok: 1 }, path: "graphql" });
  assert.ok(!JSON.stringify(e).includes("ghp_"));
  assert.equal(K.makeEntry("nope", "e").level, "info");
});

test("limits: event 64, message 2000, oversized detail truncated", () => {
  const e = K.makeEntry("info", "x".repeat(100), "m".repeat(5000), { big: "y".repeat(9000) });
  assert.equal(e.event.length, 64);
  assert.equal(e.message.length, 2000);
  assert.deepEqual(e.detail, { truncated: true });
});

test("enqueue caps at 500 dropping oldest", () => {
  let q = [];
  let dropped = 0;
  for (let i = 0; i < 505; i++) { const r = K.enqueue(q, { i }, 500); q = r.queue; dropped += r.dropped; }
  assert.equal(q.length, 500);
  assert.equal(q[0].i, 5);
  assert.equal(dropped, 5);
});

test("splitBatches in chunks of 50", () => {
  const b = K.splitBatches(Array.from({ length: 120 }, (_, i) => i), 50);
  assert.deepEqual(b.map((x) => x.length), [50, 50, 20]);
});

test("verdict: 4xx dropped (not 408/429), 5xx and network kept", () => {
  assert.equal(K.verdict(201), "ok");
  assert.equal(K.verdict(400), "drop");
  assert.equal(K.verdict(401), "drop");
  assert.equal(K.verdict(408), "keep");
  assert.equal(K.verdict(429), "keep");
  assert.equal(K.verdict(500), "keep");
  assert.equal(K.verdict(0), "keep");
});

test("unconfigured: log stays local only, queue empty, flush is a no-op", async () => {
  clear();
  globalThis.LEVANA_CFG = { supabaseUrl: "", supabaseKey: "" };
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { status: 201 }; };
  K.log("info", "app_start", "x");
  assert.equal(K.readLocal().length, 1);
  assert.equal(K.queueLen(), 0);
  await K.flush();
  assert.equal(calls, 0);
  assert.equal(K.configured(), false);
});

test("scrubs gho_/ghs_/ghu_ tokens", () => {
  clear();
  globalThis.LEVANA_CFG = { supabaseUrl: "", supabaseKey: "" };
  K.log("info", "t", "a gho_abc123 b ghs_def456 c ghu_ghi789", { x: "ghu_zzz" });
  const r = K.readLocal()[0];
  assert.equal(r.message, "a [redacted] b [redacted] c [redacted]");
  assert.equal(r.detail.x, "[redacted]");
});

test("refuses a service_role key (JWT or sb_secret_)", async () => {
  clear();
  const jwt = (role) => "eyJhbGciOiJIUzI1NiJ9." + Buffer.from(JSON.stringify({ role })).toString("base64url") + ".sig";
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { status: 201 }; };
  globalThis.LEVANA_CFG = { supabaseUrl: "https://x.supabase.co", supabaseKey: jwt("service_role") };
  assert.equal(K.configured(), false);
  globalThis.LEVANA_CFG = { supabaseUrl: "https://x.supabase.co", supabaseKey: "sb_secret_abc" };
  assert.equal(K.configured(), false);
  K.log("info", "e", "m");
  await K.flush();
  assert.equal(calls, 0);
  globalThis.LEVANA_CFG = { supabaseUrl: "https://x.supabase.co", supabaseKey: jwt("anon") };
  assert.equal(K.configured(), true);
});

test("400 on a batch retries rows one by one; only the bad row is rejected", async () => {
  clear();
  globalThis.LEVANA_CFG = { supabaseUrl: "https://x.supabase.co", supabaseKey: "sb_publishable_abc" };
  const calls = [];
  globalThis.fetch = async (u, o) => { const rows = JSON.parse(o.body); calls.push(rows.length); return { status: rows.some((r) => r.event === "bad") ? 400 : 201 }; };
  K.log("info", "a", "m"); K.log("info", "bad", "m"); K.log("info", "c", "m");
  await K.flush();
  assert.deepEqual(calls, [3, 1, 1, 1]);
  assert.equal(K.queueLen(), 0);
  const rej = K.readLocal().filter((e) => e.event === "log_rejected");
  assert.equal(rej.length, 1);
  assert.equal(rej[0].detail.count, 1);
});

test("configured: flush posts batches with headers; 4xx drops + logs locally; 5xx keeps", async () => {
  clear();
  globalThis.LEVANA_CFG = { supabaseUrl: "https://x.supabase.co", supabaseKey: "sb_publishable_abc" };
  const sent = [];
  let status = 201;
  globalThis.fetch = async (u, o) => { sent.push({ u, o }); return { status }; };
  for (let i = 0; i < 60; i++) K.log("info", "e" + i, "m");
  await K.flush();
  assert.equal(sent.length, 2);
  assert.equal(sent[0].u, "https://x.supabase.co/rest/v1/levana_log");
  assert.equal(sent[0].o.headers.apikey, "sb_publishable_abc");
  assert.equal(sent[0].o.headers.Prefer, "return=minimal");
  assert.equal(sent[0].o.headers.Authorization, undefined);
  assert.equal(JSON.parse(sent[0].o.body).length, 50);
  assert.equal(K.queueLen(), 0);
  assert.ok(K.status().lastWriteAt);

  status = 400;
  K.log("info", "bad", "m");
  await K.flush();
  assert.equal(K.queueLen(), 0);
  assert.ok(K.readLocal().some((e) => e.event === "log_rejected"));

  status = 503;
  K.log("info", "later", "m");
  await K.flush();
  assert.equal(K.queueLen(), 1);
});

test("jsonl export: one object per line", () => {
  assert.equal(K.toJsonl([{ a: 1 }, { b: 2 }]), '{"a":1}\n{"b":2}\n');
  assert.equal(K.toJsonl([]), "");
});

test("detail is limited by UTF-8 bytes, not chars", () => {
  const e = K.makeEntry("info", "e", "m", { t: "ก".repeat(2500) });
  assert.deepEqual(e.detail, { truncated: true });
});

test("5xx mid per-row retry: earlier 400 is recorded, queue keeps the rest", async () => {
  clear();
  globalThis.LEVANA_CFG = { supabaseUrl: "https://x.supabase.co", supabaseKey: "sb_publishable_abc" };
  const st = { a: 400, b: 201, c: 503 };
  globalThis.fetch = async (u, o) => { const rows = JSON.parse(o.body); return { status: rows.length > 1 ? 400 : st[rows[0].event] || 201 }; };
  for (const n of ["a", "b", "c", "d"]) K.log("info", n, "m");
  await K.flush();
  assert.deepEqual(JSON.parse(store.levana_logq).map((e) => e.event), ["c", "d"]);
  const rej = K.readLocal().filter((e) => e.event === "log_rejected");
  assert.equal(rej.length, 1);
  assert.equal(rej[0].detail.count, 1);
  assert.equal(rej[0].detail.status, 400);
});

test("log() during an in-flight flush survives", async () => {
  clear();
  globalThis.LEVANA_CFG = { supabaseUrl: "https://x.supabase.co", supabaseKey: "sb_publishable_abc" };
  let n = 0;
  globalThis.fetch = async () => { n++; if (n === 1) { K.log("info", "late", "m"); return { status: 201 }; } return { status: 503 }; };
  K.log("info", "early", "m");
  await K.flush();
  assert.deepEqual(JSON.parse(store.levana_logq).map((e) => e.event), ["late"]);
});
