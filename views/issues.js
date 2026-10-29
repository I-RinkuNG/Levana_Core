(() => {
  const { h, icon, num, tab, blk, chip, btn, empty, md } = KeshUI, A = KeshApi, L = KeshLogic;
  const day = (s) => String(s || "").slice(0, 10);
  let q = "", state = "open";
  const row = (i, now) => h("li", h("a", { className: "row", href: "#issue/" + i.number }, h("span", { className: "num rid", translate: "no" }, "#" + i.number),
    h("span", { className: "rname" }, i.title), h("span", { className: "meta mchip" }, i.user.login + " · " + day(i.created_at) + (i.comments ? " · " + i.comments + " ความเห็น" : "")),
    h("span", { className: "meta" }, L.ageText(now - Date.parse(i.created_at)))));
  KeshViews.issues = {
    skel: ["Issues", [["ISSUE", "Issue", 4]]],
    load: async () => ({ list: await A.issues(), now: Date.now() }),
    render: ({ list, now }) => {
      const input = h("input", { className: "search", type: "search", placeholder: "ค้นหา issue", "aria-label": "ค้นหา issue", value: q });
      const box = h("div"), nn = h("b");
      const pills = [["open", "เปิด"], ["closed", "ปิดแล้ว"]].map(([k, t]) => h("button", { className: "btn", type: "button", "aria-pressed": String(k === state), onclick: () => { state = k; draw(); } }, t + " " + list.filter((i) => i.state === k).length));
      const draw = () => {
        q = input.value;
        pills.forEach((p, i) => p.setAttribute("aria-pressed", String(["open", "closed"][i] === state)));
        const s = q.trim().toLowerCase();
        const rows = list.filter((i) => i.state === state && (!s || ("#" + i.number + " " + i.title + " " + i.user.login).toLowerCase().includes(s)));
        nn.textContent = String(rows.length).padStart(2, "0");
        box.replaceChildren(rows.length ? h("ul", { className: "rows" }, rows.map((i) => row(i, now))) : empty({ icon: "empty", title: s ? "ไม่พบ issue ที่ค้นหา" : state === "open" ? "ไม่มี issue ค้าง" : "ยังไม่มี issue ที่ปิด", next: s ? "ลองคำอื่น" : "" }));
      };
      input.oninput = draw;
      draw();
      return { h1: "Issues", nodes: [blk({ tab: h("span", { className: "tab", translate: "no" }, "ISSUE ", nn), title: "รายการ issue", children: [h("div", { className: "toolbar", role: "search" }, input), h("div", { className: "filters", role: "group", "aria-label": "สถานะ issue", style: "margin:var(--s3) 0 var(--s4)" }, pills), box] })] };
    }
  };
  KeshViews.issue = {
    skel: ["Issue", [["ISSUE", "Issue", 3]]],
    crumb: () => ["Issues", "#issues"],
    load: async (n) => {
      const i = (await A.issues()).find((x) => String(x.number) === String(n));
      let cm = [];
      if (i && i.comments) { try { cm = await A.get("m" + i.number, () => A.api("/issues/" + i.number + "/comments?per_page=100")); } catch (e) { if (e.code === "auth") throw e; cm = null; } }
      return { i, cm: Array.isArray(cm) ? cm : cm === null ? null : [], n };
    },
    render: ({ i, cm, n }) => {
      const crumb = ["Issues", "#issues"];
      if (!i) return { h1: "ไม่พบ issue", crumb, nodes: [empty({ icon: "empty", title: "ไม่พบ issue #" + n, next: "อาจเกิน 100 รายการล่าสุดของ snapshot", action: btn("ดู Issues ทั้งหมด", { href: "#issues", primary: true }) })] };
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
