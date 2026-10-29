KeshViews.today = (() => {
  const { h, icon, num, tab, blk, strip, chip, btn, iconbtn, bar, cap, empty, skeleton, meter, stages, opCard, runRow } = KeshUI, A = KeshApi, L = KeshLogic;
  const DAY = 86400000, ROLE = { kesh: "ประสานงาน", rin: "อนุมัติ" };
  for (const g of Object.values(L.AGENT_GROUPS)) for (const [a, r] of g) ROLE[a] = r;
  let timer = null;

  const apiCell = () => {
    const li = h("li", { className: "api", id: "api-status" });
    const draw = () => {
      const s = A.apiStatus, ok = s.ok !== false;
      const b = ok ? h("b", { className: "ok-t" }, s.ok ? "ใช้ได้" : "ยังไม่ได้ตรวจ") : h("b", { className: "bad-t" }, icon("errors", "sm"), "ใช้ไม่ได้" + (s.code ? " (" + s.code + ")" : ""));
      const rc = iconbtn("refresh", "ตรวจ GitHub token API อีกครั้ง", async () => { rc.disabled = true; await A.recheck(); });
      li.replaceChildren(icon("key"), h("div", h("span", { className: "mono", translate: "no" }, "GITHUB TOKEN API"), b, h("span", { className: "meta" }, s.checkedAt ? ["ตรวจ ", num(L.hhmm(s.checkedAt)), " (" + L.ageText(Date.now() - s.checkedAt) + ")"] : "")), rc);
    };
    li.addEventListener("status", draw);
    draw();
    return li;
  };

  const kpi = (k, v, sub) => h("div", { className: "kpi" }, h("span", { className: "mono" }, k), h("b", { className: "num val" }, v), sub);

  return {
    skel: ["วันนี้", [["WINDOW", "งบ 5 ชั่วโมง", 2], ["QUEUE", "ต้องทำตอนนี้", 3], ["STAGE", "Run ที่กำลังเดิน", 1], ["SQUAD", "Token ต่อ agent", 2], ["LOG", "Run ล่าสุด", 2]]],
    load: async () => ({ w: await A.ws(), now: Date.now() }),
    render: ({ w, now }) => {
      const runs = w.runs, win = L.window5h(runs, now), cards = L.agentCards(w, 7, now), sum = L.bounceSummary(cards);
      const ar = L.activeRun(runs), res = ar && L.reservedTokens(ar, runs, 10);
      const stg = L.stageModel(ar), tk = {};
      for (const x of L.agentTokens(ar)) tk[x.agent] = x.tokens;
      const q = L.actionQueue({ runs, issues: w.issues, apiStatus: A.apiStatus, rates: sum.rates, now });
      const seqOf = new Map(runs.slice().sort((a, b) => String(a.run_id).localeCompare(String(b.run_id))).map((r, i) => [r.run_id, i + 1]));
      const segs = L.meterSegments(win.usedPct, res ? res.pct : 0), usedP = Math.round(segs.used), resP = Math.round(segs.reserved), leftP = 100 - usedP - resP;
      const proj = L.projection(win.usedPct, now - win.startMs).pctAtReset;
      const nowI = stg.findIndex((s) => s.state === "now");
      const elapsedH = Math.min(5, Math.floor((now - win.startMs) / 3600000) + 1);
      const today = L.ymd(now), yest = L.ymd(now - DAY);
      const hoOn = (d) => runs.filter((r) => String(r.run_id).startsWith(d)).reduce((s, r) => s + (r.handoffs || []).length, 0);
      const open = w.issues.filter((i) => i.state === "open");
      const oldest = open.map((i) => Date.parse(i.created_at)).sort((a, b) => a - b)[0];
      const bad = sum.rate > L.BOUNCE_WARN + 1e-9, ratePct = Math.round(sum.rate * 100);
      const cd = h("b", { className: "num cd" }, L.fmtCountdown(win.remainingMs));
      clearInterval(timer);
      timer = setInterval(() => { if (!cd.isConnected) return clearInterval(timer); cd.textContent = L.fmtCountdown(win.resetMs - Date.now()); }, 1000);
      const approve = q.find((x) => x.kind === "APPROVE"), alert = q.find((x) => x.kind === "ALERT" && x.title.includes("%"));

      const st = strip([
        { k: "5H", v: Math.round(win.usedPct) + "%" },
        { k: "RESET", v: L.fmtCountdown(win.remainingMs).slice(0, 5), sub: "ประมาณ" },
        { k: "RUN", v: ar ? String(seqOf.get(ar.run_id)).padStart(3, "0") + " · " + Math.max(nowI + 1, stg.filter((s) => s.state !== "todo").length) + "/" + stg.length : "-", d: 1 },
        { k: "BOUNCE 7D", v: ratePct + "%", cls: bad ? "bad-t" : "" }
      ], "สถานะย่อ", apiCell());

      const queue = blk({
        tab: tab("QUEUE", String(q.length).padStart(2, "0"), true), title: "ต้องทำตอนนี้", br: true, cls: "queue o1",
        children: q.length ? h("ol", { className: "q-list" }, q.map((x) => h("li", { className: "q" + (x.danger ? " q-bad" : "") }, h("span", { className: "q-verb mono", translate: "no" }, x.kind),
          h("div", { className: "q-body" }, h("b", x.title), h("span", { className: "meta" }, x.meta)),
          btn({ APPROVE: "ดู handoff", ALERT: "ดูสาเหตุ", ISSUE: "เปิด issue" }[x.kind], { href: x.href, primary: x.kind === "APPROVE", icon: "next" })))) :
          empty({ icon: "check", title: "ยังไม่มีงานรอคุณ", next: "ไม่มี run รออนุมัติและไม่มี issue เปิด" })
      });
      const meterBlk = blk({
        tab: tab("WINDOW", elapsedH + "/5"), title: "งบ 5 ชั่วโมง", br: true, cls: "meter o2",
        children: [
          h("div", { className: "m-hero" }, h("p", h("span", { className: "meta lbl" }, "รีเซ็ตใน (ประมาณ)"), cd), h("p", { className: "m-pct" }, h("span", { className: "meta" }, "ใช้แล้ว"), h("b", { className: "num" }, usedP + "%"))),
          meter({
            segs, label: "ใช้แล้ว " + usedP + "%" + (resP ? " จองให้ " + cap(res.agent) + " " + resP + "%" : "") + " เหลือ " + leftP + "%",
            legend: [["used", ["ใช้แล้ว ", num(usedP + "%"), " ≈ " + L.fmtTok(win.usedTokens)]], res && resP ? ["resv", ["จองให้ " + cap(res.agent) + " ", num(resP + "%")]] : null, ["left", ["เหลือ ", num(leftP + "%")]]].filter(Boolean)
          }),
          h("p", { className: "meta foot" }, "1% ≈ 15k token · ตามอัตราตอนนี้จะเหลือ " + Math.max(0, Math.round(100 - proj)) + "% ตอนรีเซ็ต · ช่วงเวลาประมาณจากวันที่ใน run log")
        ]
      });
      const kpis = blk({
        tab: tab("KPI", "03"), title: "ตัวเลขวันนี้", cls: "o3 m-hide",
        children: h("div", { className: "kpis" },
          kpi("HANDOFF", String(hoOn(today)), h("span", { className: "meta" }, "เมื่อวาน " + hoOn(yest))),
          kpi("BOUNCE", ratePct + "%", h("span", { className: "meta " + (bad ? "bad-t" : "ok-t") }, icon(bad ? "errors" : "check", "sm"), bad ? "เกิน 20%" : "ต่ำกว่า 20%")),
          kpi("ISSUES", String(open.length), h("span", { className: "meta" }, oldest ? "เก่าสุด " + Math.floor((now - oldest) / DAY) + " วัน" : "ไม่มีค้าง")))
      });
      const relay = blk({
        tab: tab("STAGE", ar ? Math.max(nowI + 1, stg.filter((s) => s.state !== "todo").length) + "/" + stg.length : "0/0"), title: ar ? "Run " + (ar.title || ar.run_id) + " กำลังเดิน" : "ไม่มี run กำลังเดิน", more: ar ? ["รายละเอียด", "#run/" + encodeURIComponent(ar.run_id)] : null, br: true, cls: "relay o4",
        children: ar && stg.length ? stages(stg, (s) => s.bounces ? (ROLE[s.agent] || "") + " · ตีกลับ " + s.bounces : s.state === "now" ? "กำลังรัน" + (tk[s.agent] ? " · " + L.fmtTok(tk[s.agent]) : "") : ROLE[s.agent] || "") : h("p", { className: "meta" }, "run ถัดไปจะแสดงที่นี่พร้อมขั้นตอนทีละ agent")
      });
      const top = cards.slice().sort((a, b) => b.tokens - a.tokens).slice(0, 4).map((c, i) => Object.assign({}, c, { rank: i + 1 }));
      const over = cards.filter((c) => c.level === "bad")[0];
      const squad = blk({
        tab: h("span", { className: "tab", translate: "no" }, "SQUAD ", h("b", { className: "m-hide" }, "4/10"), h("b", { className: "m-only" }, "2/10")), title: "Token ต่อ agent", more: ["ดูทั้งหมด", "#agents"], cls: "squad o6",
        children: [h("p", { className: "meta sub" }, "7 วันล่าสุด · เรียงตาม token"),
          h("ul", { className: "cards" }, top.map((c, i) => { const li = opCard(c, false); if (i > 1) li.classList.add("m-hide"); return li; })),
          over ? h("div", { className: "sq-alert m-only" }, h("p", { className: "bad-t" }, icon("errors", "sm"), cap(over.name) + " ตีกลับ " + Math.round(over.bounceRate * 100) + "% เกินเกณฑ์"), h("a", { className: "more", href: "#agents" }, "ดูทั้งหมด 10")) : null]
      });
      const sorted = L.runRows(runs);
      const log = blk({
        tab: tab("LOG", String(runs.length).padStart(2, "0")), title: "Run ล่าสุด", more: runs.length ? ["ดูทั้งหมด", "#runs"] : null, cls: "runs o5",
        children: runs.length ? h("ul", { className: "rows" }, sorted.slice(0, 4).map((r, i) => { const li = runRow(r, seqOf.get(r.run_id)); if (i > 2) li.classList.add("m-hide"); return li; })) : empty({ icon: "empty", title: "ยังไม่มี run", next: "เมื่อ Kesh เริ่มงานแรก ประวัติจะขึ้นที่นี่" })
      });
      const brief = q.length && (approve || alert) ? h("p", { className: "brief m-hide" }, h("span", { className: "mono", translate: "no" }, "BRIEF"),
        h("span", approve ? ["Run ", h("b", { className: "num" }, ar.title || ar.run_id), " รอคุณอนุมัติ"] : null, approve && alert ? " · " : null,
          alert ? [cap(alert.title.split(" ")[0]), " ตีกลับ ", h("b", { className: "num bad-t" }, alert.title.match(/\d+%/)[0]), " เกินเกณฑ์ 20%"] : null)) : null;
      return { h1: "วันนี้", nodes: [st, brief, h("div", { className: "tri" }, h("div", { className: "zone" }, meterBlk, kpis), h("div", { className: "zone" }, queue, relay), h("div", { className: "zone" }, squad, log))] };
    }
  };
})();
