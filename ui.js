const KeshUI = (() => {
  const SVG = "http://www.w3.org/2000/svg";
  const h = (tag, a, ...kids) => {
    const e = document.createElement(tag);
    if (a instanceof Node || Array.isArray(a)) kids.unshift(a), a = null;
    if (typeof a === "string") e.textContent = a;
    else if (a) for (const k of Object.keys(a)) {
      const v = a[k];
      if (v == null || v === false) continue;
      if (k === "className" || k === "textContent" || k.startsWith("on")) e[k] = v;
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat(Infinity)) if (k != null && k !== false) e.append(k);
    return e;
  };
  const icon = (name, cls) => {
    const s = document.createElementNS(SVG, "svg"), u = document.createElementNS(SVG, "use");
    s.setAttribute("class", "i" + (cls ? " " + cls : ""));
    s.setAttribute("aria-hidden", "true");
    u.setAttribute("href", "#i-" + name);
    s.append(u);
    return s;
  };
  const num = (t, cls) => h("span", { className: "num" + (cls ? " " + cls : "") }, String(t));
  const tab = (word, nn, act) => h("span", { className: "tab" + (act ? " act" : ""), translate: "no" }, nn == null ? word : [word + " ", h("b", String(nn))]);
  const more = (text, href, cls) => h("a", { className: "more" + (cls ? " " + cls : ""), href }, text);
  let uid = 0;
  const blk = ({ tab: t, title, more: m, moreCls, br, cls, keep, children }) => {
    const id = "h" + ++uid;
    return h("section", { className: "blk" + (br ? " br" : "") + (cls ? " " + cls : "") + (keep ? " keep" : ""), "aria-labelledby": id },
      h("div", { className: "hd" }, t, title ? h("h2", { id }, title) : null, m ? more(m[0], m[1], moreCls) : null), children);
  };
  const strip = (cells, label, api) => h("ul", { className: "strip", "aria-label": label },
    cells.map((c) => h("li", { className: c.d ? "d-only" : "" }, h("span", { className: "mono", translate: "no" }, c.k), h("b", { className: "num" + (c.cls ? " " + c.cls : "") }, c.v), c.sub ? h("span", { className: "meta" }, c.sub) : null)), api);
  const KIND = { ok: "check", bad: "warn", run: "clock", warn: "clock", flag: "flag" };
  const chip = (kind, text, ic) => h("span", { className: "chip " + kind }, icon(ic || KIND[kind] || "check"), text);
  const ring = (pct, state, label) => {
    const C = 2 * Math.PI * 58, v = Math.max(0, Math.min(100, Number(pct) || 0)), off = C * (1 - v / 100);
    const e = h("div", { className: "ring" + (state && state !== "live" ? " " + (state === "missing" ? "off" : state) : ""), role: "img", "aria-label": label });
    e.innerHTML = '<svg viewBox="0 0 140 140" aria-hidden="true"><circle class="trk" cx="70" cy="70" r="58"/><circle class="val" cx="70" cy="70" r="58" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>';
    const c = h("div", { className: "c", "aria-hidden": "true" }, state === "missing" ? "—" : [Math.round(v) + "%", h("small", state === "stale" ? "ข้อมูลเก่า" : "ใช้แล้ว")]);
    e.append(c);
    return e;
  };
  const dots = (pct, state, label) => {
    const n = state === "missing" ? 0 : Math.round((Number(pct) || 0) / 5);
    return h("div", { className: "dots" + (state === "stale" ? " stale" : ""), role: "img", "aria-label": label }, Array.from({ length: 20 }, (_, i) => h("i", { className: i < n ? "f" : null })));
  };
  const dl = (items) => h("dl", { className: "kpis" }, items.map((x) => h("div", h("dt", x.dt), h("dd", { className: "v" + (x.cls ? " " + x.cls : "") }, x.v), x.c ? h("dd", { className: "c" }, x.c) : null)));
  const table = (cols, rows, o = {}) => h("table", { className: o.cls || null, id: o.id || null },
    h("thead", h("tr", cols.map((c) => h("th", { className: (c.n ? "n " : "") + (c.hide ? "hide-s" : "") || null, scope: "col" }, c.label)))),
    h("tbody", rows.map((r, ri) => h("tr", { className: r.cls || null }, (r.cells || r).map((cell, i) => h("td", { className: ((cols[i] && cols[i].n ? "n " : "") + (cols[i] && cols[i].hide ? "hide-s " : "") + (cell && cell.cls ? cell.cls : "")).trim() || null, "data-l": cols[i] && cols[i].stackLabel || null }, cell && cell.node !== undefined ? cell.node : cell))))));
  const labelChip = (l) => h("span", { className: "chip lbl", style: l.color ? "--c:#" + String(l.color).replace(/[^0-9a-fA-F]/g, "").slice(0, 6) : null }, h("i"), l.name);
  const issueRow = (i, now) => {
    const L = KeshLogic;
    return h("li", h("a", { className: "issue", href: "#/issue/" + i.number },
      h("span", { className: "st", title: i.state === "open" ? "เปิดอยู่" : "ปิดแล้ว" }, icon(i.state === "open" ? "issue" : "check"), h("span", { className: "sr" }, i.state === "open" ? "เปิดอยู่" : "ปิดแล้ว")),
      h("h3", h("span", { className: "mono" }, "#" + i.number), i.title),
      h("p", { className: "ex" }, L.excerpt(i.body, 240)),
      h("div", { className: "lb" }, (i.labels || []).map(labelChip)),
      h("div", { className: "meta" }, h("span", icon("clock"), L.ageText(now - Date.parse(i.created_at))), h("span", icon("chat"), (i.comments || 0) + " ความเห็น"), i.assignee ? h("span", i.assignee) : null)));
  };
  const btn = (text, o = {}) => {
    const cls = "btn" + (o.primary ? " primary" : "");
    const kids = [h("span", text), o.icon ? icon(o.icon) : null];
    return o.href ? h("a", { className: cls, href: o.href }, kids) : h("button", { className: cls, type: "button", onclick: o.onclick, disabled: o.disabled }, kids);
  };
  const iconbtn = (name, label, onclick, extra) => h("button", Object.assign({ className: "iconbtn", type: "button", "aria-label": label, onclick }, extra), icon(name));
  const bar = (pct, cls) => h("span", { className: "op-bar" + (cls ? " " + cls : ""), style: "--w:" + Math.max(0, Math.min(100, pct)) + "%" });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const empty = ({ icon: ic, title, next, action }) => h("div", { className: "empty" }, icon(ic || "empty"), h("p", h("b", title), next ? " " + next : ""), action || null);
  const skeleton = (n) => h("div", { className: "sk", "aria-hidden": "true" }, Array.from({ length: n || 2 }, () => h("i")));
  const skeletonBlk = ([word, title, n]) => blk({ tab: tab(word), title, children: skeleton(n) });
  const banner = (title, text, onRetry) => h("div", { className: "banner keep", role: "alert" }, icon("errors"), h("p", h("b", title), " " + text), onRetry ? btn("ลองอีกครั้ง", { onclick: onRetry }) : null);
  const stages = (model, meta) => h("ol", { className: "stages" }, model.map((s) => h("li", { className: (s.state === "bounced" ? "done bounced" : s.state) },
    h("span", { className: "dia num" }, String(s.n).padStart(2, "0")), h("b", cap(s.agent)), h("span", { className: "meta" + (s.bounces ? " bad-t" : "") }, meta(s)))));
  const runRow = (r, seq) => {
    const c = KeshLogic.runChip(r);
    return h("li", h("a", { className: "row", href: "#run/" + encodeURIComponent(r.run_id) }, h("span", { className: "num rid", translate: "no" }, String(seq).padStart(3, "0")),
      h("span", { className: "rname" }, r.title || r.run_id), chip(c.kind, c.text), h("span", { className: "num rtok" }, KeshLogic.fmtTok(r.tokens_total))));
  };
  const md = (el, src) => {
    if (window.marked && window.DOMPurify) {
      el.className = "md";
      el.innerHTML = DOMPurify.sanitize(marked.parse(src), { FORBID_TAGS: ["img", "svg", "iframe", "form", "style"], FORBID_ATTR: ["style"] });
    } else el.append(h("pre", src));
    return el;
  };
  return { ring, dots, dl, table, issueRow, labelChip, runRow, h, icon, num, tab, more, blk, strip, chip, btn, iconbtn, bar, cap, empty, skeleton, skeletonBlk, banner, stages, md };
})();
