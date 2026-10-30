KeshViews.files = (() => {
  const { h, icon, md, empty } = KeshUI, A = KeshApi, L = KeshLogic;
  const CAP = 400;
  const buildTree = (paths) => {
    const root = { dirs: {}, files: [], count: 0 };
    for (const p of paths) {
      const seg = p.split("/");
      let n = root;
      n.count++;
      for (let i = 0; i < seg.length - 1; i++) { n = n.dirs[seg[i]] || (n.dirs[seg[i]] = { dirs: {}, files: [], count: 0, path: seg.slice(0, i + 1).join("/") }); n.count++; }
      n.files.push(p);
    }
    return root;
  };
  const resolveHref = (from, href) => {
    if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//") || href.startsWith("#")) return null;
    const clean = href.split("#")[0];
    if (!/\.md$/i.test(clean)) return null;
    const out = [];
    for (const s of ((from.includes("/") ? from.slice(0, from.lastIndexOf("/") + 1) : "") + clean).split("/")) { if (!s || s === ".") continue; if (s === "..") out.pop(); else out.push(s); }
    return out.join("/");
  };
  return {
    wide: true,
    skel: ["Files"],
    load: async (arg) => {
      const [w, t] = await Promise.all([A.ws(), A.tree()]);
      const paths = t.entries.filter((e) => e.type === "blob" && /\.md$/i.test(e.path)).map((e) => e.path).sort();
      const isFile = arg && paths.includes(arg);
      let text = null, err = false;
      if (isFile) {
        const hit = w.files.find((f) => f.dir + "/" + f.name + ".md" === arg);
        if (hit) text = hit.md; else { try { text = await A.text(arg); } catch (e) { if (e.code === "auth") throw e; err = true; } }
      }
      return { w, paths, arg, isFile, text, err, truncated: t.truncated };
    },
    render: ({ w, paths, arg, isFile, text, err, truncated }, _a, query) => {
      const graph = query && query.view === "graph";
      let gm = query && query.gm === "b" ? "b" : "a";
      const open = new Set();
      const sel = isFile ? arg : null, dirArg = !isFile && arg ? arg.replace(/\/$/, "") : null;
      const expand = (p) => { const s = p.split("/"); for (let i = 1; i < s.length; i++) open.add(s.slice(0, i).join("/")); };
      if (sel) expand(sel);
      if (dirArg) { expand(dirArg + "/x"); }
      if (!open.size && !sel) open.add("lessons");
      const tree = buildTree(paths);
      let q = "", focusPath = null;
      const ul = h("ul", { role: "tree", "aria-label": "ไฟล์ .md" });
      const go = (p) => { location.hash = "#/files/" + p + (graph ? "?view=graph&gm=" + gm : ""); };
      const fileLi = (p) => h("li", { role: "none" }, h("button", { className: "tnode", role: "treeitem", type: "button", "data-path": p, "aria-selected": String(p === sel), tabindex: "-1", onclick: () => { KeshApp.ev("info", "file_open", "เปิดไฟล์", { path: p }); go(p); } }, icon("file"), h("span", { translate: "no" }, p.split("/").pop())));
      const dirLi = (name, n, force) => {
        const o = force || open.has(n.path);
        return h("li", { role: "none" }, h("button", { className: "tnode", role: "treeitem", type: "button", "data-path": n.path, "aria-expanded": String(o), tabindex: "-1", onclick: () => { if (open.has(n.path)) open.delete(n.path); else open.add(n.path); focusPath = n.path; drawTree(); } }, icon("chev", "chev"), icon("files"), h("span", { translate: "no" }, name + "/"), h("span", { className: "ct" }, String(n.count))),
          o ? h("ul", { role: "group" }, Object.keys(n.dirs).sort().map((k) => dirLi(k, n.dirs[k], force)), n.files.map(fileLi)) : null);
      };
      const drawTree = () => {
        const s = q.trim().toLowerCase();
        if (s) { const hits = paths.filter((p) => p.toLowerCase().includes(s)); ul.replaceChildren(...(hits.length ? hits.map(fileLi) : [h("li", { role: "none", className: "sub", style: "padding:8px" }, "ไม่พบไฟล์")])); }
        else ul.replaceChildren(...Object.keys(tree.dirs).sort().map((k) => dirLi(k, tree.dirs[k])), ...tree.files.map(fileLi));
        const items = [...ul.querySelectorAll(".tnode")];
        const cur = (focusPath && items.find((x) => x.dataset.path === focusPath)) || items.find((x) => x.getAttribute("aria-selected") === "true") || items[0];
        if (cur) cur.tabIndex = 0;
        if (focusPath && cur) cur.focus();
        focusPath = null;
      };
      ul.addEventListener("keydown", (e) => {
        const items = [...ul.querySelectorAll(".tnode")], i = items.indexOf(document.activeElement);
        if (i < 0) return;
        const cur = items[i], isDir = cur.hasAttribute("aria-expanded"), move = (j) => { e.preventDefault(); const t = items[Math.max(0, Math.min(items.length - 1, j))]; items.forEach((x) => { x.tabIndex = -1; }); t.tabIndex = 0; t.focus(); };
        if (e.key === "ArrowDown") move(i + 1);
        else if (e.key === "ArrowUp") move(i - 1);
        else if (e.key === "Home") move(0);
        else if (e.key === "End") move(items.length - 1);
        else if (e.key === "ArrowRight" && isDir) { e.preventDefault(); if (cur.getAttribute("aria-expanded") === "false") cur.click(); else move(i + 1); }
        else if (e.key === "ArrowLeft") { if (isDir && cur.getAttribute("aria-expanded") === "true") { e.preventDefault(); cur.click(); } else { const par = items.slice(0, i).reverse().find((x) => x.hasAttribute("aria-expanded") && cur.dataset.path.startsWith(x.dataset.path + "/")); if (par) move(items.indexOf(par)); } }
      });
      const search = h("input", { type: "search", placeholder: "ค้นหาไฟล์", "aria-label": "ค้นหาไฟล์", oninput: (e) => { q = e.target.value; drawTree(); } });
      const treeEl = h("nav", { className: "tree", id: "tree", "aria-label": "ไฟล์" }, h("div", { className: "tclose" }, h("button", { className: "iconbtn", id: "treeClose", type: "button", "aria-label": "ปิดรายการไฟล์", onclick: () => KeshApp.closeAll() }, icon("close"))), h("label", { className: "field" }, icon("search"), search), ul);
      drawTree();

      const ftog = h("button", { className: "btn ftog", id: "treeBtn", type: "button", "aria-controls": "tree", "aria-expanded": "false", onclick: () => KeshApp.openSheet(treeEl, ftog) }, icon("files"), "ไฟล์");
      KeshApp.addSheet(treeEl, ftog);
      const pathEl = h("div", { className: "path" }, sel ? [h("span", sel.includes("/") ? sel.slice(0, sel.lastIndexOf("/") + 1).replace(/\//g, " / ") : ""), " ", h("b", sel.split("/").pop())] : h("span", "เลือกไฟล์จากรายการ"));
      const base = "#/files" + (sel ? "/" + sel : dirArg ? "/" + dirArg : "");
      const view = (g) => h("button", { type: "button", id: g ? "vGraph" : "vDoc", "aria-pressed": String(g === graph), onclick: () => { location.hash = g ? base + "?view=graph&gm=" + gm : base; } }, g ? "กราฟ" : "เอกสาร");
      const bar = h("div", { className: "dbar" }, h("h1", { className: "sr", tabindex: "-1" }, "Files"), ftog, pathEl, h("div", { className: "seg", role: "group", "aria-label": "มุมมอง" }, view(false), view(true)));
      const pane = h("div", { className: "dpane" });
      let trBtn = null;
      if (!graph && sel && KeshTr.available()) {
        trBtn = h("button", { className: "btn tr", id: "trBtn", type: "button", "aria-pressed": "false" }, icon("tr"), h("span", KeshTr.direction(text || "").label));
        bar.append(trBtn);
      } else if (!KeshTr.available()) KeshTr.noteUnavailable();

      let after = null;
      if (graph) {
        const host = h("div");
        pane.append(host);
        after = async () => {
          try {
            const list = paths.slice(0, CAP), have = {};
            for (const f of w.files) have[f.dir + "/" + f.name + ".md"] = f.md;
            const missing = list.filter((p) => !(p in have));
            const got = missing.length ? await A.mdBatch(missing) : {};
            const files = list.map((p) => ({ path: p, text: p in have ? have[p] : got[p] || "" }));
            const agents = w.agents.map((a) => a.name);
            await KeshGraph.mount(host, { build: (m) => L.buildGraph(files, agents, w.issues, m), selectedId: sel ? "f:" + sel : null, mode: gm, capped: paths.length > CAP, onMode: (m) => { gm = m; history.replaceState(null, "", base + "?view=graph&gm=" + m); } });
          } catch (e) { host.replaceChildren(h("p", { className: "meta" }, "สร้างกราฟไม่สำเร็จ: " + (e.message || e.code || ""))); }
        };
      } else if (sel) {
        const art = h("article", { className: "md", id: "docView" });
        if (err) art.append(h("p", "โหลดไฟล์ไม่สำเร็จ"));
        else {
          md(art, text || "");
          art.querySelectorAll("a[href]").forEach((a) => {
            const t = resolveHref(sel, a.getAttribute("href"));
            if (t) a.setAttribute("href", "#/files/" + t); else if (/^https?:/i.test(a.getAttribute("href"))) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
          });
        }
        pane.append(art);
        if (trBtn) trBtn.onclick = async () => { try { await KeshTr.toggle(art, sel, trBtn); } catch (e) { KeshApp.ev("warn", "translate_unavailable", "แปลไม่สำเร็จ", { reason: "error" }); trBtn.querySelector("span").textContent = "แปลไม่สำเร็จ"; } };
      } else {
        pane.append(empty({ icon: "files", title: dirArg ? "เลือกไฟล์ใน " + dirArg + "/" : "เลือกไฟล์จากรายการ", next: truncated ? "รายการไฟล์ถูกตัด (repo ใหญ่)" : "" }));
        if (arg && !dirArg) {}
      }
      return { bare: true, h1: "Files", title: sel ? sel.split("/").pop() : "Files", nodes: [h("div", { className: "files" }, treeEl, h("div", { className: "dcol" }, bar, pane))], after };
    }
  };
})();
