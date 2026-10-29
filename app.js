const $ = (id) => document.getElementById(id);
const V = $("v"), BR = $("branch"), OUT = $("logout");
const st = Object.assign(KeshApi.st, { folder: "runs", file: null, issueState: "open", issue: null, q: "", f: "all" });
const NAMES = ["today", "overview", "issues", "stats", "files", "agents"];
let rid = 0;

const h = (tag, a, ...kids) => {
  const e = document.createElement(tag);
  if (typeof a === "string") e.textContent = a;
  else Object.assign(e, a);
  for (const k of kids) if (k != null) e.append(k);
  return e;
};
const card = (...k) => h("div", { className: "card" }, ...k);
const mut = (t) => h("div", { className: "mut" }, t);
const num = (n) => (n == null ? "-" : Number(n).toLocaleString());
const day = (s) => String(s || "").slice(0, 10);
const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const hud = (label, tag, body, cls) => h("section", { className: "hud " + (cls || "") },
  h("div", { className: "in" }, h("div", { className: "hud-head" }, h("span", { className: "label" }, label), tag || null), h("div", { className: "hud-body" }, ...[].concat(body))));
const panel = (title, count, ...kids) => h("section", { className: "panel" },
  h("div", { className: "hud-head" }, h("h2", title), typeof count === "string" ? h("span", { className: "label" }, count) : count), ...kids);
const tag = (t, k) => h("span", { className: "tag " + (k || "info") }, t);

const { OWNER, REPO, readLog, api, get, text, issues, commits, mdFiles, ws, token } = KeshApi;
const LOGKEY = "levana_errlog";
function md(el, src) {
  if (window.marked && window.DOMPurify) {
    el.className = "md";
    el.innerHTML = DOMPurify.sanitize(marked.parse(src), {
      FORBID_TAGS: ["img", "svg", "iframe", "form", "style"], FORBID_ATTR: ["style"]
    });
  } else {
    el.append(h("pre", src));
  }
  return el;
}

function tokenForm(msg) {
  OUT.hidden = true;
  const inp = h("input", { type: "password", placeholder: "github_pat_...", autocomplete: "off" });
  const f = h("form", {}, h("div", "วาง fine-grained PAT (read-only) ของ " + OWNER + "/" + REPO + " เก็บไว้ในเครื่องนี้เท่านั้น"), inp, h("button", { className: "on", textContent: "บันทึก" }));
  f.onsubmit = (e) => {
    e.preventDefault();
    if (!inp.value.trim()) return;
    localStorage.setItem("levana_token", inp.value.trim());
    KeshApi.clear();
    boot();
  };
  V.replaceChildren(...(msg ? [h("p", { className: "bad", textContent: msg })] : []), card(f));
}

let booted = false;
function fail(e) {
  if (e.code === "auth") return tokenForm("token ไม่ถูกต้องหรือไม่มีสิทธิ์ (401)");
  const m = {
    rate: "ชน rate limit ของ GitHub รอสักครู่แล้วลองใหม่" + (e.retryAfter != null ? " (" + e.retryAfter + "s)" : ""),
    forbidden: "token ไม่มีสิทธิ์เข้าถึง " + e.path + " (403) ไม่ใช่ token ผิด",
    network: "เชื่อมต่อ GitHub ไม่ได้ (network)",
    timeout: "GitHub ตอบช้าเกินไป (timeout)",
    404: "ไม่พบข้อมูล (404) ตรวจ repo / branch / สิทธิ์ของ token"
  }[e.code] || "โหลดไม่สำเร็จ";
  const detail = [e.status, e.path, e.message].filter(Boolean).join(" · ");
  V.replaceChildren(card(h("span", { className: "bad", textContent: m }), detail ? mut(detail) : null,
    h("div", {}, h("button", { textContent: "ลองใหม่", onclick: () => { KeshApi.clear(); booted ? route() : boot(); } }))));
}

const empty = (t) => card(mut(t || "ไม่มีข้อมูล"));

const bars = (items, fmt) => {
  const max = Math.max(1, ...items.map((x) => x.v));
  return h("ul", { className: "bars" }, ...items.map((x, i) => h("li", { className: i === 0 ? "top" : "" },
    h("span", { className: "n", title: x.l }, x.l), h("span", { className: "t" }, h("i", { style: "width:" + (x.v / max) * 100 + "%" })), h("span", { className: "p" }, fmt(x)))));
};
const pad = (...k) => h("div", { className: "hud-body" }, ...k);
const ptxt = (v) => v.toFixed(1) + "% · " + Math.round(v * 15) + "K";

