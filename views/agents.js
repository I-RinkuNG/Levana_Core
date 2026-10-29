KeshViews.agents = (() => {
  const { h, icon, tab, blk, strip, btn, empty, opCard, cap } = KeshUI, A = KeshApi, L = KeshLogic;
  const GROUPS = { BUILD: "สายสร้าง", CHECK: "สายค้นและตรวจ" };
  const mq = matchMedia("(min-width:600px)");
  return {
    skel: ["Agents", [["SQUAD", "ทีม agent", 4]]],
    load: async () => ({ w: await A.ws(), now: Date.now() }),
    render: ({ w, now }) => {
      const cards = L.agentCards(w, 7, now), sum = L.bounceSummary(cards);
      const over = cards.filter((c) => c.level === "bad");
      const tok = cards.reduce((s, c) => s + c.tokens, 0), les = cards.reduce((s, c) => s + c.lessons, 0);
      const st = strip([
        { k: "TOKEN 7D", v: L.fmtTok(tok) }, { k: "BOUNCE", v: Math.round(sum.rate * 100) + "%", cls: sum.rate > L.BOUNCE_WARN + 1e-9 ? "bad-t" : "" },
        { k: "OVER 20%", v: String(over.length), cls: over.length ? "bad-t" : "" }, { k: "HANDOFF", v: String(sum.handoffs), d: 1 }, { k: "LESSONS", v: String(les), d: 1 }
      ], "สรุป agent");
      const brief = over.length ? h("p", { className: "brief" }, h("span", { className: "mono", translate: "no" }, "ALERT"), h("span", over.map((c, i) => [i ? " · " : "", cap(c.name) + " ตีกลับ ", h("b", { className: "num bad-t" }, Math.round(c.bounceRate * 100) + "%"), " เกินเกณฑ์ 20%"]))) : null;
      let body;
      if (!sum.handoffs) body = empty({ icon: "empty", title: "ยังไม่มีสถิติใน 7 วัน", next: "agent ทั้ง 10 ยังไม่ได้รับงาน เมื่อมี run แรก การ์ดจะขึ้นที่นี่", action: btn("ดู Runs", { href: "#runs", primary: true }) });
      else body = [h("p", { className: "meta sub" }, "แถบฟ้า = token 7 วันเทียบคนที่ใช้มากสุด · แถบตีกลับมีเส้นเกณฑ์ 20% (เกินแล้วเป็นสีแดง + ไอคอน)"),
        Object.keys(GROUPS).map((g) => {
          const list = cards.filter((c) => c.group === g), ul = h("ul", { className: "cards" }, list.map((c) => opCard(c, true)));
          const head = h("h3", tab(g, String(list.length).padStart(2, "0")), GROUPS[g]);
          if (g === "BUILD") return h("div", { className: "group" }, head, ul);
          const d = h("details", { className: "tgl chk" }, h("summary", "แสดง " + g + " " + String(list.length).padStart(2, "0")), ul);
          const sync = () => { d.open = mq.matches; };
          sync();
          mq.addEventListener("change", sync);
          return h("div", { className: "group" }, head, d);
        })];
      return {
        h1: "Agents", freshExtra: "ข้อมูล 7 วัน",
        nodes: [st, brief, h("section", { className: "flat", "aria-labelledby": "h-sq" }, h("div", { className: "hd" }, tab("SQUAD", String(cards.length)), h("h2", { id: "h-sq" }, "ทีม agent")), body)]
      };
    }
  };
})();
