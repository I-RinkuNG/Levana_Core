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
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k);
    return e;
  };
  const icon = (name, cls) => {
    const s = document.createElementNS(SVG, "svg"), u = document.createElementNS(SVG, "use");
    s.setAttribute("class", "ico" + (cls ? " " + cls : ""));
    s.setAttribute("aria-hidden", "true");
    u.setAttribute("href", "#i-" + name);
    s.append(u);
    return s;
  };
  const num = (t, cls) => h("span", { className: "num" + (cls ? " " + cls : "") }, String(t));
  const tab = (word, nn, act) => h("span", { className: "tab" + (act ? " act" : ""), translate: "no" }, nn == null ? word : [word + " ", h("b", String(nn))]);
  const more = (text, href) => h("a", { className: "more", href }, text);
  let uid = 0;
  const blk = ({ tab: t, title, more: m, br, cls, keep, children }) => {
    const id = "h" + ++uid;
    return h("section", { className: "blk" + (br ? " br" : "") + (cls ? " " + cls : "") + (keep ? " keep" : ""), "aria-labelledby": id },
      h("div", { className: "hd" }, t, title ? h("h2", { id }, title) : null, m ? more(m[0], m[1]) : null), children);
  };
  const strip = (cells, label, api) => h("ul", { className: "strip", "aria-label": label },
    cells.map((c) => h("li", { className: c.d ? "d-only" : "" }, h("span", { className: "mono", translate: "no" }, c.k), h("b", { className: "num" + (c.cls ? " " + c.cls : "") }, c.v))), api);
  const KIND = { ok: "check", bad: "bounce", run: "play" };
  const chip = (kind, text) => h("span", { className: "chip " + kind }, icon(KIND[kind] || "check", "sm"), text);
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
  const meter = ({ segs, label, legend }) => h("div", {},
    h("div", { className: "bar", role: "img", "aria-label": label }, h("span", { className: "seg used", style: "--w:" + segs.used + "%" }), segs.reserved ? h("span", { className: "seg resv", style: "--w:" + segs.reserved + "%" }) : null),
    h("ul", { className: "legend meta" }, legend.map(([cls, kids]) => h("li", h("i", { className: "sw " + cls }), kids))));
  const stages = (model, meta) => h("ol", { className: "stages" }, model.map((s) => h("li", { className: (s.state === "bounced" ? "done bounced" : s.state) },
    h("span", { className: "dia num" }, String(s.n).padStart(2, "0")), h("b", cap(s.agent)), h("span", { className: "meta" + (s.bounces ? " bad-t" : "") }, meta(s)))));
  const opCard = (c, full) => {
    const bad = c.level === "bad", pct = Math.round(c.bounceRate * 100), L = KeshLogic;
    return h("li", { className: "op" + (bad ? " warn" : ""), "data-ag": c.name },
      h("span", { className: "op-ini", "aria-hidden": "true" }, c.name[0].toUpperCase(), h("span", { className: "mono" }, String(c.rank).padStart(2, "0"))),
      h("b", { className: "op-name", translate: "no" }, c.name.toUpperCase()),
      h("div", { className: "op-body" }, h("span", { className: "meta" }, c.role), h("b", { className: "num op-val" }, L.fmtTok(c.tokens)),
        h("span", { className: "op-bar", style: "--w:" + c.relPct + "%", role: full ? "img" : null, "aria-label": full ? "token 7 วัน " + L.fmtTok(c.tokens) : null }),
        full ? [
          h("dl", h("dt", { className: "meta" }, "handoff"), h("dd", { className: "num" }, String(c.handoffs)), h("dt", { className: "meta" }, "ตีกลับ"),
            h("dd", { className: "num" + (bad ? " bad-t" : "") }, bad ? icon("errors", "sm") : null, pct + "%")),
          h("span", { className: "bnc" + (bad ? " over" : ""), role: "img", "aria-label": "ตีกลับ " + pct + "% เกณฑ์ 20%" + (bad ? " เกินเกณฑ์" : "") }, h("i", { style: "--w:" + L.bounceBarPct(c.bounceRate) + "%" })),
          h("a", { className: "more", href: "#lessons" }, "lessons " + c.lessons)
        ] : h("span", { className: "meta" + (bad ? " bad-t" : "") }, bad ? icon("errors", "sm") : null, "ตีกลับ " + pct + "%")));
  };
  const md = (el, src) => {
    if (window.marked && window.DOMPurify) {
      el.className = "md";
      el.innerHTML = DOMPurify.sanitize(marked.parse(src), { FORBID_TAGS: ["img", "svg", "iframe", "form", "style"], FORBID_ATTR: ["style"] });
    } else el.append(h("pre", src));
    return el;
  };
  return { h, icon, num, tab, more, blk, strip, chip, btn, iconbtn, bar, cap, empty, skeleton, skeletonBlk, banner, meter, stages, opCard, md };
})();
