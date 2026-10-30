(() => {
  const { h, icon, btn, iconbtn, banner } = KeshUI;
  const L = KeshLogic, A = KeshApi, $ = (id) => document.getElementById(id);
  const main = $("main"), side = $("side"), scrim = $("scrim"), menu = $("menuBtn"), root = document.documentElement;
  const mq = matchMedia("(min-width:1024px)");
  const TITLES = { summary: "สรุป", runs: "Runs", run: "Run", issues: "Issues", issue: "Issue", agents: "Agents", files: "Files", log: "Log" };
  const TOKEN_URL = "https://github.com/settings/personal-access-tokens";
  let rid = 0, shown = null, lastOk = null, busy = false, sheets = [], lastFocus = null;
  const ev = (level, event, message, detail) => { if (window.KeshLog) KeshLog.log(level, event, message, detail); };

  const MSG = (e) => ({
    rate: "ชน rate limit ของ GitHub รอสักครู่แล้วลองใหม่" + (e.retryAfter != null ? " (" + e.retryAfter + "s)" : ""),
    forbidden: "token ไม่มีสิทธิ์เข้าถึง " + e.path + " (403) ไม่ใช่ token ผิด",
    network: "เชื่อมต่อ GitHub ไม่ได้ (network)",
    timeout: "GitHub ตอบช้าเกินไป (timeout)",
    404: "ไม่พบข้อมูล (404) ตรวจ repo / branch / สิทธิ์ของ token",
    auth: "token ไม่ถูกต้องหรือไม่มีสิทธิ์ (401)"
  }[e.code] || "โหลดไม่สำเร็จ");

  const getTokenLink = (primary) => h("a", { className: "btn" + (primary ? " primary" : ""), href: TOKEN_URL, target: "_blank", rel: "noopener noreferrer" }, "get token", icon("ext"), h("span", { className: "sr" }, " (เปิดแท็บใหม่)"));

  const renderSide = (page) => {
    const m = L.navModel(page);
    $("nav").replaceChildren(...m.items.map((i) => h("a", { href: i.href, "aria-current": i.key === m.activeKey ? "page" : null }, icon(i.icon), i.label)));
  };
  const setMode = (m) => {
    root.dataset.mode = m;
    try { localStorage.setItem("lvn-mode", m); } catch (e) {}
    const b = $("modeBtn");
    b.querySelector("span").textContent = m === "dark" ? "โหมดสว่าง" : "โหมดมืด";
    b.querySelector("use").setAttribute("href", m === "dark" ? "#i-sun" : "#i-moon");
    const t = document.querySelector("meta[name=theme-color]");
    if (t) t.content = getComputedStyle(root).getPropertyValue("--bg").trim();
  };
  $("modeBtn").onclick = () => setMode(root.dataset.mode === "dark" ? "light" : "dark");
  setMode(root.dataset.mode || "light");

  const sheetOpen = () => sheets.find((s) => s.el.classList.contains("open"));
  const closeAll = () => {
    const was = sheetOpen();
    for (const s of sheets) { s.el.classList.remove("open"); if (s.btn) s.btn.setAttribute("aria-expanded", "false"); }
    scrim.classList.remove("on");
    const f = lastFocus;
    lastFocus = null;
    if (was && f && f.focus && (!mq.matches || was.el !== side)) f.focus();
  };
  const openSheet = (el, trigger) => {
    closeAll();
    lastFocus = trigger;
    el.classList.add("open");
    if (el === side) scrim.classList.add("on");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    const f = el.querySelector("a,button,input");
    if (f) f.focus();
  };
  const addSheet = (el, trigger) => { sheets = sheets.filter((s) => s.el !== el).concat([{ el, btn: trigger }]); };
  addSheet(side, menu);
  menu.onclick = () => openSheet(side, menu);
  $("sideClose").onclick = closeAll;
  scrim.onclick = closeAll;
  document.addEventListener("keydown", (e) => {
    const o = sheetOpen();
    if (!o || (o.el !== side && mq.matches)) return;
    if (e.key === "Escape") { e.preventDefault(); closeAll(); return; }
    if (e.key === "Tab") {
      const f = [...o.el.querySelectorAll("a[href],button:not([disabled]),input,select")].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  mq.addEventListener("change", () => { if (mq.matches && side.classList.contains("open")) closeAll(); });

  const freshText = () => busy ? "กำลังโหลดข้อมูลล่าสุด…" : lastOk ? "อัปเดต " + L.hhmm(lastOk) + " (" + L.ageText(Date.now() - lastOk) + ")" : "";
  const refresh = () => { A.clear(); route(); };
  const phRow = (r) => h("div", { className: "ph" },
    r.crumb ? h("a", { className: "crumb", href: r.crumb[1] }, icon("back"), r.crumb[0]) : null,
    h("h1", { tabindex: "-1" }, r.h1),
    r.noFresh ? r.right || null : h("div", { className: "right" }, r.right || null, h("span", { className: "t", "aria-live": "polite" }, freshText()), iconbtn("refresh", "รีเฟรชข้อมูล", refresh, { className: "iconbtn bordered" })));
  setInterval(() => { const t = main.querySelector(".ph .t"); if (t) t.textContent = freshText(); }, 30000);

  const skeleton = (title) => [phRow({ h1: title, noFresh: true }), h("div", { className: "skl", "aria-hidden": "true" }, h("i", { className: "r" }), h("i", { className: "w" }), h("i", { className: "n" }), h("i", { className: "w" }), h("i", { className: "n" }))];
  const draw = (page, nodes, wide) => {
    main.className = "page" + (wide ? " wide" : "");
    main.dataset.page = page;
    main.setAttribute("aria-busy", String(busy));
    main.replaceChildren(...nodes.flat(Infinity).filter(Boolean));
  };
  const setBusy = (b) => {
    busy = b;
    main.setAttribute("aria-busy", String(b));
    const t = main.querySelector(".ph .t");
    if (t) t.textContent = freshText();
  };
  const setTitle = (page, text) => { $("mtitle").textContent = text; document.title = text + " · Levana"; };
  const focusMain = () => { const e = main.querySelector("h1"); if (e) e.focus({ preventScroll: true }); window.scrollTo(0, 0); };

  const tokenForm = (msg) => {
    shown = null;
    busy = false;
    const inp = h("input", { type: "password", placeholder: "github_pat_...", autocomplete: "off", "aria-label": "GitHub token", id: "tok" });
    const f = h("form", { className: "tokenform", onsubmit: (e) => { e.preventDefault(); if (!inp.value.trim()) return; localStorage.setItem("levana_token", inp.value.trim()); ev("info", "token_saved", "บันทึก token"); A.clear(); route(true); } },
      h("p", "วาง fine-grained PAT (read-only) ของ " + A.OWNER + "/" + A.REPO + " เก็บไว้ในเครื่องนี้เท่านั้น"), inp,
      h("div", { className: "acts" }, h("button", { className: "btn primary", type: "submit" }, "บันทึก"), getTokenLink(false)));
    const st = A.apiStatus;
    draw("token", [phRow({ h1: "ตั้งค่า token", noFresh: true }), msg ? banner("ใช้ token นี้ไม่ได้", msg) : null, f,
      st.checkedAt ? h("p", { className: "meta" }, "ตรวจ " + L.hhmm(st.checkedAt)) : null]);
    setTitle("token", "ตั้งค่า token");
    renderSide("summary");
    focusMain();
  };
  const logout = () => { localStorage.removeItem("levana_token"); ev("info", "token_cleared", "ล้าง token"); A.clear(); lastOk = null; tokenForm(); };

  async function route(force) {
    let r = L.parseRoute(location.hash);
    if (r.redirect) { history.replaceState(null, "", r.redirect); r = L.parseRoute(location.hash); }
    const page = r.page, view = KeshViews[page];
    const id = ++rid, key = page + "/" + (r.arg || "") + (force ? "!" : "");
    closeAll();
    renderSide(page);
    setTitle(page, TITLES[page] || "Levana");
    if (!view) return draw(page, [phRow({ h1: TITLES[page] || "Levana", noFresh: true })]);
    if (!view.noAuth && !A.token()) return tokenForm();
    const fresh = shown !== page + "/" + (r.arg || "") || force === true;
    document.body.dataset.state = "loading";
    if (fresh) { busy = true; draw(page, skeleton(view.skel[0]), view.wide); } else setBusy(true);
    try {
      const data = await view.load(r.arg, r.query);
      if (id !== rid) return;
      lastOk = Date.now();
      busy = false;
      const out = view.render(data, r.arg, r.query);
      const notes = [].concat(A.partial().length && page !== "files" ? [banner("โหลดไม่ได้ " + A.partial().length + " ไฟล์", A.partial().join(", "))] : [], A.notes().map((t) => banner("ข้อมูลไม่ครบ", t)));
      draw(page, [out.bare ? null : phRow(out)].concat(notes, out.nodes), view.wide);
      document.body.dataset.state = "ready";
      shown = page + "/" + (r.arg || "");
      setTitle(page, out.title || (typeof out.h1 === "string" ? out.h1 : TITLES[page]));
      if (fresh) focusMain();
      ev("info", "route_view", "เปิดหน้า " + page, { page });
      if (out.after) out.after();
    } catch (e) {
      if (id !== rid) return;
      busy = false;
      if (e.code === "auth") { ev("error", "fetch_error", MSG(e), { code: e.code, status: e.status || null, path: e.path || null }); return tokenForm(MSG(e)); }
      document.body.dataset.state = "error";
      ev("error", "fetch_error", MSG(e), { code: e.code, status: e.status || null, path: e.path || null, remaining: e.remaining == null ? null : e.remaining, retryAfter: e.retryAfter == null ? null : e.retryAfter });
      const detail = [e.status, e.path, e.message].filter(Boolean).join(" · ");
      const b = banner("ดึงข้อมูลจาก GitHub ไม่ได้", MSG(e) + (detail ? " (" + detail + ")" : "") + (lastOk ? " ข้อมูลด้านล่างเป็นของเวลา " + L.hhmm(lastOk) : ""), refresh);
      if (fresh || !main.querySelector(".ph")) { shown = null; draw(page, [phRow({ h1: view.skel[0] }), b], view.wide); }
      else { main.querySelectorAll(".banner[role=alert]").forEach((x) => x.remove()); main.querySelector(".ph").after(b); setBusy(false); }
    }
  }
  window.KeshApp = { route, refresh, logout, tokenForm, msg: MSG, h1Row: phRow, getTokenLink, openSheet, closeAll, addSheet, setBusy, ev, lastOk: () => lastOk, TOKEN_URL };
  window.addEventListener("hashchange", () => route());
  route();
})();
