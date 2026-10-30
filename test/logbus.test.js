const test = require("node:test");
const assert = require("node:assert/strict");

const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const K = require("../logbus.js");
const clear = () => { for (const k of Object.keys(store)) delete store[k]; };

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
