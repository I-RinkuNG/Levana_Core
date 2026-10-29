(() => {
  const { h, icon, tab, blk, btn, iconbtn, skeletonBlk, banner, skeleton } = KeshUI;
  const L = KeshLogic, A = KeshApi, $ = (id) => document.getElementById(id);
  const col = $("col"), app = document.querySelector(".app"), root = document.documentElement;
  let rid = 0, shown = null, lastOk = null, busy = false, counts = {};

  const MSG = (e) => ({
    rate: "ชน rate limit ของ GitHub รอสักครู่แล้วลองใหม่" + (e.retryAfter != null ? " (" + e.retryAfter + "s)" : ""),
    forbidden: "token ไม่มีสิทธิ์เข้าถึง " + e.path + " (403) ไม่ใช่ token ผิด",
    network: "เชื่อมต่อ GitHub ไม่ได้ (network)",
    timeout: "GitHub ตอบช้าเกินไป (timeout)",
    404: "ไม่พบข้อมูล (404) ตรวจ repo / branch / สิทธิ์ของ token",
    auth: "token ไม่ถูกต้องหรือไม่มีสิทธิ์ (401)"
  }[e.code] || "โหลดไม่สำเร็จ");

  const renderNav = (page) => {
    const m = L.navModel(Object.assign({}, counts, { errors: A.readLog().length || null }), page);
    const sub = m.rail[2].map((i) => i.key);
    const items = m.bottom.slice(0, 4).concat([m.bottom[4]], m.rail[2]);
    $("nav").replaceChildren(...items.map((i) => {
      const cur = sub.includes(i.key) ? i.key === m.activeKey : i.key === "more" ? m.activeBottom === "more" : i.key === m.activeKey;
      return h("a", { href: i.href, className: i.key === "more" ? "m-only" : sub.includes(i.key) ? "d-only" : "", "aria-current": cur ? "page" : null },
        icon(i.icon), h("span", i.label), i.count != null ? h("span", { className: "cnt" }, String(i.count)) : null);
    }));
  };
  const freshText = () => busy ? "กำลังโหลดข้อมูลล่าสุด…" : lastOk ? "อัปเดต " + L.hhmm(lastOk) + " (" + L.ageText(Date.now() - lastOk) + ")" : "";
  const setMode = (m) => { root.dataset.mode = m; try { localStorage.setItem("lvn-mode", m); } catch (e) {} document.querySelector("meta[name=theme-color]").content = getComputedStyle(root).getPropertyValue("--bg").trim(); };
  const topbar = (r) => h("header", { className: "topbar" },
    h("div", { className: "title" },
      r.crumb ? h("a", { className: "crumb", href: r.crumb[1] }, icon("back"), r.crumb[0]) : null,
      h("h1", { tabindex: "-1" }, r.h1),
      h("p", { className: "fresh meta", "aria-live": "polite", "data-busy": busy }, h("span", { className: "dot", "aria-hidden": "true" }), h("span", { className: "t" }, freshText()), r.freshExtra ? " · " + r.freshExtra : null)),
    iconbtn("refresh", "รีเฟรชข้อมูล", () => { A.clear(); route(); }),
    iconbtn("theme", "สลับโหมดสว่าง/มืด", () => setMode(root.dataset.mode === "dark" ? "light" : "dark"), { "aria-pressed": root.dataset.mode === "dark" }));
  const shell = (page, r, nodes) => {
    col.replaceChildren(topbar(r), h("main", { id: "main", className: "page pg-" + page, "aria-busy": String(busy) }, nodes));
    col.querySelector(".fresh").style.visibility = "";
  };
  setInterval(() => { const t = col.querySelector(".fresh .t"); if (t) t.textContent = freshText(); }, 30000);
  const setBusy = (b) => {
    busy = b;
    const m = $("main"), f = col.querySelector(".fresh");
    if (m) m.setAttribute("aria-busy", String(b));
    if (f) { f.dataset.busy = b; f.querySelector(".t").textContent = freshText(); }
  };

  const tokenForm = (msg) => {
    shown = null;
    const inp = h("input", { type: "password", placeholder: "github_pat_...", autocomplete: "off", "aria-label": "GitHub token", id: "tok" });
    const f = h("form", { onsubmit: (e) => { e.preventDefault(); if (!inp.value.trim()) return; localStorage.setItem("levana_token", inp.value.trim()); A.clear(); route(); } },
      h("p", "วาง fine-grained PAT (read-only) ของ " + A.OWNER + "/" + A.REPO + " เก็บไว้ในเครื่องนี้เท่านั้น"), inp,
      h("button", { className: "btn primary", type: "submit" }, "บันทึก"), h("p", { className: "meta" }, "สร้าง token ที่ GitHub › Settings › Developer settings › Fine-grained tokens"));
    const st = A.apiStatus;
    col.replaceChildren(h("header", { className: "topbar" }, h("div", { className: "title" }, h("h1", { tabindex: "-1" }, "ตั้งค่า token"))),
      h("main", { id: "main", className: "page", "aria-busy": "false" }, msg ? KeshUI.banner("ใช้ token นี้ไม่ได้", msg) : null,
        h("div", { className: "tokenform" }, blk({ tab: tab("TOKEN", "01", true), title: "GitHub token", children: [f, st.checkedAt ? h("p", { className: "meta" }, KeshUI.chip(st.ok ? "ok" : "bad", st.ok ? "ใช้ได้" : "ใช้ไม่ได้"), " ตรวจ " + L.hhmm(st.checkedAt)) : null] }))));
    renderNav("more");
    focusH1();
  };
  const focusH1 = () => { const e = col.querySelector("h1"); if (e) e.focus({ preventScroll: true }); window.scrollTo(0, 0); };
  const logout = () => { localStorage.removeItem("levana_token"); A.clear(); lastOk = null; tokenForm(); };

  async function route() {
    const r = L.parseRoute(location.hash), page = r.page, view = KeshViews[page === "run" ? "run" : page === "issue" ? "issue" : page];
    const id = ++rid, key = page + "/" + (r.arg || "");
    renderNav(page);
    if (!A.token()) return tokenForm();
    const fresh = shown !== key;
    app.dataset.state = "loading";
    if (fresh) {
      busy = true;
      shell(page, { h1: view.skel[0], crumb: view.crumb && view.crumb(r.arg) }, view.skel[1].map(skeletonBlk));
    } else setBusy(true);
    try {
      const data = await view.load(r.arg);
      if (id !== rid) return;
      lastOk = Date.now();
      busy = false;
      const out = view.render(data, r.arg);
      const notes = [].concat(A.partial().length && page !== "files" ? [banner("โหลดไม่ได้ " + A.partial().length + " ไฟล์", A.partial().join(", "))] : [], page !== "errors" ? A.notes().map((t) => banner("ข้อมูลไม่ครบ", t)) : []);
      shell(page, out, notes.concat(out.nodes));
      app.dataset.state = "ready";
      app.style.removeProperty("--asof");
      if (fresh) { shown = key; focusH1(); }
      A.ws().then((w) => { counts = { runs: w.runs.length, issues: w.issues.filter((i) => i.state === "open").length, lessons: w.lessonTexts.length, agents: w.agents.length || null }; renderNav(page); }).catch(() => {});
    } catch (e) {
      if (id !== rid) return;
      busy = false;
      if (e.code === "auth") return tokenForm(MSG(e));
      app.dataset.state = "error";
      app.style.setProperty("--asof", '"' + (lastOk ? L.hhmm(lastOk) : "-") + '"');
      const detail = [e.status, e.path, e.message].filter(Boolean).join(" · ");
      const b = banner("ดึงข้อมูลจาก GitHub ไม่ได้", MSG(e) + (detail ? " (" + detail + ")" : "") + (lastOk ? " ข้อมูลด้านล่างเป็นของเวลา " + L.hhmm(lastOk) : ""), () => { A.clear(); route(); });
      const main = $("main");
      if (fresh || !main) { shown = null; shell(page, { h1: view.skel[0], crumb: view.crumb && view.crumb(r.arg) }, [b]); }
      else { main.querySelectorAll(".banner.keep[role=alert]").forEach((x) => x.remove()); main.prepend(b); setBusy(false); }
    }
  }
  window.KeshApp = { route, logout, tokenForm, msg: MSG };
  A.onStatus(() => { const s = $("api-status"); if (s) s.dispatchEvent(new Event("status")); });
  window.addEventListener("hashchange", route);
  route();
})();
