KeshViews.errors = (() => {
  const { h, icon, tab, blk, chip, btn, empty } = KeshUI, A = KeshApi, L = KeshLogic;
  const CODE = { auth: "401 token", forbidden: "403 สิทธิ์", rate: "rate limit", network: "network", timeout: "timeout", 404: "404", http: "http", partial: "ข้อมูลไม่ครบ" };
  const cause = (x) => (x.code === "partial" ? "โหลดบางส่วนไม่ได้: " + (x.message || "") : KeshApp.msg(x));
  const badge = (x) => h("span", { className: "chip bad" }, icon("errors", "sm"), CODE[x.code] || String(x.status || x.code));
  return {
    skel: ["Errors", [["ERROR", "ข้อผิดพลาดล่าสุด", 2]]],
    load: async () => A.readLog().slice().reverse(),
    render: (log) => {
      const pad = String(log.length).padStart(2, "0");
      if (!log.length) return { h1: "Errors", nodes: [blk({ tab: tab("ERROR", "00"), title: "ข้อผิดพลาดล่าสุด", children: empty({ icon: "check", title: "ไม่มี error", next: "ยังไม่มีข้อผิดพลาดจาก GitHub ในเครื่องนี้" }) })] };
      const x = log[0], t = Date.parse(x.time);
      return {
        h1: "Errors",
        nodes: [
          blk({ tab: tab("ERROR", pad, true), title: "ข้อผิดพลาดล่าสุด", children: [
            h("div", { className: "errcode" }, badge(x), h("span", { className: "meta" }, isNaN(t) ? x.time : L.hhmm(t) + " (" + L.ageText(Date.now() - t) + ")")),
            h("p", cause(x)), h("p", { className: "meta" }, [x.status, x.path, x.message].filter(Boolean).join(" · ")),
            h("div", { style: "margin-top:var(--s4)" }, btn("ลองอีกครั้ง", { primary: true, icon: "refresh", onclick: () => { A.clear(); location.hash = "#today"; KeshApp.route(); } }))] }),
          log.length > 1 ? blk({ tab: tab("LOG", String(log.length - 1).padStart(2, "0")), title: "ประวัติ", children: h("ul", { className: "hist" }, log.slice(1).map((e) => h("li", badge(e), h("span", { className: "meta" }, e.time + " · " + (e.path || "-")), h("span", cause(e))))) }) : null,
          h("div", {}, btn("ล้าง log", { onclick: () => { A.clearLog(); KeshApp.route(); } }))
        ]
      };
    }
  };
})();
