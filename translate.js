const KeshTr = (() => {
  const SKIP = "pre, code, kbd, samp, script, style, [translate=no]";
  const thaiRatio = (text) => {
    const letters = String(text || "").replace(/[\s\d\p{P}\p{S}]/gu, "");
    if (!letters) return 0;
    return (letters.match(/[฀-๿]/g) || []).length / letters.length;
  };
  const direction = (text) => (thaiRatio(text) > 0.2 ? { source: "th", target: "en", label: "แปลเป็น EN" } : { source: "en", target: "th", label: "แปลเป็น TH" });
  const translatable = (t) => /[^\s\d\p{P}\p{S}]/u.test(String(t || ""));
  const skipped = (node, matches) => { for (let n = node.parentNode || node.parentElement; n; n = n.parentNode || n.parentElement) if (matches(n)) return true; return false; };
  const pickNodes = (nodes, matches) => nodes.filter((n) => translatable(n.nodeValue) && !skipped(n, matches));
  const cacheKey = (dir, text) => dir + "|" + text;
  const lru = (obj, key, val, cap) => { delete obj[key]; obj[key] = val; const ks = Object.keys(obj); for (let i = 0; i < ks.length - cap; i++) delete obj[ks[i]]; };
  const sha1 = async (text) => {
    const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
  };
  const CAP = 1500, LSK = "levana_tr_v1";
  const store = () => { try { return JSON.parse(localStorage.getItem(LSK)) || {}; } catch (e) { return {}; } };
  const save = (o) => { try { localStorage.setItem(LSK, JSON.stringify(o)); } catch (e) {} };
  const reason = () => !("Translator" in self) ? "no_api" : matchMedia("(pointer:coarse)").matches ? "mobile" : null;
  const available = () => reason() === null;
  let warned = false;
  const noteUnavailable = () => { const r = reason(); if (r && !warned) { warned = true; if (window.KeshApp) KeshApp.ev("warn", "translate_unavailable", "Translator ไม่พร้อมใช้", { reason: r }); } };
  const memo = {};
  const originals = new Map();

  async function toggle(root, key, btn, opts) {
    if (originals.has(root)) {
      root.replaceChildren(...originals.get(root));
      originals.delete(root);
      btn.setAttribute("aria-pressed", "false");
      btn.querySelector("span").textContent = btn.dataset.label;
      return;
    }
    const dir = direction(root.textContent), dk = dir.source + ">" + dir.target;
    btn.dataset.label = btn.querySelector("span").textContent;
    const t0 = performance.now();
    let tr = memo[dk];
    if (!tr) {
      tr = memo[dk] = await Translator.create({ sourceLanguage: dir.source, targetLanguage: dir.target, monitor(m) { m.addEventListener("downloadprogress", (e) => { btn.querySelector("span").textContent = "ดาวน์โหลดโมเดล " + Math.round(e.loaded * 100) + "%"; }); } });
    }
    originals.set(root, [...root.childNodes].map((n) => n.cloneNode(true)));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const all = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) all.push(n);
    const nodes = pickNodes(all, (n) => n.nodeType === 1 && n.matches(SKIP));
    const cache = store();
    let hits = 0, i = 0;
    const worker = async () => {
      while (i < nodes.length) {
        const n = nodes[i++], text = n.nodeValue, k = cacheKey(dk, await sha1(text));
        let out = cache[k];
        if (out != null) hits++; else { out = await tr.translate(text); lru(cache, k, out, CAP); }
        if (n.isConnected) n.nodeValue = text.match(/^\s*/)[0] + out.trim() + text.match(/\s*$/)[0];
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    save(cache);
    btn.setAttribute("aria-pressed", "true");
    btn.querySelector("span").textContent = "แสดงต้นฉบับ (" + dir.source.toUpperCase() + ")";
    if (window.KeshApp) KeshApp.ev("info", "translate_used", "แปลเอกสาร", { path: key, dir: dk, nodes: nodes.length, ms: Math.round(performance.now() - t0), cacheHits: hits });
  }
  return { SKIP, thaiRatio, direction, translatable, pickNodes, cacheKey, lru, sha1, available, reason, noteUnavailable, toggle, reset: () => originals.clear() };
})();
if (typeof module !== "undefined") module.exports = KeshTr;
