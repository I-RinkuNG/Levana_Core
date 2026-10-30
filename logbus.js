const KeshLog = (() => {
  const G = typeof window !== "undefined" ? window : globalThis;
  const QK = "levana_logq", LK = "levana_log_local", AK = "levana_log_auth", Q_CAP = 500, LOCAL_CAP = 1000, BATCH = 50, LEVELS = ["debug", "info", "warn", "error"];
  const cfg = () => G.LEVANA_CFG || {};
  const configured = () => !!(cfg().supabaseUrl && cfg().supabaseKey);
  const pad = (n, l) => String(n).padStart(l || 2, "0");
  const isoOffset = (d) => {
    const o = -d.getTimezoneOffset(), a = Math.abs(o);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + "." + pad(d.getMilliseconds(), 3) + (o >= 0 ? "+" : "-") + pad(Math.floor(a / 60)) + ":" + pad(a % 60);
  };
  const sid = Math.random().toString(36).slice(2, 12);
  const scrub = (v) => typeof v === "string" ? v.replace(/(ghp_|github_pat_|sb_secret_)[A-Za-z0-9_]+/g, "[redacted]") : v;
  const scrubDeep = (v, d = 0) => d > 4 ? null : Array.isArray(v) ? v.map((x) => scrubDeep(x, d + 1)) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => !/token|authorization|secret|password|apikey/i.test(k)).map(([k, x]) => [k, scrubDeep(x, d + 1)])) : scrub(v);
  const device = () => {
    const n = typeof navigator !== "undefined" ? navigator : {}, u = n.userAgentData;
    if (u) return { brands: (u.brands || []).map((b) => b.brand + " " + b.version).slice(0, 4), mobile: !!u.mobile, platform: u.platform || "" };
    return { ua: String(n.userAgent || "").slice(0, 160) };
  };
  const makeEntry = (level, event, message, detail) => {
    let d = detail == null ? null : scrubDeep(detail);
    if (d && JSON.stringify(d).length > 8000) d = { truncated: true };
    return {
      ts: isoOffset(new Date()), level: LEVELS.includes(level) ? level : "info", event: String(event).slice(0, 64),
      route: String(G.location && G.location.hash || "").replace(/access_token=[^&]*/g, "access_token=[redacted]").slice(0, 200), device: device(),
      tz: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) { return null; } })(),
      message: message == null ? null : String(scrub(message)).slice(0, 2000), detail: d, session_id: sid, app_version: cfg().appVersion || "v3"
    };
  };
  const enqueue = (q, entry, cap) => { const all = q.concat([entry]), over = Math.max(0, all.length - (cap || Q_CAP)); return { queue: all.slice(over), dropped: over }; };
  const splitBatches = (q, n) => { const out = []; for (let i = 0; i < q.length; i += n || BATCH) out.push(q.slice(i, i + (n || BATCH))); return out; };
  const verdict = (status) => status >= 200 && status < 300 ? "ok" : status >= 400 && status < 500 && status !== 408 && status !== 429 ? "drop" : "keep";
  const rd = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const readLocal = () => rd(LK);
  const queueLen = () => rd(QK).length;
  let lastWriteAt = null, backoff = 0, nextTry = 0, flushing = false, timer = null;
  const local = (entry) => wr(LK, rd(LK).concat([entry]).slice(-LOCAL_CAP));
  const headers = () => { const k = cfg().supabaseKey, h = { apikey: k, "Content-Type": "application/json", Prefer: "return=minimal" }; if (/^eyJ/.test(k)) h.Authorization = "Bearer " + k; return h; };
  async function flush(keepalive) {
    if (!configured() || flushing || Date.now() < nextTry) return;
    flushing = true;
    try {
      let q = rd(QK);
      while (q.length) {
        const batch = q.slice(0, BATCH);
        let status = 0;
        try { status = (await fetch(cfg().supabaseUrl.replace(/\/$/, "") + "/rest/v1/levana_log", { method: "POST", headers: headers(), body: JSON.stringify(batch), keepalive: !!keepalive })).status; } catch (e) { status = 0; }
        const v = verdict(status);
        if (v === "keep") { backoff = Math.min(300000, backoff ? backoff * 2 : 30000); nextTry = Date.now() + backoff; return; }
        q = q.slice(batch.length);
        wr(QK, q);
        backoff = 0; nextTry = 0;
        if (v === "ok") lastWriteAt = Date.now(); else local(makeEntry("warn", "log_rejected", "Supabase ปฏิเสธ log " + batch.length + " รายการ (HTTP " + status + ")", { status, count: batch.length }));
      }
    } finally { flushing = false; }
  }
  const schedule = () => { if (timer || !configured()) return; timer = setTimeout(() => { timer = null; flush(); }, 2000); };
  const log = (level, event, message, detail) => {
    let e;
    try { e = makeEntry(level, event, message, detail); } catch (x) { return null; }
    local(e);
    if (configured()) { const r = enqueue(rd(QK), e, Q_CAP); wr(QK, r.queue); schedule(); }
    return e;
  };
  const toJsonl = (entries) => entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "");
  const auth = () => { try { const a = JSON.parse(sessionStorage.getItem(AK)); return a && a.exp > Date.now() ? a.token : null; } catch (e) { return null; } };
  const grabToken = () => {
    const m = /access_token=([^&]+)/.exec(G.location && G.location.hash || "");
    if (!m) return false;
    const exp = /expires_in=(\d+)/.exec(G.location.hash);
    try { sessionStorage.setItem(AK, JSON.stringify({ token: decodeURIComponent(m[1]), exp: Date.now() + (exp ? +exp[1] * 1000 : 3600000) })); } catch (e) {}
    history.replaceState(null, "", "#/log");
    return true;
  };
  const signOut = () => { try { sessionStorage.removeItem(AK); } catch (e) {} };
  const sendMagicLink = async (email) => {
    const r = await fetch(cfg().supabaseUrl.replace(/\/$/, "") + "/auth/v1/otp?redirect_to=" + encodeURIComponent(location.origin + location.pathname + "#/log"), { method: "POST", headers: { apikey: cfg().supabaseKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, create_user: false }) });
    return r.ok;
  };
  const fetchRemote = async (limit) => {
    const t = auth();
    if (!t) return null;
    const r = await fetch(cfg().supabaseUrl.replace(/\/$/, "") + "/rest/v1/levana_log?select=*&order=ts.desc&limit=" + (limit || 200), { headers: { apikey: cfg().supabaseKey, Authorization: "Bearer " + t } });
    if (r.status === 401 || r.status === 403) { signOut(); return null; }
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  };
  const init = () => {
    grabToken();
    G.addEventListener("error", (e) => log("error", "js_error", String(e.message || "error").slice(0, 2000), { source: String(e.filename || "").split("/").pop() + ":" + e.lineno }));
    G.addEventListener("unhandledrejection", (e) => log("error", "js_error", String(e.reason && e.reason.message || e.reason || "unhandledrejection").slice(0, 2000), { source: "promise" }));
    G.addEventListener("online", () => { nextTry = 0; flush(); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(true); });
    setInterval(() => flush(), 30000);
    flush();
  };
  if (typeof window !== "undefined" && typeof document !== "undefined") init();
  return { log, flush, readLocal, queueLen, configured, status: () => ({ configured: configured(), lastWriteAt, queue: queueLen() }), makeEntry, enqueue, splitBatches, verdict, toJsonl, auth, signOut, sendMagicLink, fetchRemote, LEVELS, Q_CAP, BATCH };
})();
if (typeof module !== "undefined") module.exports = KeshLog;
