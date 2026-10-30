const KeshGraph = (() => {
  const { h, icon } = KeshUI;
  let loading = null;
  const load = () => loading || (loading = new Promise((res, rej) => {
    if (window.ForceGraph) return res(window.ForceGraph);
    const s = document.createElement("script");
    s.src = "vendor/force-graph.min.js";
    s.onload = () => res(window.ForceGraph);
    s.onerror = () => { loading = null; rej(new Error("force-graph load failed")); };
    document.head.append(s);
  }));
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const agentColor = (a) => css("--agent-" + a) || css("--ink-2");
  const KIND_TXT = { link: "ลิงก์", mention: "อ้างชื่อ", relation: "เกี่ยวข้อง" };

  const neighbours = (data, id) => {
    const lab = {};
    data.nodes.forEach((n) => { lab[n.id] = n; });
    return data.links.filter((l) => id && (l.source.id || l.source) === id || id && (l.target.id || l.target) === id).map((l) => {
      const s = l.source.id || l.source, t = l.target.id || l.target, o = lab[s === id ? t : s];
      return { node: o, kind: l.kind };
    }).filter((x) => x.node);
  };
  const hashFor = (n) => n.kind === "file" ? "#/files/" + n.path : n.kind === "agent" ? "#/files/agents/" + n.agent + ".md" : "#/issue/" + n.number;

  const legend = (mode) => {
    const li = (svg, t) => { const l = h("li", h("span", t)); l.insertAdjacentHTML("afterbegin", svg); return l; };
    const line = (d, w) => '<svg width="32" height="16" aria-hidden="true"><line x1="0" y1="8" x2="32" y2="8" stroke="' + css("--line-strong") + '" stroke-width="' + (w || 2) + '"' + (d ? ' stroke-dasharray="' + d + '"' : "") + "/></svg>";
    const out = [li(line(""), "ลิงก์ใน .md"), li(line("6 5"), "อ้างชื่อไฟล์"), li('<svg width="32" height="16" aria-hidden="true"><rect x="8" y="1" width="14" height="14" rx="3" fill="' + css("--surface") + '" stroke="' + css("--data") + '" stroke-width="2"/></svg>', "ไฟล์")];
    if (mode === "b") out.push(li(line("2 4", 1.5), "agent/issue เกี่ยวข้อง"), li('<svg width="32" height="16" aria-hidden="true"><circle cx="16" cy="8" r="7" fill="' + css("--agent-kotev") + '"/></svg>', "agent (ตัวอักษรแรก)"), li('<svg width="32" height="16" aria-hidden="true"><path d="M16 0L24 8L16 16L8 8Z" fill="' + css("--surface") + '" stroke="' + css("--ink") + '" stroke-width="2"/></svg>', "issue"));
    return out;
  };

  const mount = async (host, { build, selectedId, mode, onMode, capped }) => {
    host.replaceChildren(h("p", { className: "sub" }, "กำลังโหลดกราฟ…"));
    let FG;
    try { FG = await load(); } catch (e) { host.replaceChildren(h("p", { className: "meta" }, "โหลดกราฟไม่สำเร็จ")); return; }
    let m = mode, data = build(m), g = null, sel = selectedId;
    const can = h("div", { className: "gcan", style: "height:min(70vh,520px)" });
    const zoom = h("div", { className: "zoom" },
      h("button", { type: "button", "aria-label": "ซูมเข้า", onclick: () => g && g.zoom(g.zoom() * 1.4, 250) }, "+"),
      h("button", { type: "button", "aria-label": "ซูมออก", onclick: () => g && g.zoom(g.zoom() / 1.4, 250) }, "−"),
      h("button", { type: "button", "aria-label": "พอดีจอ", style: "font-size:15px", onclick: () => g && g.zoomToFit(300, 30) }, "fit"));
    const panel = h("div", { className: "gpanel" });
    host.replaceChildren(h("div", { className: "gwrap", id: "graphView" }, h("div", { style: "display:grid;gap:8px" }, can, capped ? h("p", { className: "sub" }, "แสดง 400 ไฟล์แรกเท่านั้น") : null), panel));
    can.append(zoom);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = () => {
      const w = can.clientWidth || 600, hgt = can.clientHeight || 420;
      if (g) { g._destructor && g._destructor(); can.querySelectorAll("canvas,div.force-graph-container").forEach((x) => x.remove()); }
      const ink = css("--ink"), surface = css("--surface"), data_ = css("--data"), act = css("--act"), line = css("--line-strong"), onAgent = css("--on-agent");
      const nodeObj = (n, ctx, k) => {
        const fs = Math.max(13 / k, 4), r = 7;
        ctx.lineWidth = 2 / k;
        if (n.id === sel) { ctx.strokeStyle = act; ctx.lineWidth = 3 / k; ctx.beginPath(); ctx.arc(n.x, n.y, r + 5, 0, 2 * Math.PI); ctx.stroke(); ctx.lineWidth = 2 / k; }
        if (n.kind === "agent") { ctx.fillStyle = agentColor(n.agent); ctx.beginPath(); ctx.arc(n.x, n.y, r + 2, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = onAgent; ctx.font = "600 " + fs + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(n.label[0], n.x, n.y); }
        else if (n.kind === "issue") { ctx.fillStyle = surface; ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(n.x, n.y - r - 3); ctx.lineTo(n.x + r + 3, n.y); ctx.lineTo(n.x, n.y + r + 3); ctx.lineTo(n.x - r - 3, n.y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        else { ctx.fillStyle = surface; ctx.strokeStyle = data_; ctx.beginPath(); ctx.rect(n.x - r, n.y - r, 2 * r, 2 * r); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = ink; ctx.font = fs + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(n.label, n.x, n.y + r + 4);
      };
      g = FG()(can).width(w).height(hgt).graphData(data).nodeId("id").backgroundColor("rgba(0,0,0,0)")
        .nodeCanvasObject(nodeObj).nodePointerAreaPaint((n, color, ctx) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(n.x, n.y, 12, 0, 2 * Math.PI); ctx.fill(); })
        .linkColor(() => line).linkWidth((l) => l.kind === "relation" ? 1 : 1.5).linkLineDash((l) => l.kind === "mention" ? [4, 3] : l.kind === "relation" ? [1, 3] : null)
        .warmupTicks(reduce ? 100 : 0).cooldownTicks(reduce ? 0 : 120).onNodeClick((n) => { location.hash = hashFor(n); })
        .onEngineStop(() => { if (!can.dataset.fit) { can.dataset.fit = "1"; g.zoomToFit(200, 30); } });
      if (reduce) setTimeout(() => g.zoomToFit(0, 30), 0);
      KeshApp.ev("info", "graph_open", "เปิดกราฟ", { mode: m, nodes: data.nodes.length, links: data.links.length });
    };
    const side = () => {
      const nb = neighbours(data, sel);
      panel.replaceChildren(
        h("div", h("h3", "โหมด"),
          ...[["a", "ลิงก์ระหว่างไฟล์", "ลิงก์ใน .md และการอ้างชื่อไฟล์"], ["b", "+ agent และ issue", "เพิ่มโหนด agent และ issue"]].map(([v, t, s], i) => h("label", { className: "radio", style: i ? "margin-top:8px" : null }, h("input", { type: "radio", name: "gm", value: v, checked: m === v, onchange: () => { m = v; data = build(m); can.dataset.fit = ""; draw(); side(); if (onMode) onMode(v); } }), h("span", t, h("small", s))))),
        h("div", h("h3", "สัญลักษณ์"), h("ul", { className: "legend", id: "glegend" }, legend(m))),
        h("div", h("h3", sel ? "เชื่อมกับ " + ((data.nodes.find((n) => n.id === sel) || {}).label || "") : "เชื่อมกับ"), h("div", { className: "gl", id: "glist" }, nb.length ? nb.map((x) => h("button", { type: "button", onclick: () => { location.hash = hashFor(x.node); } }, x.node.label + " · " + KIND_TXT[x.kind])) : h("p", { className: "sub" }, sel ? "ไม่มีโหนดที่เชื่อมกับไฟล์นี้" : "คลิกโหนดเพื่อเปิดไฟล์"))));
    };
    side();
    draw();
    window.__graph = { data: () => data, g: () => g };
  };
  return { mount, load, neighbours };
})();
