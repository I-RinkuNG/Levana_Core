KeshViews.runs = (() => {
  const { h, icon, chip, table, empty, btn } = KeshUI, A = KeshApi, L = KeshLogic;
  const ST = [["all", "ทั้งหมด"], ["done", "เสร็จ"], ["open", "กำลังทำ"], ["followups", "มีงานค้างต่อ"]];
  const MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const dshort = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); return m ? +m[3] + " " + MON[+m[2] - 1] : "—"; };
  let q = "", status = "all", limit = 30;
  return {
    skel: ["Runs"],
    load: async () => (await A.ws()).runs,
    render: (runs) => {
      const count = (k) => L.runRows(runs, { status: k }).length;
      const input = h("input", { type: "search", placeholder: "ค้นหา run", "aria-label": "ค้นหา run", value: q });
      const fil = h("div", { className: "txt", role: "group", "aria-label": "กรองสถานะ" });
      const box = h("div");
      const draw = () => {
        q = input.value;
        fil.replaceChildren(...ST.map(([k, t]) => h("button", { type: "button", "aria-pressed": String(k === status), onclick: () => { status = k; limit = 30; draw(); } }, t + " ", h("b", String(count(k))))));
        const rows = L.runRows(runs, { q, status });
        if (!rows.length) return box.replaceChildren(empty({ icon: "runs", title: runs.length ? "ไม่พบ run ที่ตรงเงื่อนไข" : "ยังไม่มี run", next: runs.length ? "ลองล้างคำค้นหรือเปลี่ยนสถานะ" : "run ถูกสร้างเมื่อ Kesh รับงานแล้วเขียนไฟล์ใน runs/. ตรวจว่า token อ่าน repo claude-dotfiles ได้", action: runs.length ? null : btn("ตรวจใหม่", { onclick: () => KeshApp.refresh(), icon: "refresh" }) }));
        const shown = rows.slice(0, limit);
        const cols = [{ label: "Run" }, { label: "เริ่ม" }, { label: "Handoffs", n: 1 }, { label: "Tokens", n: 1 }, { label: "สถานะ" }];
        const trs = shown.map((r) => [
          h("a", { href: "#/run/" + encodeURIComponent(r.run_id), translate: "no" }, h("b", r.title || r.run_id)),
          { node: dshort(r.date || r.run_id), cls: "" }, String((r.handoffs || []).length), r.tokens_total == null ? "—" : r.tokens_total.toLocaleString("en-US"),
          h("div", { className: "tags" }, r.status === "open" ? chip("run", "กำลังทำ", "clock") : chip("ok", "เสร็จ", "check"), r.has_followups ? chip("flag", "มีงานค้างต่อ", "flag") : null, r.bounce_count > 0 ? chip("bad", "ตีกลับ " + r.bounce_count, "warn") : null)
        ]);
        const t = table(cols, trs, { cls: "stack" });
        t.querySelectorAll("tbody tr").forEach((tr) => { const c = tr.children; [["เริ่ม"], ["Handoffs"], ["Tokens"]].forEach((l, i) => c[i + 1].setAttribute("data-l", l[0])); });
        box.replaceChildren(h("div", { className: "tw" }, t), h("div", { className: "logfoot" }, h("span", { className: "sub" }, "แสดง " + shown.length + " จาก " + rows.length), rows.length > shown.length ? btn("แสดงเพิ่ม", { onclick: () => { limit += 30; draw(); } }) : null));
      };
      input.oninput = () => { limit = 30; draw(); };
      draw();
      return { h1: "Runs", nodes: [h("details", { className: "help" }, h("summary", "run คืออะไร"), h("p", "run = งาน 1 งานที่ Kesh ส่งต่อให้หลาย agent. เสร็จ = มีส่วนสรุปผลหรือ handoff ครบ; มีงานค้างต่อ = เสร็จแล้วแต่ยังมีข้อ follow-up.")),
        h("div", { className: "rtop" }, fil, h("label", { className: "field" }, icon("search"), input)), box] };
    }
  };
})();
