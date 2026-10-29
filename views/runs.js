KeshViews.runs = (() => {
  const { h, tab, blk, btn, empty, runRow } = KeshUI, A = KeshApi, L = KeshLogic;
  const ST = [["all", "ทั้งหมด"], ["open", "กำลังรัน"], ["pending", "ค้าง"], ["done", "เสร็จ"], ["bounce", "ตีกลับ"]];
  let q = "", status = "all";
  return {
    skel: ["Runs", [["LOG", "Run ทั้งหมด", 4]]],
    load: async () => (await A.ws()).runs,
    render: (runs) => {
      const seq = new Map(runs.slice().sort((a, b) => String(a.run_id).localeCompare(String(b.run_id))).map((r, i) => [r.run_id, i + 1]));
      const input = h("input", { className: "search", type: "search", id: "rq", placeholder: "ค้นหา run", "aria-label": "ค้นหา run", value: q });
      const list = h("div"), nn = h("b"), pills = ST.map(([k, t]) => h("button", { className: "btn", type: "button", "aria-pressed": String(k === status), onclick: () => { status = k; draw(); } }, t));
      const draw = () => {
        q = input.value;
        pills.forEach((p, i) => p.setAttribute("aria-pressed", String(ST[i][0] === status)));
        const rows = L.runRows(runs, { q, status });
        nn.textContent = String(rows.length).padStart(2, "0");
        list.replaceChildren(rows.length ? h("ul", { className: "rows" }, rows.map((r) => runRow(r, seq.get(r.run_id)))) : empty({ icon: "empty", title: runs.length ? "ไม่พบ run ที่ตรงเงื่อนไข" : "ยังไม่มี run", next: runs.length ? "ลองล้างคำค้นหรือเปลี่ยนสถานะ" : "เมื่อ Kesh เริ่มงานแรก ประวัติจะขึ้นที่นี่" }));
      };
      input.oninput = draw;
      draw();
      return { h1: "Runs", nodes: [blk({ tab: h("span", { className: "tab", translate: "no" }, "LOG ", nn), title: "Run ทั้งหมด", children: [h("div", { className: "toolbar", role: "search" }, input), h("div", { className: "filters", role: "group", "aria-label": "กรองสถานะ", style: "margin:var(--s3) 0 var(--s4)" }, pills), list] })] };
    }
  };
})();
