const KeshLogic = (() => {
  const P = typeof KeshParse !== "undefined" ? KeshParse : require("./parse.js");
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
  const GQL_QUERY = `fragment D on GitObject { ... on Tree { entries { name type object { ... on Blob { text isTruncated byteSize oid } } } } }
query($owner: String!, $name: String!, $ref: String!, $runs: String!, $agents: String!, $lessons: String!) {
  rateLimit { cost remaining }
  repository(owner: $owner, name: $name) {
    ref(qualifiedName: $ref) { target { ... on Commit { history(first: 10) { nodes { oid message author { name date } } } } } }
    runs: object(expression: $runs) { ...D }
    agents: object(expression: $agents) { ...D }
    lessons: object(expression: $lessons) { ...D }
    issues(first: 100, states: [OPEN, CLOSED], orderBy: { field: CREATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes { number title state body createdAt closedAt url author { login } comments { totalCount } assignees(first: 1) { nodes { login } } labels(first: 20) { nodes { name color } } }
    }
  }
}`;
  const GQL_ISSUES_QUERY = `query($owner: String!, $name: String!, $after: String) {
  rateLimit { cost remaining }
  repository(owner: $owner, name: $name) {
    issues(first: 100, after: $after, states: [OPEN, CLOSED], orderBy: { field: CREATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes { number title state body createdAt closedAt url author { login } comments { totalCount } assignees(first: 1) { nodes { login } } labels(first: 20) { nodes { name color } } }
    }
  }
}`;
  const MAX_ISSUE_PAGES = 10;
  const issuePageInfo = (data) => {
    const i = data && data.repository && data.repository.issues;
    const p = i && i.pageInfo;
    return p && p.hasNextPage && p.endCursor ? p.endCursor : null;
  };
  const mergeIssuePages = (data, pages) => {
    const base = (data.repository && data.repository.issues && data.repository.issues.nodes) || [];
    const more = [].concat(...pages.map((d) => (d && d.repository && d.repository.issues && d.repository.issues.nodes) || []));
    const repo = Object.assign({}, data.repository, { issues: Object.assign({}, data.repository.issues, { nodes: base.concat(more) }) });
    return Object.assign({}, data, { repository: repo });
  };
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
        files.push({ dir, name: e.name.replace(/\.md$/, ""), md: b.text, oid: b.oid || null });
      }
    }
    const issues = ((repo.issues && repo.issues.nodes) || []).filter(Boolean).map((i) => ({
      number: i.number, title: i.title, state: String(i.state).toLowerCase(), body: i.body || "",
      created_at: i.createdAt, closed_at: i.closedAt, html_url: i.url,
      user: { login: (i.author && i.author.login) || "ghost" },
      comments: i.comments ? i.comments.totalCount : 0,
      labels: ((i.labels && i.labels.nodes) || []).map((l) => (l.color ? { name: l.name, color: l.color } : { name: l.name })),
      assignee: ((i.assignees && i.assignees.nodes && i.assignees.nodes[0]) || {}).login || ""
    }));
    const hist = repo.ref && repo.ref.target && repo.ref.target.history;
    const commits = ((hist && hist.nodes) || []).map((c) => ({
      sha: c.oid, commit: { message: c.message || "", author: { name: (c.author && c.author.name) || "", date: (c.author && c.author.date) || "" } }
    }));
    return { files, partial, issues, commits, notes: gqlNotes(data._errors), branchFound: !!repo.ref };
  };

  const excerpt = (body, n) => {
    const t = String(body || "").replace(/```[\s\S]*?```/g, " ").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/<[^>]+>/g, " ").replace(/[#>*_`|-]+/g, " ").replace(/\s+/g, " ").trim();
    return t.length > n ? t.slice(0, n) + "…" : t;
  };
  const BOUNCE_WARN = 0.2, BOUNCE_TICK = 40, DAY = 86400000;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const pad2 = (n) => String(n).padStart(2, "0");
  const ymd = (ms) => { const d = new Date(ms); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); };
  const hhmm = (ms) => { const d = new Date(ms); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); };
  const fmtDur = (ms) => {
    const m = Math.max(0, Math.round(ms / 60000)), hh = Math.floor(m / 60), mm = m % 60;
    return hh ? (hh + " ชม. " + (mm ? mm + " น." : "")).trim() : mm + " น.";
  };
  const ageText = (ms) => {
    const m = Math.floor(Math.max(0, ms) / 60000);
    if (m < 1) return "เมื่อครู่";
    if (m < 60) return m + " นาทีที่แล้ว";
    if (m < 1440) return Math.floor(m / 60) + " ชั่วโมงที่แล้ว";
    return Math.floor(m / 1440) + " วันที่แล้ว";
  };
  const fmtTok = (n) => {
    n = Number(n) || 0;
    if (n >= 1e6 || Math.round(n / 1e3) >= 1000) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
    if (n >= 1e3) return Math.round(n / 1e3) + "k";
    return String(Math.round(n));
  };
  const bounceLevel = (rate) => (rate > BOUNCE_WARN + 1e-9 ? "bad" : "ok");
  const bounceBarPct = (rate) => clamp((rate / (BOUNCE_WARN * 2.5)) * 100, 0, 100);

  const PAGES = ["summary", "runs", "run", "issues", "issue", "agents", "files", "log"];
  const REDIRECT = { today: "#/", usage: "#/", lessons: "#/files/lessons", errors: "#/log", more: "#/" };
  const parseQuery = (q) => {
    const out = {};
    for (const kv of String(q || "").split("&")) {
      if (!kv) continue;
      const i = kv.indexOf("=");
      const dec = (x) => { try { return decodeURIComponent(x); } catch (e) { return x; } };
      out[dec(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? "" : dec(kv.slice(i + 1));
    }
    return out;
  };
  const parseRoute = (hash) => {
    let s = String(hash || "").replace(/^#\/?/, "");
    const qi = s.indexOf("?");
    const query = parseQuery(qi < 0 ? "" : s.slice(qi + 1));
    if (qi >= 0) s = s.slice(0, qi);
    if (!s) return { page: "summary", arg: null, query };
    const i = s.indexOf("/");
    const head = i < 0 ? s : s.slice(0, i);
    let arg = i < 0 ? null : s.slice(i + 1);
    if (arg != null) try { arg = decodeURIComponent(arg); } catch (e) {}
    if (head === "summary") return { page: "summary", arg: null, query };
    if (head === "lessons" && arg) return { page: "files", arg: "lessons/" + arg.replace(/\.md$/, "") + ".md", query, redirect: "#/files/lessons/" + arg.replace(/\.md$/, "") + ".md" };
    if (REDIRECT[head]) return { page: head === "lessons" ? "files" : head === "errors" ? "log" : "summary", arg: head === "lessons" ? "lessons" : null, query, redirect: REDIRECT[head] };
    if (!PAGES.includes(head)) return { page: "summary", arg: null, query, redirect: "#/" };
    if ((head === "run" || head === "issue") && !arg) return { page: head + "s", arg: null, query };
    return { page: head, arg: head === "run" || head === "issue" || head === "files" ? arg || null : null, query };
  };
  const NAV = [["summary", "สรุป", "sum", "#/"], ["runs", "Runs", "runs", "#/runs"], ["issues", "Issues", "issue", "#/issues"], ["agents", "Agents", "agents", "#/agents"], ["files", "Files", "files", "#/files"], ["log", "Log", "log", "#/log"]];
  const navModel = (page) => {
    const activeKey = { run: "runs", issue: "issues" }[page] || page;
    return { items: NAV.map(([key, label, icon, href]) => ({ key, label, icon, href })), activeKey };
  };

  const runDay = (r) => (r.date || String(r.run_id || "").slice(0, 10) || "");
  const runTokens = (r) => (r.tokens_total != null ? r.tokens_total : 0);
  const activeRun = (runs) => (runs || []).filter((r) => r.status === "open").sort((a, b) => String(b.run_id).localeCompare(String(a.run_id)))[0] || null;
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
  const USAGE_STALE_MS = 15 * 60 * 1000;
  const usageState = (u, now) => {
    const f = u && u.five_hour;
    if (!f || typeof f.used_percentage !== "number") return { state: "missing" };
    const cap = Date.parse(u.captured_at), capturedAt = isNaN(cap) ? null : cap;
    const resetsAt = typeof f.resets_at === "number" ? f.resets_at * 1000 : null;
    const base = { pct: clamp(f.used_percentage, 0, 100), resetsAt, capturedAt };
    const resetPassed = resetsAt != null && now > resetsAt;
    if (resetPassed || capturedAt == null || now - capturedAt > USAGE_STALE_MS) return Object.assign({ state: "stale", resetPassed }, base);
    return Object.assign({ state: "live" }, base);
  };
  const SKIP = ["kesh", "rin", "other"];
  const inWindow = (runs, from, to) => (runs || []).filter((r) => { const d = runDay(r); return d >= from && d < to; });
  const tally = (runs) => {
    let handoffs = 0, tokens = 0, bounces = 0;
    const per = {};
    for (const r of runs) {
      const t = P.computeTokens(r.handoffs || []);
      tokens += t.total || 0;
      for (const h of r.handoffs || []) {
        handoffs++;
        const a = per[h.to] || (per[h.to] = { agent: h.to, handoffs: 0, rejects: 0 });
        a.handoffs++;
        if (h.bounce_round > 0) { bounces++; a.rejects++; }
      }
      for (const k of Object.keys(t.perAgent)) (per[k] || (per[k] = { agent: k, handoffs: 0, rejects: 0 })).tokens = (per[k].tokens || 0) + t.perAgent[k];
    }
    return { handoffs, tokens, bounces, per };
  };
  const lessonCount7d = (texts, nowMs) => {
    const from = ymd(nowMs - 7 * DAY), agents = new Set();
    let count = 0;
    for (const t of texts || []) {
      if (String(t.name).startsWith("_")) continue;
      for (const l of String(t.md).split(/\r?\n/)) {
        const m = /^\s*-\s+.*?(\d{4}-\d{2}-\d{2})/.exec(l);
        if (m && m[1] >= from) { count++; agents.add(t.name); }
      }
    }
    return { count, agents: agents.size };
  };
  const kpis7d = (runs, lessonsTexts, now) => {
    const n = now == null ? Date.now() : now;
    const cur = tally(inWindow(runs, ymd(n - 7 * DAY), "9999")), prev = tally(inWindow(runs, ymd(n - 14 * DAY), ymd(n - 7 * DAY)));
    const tph = cur.handoffs ? cur.tokens / cur.handoffs : null, prevTph = prev.handoffs ? prev.tokens / prev.handoffs : null;
    const worst = Object.values(cur.per).filter((a) => a.handoffs > 0 && !SKIP.includes(a.agent)).sort((a, b) => b.rejects / b.handoffs - a.rejects / a.handoffs || b.rejects - a.rejects)[0] || null;
    const open = (runs || []).filter((r) => r.status === "open");
    return {
      tph, prevTph, deltaPct: tph != null && prevTph ? Math.round(((tph - prevTph) / prevTph) * 100) : null,
      bounces: cur.bounces, handoffs: cur.handoffs, bouncePct: cur.handoffs ? Math.round((cur.bounces / cur.handoffs) * 100) : 0,
      worst: worst && worst.rejects ? { agent: worst.agent, rejects: worst.rejects, handoffs: worst.handoffs } : null,
      done: (runs || []).filter((r) => r.status === "done").length, open: open.length, openDay: open[0] ? runDay(open[0]) : null,
      lessons: lessonCount7d(lessonsTexts, n)
    };
  };
  const agentTable = (runs, days, now) => {
    const n = now == null ? Date.now() : now;
    const t = tally(inWindow(runs, ymd(n - (days || 7) * DAY), "9999"));
    const names = Object.values(AGENT_GROUPS).flat().map((x) => x[0]);
    const rows = names.map((a) => { const x = t.per[a] || {}; const tokens = x.tokens || 0, handoffs = x.handoffs || 0, rejects = x.rejects || 0; return { agent: a, tokens, handoffs, rejects, tph: handoffs ? tokens / handoffs : 0, share: t.tokens ? (tokens / t.tokens) * 100 : 0, rate: handoffs ? rejects / handoffs : 0, hot: handoffs > 0 && rejects / handoffs > BOUNCE_WARN + 1e-9 }; });
    return rows.sort((a, b) => b.tokens - a.tokens || a.agent.localeCompare(b.agent));
  };
  const issueRows = (issues, n) => (issues || []).filter((i) => i.state === "open").sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, n);
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
  const runChip = (r) => {
    if (r.bounce_count > 0) return { kind: "bad", text: "ตีกลับ " + r.bounce_count };
    if (r.status === "done") return { kind: "ok", text: "เสร็จ" };
    return { kind: "run", text: "กำลังรัน" };
  };
  const runRows = (runs, f) => {
    const { q, status, agent } = f || {}, s = String(q || "").trim().toLowerCase();
    return (runs || []).filter((r) => (!s || (r.run_id + " " + r.title).toLowerCase().includes(s)) &&
      (!status || status === "all" || (status === "bounce" ? r.bounce_count > 0 : status === "followups" ? !!r.has_followups : r.status === status)) &&
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
  return { excerpt, bounceSummary, BOUNCE_WARN, BOUNCE_TICK, AGENT_GROUPS, USAGE_STALE_MS, usageState, kpis7d, agentTable, issueRows, fmtDur, parseRoute, navModel, bounceLevel, bounceBarPct, activeRun, stageModel, handoffRows, bounceReasons, agentTokens, agentCards, runRows, runChip, usageSeries, groupFiles, lessonGroups, highlight, ageText, hhmm, fmtTok, ymd, classify, classifyGql, gqlNotes, mapGraphql, gqlVars, GQL_QUERY, GQL_ISSUES_QUERY, MAX_ISSUE_PAGES, issuePageInfo, mergeIssuePages, retryDelay, pushLog, memo, isToday, tokensByAgent, rejectRates };
})();
if (typeof module !== "undefined") module.exports = KeshLogic;
