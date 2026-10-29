const KeshLogic = (() => {
  const P = typeof KeshParse !== "undefined" ? KeshParse : require("./parse.js");
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

  const BOUNCE_WARN = 0.2, BOUNCE_TICK = 40, H5 = 5 * 3600000, DAY = 86400000;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const pad2 = (n) => String(n).padStart(2, "0");
  const ymd = (ms) => { const d = new Date(ms); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); };
  const hhmm = (ms) => { const d = new Date(ms); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); };
  const fmtCountdown = (ms) => { const s = Math.floor(Math.max(0, ms) / 1000); return [s / 3600 | 0, (s % 3600) / 60 | 0, s % 60].map(pad2).join(":"); };
  const ageText = (ms) => {
    const m = Math.floor(Math.max(0, ms) / 60000);
    if (m < 1) return "เมื่อครู่";
    if (m < 60) return m + " นาทีที่แล้ว";
    if (m < 1440) return Math.floor(m / 60) + " ชั่วโมงที่แล้ว";
    return Math.floor(m / 1440) + " วันที่แล้ว";
  };
  const fmtTok = (n) => {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
    if (n >= 1e3) return Math.round(n / 1e3) + "k";
    return String(Math.round(n));
  };
  const bounceLevel = (rate) => (rate > BOUNCE_WARN + 1e-9 ? "bad" : "ok");
  const bounceBarPct = (rate) => clamp((rate / (BOUNCE_WARN * 2.5)) * 100, 0, 100);
  const meterSegments = (usedPct, reservedPct) => {
    const used = clamp(Number(usedPct) || 0, 0, 100);
    const reserved = clamp(Number(reservedPct) || 0, 0, 100 - used);
    return { used, reserved, rest: 100 - used - reserved };
  };
  const projection = (usedPct, elapsedMs) => ({ pctAtReset: elapsedMs > 0 ? usedPct * (H5 / elapsedMs) : usedPct });

  const PAGES = ["today", "runs", "run", "issues", "issue", "agents", "usage", "lessons", "files", "errors", "more"];
  const parseRoute = (hash) => {
    const s = String(hash || "").replace(/^#/, "");
    const i = s.indexOf("/");
    const page = i < 0 ? s : s.slice(0, i);
    let arg = i < 0 ? null : s.slice(i + 1);
    if (arg != null) try { arg = decodeURIComponent(arg); } catch (e) {}
    if (!PAGES.includes(page)) return { page: "today", arg: null };
    if ((page === "run" || page === "issue") && !arg) return { page: page + "s", arg: null };
    return { page, arg: page === "run" || page === "issue" ? arg : null };
  };
  const NAV = {
    today: ["วันนี้", "today"], runs: ["Runs", "runs"], issues: ["Issues", "issues"], agents: ["Agents", "agents"], more: ["เพิ่มเติม", "more"],
    usage: ["การใช้ token", "usage"], lessons: ["Lessons", "lessons"], files: ["ไฟล์", "files"], errors: ["Errors", "errors"]
  };
  const navModel = (counts, page) => {
    const c = counts || {};
    const item = (k) => ({ key: k, label: NAV[k][0], icon: NAV[k][1], href: "#" + k, count: c[k] == null ? null : c[k] });
    const activeKey = { run: "runs", issue: "issues" }[page] || page;
    const sub = ["usage", "lessons", "files", "errors"];
    return {
      bottom: ["today", "runs", "issues", "agents", "more"].map(item),
      rail: [["today"], ["runs", "issues", "agents"], sub].map((g) => g.map(item)),
      activeKey,
      activeBottom: sub.includes(activeKey) ? "more" : activeKey
    };
  };

  const runDay = (r) => (r.date || String(r.run_id || "").slice(0, 10) || "");
  const runTokens = (r) => (r.tokens_total != null ? r.tokens_total : 0);
  const window5h = (runs, nowMs) => {
    const rs = runs || [];
    const timed = rs.filter((r) => r.started_at && !isNaN(Date.parse(r.started_at)) && nowMs - Date.parse(r.started_at) < H5 && Date.parse(r.started_at) <= nowMs);
    let startMs, used, estimated;
    if (timed.length) {
      startMs = Math.min(...timed.map((r) => Date.parse(r.started_at)));
      used = rs.filter((r) => r.started_at && Date.parse(r.started_at) >= startMs).reduce((s, r) => s + runTokens(r), 0);
      estimated = false;
    } else {
      const d = new Date(nowMs), mid = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      startMs = mid + Math.floor((nowMs - mid) / H5) * H5;
      used = rs.filter((r) => isToday(r, ymd(nowMs))).reduce((s, r) => s + runTokens(r), 0);
      estimated = true;
    }
    const resetMs = startMs + H5;
    return { startMs, resetMs, remainingMs: Math.max(0, resetMs - nowMs), usedTokens: used, usedPct: pct5h(used), estimated };
  };

  const activeRun = (runs) => (runs || []).filter((r) => r.status !== "done").sort((a, b) => String(b.run_id).localeCompare(String(a.run_id)))[0] || null;
  const stageModel = (run) => {
    if (!run) return [];
    const hs = run.handoffs || [];
    let agents = [];
    for (const g of run.flow || []) for (const m of g.members) agents.push(m.agent);
    if (!agents.length) for (const h of hs) if (!agents.includes(h.to)) agents.push(h.to);
    let nowSet = run.status === "done";
    return agents.map((agent, i) => {
      const mine = hs.filter((h) => h.to === agent);
      const bounces = mine.filter((h) => h.bounce_round > 0).length;
      const done = run.status === "done" || mine.some((h) => h.status === "done") || hs.some((h) => h.from === agent && !h.self);
      let state = done ? (bounces ? "bounced" : "done") : nowSet ? "todo" : "now";
      if (!done && !nowSet) nowSet = true;
      return { n: i + 1, agent, state, bounces };
    });
  };
  const handoffTokens = (hs) => P.computeTokens(hs).deltas;
  const causeOf = (h) => {
    const m = /สาเหตุ(?:ใหม่)?\s*:\s*([^)]*)/.exec(h.annotation || "");
    return (m ? m[1] : h.reason || "").trim();
  };
  const handoffRows = (run) => {
    const hs = (run && run.handoffs) || [];
    const d = handoffTokens(hs);
    const max = Math.max(0, ...d.map((x) => x || 0));
    return hs.map((h, i) => ({
      n: i + 1, from: h.from, to: h.to, tokens: d[i], relPct: max && d[i] ? (d[i] / max) * 100 : 0,
      bounced: h.bounce_round > 0, running: h.status === "running", why: h.bounce_round > 0 ? causeOf(h) : null
    }));
  };
  const bounceReasons = (run) => {
    const m = {};
    for (const h of (run && run.handoffs) || []) if (h.bounce_round > 0) { const k = causeOf(h) || "ไม่ระบุสาเหตุ"; m[k] = (m[k] || 0) + 1; }
    return Object.keys(m).map((reason) => ({ reason, count: m[reason] })).sort((a, b) => b.count - a.count);
  };
  const agentTokens = (run) => {
    const p = P.computeTokens((run && run.handoffs) || []).perAgent;
    const list = Object.keys(p).filter((k) => p[k] > 0).map((agent) => ({ agent, tokens: p[agent] })).sort((a, b) => b.tokens - a.tokens);
    const max = list.length ? list[0].tokens : 0;
    return list.map((x) => Object.assign(x, { pct: max ? (x.tokens / max) * 100 : 0 }));
  };

  const AGENT_GROUPS = {
    BUILD: [["kotev", "เขียนโค้ด"], ["tzayar", "ออกแบบ"], ["bona", "วางโครงสร้าง"], ["oseh", "รันคำสั่ง"], ["tak", "ปรับโค้ด"]],
    CHECK: [["bochek", "ทดสอบ"], ["amet", "ตรวจข้อเท็จจริง"], ["rosh", "วางแผนวิจัย"], ["cheker", "ดึงข้อมูล"], ["zekher", "ดูแล lessons"]]
  };
  const agentCards = (w, windowDays, nowMs) => {
    const days = windowDays || 7, from = ymd((nowMs == null ? Date.now() : nowMs) - days * DAY);
    const runs = ((w && w.runs) || []).filter((r) => runDay(r) >= from);
    const per = {}, hc = {}, bc = {};
    for (const r of runs) {
      const p = P.computeTokens(r.handoffs || []).perAgent;
      for (const k of Object.keys(p)) per[k] = (per[k] || 0) + p[k];
      for (const h of r.handoffs || []) { hc[h.to] = (hc[h.to] || 0) + 1; if (h.bounce_round > 0) bc[h.to] = (bc[h.to] || 0) + 1; }
    }
    const max = Math.max(0, ...Object.values(AGENT_GROUPS).flat().map(([a]) => per[a] || 0));
    let rank = 0;
    const out = [];
    for (const group of Object.keys(AGENT_GROUPS)) {
      const cards = AGENT_GROUPS[group].map(([name, role]) => {
        const handoffs = hc[name] || 0, rate = handoffs ? (bc[name] || 0) / handoffs : 0;
        return { name, group, role, tokens: per[name] || 0, relPct: max ? ((per[name] || 0) / max) * 100 : 0, handoffs, bounceRate: rate, level: bounceLevel(rate), lessons: ((w && w.lessons) || {})[name] || 0 };
      }).sort((a, b) => b.tokens - a.tokens);
      for (const c of cards) out.push(Object.assign(c, { rank: ++rank }));
    }
    return out;
  };

  const bounceSummary = (cards) => {
    const rates = (cards || []).filter((c) => c.handoffs > 0 && c.name !== "rin" && c.name !== "kesh").map((c) => ({ agent: c.name, handoffs: c.handoffs, rejects: Math.round(c.bounceRate * c.handoffs), rate: c.bounceRate })).sort((a, b) => b.rate - a.rate || b.rejects - a.rejects);
    const handoffs = rates.reduce((s, r) => s + r.handoffs, 0), bounces = rates.reduce((s, r) => s + r.rejects, 0);
    return { handoffs, bounces, rate: handoffs ? bounces / handoffs : 0, rates };
  };
  const actionQueue = ({ runs, issues, apiStatus, rates, now }) => {
    const out = [];
    const ar = activeRun(runs);
    if (ar) {
      const st = stageModel(ar).find((s) => s.state === "now");
      out.push({ kind: "APPROVE", title: "Run " + (ar.title || ar.run_id) + " รออนุมัติ", meta: (st ? "อยู่ขั้น " + st.agent + " · " : "") + (ar.handoffs || []).length + " handoff", href: "#run/" + encodeURIComponent(ar.run_id), danger: false });
    }
    if (apiStatus && apiStatus.ok === false) out.push({ kind: "ALERT", title: "GitHub token API ใช้ไม่ได้", meta: "ตรวจล่าสุด " + (apiStatus.checkedAt ? hhmm(apiStatus.checkedAt) : "-"), href: "#errors", danger: true });
    for (const r of (rates || []).filter((x) => bounceLevel(x.rate) === "bad" && x.agent !== "rin" && x.agent !== "kesh")) {
      out.push({ kind: "ALERT", title: r.agent + " ตีกลับงาน " + Math.round(r.rate * 100) + "% (เกิน 20%)", meta: r.rejects + " จาก " + r.handoffs + " handoff", href: "#agents", danger: true });
    }
    const t = now == null ? Date.now() : now;
    const oldest = (issues || []).filter((i) => i.state === "open").sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0];
    if (oldest) out.push({ kind: "ISSUE", title: "Issue #" + oldest.number + " เปิดค้าง " + Math.max(0, Math.floor((t - Date.parse(oldest.created_at)) / DAY)) + " วัน", meta: oldest.title, href: "#issue/" + oldest.number, danger: false });
    return out.slice(0, 3);
  };
  const reservedTokens = (run, runs, n) => {
    const next = stageModel(run).filter((s) => s.state === "todo" && s.agent !== "rin" && s.agent !== "kesh")[0];
    if (!next) return null;
    const vals = [];
    for (const r of runs || []) {
      const d = handoffTokens(r.handoffs || []);
      (r.handoffs || []).forEach((h, i) => { if (h.to === next.agent && d[i] != null) vals.push({ id: r.run_id, i, v: d[i] }); });
    }
    const last = vals.sort((a, b) => String(a.id).localeCompare(String(b.id)) || a.i - b.i).slice(-(n || 10));
    if (!last.length) return null;
    const tokens = last.reduce((s, x) => s + x.v, 0) / last.length;
    return { tokens, pct: pct5h(tokens), agent: next.agent };
  };
  const runChip = (r) => {
    if (r.bounce_count > 0) return { kind: "bad", text: "ตีกลับ " + r.bounce_count };
    if (r.status === "done") return { kind: "ok", text: "เสร็จ" };
    return r.status === "pending" ? { kind: "run", text: "ค้าง" } : { kind: "run", text: "กำลังรัน" };
  };
  const runRows = (runs, f) => {
    const { q, status, agent } = f || {}, s = String(q || "").trim().toLowerCase();
    return (runs || []).filter((r) => (!s || (r.run_id + " " + r.title).toLowerCase().includes(s)) &&
      (!status || status === "all" || (status === "bounce" ? r.bounce_count > 0 : r.status === status)) &&
      (!agent || (r.handoffs || []).some((h) => h.to === agent))).sort((a, b) => String(b.run_id).localeCompare(String(a.run_id)));
  };
  const usageSeries = (agg, rates) => ({
    perRun: agg.g1.slice(-10).map((x) => ({ id: x.run_id, total: x.total || 0 })),
    perAgent: agg.g2, bounceByAgent: rates, lessonsByAgent: agg.g5.filter((x) => x.lessons > 0).sort((a, b) => b.lessons - a.lessons)
  });
  const FOLDERS = ["runs", "plans", "research", "lessons", "agents"];
  const groupFiles = (files, sort) => FOLDERS.map((folder) => {
    const items = (files || []).filter((f) => f.dir === folder).map((f) => ({ name: f.name, size: f.size, date: (/^\d{4}-\d{2}-\d{2}/.exec(f.name) || [""])[0], path: f.path }));
    items.sort(sort === "date" ? (a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name) : (a, b) => a.name.localeCompare(b.name));
    return { folder, items };
  }).filter((g) => g.items.length);
  const lessonGroups = (texts, q, agent) => {
    const s = String(q || "").trim().toLowerCase();
    return (texts || []).filter((t) => !agent || t.name === agent).map((t) => {
      const all = String(t.md).split(/\r?\n/).filter((l) => /^\s*-\s+/.test(l)).map((l) => l.replace(/^\s*-\s+/, ""));
      const hit = all.filter((l) => !s || l.toLowerCase().includes(s));
      return { agent: t.name, total: hit.length, items: hit.slice(0, 7), rest: hit.slice(7) };
    }).filter((g) => g.total);
  };
  const highlight = (text, q) => {
    const s = String(q || "").trim().toLowerCase(), t = String(text);
    if (!s) return [{ t, hit: false }];
    const out = [];
    let i = 0, k;
    while ((k = t.toLowerCase().indexOf(s, i)) >= 0) { if (k > i) out.push({ t: t.slice(i, k), hit: false }); out.push({ t: t.slice(k, k + s.length), hit: true }); i = k + s.length; }
    if (i < t.length) out.push({ t: t.slice(i), hit: false });
    return out;
  };
  return { bounceSummary, BOUNCE_WARN, BOUNCE_TICK, AGENT_GROUPS, parseRoute, navModel, window5h, reservedTokens, meterSegments, fmtCountdown, projection, bounceLevel, bounceBarPct, activeRun, stageModel, actionQueue, handoffRows, bounceReasons, agentTokens, agentCards, runRows, runChip, usageSeries, groupFiles, lessonGroups, highlight, ageText, hhmm, fmtTok, ymd, classify, classifyGql, gqlNotes, mapGraphql, gqlVars, GQL_QUERY, retryDelay, pushLog, memo, TOKENS_PER_PCT, pct5h, isToday, tokensByAgent, rejectRates };
})();
if (typeof module !== "undefined") module.exports = KeshLogic;
