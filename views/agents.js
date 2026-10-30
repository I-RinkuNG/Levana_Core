KeshViews.agents = (() => {
  const { h, table, cap } = KeshUI, A = KeshApi, L = KeshLogic;
  const ROLE = {};
  for (const g of Object.values(L.AGENT_GROUPS)) for (const [a, r] of g) ROLE[a] = r;
  const MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return {
    skel: ["Agents"],
    load: async () => ({ w: await A.ws() }),
    render: ({ w }) => {
      const last = {};
      for (const r of w.runs.slice().sort((a, b) => String(a.run_id).localeCompare(String(b.run_id)))) for (const x of r.handoffs || []) last[x.to] = r;
      const names = Object.keys(ROLE);
      const cols = [{ label: "Agent" }, { label: "หน้าที่" }, { label: "ทำงานล่าสุด" }, { label: "Lessons", n: 1 }];
      const rows = names.map((a) => {
        const r = last[a], d = r && /^(\d{4})-(\d{2})-(\d{2})/.exec(r.date || r.run_id);
        return [h("div", { className: "nm" }, h("span", { className: "sw lg", style: "--c:var(--agent-" + a + ")", "aria-hidden": "true" }, cap(a)[0]), h("span", { translate: "no" }, cap(a))),
          ROLE[a], r ? (d ? +d[3] + " " + MON[+d[2] - 1] + " · " : "") + (r.title || r.run_id) : "—",
          h("a", { href: "#/files/lessons/" + a + ".md" }, (w.lessons[a] || 0) + " ข้อ")];
      });
      const t = table(cols, rows, { cls: "stack" });
      t.querySelectorAll("tbody tr").forEach((tr) => { ["", "หน้าที่", "ล่าสุด", "Lessons"].forEach((l, i) => l && tr.children[i].setAttribute("data-l", l)); });
      return { h1: "Agents", noFresh: true, nodes: [h("div", { className: "tw" }, t)] };
    }
  };
})();