const views = {
  async today() {
    const w = await ws();
    const day0 = todayStr();
    const runsToday = w.runs.filter((r) => KeshLogic.isToday(r, day0));
    const used = runsToday.reduce((s, r) => s + (r.tokens_total || 0), 0);
    const pct = KeshLogic.pct5h(used);
    const open = w.issues.filter((i) => i.state === "open");
    const latest = w.runs.slice().sort((a, b) => String(b.run_id).localeCompare(String(a.run_id))).slice(0, 8);
    const rej = runsToday.reduce((s, r) => s + (r.bounce_count || 0), 0);
    const hs = runsToday.reduce((s, r) => s + (r.handoffs || []).length, 0);
    const done = runsToday.filter((r) => r.status === "done").length;
    const kpi = (lbl, n, i, v, sub, extra) => hud(lbl, h("span", { className: "label" }, "0" + i), [
      h("div", { className: "v" }, String(v), n ? h("small", n) : null), h("div", { className: "sub" }, sub), extra], "kpi");
    const perAgent = KeshLogic.tokensByAgent(runsToday, KeshParse.computeTokens);
    const rr = KeshLogic.rejectRates(w.runs).filter((x) => x.rejects > 0);
    const q = h("input", { className: "search", id: "q", type: "search", placeholder: "ค้นหา issue, run, lesson ...", value: st.q });
    const seg = h("div", { className: "seg", role: "group", ariaLabel: "กรอง" }, ...[["all", "All"], ["open", "Open"], ["reject", "Rejected"]].map(([k, t]) =>
      h("button", { type: "button", textContent: t, className: st.f === k ? "on" : "", onclick: () => { st.f = k; apply(); } })));
    const issUl = h("ul", { className: "list" }), runUl = h("ul", { className: "list" }), lesUl = h("ul", { className: "list" });
    const cIss = h("span", { className: "label" }), cRun = h("span", { className: "label" }), cLes = h("span", { className: "label" });
    const eIss = h("div", { className: "empty" }, "ไม่พบรายการ"), eRun = h("div", { className: "empty" }, "ไม่พบรายการ"), eLes = h("div", { className: "empty" }, "ไม่พบรายการ");
    const items = (ul, rows, mk) => rows.map((x) => { const li = mk(x); li.dataset.q = x.q.toLowerCase(); li.dataset.k = x.k; ul.append(li); return li; });
    const iLi = items(issUl, open.map((i) => ({ q: "#" + i.number + " " + i.title + " " + i.user.login, k: "open", i })), (x) =>
      h("li", {}, h("span", { className: "id" }, "#" + x.i.number), h("span", x.i.title), tag(x.i.user.login)));
    const rLi = items(runUl, latest.map((r) => ({ q: r.run_id + " " + r.status, k: r.bounce_count > 0 ? "reject" : r.status === "done" ? "done" : "open", r })), (x) =>
      h("li", {}, h("span", { className: "id" }, x.r.status || "-"), h("span", { className: "meta" }, x.r.run_id + " · " + num(x.r.tokens_total) + " tok"),
        x.r.bounce_count > 0 ? tag("ตีกลับ " + x.r.bounce_count, "bad") : tag(x.r.status === "done" ? "ok" : "open", x.r.status === "done" ? "ok" : "warn")));
    const lLi = items(lesUl, w.lessonTexts.map((x) => ({ q: x.name + " " + x.md, k: "lesson", x })), (x) =>
      h("li", {}, h("span", { className: "id" }, x.x.name), h("span", { className: "meta" }, "lessons " + (w.lessons[x.x.name] || 0)), tag("lesson")));
    function apply() {
      const t = q.value.trim().toLowerCase();
      st.q = q.value;
      [...seg.children].forEach((b) => b.classList.toggle("on", b.textContent.toLowerCase().startsWith(st.f)));
      for (const [li, ul, e, c, lesson] of [[iLi, issUl, eIss, cIss], [rLi, runUl, eRun, cRun], [lLi, lesUl, eLes, cLes, 1]]) {
        let n = 0;
        li.forEach((el) => {
          const ok = (!t || el.dataset.q.includes(t)) && (st.f === "all" ? !lesson || !!t : st.f === el.dataset.k);
          el.hidden = !ok;
          if (ok) n++;
        });
        e.hidden = n > 0;
        c.textContent = n + " / " + li.length;
        if (lesson) lesUl.parentNode.hidden = !t || st.f !== "all";
      }
    }
    q.oninput = apply;
    const out = [
      h("div", { className: "span kpis" },
        kpi("TOKEN // 5H", "%", 1, pct.toFixed(1), num(used) + " จาก 1,500,000 ใน 5 ชม.", h("div", { className: "meter", role: "img", ariaLabel: "ใช้ไปแล้ว " + pct.toFixed(1) + "%" }, h("i", { style: "width:" + Math.min(100, pct) + "%" }))),
        kpi("ISSUES // OPEN", null, 2, open.length, "ค้างข้าม session"),
        kpi("RUNS // TODAY", null, 3, runsToday.length, "เสร็จ " + done + " · ยังไม่เสร็จ " + (runsToday.length - done)),
        kpi("REJECT // RATE", "%", 4, hs ? Math.round((rej / hs) * 100) : 0, "ตีกลับ " + rej + " จาก " + hs + " ครั้ง")),
      h("div", { className: "span toolbar", role: "search" }, h("label", { className: "sr", htmlFor: "q" }, "ค้นหา"), q, seg),
      h("div", { className: "col" },
        panel("Token ต่อ agent วันนี้", "1% ≈ 15K", perAgent.length ? pad(bars(perAgent.map((x) => ({ l: x.agent, v: x.tokens })), (x) => ptxt(KeshLogic.pct5h(x.v)))) : empty("ยังไม่มี token วันนี้")),
        panel("อัตราตีกลับต่อ agent", "ทุก run", rr.length ? pad(bars(rr.map((x) => ({ l: x.agent, v: x.rate })), (x) => Math.round(x.v * 100) + "% · " + rr.find((y) => y.agent === x.l).rejects + "/" + rr.find((y) => y.agent === x.l).handoffs)) : empty("ไม่มีการตีกลับ"))),
      h("div", { className: "col" },
        panel("Issues ที่เปิดอยู่", cIss, issUl, eIss),
        panel("Run ล่าสุด", cRun, runUl, eRun),
        panel("Lessons", cLes, lesUl, eLes))
    ];
    apply();
    return out;
  },

  async overview() {
    const [w, cs] = await Promise.all([ws(), commits()]);
    const open = w.issues.filter((i) => i.state === "open").length;
    const latest = w.runs.slice().sort((a, b) => String(b.run_id).localeCompare(String(a.run_id))).slice(0, 5);
    const kpi = (n, t) => card(h("div", { className: "big" }, String(n)), mut(t));
    return [
      h("div", { className: "kpis" }, kpi(open, "open issues"), kpi(w.runs.length, "runs")),
      h("h2", "Run ล่าสุด"),
      ...(latest.length ? latest.map((r) => card(
        h("div", { className: "row" }, h("b", r.run_id), h("span", { className: "tag" }, r.status)),
        mut("tokens " + num(r.tokens_total) + " · bounce " + r.bounce_count))) : [empty("ยังไม่มี run")]),
      h("h2", "Commits ล่าสุด"),
      ...(cs.length ? cs.map((c) => card(
        h("div", c.commit.message.split("\n")[0]),
        mut(c.sha.slice(0, 7) + " · " + c.commit.author.name + " · " + day(c.commit.author.date)))) : [empty()])
    ];
  },

  async issues() {
    const all = await issues();
    if (st.issue != null) return issueDetail(all.find((i) => i.number === st.issue));
    const tg = h("div", { className: "tabs" }, ...["open", "closed"].map((s) =>
      h("button", { textContent: s, className: st.issueState === s ? "on" : "", onclick: () => { st.issueState = s; route(); } })));
    const list = all.filter((i) => i.state === st.issueState);
    return [tg, ...(list.length ? list.map((i) => {
      const c = card(h("div", { className: "row" }, h("b", "#" + i.number + " " + i.title)), mut(i.user.login + " · " + day(i.created_at) + " · " + i.comments + " comments"));
      c.className += " tap";
      c.onclick = () => { st.issue = i.number; route(); };
      return c;
    }) : [empty("ไม่มี issue")])];
  },

  async stats() {
    const { agg, runs } = await ws();
    const rr = KeshLogic.rejectRates(runs);
    const bars = (title, items, two) => {
      const max = Math.max(1, ...items.map((x) => x.v));
      return [h("h2", title), ...(items.length ? items.map((x) => h("div", { className: "bar" },
        h("span", x.l), h("div", {}, h("i", { style: "width:" + (x.v / max) * 100 + "%" }), x.w == null ? null : h("i", { className: "b2", style: "width:" + (x.w / max) * 100 + "%" })),
        h("span", x.w == null ? num(x.v) : x.v + " / " + x.w))) : [empty()])];
    };
    return [
      ...bars("tokens ต่อ run", agg.g1.map((x) => ({ l: x.date || x.run_id, v: x.total || 0 }))),
      ...bars("tokens ต่อ agent", agg.g2.map((x) => ({ l: x.agent, v: x.tokens }))),
      ...bars("อัตราตีกลับต่อ agent (%)", rr.map((x) => ({ l: x.agent, v: Math.round(x.rate * 100) }))),
      ...bars("bounces ต่อ agent", agg.g3.map((x) => ({ l: x.agent, v: x.original + x.newCause }))),
      ...bars("การใช้งาน (ฟ้า) เทียบ lessons (เหลือง)", agg.g5.map((x) => ({ l: x.agent, v: x.handoffs, w: x.lessons })))
    ];
  },

  async errors() {
    const log = readLog().reverse();
    const clr = h("button", { className: "ghost", textContent: "ล้าง", onclick: () => { try { localStorage.removeItem(LOGKEY); } catch (e) {} route(); } });
    return [clr, ...(log.length ? log.map((x) => card(
      h("div", { className: "row" }, h("b", x.path || "-"), tag(String(x.status || x.code), "bad")),
      mut(x.time + " · " + x.code + " · remaining " + x.remaining + " · retry-after " + x.retryAfter),
      h("div", x.message || ""))) : [empty("ไม่มี error")])];
  },

  async files() {
    const tabs = h("div", { className: "tabs" }, ...["runs", "plans", "research", "lessons", "agents"].map((f) =>
      h("button", { textContent: f, className: st.folder === f ? "on" : "", onclick: () => { st.folder = f; st.file = null; route(); } })));
    if (st.file) {
      const body = h("div");
      md(body, await text(st.file.path));
      return [tabs, h("button", { className: "ghost", textContent: "← " + st.folder, onclick: () => { st.file = null; route(); } }), card(h("b", st.file.name), body)];
    }
    const fs = await mdFiles(st.folder);
    return [tabs, ...(fs.length ? fs.map((f) => {
      const c = card(f.name);
      c.className += " tap";
      c.onclick = () => { st.file = f; route(); };
      return c;
    }) : [empty("โฟลเดอร์ว่าง")])];
  },

  async agents() {
    const { agents, lessons } = await ws();
    return agents.length ? agents.map((a) => card(
      h("div", { className: "row" }, h("b", a.name), h("span", { className: "tag" }, a.model || "-")),
      h("div", a.description || ""),
      mut("tools: " + KeshParse.parseList(a.tools).join(", ")),
      mut("lessons: " + (lessons[a.name] || 0)))) : [empty("ไม่พบ agents")];
  }
};

