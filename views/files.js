KeshViews.files = (() => {
  const { h, tab, blk, btn, empty, md } = KeshUI, A = KeshApi, L = KeshLogic;
  let sort = "name", opened = null;
  const size = (n) => (n == null ? "-" : n < 1024 ? n + " B" : (n / 1024).toFixed(1) + " KB");
  return {
    skel: ["ไฟล์", [["RUNS", "runs", 3], ["LESSONS", "lessons", 3]]],
    load: async () => {
      const w = await A.ws(), enc = new TextEncoder();
      const files = w.files.map((f) => ({ dir: f.dir, name: f.name, size: enc.encode(f.md).length, path: f.dir + "/" + f.name + ".md", md: f.md }));
      const miss = [];
      for (const d of ["plans", "research"]) {
        try { for (const f of await A.mdFiles(d)) files.push({ dir: d, name: f.name.replace(/\.md$/, ""), size: f.size, path: f.path }); } catch (e) { if (e.code === "auth") throw e; miss.push(d); }
      }
      return { files, miss };
    },
    render: ({ files, miss }) => {
      const box = h("div", { className: "lgrid" });
      const pills = [["name", "ชื่อ"], ["date", "วันที่"]].map(([k, t]) => h("button", { className: "btn", type: "button", "aria-pressed": String(k === sort), onclick: () => { sort = k; draw(); } }, "เรียงตาม" + t));
      const open = async (f) => {
        opened = f;
        draw();
      };
      const draw = () => {
        pills.forEach((p, i) => p.setAttribute("aria-pressed", String(["name", "date"][i] === sort)));
        if (opened) {
          const body = h("div", "กำลังโหลด…");
          box.replaceChildren(h("div", {}, btn("← " + opened.dir, { onclick: () => { opened = null; draw(); } })), blk({ tab: tab("FILE", null), title: opened.name, children: body }));
          const f = opened;
          (f.md != null ? Promise.resolve(f.md) : A.text(f.path)).then((t) => { if (opened === f) body.replaceWith(md(h("div"), t)); }).catch(() => { if (opened === f) body.textContent = "โหลดไฟล์ไม่สำเร็จ"; });
          return;
        }
        const gs = L.groupFiles(files, sort);
        box.replaceChildren(...(miss.length ? [KeshUI.banner("โหลดไม่ได้", "โฟลเดอร์ " + miss.join(", "))] : []), ...(gs.length ? gs.map((g) => blk({
          tab: tab(g.folder, g.items.length), title: null,
          children: h("ul", g.items.map((f) => h("li", h("button", { className: "frow", type: "button", onclick: () => open(files.find((x) => x.path === f.path)) }, h("span", { className: "fn" }, f.name), h("span", { className: "meta" }, size(f.size) + (f.date ? " · " + f.date : ""))))))
        })) : [empty({ icon: "empty", title: "ยังไม่มีไฟล์", next: "" })]));
      };
      draw();
      return { h1: "ไฟล์", nodes: [h("div", { className: "filters", role: "group", "aria-label": "เรียงลำดับ" }, pills), box] };
    }
  };
})();
