KeshViews.log = (() => {
  const { h, icon, empty, btn } = KeshUI, K = KeshLog;
  const MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const LV = { error: ["x", "error"], warn: ["warn", "warn"], info: ["info", "info"], debug: ["info", "info"] };
  const RANGES = [["1h", "1 ชั่วโมงล่าสุด", 3600000], ["24h", "24 ชั่วโมงล่าสุด", 86400000], ["7d", "7 วัน", 7 * 86400000], ["all", "ทั้งหมด", 0]];
  const pad = (n) => String(n).padStart(2, "0");
  const when = (e) => { const d = new Date(e.ts); return isNaN(d) ? String(e.ts) : d.getDate() + " " + MON[d.getMonth()] + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()); };
  const devLabel = (d) => !d ? "—" : d.brands ? (d.brands.filter((b) => !/not.?a.?brand/i.test(b))[0] || d.brands[0] || "") + " · " + (d.platform || "") + (d.mobile ? " (มือถือ)" : "") : String(d.ua || "—").slice(0, 60);
  let q = "", level = "all", range = "24h", dev = "all", limit = 100;
  return {
    noAuth: true,
    skel: ["Log"],
    load: async () => {
      let rows = null, note = "", remote = false;
      if (K.configured() && K.auth()) { try { rows = await K.fetchRemote(200); remote = !!rows; } catch (e) { note = "อ่านจาก Supabase ไม่ได้ (" + e.message + ") แสดง log ในเครื่องแทน"; } }
      if (!rows) rows = K.readLocal().slice().reverse();
      return { rows, remote, note, st: K.status() };
    },
    render: ({ rows, remote, note, st }) => {
      const now = Date.now(), box = h("div"), fil = h("div", { className: "txt", role: "group", "aria-label": "ระดับ" });
      const devs = [...new Set(rows.map((r) => devLabel(r.device)))];
      const input = h("input", { type: "search", placeholder: "ค้นหา event หรือข้อความ", "aria-label": "ค้นหา log", value: q });
      const sel = (label, opts, val, on) => h("label", { className: "field sm" }, h("select", { "aria-label": label, onchange: (e) => { on(e.target.value); limit = 100; draw(); } }, opts.map(([v, t]) => h("option", { value: v, selected: v === val }, t))));
      const inRange = (r) => { const m = RANGES.find((x) => x[0] === range)[2]; return !m || now - Date.parse(r.ts) <= m; };
      const base = () => rows.filter((r) => inRange(r) && (dev === "all" || devLabel(r.device) === dev) && (!q.trim() || (r.event + " " + (r.message || "")).toLowerCase().includes(q.trim().toLowerCase())));
      const draw = () => {
        q = input.value;
        const b = base(), cnt = (l) => b.filter((r) => l === "all" || r.level === l).length;
        fil.replaceChildren(...["all", "error", "warn", "info", "debug"].map((l) => h("button", { type: "button", "aria-pressed": String(l === level), onclick: () => { level = l; limit = 100; draw(); } }, (l === "all" ? "ทั้งหมด" : l) + " ", h("b", cnt(l).toLocaleString("en-US")))));
        const list = b.filter((r) => level === "all" || r.level === level);
        if (!list.length) return box.replaceChildren(empty({ icon: "log", title: rows.length ? "ไม่พบ log ที่ตรงเงื่อนไข" : "ยังไม่มี log", next: rows.length ? "ลองขยายช่วงเวลาหรือล้างตัวกรอง" : "log ถูกเขียนจากหน้าเว็บนี้ ถ้าตั้งค่า Supabase แล้วจะส่งไปที่ตาราง levana_log (โปรเจกต์ฟรีถูกพักเมื่อไม่มีการใช้งาน 7 วัน)" }));
        const shown = list.slice(0, limit);
        const trs = [];
        shown.forEach((r) => {
          const l = LV[r.level] || LV.info, jr = h("tr", { className: "jr", hidden: true }, h("td", { colspan: "8" }, h("pre", JSON.stringify(r, null, 1))));
          const xb = h("button", { className: "xbtn", type: "button", "aria-expanded": "false", "aria-label": "ดูรายละเอียด JSON", onclick: () => { const o = xb.getAttribute("aria-expanded") === "true"; xb.setAttribute("aria-expanded", String(!o)); jr.hidden = o; } }, icon("chev"));
          trs.push(h("tr", { className: "r" }, h("td", { className: "mono" }, when(r)), h("td", h("span", { className: "lv " + l[1] }, icon(l[0]), r.level)), h("td", { className: "e mono", style: "font-size:var(--t-small)" }, r.event), h("td", { className: "rt mono" }, r.route || ""), h("td", { className: "dv" }, devLabel(r.device)), h("td", { className: "tz mono" }, r.tz || ""), h("td", { className: "lmsg" }, r.message || ""), h("td", { className: "x" }, xb)), jr);
        });
        box.replaceChildren(h("div", { className: "tw" }, h("table", { className: "log thsticky" }, h("thead", h("tr", ["เวลา", "ระดับ", "Event", "Route", "อุปกรณ์", "Timezone", "ข้อความ"].map((t) => h("th", t)), h("th", h("span", { className: "sr" }, "ขยาย")))), h("tbody", trs))),
          h("div", { className: "logfoot" }, h("span", { className: "sub" }, "แสดง " + shown.length + " จาก " + list.length), list.length > shown.length ? btn("แสดงเพิ่ม", { onclick: () => { limit += 100; draw(); } }) : null));
      };
      input.oninput = () => { limit = 100; draw(); };
      draw();
      const exportBtn = h("button", { className: "btn", type: "button", onclick: () => {
        const list = base().filter((r) => level === "all" || r.level === level);
        const url = URL.createObjectURL(new Blob([K.toJsonl(list)], { type: "application/x-ndjson" }));
        const a = h("a", { href: url, download: "levana-log.jsonl" });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        KeshApp.ev("info", "export_jsonl", "ส่งออก JSONL", { rows: list.length });
      } }, icon("dl"), "ส่งออก JSONL");
      const status = !K.configured() ? "เก็บในเครื่องนี้เท่านั้น (ยังไม่ตั้งค่า Supabase)" : "Supabase · " + (st.lastWriteAt ? "เขียนล่าสุด " + new Date(st.lastWriteAt).toTimeString().slice(0, 8) : "ยังไม่เคยเขียน") + (st.queue ? " · ค้างส่ง " + st.queue : "");
      let signin = null;
      if (K.configured() && !remote) {
        const em = h("input", { type: "email", placeholder: "อีเมลของ Rin", "aria-label": "อีเมล", autocomplete: "email" }), msg = h("span", { className: "sub", "aria-live": "polite" });
        signin = h("form", { className: "lflt", id: "logSignin", onsubmit: async (e) => { e.preventDefault(); if (!em.value.trim()) return; msg.textContent = "กำลังส่ง…"; try { msg.textContent = (await K.sendMagicLink(em.value.trim())) ? "ส่งลิงก์แล้ว เปิดอีเมลบนเครื่องนี้" : "ส่งไม่สำเร็จ"; } catch (x) { msg.textContent = "ส่งไม่สำเร็จ (network)"; } } },
          h("label", { className: "field" }, icon("key"), em), h("button", { className: "btn", type: "submit" }, "เข้าสู่ระบบเพื่ออ่านย้อนหลัง"), msg);
      }
      return {
        h1: "Log", noFresh: true, right: h("div", { className: "right" }, h("span", { id: "logStatus" }, status), exportBtn),
        nodes: [note ? KeshUI.banner("อ่าน log ไม่ครบ", note) : null, signin,
          h("div", { className: "lflt" }, h("label", { className: "field" }, icon("search"), input), fil, sel("ช่วงเวลา", RANGES.map((r) => [r[0], r[1]]), range, (v) => { range = v; }), sel("อุปกรณ์", [["all", "ทุกอุปกรณ์"]].concat(devs.map((d) => [d, d])), dev, (v) => { dev = v; })), box]
      };
    }
  };
})();
