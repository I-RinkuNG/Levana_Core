// Dev-only behaviour checks: NODE_PATH=<global node_modules> node e2e/behaviours.js
const { chromium } = require("playwright");
const H = require("./harness"), F = H.F;
const results = [];
const check = (name, ok, info) => { results.push([name, !!ok]); console.log((ok ? "ok   " : "FAIL ") + name + (ok ? "" : " :: " + info)); };
(async () => {
  const { server, base } = await H.startServer();
  const browser = await chromium.launch();
  const open = async (width, mode, hash, { gql, usage, tokenless, cfg, init } = {}) => {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, colorScheme: mode || "light", locale: "th-TH" });
    const state = { gql: gql || "ok", usage: usage || "live" }, sb = [];
    if (!tokenless) await ctx.addInitScript(() => { if (!localStorage.getItem("levana_token")) localStorage.setItem("levana_token", "ghp_test"); });
    if (cfg) await ctx.addInitScript((c) => { window.LEVANA_CFG = c; }, cfg);
    if (init) await ctx.addInitScript(init);
    await H.routes(ctx, state, sb);
    const page = await ctx.newPage();
    await page.goto(base + hash);
    await page.waitForSelector("#main[aria-busy=false]", { timeout: 15000 });
    return { page, state, ctx, sb };
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

  t = await open(1440, "light", "#/");
  check("usage live: ring + reset + token chip", (await t.page.isVisible(".usage .ring")) && (await t.page.textContent(".usage")).includes("21%") && (await t.page.textContent(".tapi")).includes("ใช้ได้"));
  check("get token link: new tab, noopener, sr text", (await t.page.getAttribute(".tapi a", "rel")) === "noopener noreferrer" && (await t.page.textContent(".tapi a")).includes("เปิดแท็บใหม่"));
  check("PC: 5 issue rows", (await t.page.$$eval("#main .issues > li", (l) => l.length)) === 5);
  await t.ctx.close();
  t = await open(1440, "light", "#/", { usage: "stale" });
  check("usage stale: chip ข้อมูลเก่า + reset-passed text", (await t.page.textContent(".usage")).includes("ข้อมูลเก่า") && (await t.page.textContent(".usage")).includes("รอบนี้รีเซ็ตแล้วตอน"));
  await t.ctx.close();
  t = await open(1440, "light", "#/", { usage: "missing" });
  check("usage missing: dashed ring + cause", (await t.page.isVisible(".usage .ring.off")) && (await t.page.textContent(".usage")).includes("ยังไม่มีค่า 5 ชั่วโมง"));
  await t.ctx.close();
  t = await open(1440, "light", "#/", { usage: "404" });
  check("usage 404: same as missing, page still renders", (await t.page.isVisible(".usage .ring.off")) && (await t.page.isVisible("#agTable")));
  await t.ctx.close();
  t = await open(390, "light", "#/");
  check("390: 3 issue rows", (await t.page.$$eval("#main .issues > li", (l) => l.length)) === 3);
  check("390: dot matrix visible, ring hidden", (await t.page.isVisible(".usage .dots")) && !(await t.page.isVisible(".usage .ring")));
  check("390: agent table shows first 5 rows, then expands", (await t.page.$$eval("#agTable tbody tr", (r) => r.filter((x) => x.offsetParent !== null).length)) === 5);
  await t.page.click("#agMore");
  check("390: show all 10 agents", (await t.page.$$eval("#agTable tbody tr", (r) => r.filter((x) => x.offsetParent !== null).length)) === 10);
  await t.ctx.close();

  await browser.close(); server.close();
  const bad = results.filter((r) => !r[1]);
  console.log(bad.length ? bad.length + " FAILED" : "ALL " + results.length + " OK");
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
