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
    if (e.code === "rate") return Math.min(10000, e.retryAfter != null ? e.retryAfter * 1000 : back);
    return null;
  };
  const pushLog = (log, entry, max = 50) => (log || []).concat([entry]).slice(-max);
  const memo = (cache, key, fn) => {
    if (cache[key]) return cache[key];
    const p = cache[key] = fn();
    p.catch(() => { if (cache[key] === p) delete cache[key]; });
    return p;
  };
  return { classify, retryDelay, pushLog, memo, TOKENS_PER_PCT, pct5h, isToday, tokensByAgent, rejectRates };
})();
if (typeof module !== "undefined") module.exports = KeshLogic;
