const KeshLogic = (() => {
  const TOKENS_PER_PCT = 15000;
  const pct5h = (tokens) => (Number(tokens) || 0) / TOKENS_PER_PCT;
  const isToday = (r, today) => String(r.run_id || "").startsWith(today);
  const tokensByAgent = (runs, computeTokens) => {
    const out = {};
    for (const r of runs || []) {
      const p = computeTokens(r.handoffs || []).perAgent;
      for (const k of Object.keys(p)) out[k] = (out[k] || 0) + (p[k] || 0);
    }
    return Object.keys(out).map((agent) => ({ agent, tokens: out[agent] })).sort((a, b) => b.tokens - a.tokens);
  };
  const rejectRates = (runs) => {
    const m = {};
    for (const r of runs || []) for (const h of r.handoffs || []) {
      const a = m[h.to] || (m[h.to] = { agent: h.to, handoffs: 0, rejects: 0 });
      a.handoffs++;
      if (h.bounce_round > 0) a.rejects++;
    }
    return Object.keys(m).map((k) => Object.assign(m[k], { rate: m[k].rejects / m[k].handoffs })).sort((a, b) => b.rate - a.rate || b.rejects - a.rejects);
  };
  const classify = ({ status, retryAfter, remaining, msg }) => {
    if (status === 401) return "auth";
    if (status === 404) return "404";
    if (status === 429 || (status === 403 && (retryAfter != null || remaining === "0" || /rate limit/i.test(msg || "")))) return "rate";
    if (status === 403) return "forbidden";
    return "http";
  };
  const retryDelay = (e, attempt) => {
    if (attempt >= 2) return null;
    const back = 500 * Math.pow(2, attempt);
    if (e.code === "network" || e.code === "timeout" || (e.code === "http" && e.status >= 500)) return back;
    if (e.code === "rate") {
      const d = e.retryAfter != null ? e.retryAfter * 1000 : back;
      return d > 10000 ? null : d;
    }
    return null;
  };
  const pushLog = (log, entry, max = 50) => (log || []).concat([entry]).slice(-max);
  const memo = (cache, key, fn) => {
    if (cache[key]) return cache[key];
    const p = cache[key] = fn();
    p.catch(() => { if (cache[key] === p) delete cache[key]; });
    return p;
  };
  const DIRS = ["runs", "agents", "lessons"];
  const GQL_QUERY = `fragment D on GitObject { ... on Tree { entries { name type object { ... on Blob { text isTruncated byteSize } } } } }
query($owner: String!, $name: String!, $ref: String!, $runs: String!, $agents: String!, $lessons: String!) {
  rateLimit { cost remaining }
  repository(owner: $owner, name: $name) {
    ref(qualifiedName: $ref) { target { ... on Commit { history(first: 10) { nodes { oid message author { name date } } } } } }
    runs: object(expression: $runs) { ...D }
    agents: object(expression: $agents) { ...D }
    lessons: object(expression: $lessons) { ...D }
    issues(first: 100, states: [OPEN, CLOSED], orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes { number title state body createdAt closedAt url author { login } comments { totalCount } labels(first: 20) { nodes { name } } }
    }
  }
}`;
  const gqlVars = (owner, name, branch) => ({
    owner, name, ref: "refs/heads/" + branch,
    runs: branch + ":runs", agents: branch + ":agents", lessons: branch + ":lessons"
  });
  const classifyGql = ({ status, errors, retryAfter, remaining }) => {
    const errs = errors || [];
    const where = (x) => (Array.isArray(x.path) ? x.path.join(".") : x.path || "");
    const msg = errs.map((x) => (where(x) ? where(x) + ": " : "") + (x.message || "")).filter(Boolean).join("; ");
    if (status === 401) return { code: "auth", message: msg };
    if (status && status !== 200) return { code: classify({ status, retryAfter, remaining, msg }), message: msg };
    const t = (x) => x.type || (x.extensions && x.extensions.code) || "";
    const has = (k) => errs.some((x) => t(x) === k);
    if (has("RATE_LIMITED") || /rate limit/i.test(msg)) return { code: "rate", message: msg };
    if (has("FORBIDDEN") || has("INSUFFICIENT_SCOPES")) return { code: "forbidden", message: msg };
    if (has("NOT_FOUND")) return { code: "404", message: msg };
    if (/bad credentials/i.test(msg)) return { code: "auth", message: msg };
    return { code: "http", message: msg };
  };
  const gqlNotes = (errors) => (errors || []).map((x) => "โหลด " + (Array.isArray(x.path) ? x.path.slice(0, 2).join(".") : x.path || "บางส่วน") + " ไม่ได้: " + (x.message || ""));
  const mapGraphql = (data) => {
    const repo = data && data.repository;
    if (!repo) return null;
    const files = [], partial = [];
    for (const dir of DIRS) {
      const t = repo[dir];
      for (const e of (t && t.entries) || []) {
        if (e.type !== "blob" || !/\.md$/.test(e.name)) continue;
        const b = e.object;
        if (!b || b.isTruncated || typeof b.text !== "string") { partial.push(dir + "/" + e.name); continue; }
        files.push({ dir, name: e.name.replace(/\.md$/, ""), md: b.text });
      }
    }
    const issues = ((repo.issues && repo.issues.nodes) || []).filter(Boolean).map((i) => ({
      number: i.number, title: i.title, state: String(i.state).toLowerCase(), body: i.body || "",
      created_at: i.createdAt, closed_at: i.closedAt, html_url: i.url,
      user: { login: (i.author && i.author.login) || "ghost" },
      comments: i.comments ? i.comments.totalCount : 0,
      labels: ((i.labels && i.labels.nodes) || []).map((l) => ({ name: l.name }))
    }));
    const hist = repo.ref && repo.ref.target && repo.ref.target.history;
    const commits = ((hist && hist.nodes) || []).map((c) => ({
      sha: c.oid, commit: { message: c.message || "", author: { name: (c.author && c.author.name) || "", date: (c.author && c.author.date) || "" } }
    }));
    return { files, partial, issues, commits, notes: gqlNotes(data._errors), branchFound: !!repo.ref };
  };
  return { classify, classifyGql, gqlNotes, mapGraphql, gqlVars, GQL_QUERY, retryDelay, pushLog, memo, TOKENS_PER_PCT, pct5h, isToday, tokensByAgent, rejectRates };
})();
if (typeof module !== "undefined") module.exports = KeshLogic;
