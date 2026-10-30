const KeshParse = (() => {
  const KNOWN_AGENTS = ["kesh", "rin", "rosh", "cheker", "amet", "zekher", "bona", "kotev", "bochek", "tak", "oseh", "tzayar"];

  function normalizeAgent(text) {
    const m = /[A-Za-z]+/.exec(String(text == null ? "" : text).trim());
    if (!m) return "other";
    const id = m[0].toLowerCase();
    return KNOWN_AGENTS.indexOf(id) >= 0 ? id : "other";
  }

  function splitTop(text, seps) {
    const out = [];
    let depth = 0;
    let cur = "";
    for (const ch of String(text)) {
      if (ch === "(") depth++;
      else if (ch === ")" && depth > 0) depth--;
      if (depth === 0 && seps.indexOf(ch) >= 0) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function parseFlow(text) {
    const src = String(text == null ? "" : text).trim();
    if (!src) return [];
    return splitTop(src, ["→"]).map((g) => {
      const parts = splitTop(g, ["∥"]);
      const members = parts
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const open = p.indexOf("(");
          const close = p.lastIndexOf(")");
          const before = open >= 0 ? p.slice(0, open) : p;
          const label = open >= 0 && close > open ? p.slice(open + 1, close).trim() : "";
          const tm = /[×x]\s*(\d+)/i.exec(before);
          const name = before.replace(/[×x]\s*\d+/i, "").trim();
          return { agent: normalizeAgent(name), label, times: tm ? parseInt(tm[1], 10) : 1 };
        });
      return { parallel: parts.length > 1, members };
    });
  }

  function splitRow(line) {
    let s = String(line).trim();
    if (s.startsWith("|")) s = s.slice(1);
    if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
    const cells = [];
    let cur = "";
    let inTick = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "`") {
        inTick = !inTick;
        cur += ch;
      } else if (ch === "\\" && s[i + 1] === "|") {
        cur += "|";
        i++;
      } else if (ch === "|" && !inTick) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  }

  function parseTokens(cell) {
    const s = String(cell == null ? "" : cell).trim();
    if (!s || /^[–—-]+$/.test(s)) return { value: null, cumulative: false, note: "" };
    const m = /^~?([\d,]+)\s*(\(\s*สะสม\s*\))?$/.exec(s);
    if (m) {
      const v = parseInt(m[1].replace(/,/g, ""), 10);
      if (!isNaN(v)) return { value: v, cumulative: !!m[2], note: "" };
    }
    return { value: null, cumulative: false, note: s };
  }

  function parseFromTo(cell) {
    const s = String(cell || "").trim();
    const open = s.indexOf("(");
    const head = (open >= 0 ? s.slice(0, open) : s).trim();
    const paren = open >= 0 ? s.slice(open) : "";
    const bm = /ตีกลับรอบ\s*(\d+)/.exec(s);
    const arrow = head.indexOf("→");
    let from;
    let to;
    let self = false;
    if (arrow >= 0) {
      from = normalizeAgent(head.slice(0, arrow));
      to = normalizeAgent(head.slice(arrow + 1));
    } else {
      from = to = normalizeAgent(head);
      self = true;
    }
    return {
      from,
      to,
      self,
      out_of_flow: /นอก\s*flow/i.test(paren),
      bounce_round: bm ? parseInt(bm[1], 10) : 0,
      bounce_new_cause: !!bm && /สาเหตุใหม่/.test(s),
      annotation: paren
    };
  }

  function isSeparatorRow(cells) {
    return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));
  }

  function parseHandoffTable(lines) {
    const rows = [];
    let headerSeen = false;
    for (const raw of lines) {
      const line = String(raw).trim();
      if (!line.startsWith("|")) continue;
      const cells = splitRow(line);
      if (!headerSeen) {
        headerSeen = true;
        continue;
      }
      if (isSeparatorRow(cells)) continue;
      while (cells.length < 5) cells.push("");
      const n = cells[0];
      const ft = parseFromTo(cells[1]);
      const reason = cells[2];
      const tokCell = cells[cells.length - 1];
      const result = cells.length > 5 ? cells.slice(3, -1).join(" | ") : cells[3];
      const tk = parseTokens(tokCell);
      rows.push({
        seq: rows.length + 1,
        n,
        from: ft.from,
        to: ft.to,
        self: ft.self,
        reason,
        result: result || null,
        status: result ? "done" : "running",
        bounce_round: ft.bounce_round,
        bounce_new_cause: ft.bounce_new_cause,
        out_of_flow: ft.out_of_flow,
        annotation: ft.annotation,
        tokens: tk.value,
        tokens_cumulative: tk.cumulative,
        tokens_note: tk.note
      });
    }
    return rows;
  }

  function computeTokens(handoffs) {
    const perAgent = {};
    const deltas = [];
    const last = {};
    let total = 0;
    let any = false;
    let missing = 0;
    for (const h of handoffs || []) {
      if (h.tokens == null) {
        deltas.push(null);
        if (!h.self) missing++;
        continue;
      }
      let d = h.tokens;
      if (h.tokens_cumulative && last[h.to] != null) d = h.tokens - last[h.to];
      last[h.to] = h.tokens;
      deltas.push(d);
      perAgent[h.to] = (perAgent[h.to] || 0) + d;
      total += d;
      any = true;
    }
    return { total: any ? total : null, perAgent, deltas, partial: missing > 0 };
  }

  function parseFrontmatter(md) {
    const text = String(md == null ? "" : md).replace(/\r\n?/g, "\n");
    const m = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
    if (!m) return {};
    const out = {};
    let lastKey = null;
    for (const line of m[1].split("\n")) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const li = /^\s+-\s+(.*)$|^-\s+(.*)$/.exec(line);
      if (li && lastKey) {
        if (!Array.isArray(out[lastKey])) out[lastKey] = [];
        out[lastKey].push(unquote(li[1] != null ? li[1] : li[2]));
        continue;
      }
      const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
      if (kv) {
        lastKey = kv[1];
        out[lastKey] = kv[2] === "" ? "" : unquote(kv[2]);
      }
    }
    return out;
  }

  function unquote(v) {
    const s = String(v).trim();
    if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') return s.slice(1, -1).replace(/\\(["\\])/g, "$1");
    if (s.length >= 2 && s[0] === "'" && s[s.length - 1] === "'") return s.slice(1, -1).replace(/''/g, "'");
    return s;
  }

  function parseList(value) {
    if (Array.isArray(value)) return value.slice();
    return String(value == null ? "" : value)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function countLessons(md) {
    if (md == null) return 0;
    let n = 0;
    for (const line of String(md).split(/\r?\n/)) if (/^\s*-\s+/.test(line)) n++;
    return n;
  }

  function parseRunLog(md, filename) {
    const text = String(md == null ? "" : md).replace(/\r\n?/g, "\n");
    const lines = text.split("\n");
    const base = String(filename || "").split(/[\\/]/).pop().replace(/\.md$/i, "");
    const tm = /^#\s+Run:\s*(.+?)\s*(?:\((\d{4}-\d{2}-\d{2})\))?\s*$/m.exec(text);
    const dateFromName = /^(\d{4}-\d{2}-\d{2})/.exec(base);
    const meta = {};
    const sections = {};
    let current = null;
    let sectionLines = [];
    let handoffLines = [];
    let inHandoffs = false;
    let tableState = 0;

    const flush = () => {
      if (current != null) sections[current] = sectionLines.join("\n").trim();
    };

    for (const line of lines) {
      const h2 = /^##\s+(.+?)\s*$/.exec(line);
      if (h2) {
        flush();
        current = h2[1];
        sectionLines = [];
        inHandoffs = /^Handoffs?\b/i.test(current);
        tableState = 0;
        continue;
      }
      if (current == null) {
        const mm = /^\*\*(.+?):\*\*\s*(.*)$/.exec(line);
        if (mm && !(mm[1] in meta)) meta[mm[1]] = mm[2].trim();
        continue;
      }
      sectionLines.push(line);
      if (inHandoffs && tableState < 2) {
        const t = line.trim();
        if (/^#/.test(t)) tableState = 2;
        else if (t.startsWith("|")) {
          tableState = 1;
          handoffLines.push(line);
        } else if (t && tableState === 1) tableState = 2;
      }
    }
    flush();

    const flowKey = Object.keys(meta).find((k) => k.startsWith("Flow ที่อนุมัติ"));
    const flow_text = flowKey ? meta[flowKey] : "";
    const handoffs = parseHandoffTable(handoffLines);
    const tok = computeTokens(handoffs);

    const pendKey = Object.keys(sections).find((k) => k.startsWith("ค้าง"));
    const pending_items = [];
    if (pendKey) {
      for (const l of sections[pendKey].split("\n")) {
        const im = /^\s*(?:[-*]|\d+[.)])\s+(.*\S)\s*$/.exec(l);
        if (im) pending_items.push(im[1]);
      }
    }
    const dm = /tokens รวม[^:]*:\s*~?([\d,]+)/.exec(text);
    const nonEmpty = (v) => v != null && String(v).trim() !== "";
    const last = handoffs[handoffs.length - 1];
    const finished = Object.keys(sections).some((k) => /^(ผลสุดท้าย|สรุป|ผล|สถานะ)/.test(k)) ||
      nonEmpty(meta["ผล"]) ||
      (handoffs.length > 0 && handoffs.every((h) => nonEmpty(h.result)));
    const status = finished ? "done" : !handoffs.length || !nonEmpty(last.result) ? "open" : "done";

    return {
      run_id: base,
      title: tm ? tm[1] : base,
      date: tm && tm[2] ? tm[2] : dateFromName ? dateFromName[1] : null,
      meta,
      task: meta["คำขอ"] || "",
      flow_text,
      flow: parseFlow(flow_text),
      handoffs,
      sections,
      pending_items,
      declared_total: dm ? parseInt(dm[1].replace(/,/g, ""), 10) : null,
      tokens_total: tok.total,
      status,
      has_followups: pending_items.length > 0,
      has_title: !!tm,
      bounce_count: handoffs.filter((h) => h.bounce_round > 0).length
    };
  }

  function isRun(name, run) {
    if (String(name || "").startsWith("_")) return false;
    if (!run) return false;
    return run.handoffs.length > 0 || !!run.has_title;
  }

  function resultText(result) {
    if (result == null) return "";
    if (typeof result === "string") return result;
    if (typeof result.payload === "string") return result.payload;
    const items = Array.isArray(result.content) ? result.content : [];
    return items
      .filter((c) => c && c.type === "text" && typeof c.text === "string")
      .map((c) => c.text)
      .join("\n");
  }

  function balancedSpan(text, start) {
    const open = text[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inStr = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (ch === "\\") i++;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) return ch === close ? text.slice(start, i + 1) : null;
        if (depth < 0) return null;
      }
    }
    return null;
  }

  function passes(expect, value) {
    if (typeof expect !== "function") return true;
    try {
      return !!expect(value);
    } catch (e) {
      return false;
    }
  }

  function extractPayload(result, expect) {
    if (result != null && typeof result === "object") {
      if (result.structuredContent && typeof result.structuredContent === "object" && passes(expect, result.structuredContent)) {
        return { ok: true, data: result.structuredContent };
      }
      if (result.payload && typeof result.payload === "object" && passes(expect, result.payload)) {
        return { ok: true, data: result.payload };
      }
    }
    const text = resultText(result);
    const trimmed = text.trim();
    if (trimmed) {
      try {
        const v = JSON.parse(trimmed);
        if (v !== null && typeof v === "object" && passes(expect, v)) return { ok: true, data: v };
      } catch (e) {
        /* fall through to scan */
      }
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch !== "{" && ch !== "[") continue;
        const span = balancedSpan(text, i);
        if (!span) continue;
        let v;
        try {
          v = JSON.parse(span);
        } catch (e) {
          continue;
        }
        if (v !== null && typeof v === "object" && passes(expect, v)) return { ok: true, data: v };
      }
    }
    return { ok: false, raw: text };
  }

  function decodeBase64Utf8(b64) {
    const clean = String(b64).replace(/\s+/g, "");
    if (typeof Buffer !== "undefined") return Buffer.from(clean, "base64").toString("utf8");
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  function extractFileText(result) {
    if (result == null) return null;
    if (typeof result === "string") return result;
    const items = Array.isArray(result.content) ? result.content : [];
    for (const c of items) {
      if (c && c.type === "resource" && c.resource && typeof c.resource.text === "string") return c.resource.text;
    }
    for (const c of items) {
      if (c && c.type === "resource" && c.resource && typeof c.resource.blob === "string") return decodeBase64Utf8(c.resource.blob);
    }
    for (const p of [result.structuredContent, result.payload]) {
      if (p && typeof p === "object" && typeof p.content === "string") {
        return p.encoding === "base64" ? decodeBase64Utf8(p.content) : p.content;
      }
    }
    const t = resultText(result);
    return t || null;
  }

  function extractDir(result) {
    const r = extractPayload(result, (v) => Array.isArray(v));
    if (!r.ok) return null;
    return r.data
      .filter((e) => e && typeof e === "object" && typeof e.name === "string")
      .map((e) => ({ name: e.name, path: e.path || e.name, type: e.type, sha: e.sha }));
  }

  function clip(s, n) {
    const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
    return t.length > n ? t.slice(0, n) + "…" : t;
  }

  function contentText(content) {
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return "";
    return content
      .map((b) => {
        if (typeof b === "string") return b;
        if (b && typeof b.text === "string") return b.text;
        if (b && typeof b.content === "string") return b.content;
        if (b && Array.isArray(b.content)) return contentText(b.content);
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  function findNext(text) {
    const m = /^\s*NEXT:\s*([A-Za-z]+)\s*(?:[—–-]+\s*(.*))?$/m.exec(String(text || ""));
    if (!m) return null;
    return { agent: normalizeAgent(m[1]), reason: m[2] ? m[2].trim() : "" };
  }

  function flowFromEvents(events) {
    const items = [];
    const list = Array.isArray(events) ? events : [];
    for (const ev of list) {
      if (!ev || typeof ev !== "object") continue;
      const kind = ["user", "assistant", "result", "system"].find((k) => ev[k] != null) || ev.kind || ev.type || "unknown";
      const payload = ev[kind] != null && typeof ev[kind] === "object" ? ev[kind] : ev;
      const inner = payload.internal_anthropic_catchall || payload;
      const msg = inner.message || payload.message || {};
      const at = ev.created_at || inner.timestamp || null;
      const base = { at, eventKind: kind };

      if (kind === "assistant") {
        const blocks = Array.isArray(msg.content) ? msg.content : [];
        let used = false;
        for (const b of blocks) {
          if (b && b.type === "tool_use" && (b.name === "Agent" || b.name === "Task")) {
            const inp = b.input || {};
            const sub = inp.subagent_type || "";
            items.push({
              ...base,
              kind: "dispatch",
              agent: normalizeAgent(sub),
              text: "ส่งให้ " + (sub || "agent") + (inp.description ? ": " + clip(inp.description, 140) : "")
            });
            used = true;
          }
        }
        if (!used) {
          const t = blocks
            .filter((b) => b && b.type === "text")
            .map((b) => b.text)
            .join(" ");
          const tools = blocks.filter((b) => b && b.type === "tool_use").map((b) => b.name);
          items.push({ ...base, kind: "event", text: clip(t || (tools.length ? "tool: " + tools.join(", ") : ""), 140) });
        }
        continue;
      }

      let text = contentText(msg.content);
      if (!text && typeof inner.result === "string") text = inner.result;
      if (!text && typeof payload.result === "string") text = payload.result;
      const nx = findNext(text);
      const origin = inner.origin || payload.origin || null;
      if (kind === "user" && origin && origin.kind === "peer") {
        items.push({ ...base, kind: "return", agent: normalizeAgent(origin.name), text: clip(text, 140), next: nx });
      } else if (nx) {
        items.push({ ...base, kind: "handoff_end", agent: nx.agent, text: clip(nx.reason, 140), next: nx });
      } else {
        items.push({ ...base, kind: "event", text: clip(text, 140) });
      }
    }
    return items;
  }

  function weekStart(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    const dow = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dow);
    return d.toISOString().slice(0, 10);
  }

  function runDate(r) {
    return r.date || (r.started_at ? String(r.started_at).slice(0, 10) : null);
  }

  function aggregate(runs, issues, agents, lessons) {
    const rs = (runs || []).slice().sort((a, b) => String(runDate(a) || "").localeCompare(String(runDate(b) || "")));
    const g1 = rs.slice(-12).map((r) => {
      const t = computeTokens(r.handoffs || []);
      const fromDb = r.db && r.tokens_total != null;
      const total = fromDb ? r.tokens_total : t.total != null ? t.total : r.tokens_total != null ? r.tokens_total : null;
      return { run_id: r.run_id, date: runDate(r), total, partial: fromDb ? false : t.partial };
    });

    const perAgent = {};
    const bounceAgents = {};
    const usage = {};
    let selfCount = 0;
    let outOfFlow = 0;
    let rinFeedback = 0;
    const g6 = [];
    for (const r of rs) {
      const hs = r.handoffs || [];
      const t = computeTokens(hs);
      for (const k of Object.keys(t.perAgent)) perAgent[k] = (perAgent[k] || 0) + t.perAgent[k];
      let bounces = 0;
      for (const h of hs) {
        usage[h.to] = (usage[h.to] || 0) + 1;
        if (h.self) selfCount++;
        if (h.out_of_flow) outOfFlow++;
        if (h.from === "rin") rinFeedback++;
        if (h.bounce_round > 0) {
          bounces++;
          const b = bounceAgents[h.to] || (bounceAgents[h.to] = { agent: h.to, original: 0, newCause: 0, causes: [] });
          if (h.bounce_new_cause) b.newCause++;
          else b.original++;
          b.causes.push({ run_id: r.run_id, round: h.bounce_round, newCause: h.bounce_new_cause, reason: h.reason });
        }
      }
      let n = hs.length;
      if (!n && typeof r.handoff_count === "number" && r.handoff_count > 0) {
        n = r.handoff_count;
        bounces = r.bounce_count || 0;
        for (const st of r.steps || []) {
          if (st && st.status === "bounced" && st.agent) {
            const a = normalizeAgent(st.agent);
            const b = bounceAgents[a] || (bounceAgents[a] = { agent: a, original: 0, newCause: 0, causes: [] });
            b.original++;
            b.causes.push({ run_id: r.run_id, round: 1, newCause: false, reason: st.label });
          }
        }
      }
      g6.push({ run_id: r.run_id, date: runDate(r), rate: n ? bounces / n : null, bounces, handoffs: n });
    }

    const weeks = {};
    const wk = (w) => weeks[w] || (weeks[w] = { week: w, runs: { done: 0, open: 0 }, opened: 0, closed: 0 });
    for (const r of rs) {
      const w = weekStart(runDate(r));
      if (!w) continue;
      const st = r.status === "done" ? "done" : "open";
      wk(w).runs[st]++;
    }
    for (const i of issues || []) {
      const o = weekStart(i.created_at);
      if (o) wk(o).opened++;
      const c = weekStart(i.closed_at);
      if (c) wk(c).closed++;
    }
    const g4 = Object.keys(weeks)
      .sort()
      .map((k) => weeks[k]);

    const ids = {};
    for (const a of agents || []) ids[a.name || a.id] = true;
    for (const k of Object.keys(usage)) if (k !== "other" && k !== "rin") ids[k] = true;
    const lc = lessons || {};
    const g5 = Object.keys(ids)
      .sort()
      .map((a) => ({ agent: a, handoffs: usage[a] || 0, lessons: lc[a] || 0 }));

    return {
      g1,
      g2: Object.keys(perAgent)
        .map((a) => ({ agent: a, tokens: perAgent[a] }))
        .sort((x, y) => y.tokens - x.tokens),
      g3: Object.keys(bounceAgents).map((k) => bounceAgents[k]),
      g4,
      g5,
      g6,
      g7: { self: selfCount, out_of_flow: outOfFlow, rin_feedback: rinFeedback }
    };
  }

  return {
    KNOWN_AGENTS,
    normalizeAgent,
    parseFlow,
    splitRow,
    parseTokens,
    parseHandoffTable,
    computeTokens,
    parseFrontmatter,
    parseList,
    countLessons,
    parseRunLog,
    isRun,
    extractPayload,
    extractFileText,
    extractDir,
    flowFromEvents,
    aggregate
  };
})();
if (typeof module !== "undefined") module.exports = KeshParse;