async function issueDetail(i) {
  const back = h("button", { className: "ghost", textContent: "← issues", onclick: () => { st.issue = null; route(); } });
  if (!i) return [back, empty("ไม่พบ issue")];
  const cm = i.comments ? await get("m" + i.number, () => api("/issues/" + i.number + "/comments?per_page=100")) : [];
  const body = h("div");
  md(body, i.body || "_ไม่มีรายละเอียด_");
  return [back, card(h("b", "#" + i.number + " " + i.title), mut(i.state + " · " + i.user.login), body),
    ...cm.map((c) => { const b = h("div"); md(b, c.body || ""); return card(mut(c.user.login + " · " + day(c.created_at)), b); })];
}

async function route() {
  const name = views[location.hash.slice(1)] ? location.hash.slice(1) : "today";
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.hash === "#" + name));
  if (!token()) return tokenForm();
  OUT.hidden = false;
  const id = ++rid;
  V.replaceChildren(mut("กำลังโหลด..."));
  try {
    const out = await views[name]();
    if (id === rid) {
      const note = KeshApi.partial().length && name !== "errors" && name !== "files" && name !== "issues" ? [h("div", { className: "bad", textContent: "โหลดไม่ได้ " + KeshApi.partial().length + " ไฟล์: " + KeshApi.partial().join(", ") })] : [];
      const nn = name !== "errors" ? KeshApi.notes().map((t) => h("div", { className: "bad", textContent: t })) : [];
      V.replaceChildren(h("div", { className: "page " + name }, ...note, ...nn, ...out));
    }
  } catch (e) {
    if (id === rid) fail(e);
  }
}

async function boot() {
  if (!token()) return tokenForm();
  try {
    const bs = await api("/branches?per_page=100");
    BR.replaceChildren(...bs.map((b) => h("option", { value: b.name, textContent: b.name, selected: b.name === st.branch })));
    BR.hidden = false;
  } catch (e) {
    return fail(e);
  }
  booted = true;
  route();
}

const R = document.documentElement, MODE = $("mode");
const syncMode = () => { MODE.textContent = R.dataset.mode === "dark" ? "DARK" : "LIGHT"; };
MODE.onclick = () => {
  R.dataset.mode = R.dataset.mode === "dark" ? "light" : "dark";
  try { localStorage.setItem("lv-mode", R.dataset.mode); } catch (e) {}
  syncMode();
};
syncMode();
BR.onchange = () => { st.branch = BR.value; st.file = null; KeshApi.clear(); route(); };
OUT.onclick = () => { booted = false; localStorage.removeItem("levana_token"); KeshApi.clear(); BR.hidden = true; tokenForm(); };
window.addEventListener("hashchange", route);
boot();
