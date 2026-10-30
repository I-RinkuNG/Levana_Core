(() => {
  const { h, icon, num, tab, blk, chip, btn, empty, md } = KeshUI, A = KeshApi, L = KeshLogic;
  const day = (s) => String(s || "").slice(0, 10);
  let q = "", state = "open";
  KeshViews.issues = {
    skel: ["Issues"],
    load: async () => ({ list: await A.issues(), now: Date.now() }),
    render: ({ list, now }) => {
      const input = h("input", { type: "search", placeholder: "ค้นหา issue", "aria-label": "ค้นหา issue", value: q });
      const box = h("div"), fil = h("div", { className: "txt", role: "group", "aria-label": "สถานะ issue" });
      const draw = () => {
        q = input.value;
        fil.replaceChildren(...[["open", "เปิด"], ["closed", "ปิดแล้ว"]].map(([k, t]) => h("button", { type: "button", "aria-pressed": String(k === state), onclick: () => { state = k; draw(); } }, t + " ", h("b", String(list.filter((i) => i.state === k).length)))));
        const s = q.trim().toLowerCase();
        const rows = list.filter((i) => i.state === state && (!s || ("#" + i.number + " " + i.title + " " + i.user.login).toLowerCase().includes(s)));
        box.replaceChildren(rows.length ? h("ul", { className: "issues" }, rows.map((i) => KeshUI.issueRow(i, now))) : empty({ icon: "check", title: s ? "ไม่พบ issue ที่ค้นหา" : state === "open" ? "ไม่มี issue ที่เปิดอยู่" : "ยังไม่มี issue ที่ปิด", next: s ? "ลองคำอื่น" : "" }));
      };
      input.oninput = draw;
      draw();
      return { h1: "Issues", nodes: [h("div", { className: "rtop" }, fil, h("label", { className: "field" }, icon("search"), input)), box] };
    }
  };
  KeshViews.issue = {
    skel: ["Issue", [["ISSUE", "Issue", 3]]],
    crumb: () => ["Issues", "#/issues"],
    load: async (n) => {
      const i = (await A.issues()).find((x) => String(x.number) === String(n));
      let cm = [];
      if (i && i.comments) { try { cm = await A.get("m" + i.number, () => A.api("/issues/" + i.number + "/comments?per_page=100")); } catch (e) { if (e.code === "auth") throw e; cm = null; } }
      return { i, cm: Array.isArray(cm) ? cm : cm === null ? null : [], n };
    },
    render: ({ i, cm, n }) => {
      const crumb = ["Issues", "#/issues"];
      if (!i) return { h1: "ไม่พบ issue", crumb, nodes: [empty({ icon: "empty", title: "ไม่พบ issue #" + n, next: "อาจเกิน 100 รายการล่าสุดของ snapshot", action: btn("ดู Issues ทั้งหมด", { href: "#/issues", primary: true }) })] };
      const body = md(h("div"), i.body || "_ไม่มีรายละเอียด_");
      const gh = /^https:\/\/github\.com\//.test(i.html_url) ? btn("เปิดใน GitHub", { href: i.html_url, icon: "next" }) : null;
      if (gh) { gh.target = "_blank"; gh.rel = "noopener noreferrer"; }
      return {
        h1: i.title, crumb,
        nodes: [blk({
          tab: tab("ISSUE", "#" + i.number, i.state === "open"), title: null,
          children: [h("p", { className: "meta" }, i.state === "open" ? chip("run", "เปิด") : chip("ok", "ปิดแล้ว"), " " + i.user.login + " · " + day(i.created_at)), body, h("div", { style: "margin-top:var(--s4)" }, gh)]
        }), ...(cm === null ? [h("p", { className: "meta" }, "โหลดความเห็นไม่สำเร็จ")] : cm.map((c) => blk({ tab: tab("REPLY", null), title: (c.user && c.user.login || "ghost") + " · " + day(c.created_at), children: md(h("div"), c.body || "") })))]
      };
    }
  };
})();
