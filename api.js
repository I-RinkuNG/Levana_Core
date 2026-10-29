const KeshApi = (() => {
const OWNER = "i-rinkung", REPO = "claude-dotfiles";
const API = "https://api.github.com/repos/" + OWNER + "/" + REPO;
const st = { branch: "main" };
const apiStatus = { ok: null, code: null, checkedAt: null };
const subs = [];
const setStatus = (ok, code) => { apiStatus.ok = ok; apiStatus.code = code || null; apiStatus.checkedAt = Date.now(); subs.forEach((f) => f(apiStatus)); };
const token = () => localStorage.getItem("levana_token");
let cache = {};
const LOGKEY = "levana_errlog";
const readLog = () => { try { return JSON.parse(localStorage.getItem(LOGKEY)) || []; } catch (e) { return []; } };
const logErr = (e) => {
  try {
    localStorage.setItem(LOGKEY, JSON.stringify(KeshLogic.pushLog(readLog(), {
      time: new Date().toISOString(), path: e.path, status: e.status || null, code: e.code,
      remaining: e.remaining == null ? null : e.remaining, retryAfter: e.retryAfter == null ? null : e.retryAfter, message: e.message || ""
    })));
  } catch (x) {}
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function once(path, raw) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  let r;
  try {
    r = await fetch(path.startsWith("http") ? path : API + path, {
      signal: ctl.signal,
      headers: { Authorization: "Bearer " + token(), Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json" }
    });
    if (r.ok) return await (raw ? r.text() : r.json());
  } catch (x) {
    throw x && x.name === "AbortError" ? { code: "timeout", path, message: "timeout 15s" } : { code: "network", path, message: String(x && x.message || x) };
  } finally { clearTimeout(t); }
  let msg = "";
  try { msg = (await r.json()).message || ""; } catch (x) {}
  const ra = r.headers.get("retry-after"), rem = r.headers.get("x-ratelimit-remaining");
  const e = { status: r.status, path, message: msg, remaining: rem, retryAfter: ra == null || isNaN(+ra) ? null : +ra };
  e.code = KeshLogic.classify({ status: r.status, retryAfter: e.retryAfter, remaining: rem, msg });
  throw e;
}
async function onceGql(vars) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000), path = "graphql";
  let r;
  try {
    r = await fetch("https://api.github.com/graphql", {
      method: "POST", signal: ctl.signal,
      headers: { Authorization: "Bearer " + token(), "Content-Type": "application/json" },
      body: JSON.stringify({ query: KeshLogic.GQL_QUERY, variables: vars })
    });
  } catch (x) {
    throw x && x.name === "AbortError" ? { code: "timeout", path, message: "timeout 15s" } : { code: "network", path, message: String(x && x.message || x) };
  } finally { clearTimeout(t); }
  let body = {};
  try { body = await r.json(); } catch (x) {}
  const ra = r.headers.get("retry-after"), rem = r.headers.get("x-ratelimit-remaining");
  const retryAfter = ra == null || isNaN(+ra) ? null : +ra;
  let errors = body.errors;
  if (!r.ok && !(errors && errors.length)) errors = [{ message: body.message || "" }];
  if (r.ok && !(errors && errors.length)) return body.data;
  const c = KeshLogic.classifyGql({ status: r.status, errors, retryAfter, remaining: rem });
  if (r.ok && body.data && body.data.repository && c.code !== "rate" && c.code !== "auth") {
    logErr({ status: r.status, path, message: c.message, code: "partial" });
    return Object.assign({}, body.data, { _errors: errors });
  }
  throw { status: r.status, path, message: c.message, remaining: rem, retryAfter, code: c.code };
}
const retrying = async (fn) => {
  for (let n = 0; ; n++) {
    try { const r = await fn(); setStatus(true); return r; } catch (e) {
      if (e.code === "auth") setStatus(false, 401);
      const d = KeshLogic.retryDelay(e, n);
      if (d == null) { logErr(e); throw e; }
      await sleep(d);
    }
  }
};
const api = (path, raw) => retrying(() => once(path, raw));
const get = (key, fn) => KeshLogic.memo(cache, key, fn);
const ref = () => "?ref=" + encodeURIComponent(st.branch);
const dir = (p) => get("d" + p, () => api("/contents/" + p + ref()).then((l) => l.filter((x) => x.type === "file")));
const text = (p) => get("f" + p, () => api("/contents/" + encodeURI(p) + ref(), true));
const snap = () => get("g", () => retrying(() => onceGql(KeshLogic.gqlVars(OWNER, REPO, st.branch))).then((d) => {
  const m = KeshLogic.mapGraphql(d);
  if (!m || !m.branchFound) throw { code: "404", path: "graphql", message: "repository or branch not found" };
  return m;
}));
const issues = () => snap().then((m) => m.issues);
const commits = () => snap().then((m) => m.commits);
const mdFiles = async (d) => {
  try { return await dir(d); } catch (e) { if (e.code === "404") return []; throw e; }
};
let partial = [], notes = [];
const ws = () => get("ws", async () => {
  const m = await snap();
  partial = m.partial;
  notes = m.notes;
  const is = m.issues, got = m.files;
  const of = (d) => got.filter((x) => x.dir === d);
  const runs = of("runs").map((x) => KeshParse.parseRunLog(x.md, x.name + ".md"));
  const agents = of("agents").map((x) => Object.assign({ name: x.name }, KeshParse.parseFrontmatter(x.md)));
  const l = of("lessons"), lessons = {};
  for (const x of l) lessons[x.name] = KeshParse.countLessons(x.md);
  return { runs, agents, lessons, files: got, lessonTexts: l, issues: is, agg: KeshParse.aggregate(runs, is, agents, lessons) };
});

const recheck = async () => {
  delete cache.g;
  try { await retrying(() => once("https://api.github.com/rate_limit")); } catch (e) { if (e.code !== "auth") setStatus(false, e.status || e.code); }
  return apiStatus;
};
const clear = () => { cache = {}; };
const clearLog = () => { try { localStorage.removeItem(LOGKEY); } catch (e) {} };
return { OWNER, REPO, st, apiStatus, onStatus: (f) => subs.push(f), recheck, clear, clearLog, token, readLog, logErr, api, get, dir, text, snap, issues, commits, mdFiles, ws, partial: () => partial, notes: () => notes };
})();
