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
  let t = await open(390, "light", "#/");
  check("390: sidebar hidden, header title shown", !(await t.page.isVisible("#side")) && (await t.page.textContent("#mtitle")) === "สรุป");
  await t.page.click("#menuBtn");
  check("drawer opens, aria-expanded true", (await t.page.isVisible("#side")) && (await t.page.getAttribute("#menuBtn", "aria-expanded")) === "true");
  check("drawer has 6 links, no counts", (await t.page.$$eval("#nav a", (a) => a.length)) === 6 && !(await t.page.$("#nav .cnt")));
  for (let i = 0; i < 12; i++) await t.page.keyboard.press("Tab");
  check("drawer traps Tab", await t.page.evaluate(() => document.getElementById("side").contains(document.activeElement)));
  await t.page.keyboard.press("Escape");
  check("Esc closes drawer, focus returns to menu button", !(await t.page.isVisible("#side")) && (await t.page.evaluate(() => document.activeElement.id)) === "menuBtn");
  await t.page.click("#menuBtn");
  await t.page.click("#scrim", { position: { x: 380, y: 400 } });
  check("scrim click closes drawer", !(await t.page.isVisible("#side")));
  await t.page.click("#menuBtn");
  await t.page.click("#nav a[href='#/runs']");
  await t.page.waitForSelector("#main[aria-busy=false]");
  check("nav click routes and closes drawer", !(await t.page.isVisible("#side")) && (await t.page.textContent("#mtitle")) === "Runs");
  await t.ctx.close();

  t = await open(1440, "light", "#/");
  check("1440: sidebar persistent, header hidden", (await t.page.isVisible("#side")) && !(await t.page.isVisible(".mhead")) && !(await t.page.isVisible("#menuBtn")));
  check("1440: aria-current on Summary", (await t.page.getAttribute("#nav a[aria-current=page]", "href")) === "#/");
  for (const [from, to] of [["#/today", "#/"], ["#/usage", "#/"], ["#/more", "#/"], ["#/errors", "#/log"], ["#/lessons", "#/files/lessons"], ["#/lessons/kotev", "#/files/lessons/kotev.md"], ["#/nowhere", "#/"]]) {
    await t.page.evaluate((h) => { location.hash = h; }, from);
    await t.page.waitForFunction((x) => location.hash === x, to);
    check("redirect " + from + " -> " + to, true);
  }
  await t.ctx.close();

  t = await open(390, "light", "#/", { tokenless: true });
  check("no token: form + get token link opens new tab safely", (await t.page.isVisible(".tokenform")) && (await t.page.getAttribute(".tokenform a[href*=personal-access-tokens]", "rel")) === "noopener noreferrer" && (await t.page.getAttribute(".tokenform a[href*=personal-access-tokens]", "target")) === "_blank");
  await t.ctx.close();
  t = await open(390, "light", "#/", { gql: "401" }).catch(() => null);
  check("401: token form with banner", t && (await t.page.isVisible(".tokenform")) && (await t.page.isVisible(".banner[role=alert]")));
  if (t) await t.ctx.close();
  t = await open(390, "light", "#/");
  await t.page.click("#menuBtn");
  await t.page.click("#modeBtn");
  const m1 = await t.page.evaluate(() => document.documentElement.dataset.mode);
  await t.page.reload(); await t.page.waitForSelector("#main[aria-busy=false]");
  check("theme toggle persists", m1 === "dark" && (await t.page.evaluate(() => document.documentElement.dataset.mode)) === "dark");
  await t.ctx.close();
  await browser.close(); server.close();
  const bad = results.filter((r) => !r[1]);
  console.log(bad.length ? bad.length + " FAILED" : "ALL " + results.length + " OK");
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
