KeshViews.usage = (() => {
  const { h, icon, num, tab, blk, strip, bar, cap, empty, meter } = KeshUI, A = KeshApi, L = KeshLogic;
  const pad = (n) => String(n).padStart(2, "0");
  const list = (items, fmt) => h("ul", { className: "bars" }, items.map((x) => h("li", h("b", { translate: "no" }, x.l), h("b", { className: "num" }, fmt(x)), bar(x.pct))));
  const none = (t) => h("p", { className: "meta" }, t);
  return {
    skel: ["การใช้ token", [["WINDOW", "งบ 5 ชั่วโมง", 2], ["TOKEN/RUN", "ต่อ run", 3], ["TOKEN/AGENT", "ต่อ agent", 3]]],
    load: async () => ({ w: await A.ws(), now: Date.now() }),
    render: ({ w, now }) => {
      const win = L.window5h(w.runs, now), cards = L.agentCards(w, 7, now), sum = L.bounceSummary(cards);
      const u = L.usageSeries(w.agg, L.bounceSummary(L.agentCards(w, 3650, now)).rates);
      const segs = L.meterSegments(win.usedPct, 0), usedP = Math.round(segs.used);
      const mx = (a) => Math.max(1, ...a);
      const st = strip([{ k: "5H", v: usedP + "%" }, { k: "RESET", v: L.fmtCountdown(win.remainingMs).slice(0, 5), sub: "ประมาณ" }, { k: "RUNS", v: String(w.runs.length) }], "สรุปการใช้ token");
      const winBlk = blk({ tab: tab("WINDOW", null), title: "งบ 5 ชั่วโมง", br: true, children: [
        meter({ segs, label: "ใช้แล้ว " + usedP + "% เหลือ " + (100 - usedP) + "%", legend: [["used", ["ใช้แล้ว ", num(usedP + "%"), " ≈ " + L.fmtTok(win.usedTokens)]], ["left", ["เหลือ ", num(100 - usedP + "%")]]] }),
        h("p", { className: "meta foot" }, "1% ≈ 15k token · รีเซ็ตประมาณอีก " + L.fmtCountdown(win.remainingMs) + " (ประมาณจากวันที่ใน run log)")] });
      const runMax = mx(u.perRun.map((x) => x.total));
      const perRun = blk({ tab: tab("TOKEN/RUN", pad(u.perRun.length)), title: "ต่อ run (10 ล่าสุด)", children: u.perRun.length ? list(u.perRun.map((x) => ({ l: x.id.replace(/^\d{4}-/, ""), v: x.total, pct: (x.total / runMax) * 100 })), (x) => L.fmtTok(x.v)) : none("ยังไม่มี run") });
      const agMax = mx(u.perAgent.map((x) => x.tokens));
      const perAgent = blk({ tab: tab("TOKEN/AGENT", pad(u.perAgent.length)), title: "ต่อ agent (ทุก run)", children: u.perAgent.length ? list(u.perAgent.map((x) => ({ l: cap(x.agent), v: x.tokens, pct: (x.tokens / agMax) * 100 })), (x) => L.fmtTok(x.v)) : none("ยังไม่มี token") });
      const bn = u.bounceByAgent;
      const bounce = blk({ tab: tab("BOUNCE/AGENT", pad(bn.length)), title: "ตีกลับต่อ agent (ทุก run)", children: bn.length ? h("ul", { className: "bars" }, bn.map((r) => { const bad = L.bounceLevel(r.rate) === "bad"; return h("li", { className: bad ? "warn" : "" }, h("b", { translate: "no" }, cap(r.agent)), h("b", { className: "num" + (bad ? " bad-t" : "") }, bad ? icon("errors", "sm") : null, Math.round(r.rate * 100) + "% · " + r.rejects + "/" + r.handoffs),
        h("span", { className: "bnc" + (bad ? " over" : ""), role: "img", "aria-label": cap(r.agent) + " ตีกลับ " + Math.round(r.rate * 100) + "% เกณฑ์ 20%" + (bad ? " เกินเกณฑ์" : "") }, h("i", { style: "--w:" + L.bounceBarPct(r.rate) + "%" }))); })) : none("ยังไม่มีข้อมูลตีกลับ") });
      const lMax = mx(u.lessonsByAgent.map((x) => x.lessons));
      const les = blk({ tab: tab("LESSON", pad(u.lessonsByAgent.length)), title: "lessons ต่อ agent", children: u.lessonsByAgent.length ? list(u.lessonsByAgent.map((x) => ({ l: cap(x.agent), v: x.lessons, pct: (x.lessons / lMax) * 100 })), (x) => String(x.v)) : none("ยังไม่มี lessons") });
      return { h1: "การใช้ token", nodes: [st, h("div", { className: "lgrid" }, winBlk, perRun, perAgent, bounce, les)] };
    }
  };
})();
