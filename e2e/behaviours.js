// Dev-only behaviour checks: NODE_PATH=<global node_modules> node e2e/behaviours.js
const { chromium } = require("playwright");
const http = require("node:http"), fs = require("node:fs"), path = require("node:path");
const F = require("./fixtures");
const ROOT = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
const server = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
  fs.readFile(p, (e, b) => e ? (r.writeHead(404), r.end()) : (r.writeHead(200, { "content-type": MIME[path.extname(p)] || "text/plain" }), r.end(b)));
});
const results = [];
const check = (name, ok, info) => { results.push([name, !!ok]); console.log((ok ? "ok   " : "FAIL ") + name + (ok ? "" : " :: " + info)); };
(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = "http://localhost:" + server.address().port + "/";
  const browser = await chromium.launch();
  const open = async (width, mode, hash, { gql, tokenless } = {}) => {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, colorScheme: mode || "light" });
    const state = { mode: gql || "ok" };
    if (!tokenless) await ctx.addInitScript(() => { if (!localStorage.getItem("levana_token")) localStorage.setItem("levana_token", "ghp_test"); });
    await ctx.route("https://api.github.com/**", (r) => {
      const req = r.request(), u = req.url();
      if (req.method() === "OPTIONS") return r.fulfill({ status: 204, headers: F.CORS });
      const hd = Object.assign({ "x-ratelimit-remaining": "4990", "content-type": "application/json" }, F.CORS);
      if (u.endsWith("/graphql")) {
        if (state.mode === "401") return r.fulfill({ status: 401, headers: hd, body: JSON.stringify({ message: "Bad credentials" }) });
        if (state.mode === "502") return r.fulfill({ status: 502, headers: hd, body: "{}" });
        return r.fulfill({ status: 200, headers: hd, body: JSON.stringify({ data: state.mode === "empty" ? F.empty() : F.data() }) });
      }
      if (u.endsWith("/rate_limit")) return state.mode === "401" ? r.fulfill({ status: 401, headers: hd, body: JSON.stringify({ message: "Bad credentials" }) }) : r.fulfill({ status: 200, headers: hd, body: "{}" });
      r.fulfill({ status: 200, headers: hd, body: "[]" });
    });
    const page = await ctx.newPage();
    await page.goto(base + hash);
    await page.waitForSelector("#main[aria-busy=false]", { timeout: 15000 });
    return { page, state, ctx };
  };
  let t = await open(390, "light", "#agents");
  check("agents CHECK collapsed at 390", !(await t.page.$eval("details.chk", (d) => d.open)));
  await t.page.click("details.chk summary");
  check("agents CHECK expands", await t.page.$eval("details.chk", (d) => d.open) && await t.page.isVisible(".op[data-ag=bochek]"));
  check("agents over-threshold card has .warn", await t.page.$(".op.warn[data-ag=bochek]"));
  check("agents warn card has icon + text", (await t.page.$eval(".op.warn .op-body dl dd.bad-t", (e) => e.innerHTML)).includes("svg"));
  await t.ctx.close();
  t = await open(1440, "light", "#agents");
  check("agents CHECK open at 1440, summary hidden", await t.page.$eval("details.chk", (d) => d.open) && !(await t.page.isVisible("details.chk summary")));
  await t.ctx.close();

  t = await open(390, "light", "#run/" + F.ago(0) + "-levana-redesign");
  check("run: no BOUNCE panel at 390", !(await t.page.isVisible(".bounce-d")));
  check("run: inline bounce reason visible", await t.page.isVisible(".tl .why"));
  check("run: reasons footer visible at 390", await t.page.isVisible(".reasons-m"));
  await t.ctx.close();
  t = await open(1440, "light", "#run/" + F.ago(0) + "-levana-redesign");
  check("run: BOUNCE card at 1440, footer hidden", await t.page.isVisible(".bounce-d") && !(await t.page.isVisible(".reasons-m")));
  await t.ctx.close();

  for (const p of ["today", "agents"]) { t = await open(390, "light", "#" + p); const h = await t.page.evaluate(() => document.documentElement.scrollHeight); check(p + " height at 390 <= 2110 (" + h + ")", h <= 2110); await t.ctx.close(); }
  t = await open(390, "light", "#run/" + F.ago(0) + "-levana-redesign"); { const h = await t.page.evaluate(() => document.documentElement.scrollHeight); check("run height at 390 <= 2110 (" + h + ")", h <= 2110); } await t.ctx.close();

  t = await open(390, "light", "#today");
  check("today: reserved segment present with next-agent label", (await t.page.textContent(".legend")).includes("จองให้"));
  check("today: reset marked ประมาณ", (await t.page.textContent(".strip")).includes("ประมาณ"));
  check("today: api status ใช้ได้", (await t.page.textContent("#api-status")).includes("ใช้ได้"));
  const before = await t.page.evaluate(() => KeshApi.apiStatus.checkedAt);
  await t.page.waitForTimeout(20);
  await t.page.click("#api-status .iconbtn");
  await t.page.waitForFunction((b) => KeshApi.apiStatus.checkedAt > b && !document.querySelector("#api-status .iconbtn").disabled, before);
  check("recheck updates checkedAt", true);
  t.state.mode = "502";
  await t.page.click("header .iconbtn[aria-label=รีเฟรชข้อมูล]");
  await t.page.waitForSelector(".banner[role=alert]", { timeout: 15000 });
  check("502: banner shown, cached panels kept", (await t.page.isVisible(".queue")) && (await t.page.textContent("[role=alert]")).includes("ข้อมูลด้านล่างเป็นของเวลา"));
  check("502: panel as-of suffix", (await t.page.$eval(".blk:not(.keep) .hd h2", (e) => getComputedStyle(e, "::after").content)).includes("ข้อมูล"));
  t.state.mode = "ok";
  await t.page.click(".banner .btn");
  await t.page.waitForSelector(".banner[role=alert]", { state: "detached" });
  check("retry button recovers", true);
  await t.page.click("header .iconbtn[aria-label^=สลับ]");
  const m1 = await t.page.evaluate(() => document.documentElement.dataset.mode);
  await t.page.reload(); await t.page.waitForSelector("#main[aria-busy=false]");
  check("theme toggle persists", m1 === "dark" && (await t.page.evaluate(() => document.documentElement.dataset.mode)) === "dark");
  await t.ctx.close();

  t = await open(390, "light", "#today", { gql: "401" }).catch(() => null);
  check("401: token form with banner", t && (await t.page.isVisible(".tokenform")) && (await t.page.isVisible(".banner[role=alert]")));
  if (t) await t.ctx.close();
  t = await open(390, "light", "#today", { gql: "empty" });
  check("empty repo: Today shows empty queue + 00 tab", (await t.page.textContent(".queue")).includes("ยังไม่มีงานรอคุณ") && (await t.page.textContent(".queue .tab")).includes("00"));
  await t.ctx.close();
  t = await open(390, "light", "#today", { tokenless: true });
  check("no token: form shown", await t.page.isVisible(".tokenform"));
  await t.ctx.close();
  t = await open(390, "light", "#errors");
  await t.page.evaluate(() => localStorage.setItem("levana_errlog", JSON.stringify([{ time: new Date().toISOString(), path: "graphql", status: 502, code: "http", message: "bad gateway" }, { time: new Date().toISOString(), path: "graphql", status: 429, code: "rate", message: "", retryAfter: 5 }])));
  await t.page.reload(); await t.page.waitForSelector("#main[aria-busy=false]");
  check("errors: latest + history + clear", (await t.page.isVisible(".errcode")) && (await t.page.isVisible(".hist")));
  await t.page.click("text=ล้าง log");
  check("errors: clear empties log", (await t.page.textContent("#main")).includes("ไม่มี error"));
  await t.ctx.close();
  await browser.close(); server.close();
  const bad = results.filter((r) => !r[1]);
  console.log(bad.length ? bad.length + " FAILED" : "ALL " + results.length + " OK");
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
