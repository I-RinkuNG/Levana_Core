KeshViews.run = (() => {
  const { h, icon, num, tab, blk, strip, chip, btn, bar, cap, empty, stages, runRow } = KeshUI, A = KeshApi, L = KeshLogic;
  const ROLE = { kesh: "ประสานงาน", rin: "อนุมัติ" };
  for (const g of Object.values(L.AGENT_GROUPS)) for (const [a, r] of g) ROLE[a] = r;
  const pad = (n) => String(n).padStart(2, "0");
  const reasonList = (rs) => h("ul", { className: "reasons" }, rs.map((r) => h("li", h("span", r.reason), h("b", { className: "num" }, String(r.count)), bar((r.count / rs[0].count) * 100))));
  return {
    skel: ["Run", [["STAGE", "ขั้นตอน", 1], ["HANDOFF", "ไทม์ไลน์ handoff", 4]]],
    crumb: () => ["Runs", "#runs"],
    load: async (id) => { const w = await A.ws(); return { run: w.runs.find((r) => r.run_id === id), runs: w.runs, id }; },
    render: ({ run, runs, id }) => {
      const crumb = ["Runs", "#runs"];
      if (!run) return { h1: "ไม่พบ run", crumb, nodes: [empty({ icon: "empty", title: "ไม่พบ run " + id, next: "run นี้อาจอยู่นอก snapshot ล่าสุด", action: btn("ดู Runs ทั้งหมด", { href: "#runs", primary: true }) })] };
      const seq = runs.slice().sort((a, b) => String(a.run_id).localeCompare(String(b.run_id))).findIndex((r) => r.run_id === id) + 1;
      const stg = L.stageModel(run), rows = L.handoffRows(run), ag = L.agentTokens(run), rs = L.bounceReasons(run);
      const tokens = run.tokens_total || 0, nowI = stg.findIndex((s) => s.state === "now");
      const rate = rows.length ? run.bounce_count / rows.length : 0, bad = L.bounceLevel(rate) === "bad";
      const tk = {};
      ag.forEach((x) => { tk[x.agent] = x.tokens; });
      const st = strip([{ k: "TOKEN", v: L.fmtTok(tokens) }, { k: "HANDOFF", v: String(rows.length) }, { k: "BOUNCE", v: String(run.bounce_count) }, { k: "STATUS", v: { done: "เสร็จ", open: "กำลังรัน" }[run.status] + (run.has_followups ? " · มีงานค้างต่อ" : ""), d: 1 }], "สรุป run");
      const summary = blk({
        tab: tab("RUN", pad(seq)), title: "สรุป", cls: "o5 m-hide",
        children: h("div", { className: "kpis" },
          h("div", { className: "kpi" }, h("span", { className: "mono" }, "TOKEN"), h("b", { className: "num val" }, L.fmtTok(tokens)), h("span", { className: "meta" }, "รวมทั้ง run")),
          h("div", { className: "kpi" }, h("span", { className: "mono" }, "BOUNCE"), h("b", { className: "num val" }, Math.round(rate * 100) + "%"), h("span", { className: "meta " + (bad ? "bad-t" : "ok-t") }, icon(bad ? "errors" : "check", "sm"), bad ? "เกิน 20%" : "ต่ำกว่า 20%")),
          h("div", { className: "kpi" }, h("span", { className: "mono" }, "HANDOFF"), h("b", { className: "num val" }, String(rows.length)), h("span", { className: "meta" }, run.date || "")))
      });
      const agentBlk = blk({
        tab: tab("AGENT", pad(ag.length)), title: "Token ต่อ agent ใน run นี้", cls: "o6",
        children: ag.length ? h("ul", { className: "reasons" }, ag.map((x) => h("li", h("b", { translate: "no" }, cap(x.agent)), h("b", { className: "num" }, L.fmtTok(x.tokens)), bar(x.pct)))) : h("p", { className: "meta" }, "ยังไม่มี agent ใช้ token ใน run นี้")
      });
      const stageBlk = blk({
        tab: tab("STAGE", stg.length ? Math.max(nowI + 1, stg.filter((s) => s.state !== "todo").length) + "/" + stg.length : "0/0"), title: "ขั้นตอน", br: true, cls: "relay o2",
        children: stg.length ? stages(stg, (s) => s.bounces ? "ตีกลับ " + s.bounces : s.state === "now" ? "กำลังรัน" + (tk[s.agent] ? " · " + L.fmtTok(tk[s.agent]) : "") : ROLE[s.agent] || "") : h("p", { className: "meta" }, "ยังไม่มีขั้นตอนใน flow")
      });
      const res = (r) => r.bounced ? chip("bad", "ตีกลับ") : r.running ? chip("run", "กำลังรัน") : chip("ok", "ผ่าน");
      const hoBlk = blk({
        tab: tab("HANDOFF", pad(rows.length)), title: "ไทม์ไลน์ handoff", cls: "o3",
        children: rows.length ? [
          h("div", { className: "tl-head meta mono", "aria-hidden": "true" }, h("span", "#"), h("span", "จาก → ถึง"), h("span", "TOKEN"), h("span", "ผล")),
          h("ol", { className: "tl" }, rows.map((r) => h("li", h("span", { className: "hn num" }, pad(r.n)),
            h("span", { className: "who" }, cap(r.from) + " ", icon("next", "sm"), h("span", { className: "sr" }, "ส่งให้"), " " + cap(r.to)),
            h("span", { className: "tk" }, bar(r.relPct), h("b", { className: "num" }, r.tokens == null ? "-" : L.fmtTok(r.tokens))), h("span", { className: "res-c" }, res(r)),
            r.why ? h("p", { className: "why" }, h("b", "เหตุ:"), " " + r.why) : null))),
          rs.length ? h("div", { className: "reasons-m" }, h("p", { className: "meta sub" }, "เหตุตีกลับใน run นี้"), reasonList(rs)) : null
        ] : empty({ icon: "clock", title: "ยังไม่มี handoff", next: "Kesh เพิ่งรับงาน handoff แรกจะขึ้นเมื่อบันทึกใน run log" })
      });
      const open = run.status !== "done";
      const approve = blk({
        tab: tab("ACTION", open ? "01" : "00", true), title: open ? "รอคุณอนุมัติ" : "ปิดงานแล้ว", keep: true, cls: "approve o1",
        children: [h("p", open ? "run นี้ยังไม่ปิด" + (nowI >= 0 ? " ขั้นที่กำลังเดินคือ " + cap(stg[nowI].agent) : "") + " อนุมัติและส่งกลับผ่าน Kesh ใน Claude Code (หน้านี้อ่านอย่างเดียว)" : "ไม่มีอะไรให้อนุมัติ run นี้เสร็จแล้ว"),
          h("div", { className: "acts" }, btn("เปิด run log บน GitHub", { href: "https://github.com/" + A.OWNER + "/" + A.REPO + "/blob/" + A.st.branch + "/runs/" + encodeURIComponent(id) + ".md", primary: open, icon: "next" }))]
      });
      const bnc = blk({
        tab: tab("BOUNCE", pad(run.bounce_count)), title: "เหตุตีกลับ", cls: "o4 bounce-d",
        children: rs.length ? reasonList(rs) : h("p", { className: "meta" }, "ยังไม่มีการตีกลับใน run นี้")
      });
      return { h1: [h("span", { className: "num", translate: "no" }, "Run " + pad(seq)), " " + (run.title || id)], crumb, nodes: [st, h("div", { className: "tri tri-run" }, h("div", { className: "zone" }, summary, agentBlk), h("div", { className: "zone" }, stageBlk, hoBlk), h("div", { className: "zone" }, approve, bnc))] };
    }
  };
})();
