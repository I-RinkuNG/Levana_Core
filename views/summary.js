KeshViews.summary = (() => {
  const { h, icon, chip, ring, dots, dl, issueRow, table, cap, empty } = KeshUI, A = KeshApi, L = KeshLogic;
  const mqD = matchMedia("(min-width:1024px)");
  const TOKEN_URL = "https://github.com/settings/personal-access-tokens";
  let timer = null, lastState = null;
  const fmt = (n) => Math.round(n).toLocaleString("en-US");

  const tokenChip = () => {
    const s = A.apiStatus;
    if (s.ok === true) return chip("ok", "Token API ใช้ได้", "check");
    if (s.ok === false) return chip("bad", s.code === 401 ? "Token API หมดอายุ" : "Token API ใช้ไม่ได้" + (s.code ? " (" + s.code + ")" : ""), "x");
    return chip("flag", "Token API ยังไม่ได้ตรวจ", "info");
  };
  const tokenLink = (primary) => h("a", { className: "btn" + (primary ? " primary" : ""), href: TOKEN_URL, target: "_blank", rel: "noopener noreferrer" }, "get token", icon("ext"), h("span", { className: "sr" }, " (เปิดแท็บใหม่)"));

  const usageNodes = (u, now) => {
    const st = L.usageState(u, now);
    if (st.state !== lastState) { if (lastState !== null || st.state !== "live") KeshApp.ev(st.state === "live" ? "info" : "warn", "usage_state", "usage " + st.state, { state: st.state }); lastState = st.state; }
    const expired = A.apiStatus.ok === false && A.apiStatus.code === 401;
    const foot = h("div", { className: "tapi" }, tokenChip(), h("button", { className: "btn", type: "button", onclick: async (e) => { e.currentTarget.disabled = true; await A.recheck(); KeshApp.ev("info", "recheck", "ตรวจ token ใหม่", { ok: A.apiStatus.ok }); KeshApp.refresh(); } }, icon("refresh"), "ตรวจใหม่"), tokenLink(expired));
    let body;
    if (st.state === "missing") {
      body = [h("div", { className: "umiss" }, ring(0, "missing", "ยังไม่มีค่า usage"), h("div", { className: "ufacts", style: "flex:1 1 220px" }, h("p", h("b", "ยังไม่มีค่า 5 ชั่วโมง")), h("p", { className: "sub" }, "ไม่พบ usage.json หรือไม่มี rate_limits (ต้องเป็นแผน Pro/Max และส่งข้อความใน Claude Code อย่างน้อย 1 ครั้ง)"))),
        h("div", { className: "dmain" }, h("b", "—"), h("span", { className: "sub" }, "ยังไม่มีค่า")), dots(0, "missing", "ไม่มีข้อมูล")];
    } else {
      const stale = st.state === "stale", pct = Math.round(st.pct);
      const when = st.capturedAt != null ? L.hhmm(st.capturedAt) : "—";
      const facts = stale
        ? h("dl", { className: "ufacts" }, h("div", h("dt", "ณ"), h("dd", when + " ", chip("warn", "ข้อมูลเก่า", "clock"))),
          h("div", h("dt", st.resetPassed ? "รอบนี้รีเซ็ตแล้วตอน" : "รีเซ็ต"), h("dd", st.resetsAt != null ? L.hhmm(st.resetsAt) : "—", st.resetPassed ? h("small", " ค่าใหม่ยังไม่เข้า") : null)))
        : h("dl", { className: "ufacts" }, h("div", h("dt", "รีเซ็ต"), h("dd", st.resetsAt != null ? [L.hhmm(st.resetsAt) + " ", h("small", "อีก " + L.fmtDur(st.resetsAt - now))] : "—")),
          h("div", h("dt", "ณ"), h("dd", [when + " ", h("small", "(" + L.ageText(now - st.capturedAt) + ")")])));
      body = [h("div", { className: "dmain" }, h("b", pct + "%"), stale ? chip("warn", "ข้อมูลเก่า", "clock") : h("span", { className: "sub" }, "ใช้แล้ว")),
        h("div", { className: "ubody" }, ring(st.pct, stale ? "stale" : "live", (stale ? "ข้อมูลเก่า " : "ใช้ไปแล้ว ") + pct + "% ของ 5 ชั่วโมง"), dots(st.pct, st.state, pct + "% ของ 5 ชั่วโมง"), facts)];
    }
    return [h("h2", { id: "h-usage" }, "USAGE"), body, foot];
  };

  const kpiNodes = (k) => {
    const delta = k.deltaPct == null ? h("span", k.tph == null ? "ยังไม่มีข้อมูล 7 วันนี้" : "ยังไม่มีข้อมูล 7 วันก่อน") : [icon(k.deltaPct >= 0 ? "up" : "down"), h("span", (k.deltaPct >= 0 ? "+" : "−") + Math.abs(k.deltaPct) + "% จาก " + L.fmtTok(k.prevTph) + " (7 วันก่อน)")];
    return dl([
      { dt: "Tokens ต่อ handoff", v: k.tph == null ? "—" : L.fmtTok(k.tph), c: delta },
      { dt: "ตีกลับ", v: [String(k.bounces) + " ", h("span", { style: "font-size:var(--t-small);font-weight:400" }, "จาก " + k.handoffs)], cls: k.bouncePct > 20 ? "bad" : "", c: h("span", k.bouncePct + "%" + (k.worst ? " · มากสุด " + cap(k.worst.agent) + " " + k.worst.rejects + "/" + k.worst.handoffs : "")) },
      { dt: "Run เสร็จ / กำลังทำ", v: k.done + " / " + k.open, c: h("span", k.open ? "ที่เปิดอยู่ล่าสุดเริ่ม " + (k.openDay || "—") : "ไม่มี run ที่เปิดอยู่") },
      { dt: "Lessons ที่เพิ่ม", v: String(k.lessons.count), c: h("span", "7 วัน · " + k.lessons.agents + " agent") }
    ]);
  };

  const agentTable = (rows) => {
    const cols = [{ label: "Agent" }, { label: "Tokens", n: 1 }, { label: "Handoffs", n: 1, hide: 1 }, { label: "ต่อ handoff", n: 1, hide: 1 }, { label: "สัดส่วน", n: 1, hide: 1 }, { label: "ตีกลับ", n: 1 }];
    const trs = rows.map((x, i) => ({
      cls: i > 4 ? "x" : null,
      cells: [
        h("div", { className: "nm" }, h("span", { className: "sw", style: "--c:var(--agent-" + x.agent + ")", "aria-hidden": "true" }, cap(x.agent)[0]), h("span", { translate: "no" }, cap(x.agent), h("small", { className: "hm" }, x.handoffs ? L.fmtTok(x.tph) + " ต่อ handoff" : ""))),
        fmt(x.tokens), String(x.handoffs), x.handoffs ? L.fmtTok(x.tph) : "—", x.share.toFixed(1) + "%",
        x.hot ? { cls: "hot", node: h("span", icon("warn"), x.rejects + "/" + x.handoffs + " · " + Math.round(x.rate * 100) + "%") } : x.rejects + "/" + x.handoffs
      ]
    }));
    return table(cols, trs, { id: "agTable" });
  };

  return {
    skel: ["สรุป"],
    load: async () => { const w = await A.ws(); const u = await A.usage().catch(() => null); return { w, u, now: Date.now() }; },
    render: ({ w, u, now }) => {
      clearInterval(timer);
      const k = L.kpis7d(w.runs, w.lessonTexts, now), rows = L.agentTable(w.runs, 7, now);
      const open = w.issues.filter((i) => i.state === "open");
      const usage = h("section", { className: "usage", "aria-labelledby": "h-usage" }, usageNodes(u, now));
      const gi = h("div"), giDraw = () => {
        const list = L.issueRows(w.issues, mqD.matches ? 5 : 3);
        gi.replaceChildren(list.length ? h("ul", { className: "issues" }, list.map((i) => issueRow(i, now))) : empty({ icon: "check", title: "ไม่มี issue ที่เปิดอยู่", next: "ทุก issue ถูกปิดแล้ว" }));
      };
      giDraw();
      mqD.onchange = giDraw;
      const more = h("button", { className: "btn only-m", id: "agMore", type: "button", style: "margin-top:8px", "aria-expanded": "false", onclick: (e) => { const t = document.getElementById("agTable"), a = t.classList.toggle("all"); e.currentTarget.textContent = a ? "ย่อรายการ" : "แสดงทั้ง " + rows.length + " agent"; e.currentTarget.setAttribute("aria-expanded", String(a)); } }, "แสดงทั้ง " + rows.length + " agent");
      const expired = A.apiStatus.code === 401;
      const banner = expired ? h("div", { className: "banner", role: "alert" }, icon("warn"), h("p", h("b", "โหลดข้อมูลจาก GitHub ไม่สำเร็จ (HTTP 401)"), " เมื่อ " + L.hhmm(A.apiStatus.checkedAt || now) + " · token อาจหมดอายุ ข้อมูลที่เห็นอาจเก่า"), tokenLink(true), h("button", { className: "btn", type: "button", onclick: () => KeshApp.refresh() }, "ลองอีกครั้ง")) : null;
      return {
        h1: "สรุป", title: "สรุป",
        nodes: [banner, h("div", { className: "top2" }, usage, h("section", { "aria-labelledby": "h-kpi" }, h("h2", { id: "h-kpi", style: "margin-bottom:var(--s4)" }, "7 วันล่าสุด"), kpiNodes(k))),
          h("section", { className: "sec", "aria-labelledby": "h-gi" }, h("h2", { id: "h-gi" }, "GIT ISSUE"), gi, h("a", { className: "more", href: "#/issues" }, "ดู issue ทั้งหมด (" + open.length + ")")),
          h("section", { className: "sec", "aria-labelledby": "h-ag" }, h("h2", { id: "h-ag" }, "TOKEN ต่อ AGENT ", h("span", { className: "mono" }, "7 วัน")), h("div", { className: "tw" }, agentTable(rows)), more)],
        after: () => {
          timer = setInterval(async () => {
            if (document.visibilityState !== "visible" || !usage.isConnected) return;
            const nu = await A.usage(true).catch(() => null);
            usage.replaceChildren(...usageNodes(nu, Date.now()).flat());
          }, 5 * 60 * 1000);
        }
      };
    }
  };
})();
