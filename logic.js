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
  return { TOKENS_PER_PCT, pct5h, isToday, tokensByAgent, rejectRates };
})();
if (typeof module !== "undefined") module.exports = KeshLogic;
