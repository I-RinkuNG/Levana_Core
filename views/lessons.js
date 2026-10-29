KeshViews.lessons = (() => {
  const { h, tab, blk, empty, cap } = KeshUI, A = KeshApi, L = KeshLogic;
  let q = "", agent = "";
  const hl = (t) => L.highlight(t, q).map((p) => (p.hit ? h("mark", p.t) : p.t));
  return {
    skel: ["Lessons", [["LESSON", "Lessons", 4]]],
    load: async () => (await A.ws()).lessonTexts,
    render: (texts) => {
      const input = h("input", { className: "search", type: "search", placeholder: "ค้นหา lessons", "aria-label": "ค้นหา lessons", value: q });
      const names = texts.map((t) => t.name).sort();
      const pills = [["", "ทั้งหมด"]].concat(names.map((n) => [n, cap(n)])).map(([k, t]) => h("button", { className: "btn", type: "button", "aria-pressed": String(k === agent), onclick: () => { agent = k; draw(); } }, t));
      const box = h("div", { className: "lgrid" });
      const draw = () => {
        q = input.value;
        pills.forEach((p, i) => p.setAttribute("aria-pressed", String((i ? names[i - 1] : "") === agent)));
        const gs = L.lessonGroups(texts, q, agent);
        const li = (t) => h("li", { style: "padding:var(--s2) 0;border-top:1px solid var(--line)" }, hl(t));
        box.replaceChildren(...(gs.length ? gs.map((g) => blk({
          tab: tab("LESSON", String(g.total).padStart(2, "0")), title: cap(g.agent),
          children: [h("ul", g.items.map(li)), g.rest.length ? h("details", { className: "tgl", style: "margin-top:var(--s2)" }, h("summary", "ดูทั้งหมด " + g.total), h("ul", g.rest.map(li))) : null]
        })) : [empty({ icon: "empty", title: q ? "ไม่พบ lesson ที่ค้นหา" : "ยังไม่มี lessons", next: q ? "ลองคำอื่น หรือเลือก agent ทั้งหมด" : "" })]));
      };
      input.oninput = draw;
      draw();
      return { h1: "Lessons", nodes: [h("div", { className: "toolbar", role: "search" }, input), h("div", { className: "filters", role: "group", "aria-label": "กรอง agent" }, pills), box] };
    }
  };
})();
