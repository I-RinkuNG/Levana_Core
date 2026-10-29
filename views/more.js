KeshViews.more = (() => {
  const { h, icon, tab, blk, btn } = KeshUI, A = KeshApi, L = KeshLogic;
  return {
    skel: ["เพิ่มเติม", [["MORE", "เมนูอื่น", 2]]],
    load: async () => {
      const w = await A.ws();
      return { lessons: w.lessonTexts.length, errors: A.readLog().length };
    },
    render: (d) => {
      const m = L.navModel({ lessons: d.lessons, errors: d.errors || null }, "more").rail[2];
      return {
        h1: "เพิ่มเติม",
        nodes: [blk({
          tab: tab("MORE", String(m.length).padStart(2, "0")), title: "เมนูอื่น",
          children: h("ul", { className: "morelist" }, m.map((i) => h("li", h("a", { href: i.href }, icon(i.icon), i.label, i.count != null ? h("span", { className: "cnt" }, String(i.count)) : null))))
        }), h("div", {}, btn("ลบ token ออกจากเครื่องนี้", { onclick: KeshApp.logout }))]
      };
    }
  };
})();
