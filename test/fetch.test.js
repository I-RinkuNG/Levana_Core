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
  assert.equal(L.retryDelay({ code: "rate", retryAfter: 60 }, 0), 10000);
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
