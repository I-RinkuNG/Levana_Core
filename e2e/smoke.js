// Dev-only: NODE_PATH=$(npm root -g) node e2e/smoke.js [pageName] [--update]   shots -> design/v3/build-shots/_run (untracked); --update writes the tracked design/v3/build-shots (OUT overrides)
const { chromium } = require("playwright");
const fs = require("node:fs"), path = require("node:path");
const H = require("./harness"), F = H.F, ROOT = H.ROOT;
const args = process.argv.slice(2), UPDATE = args.includes("--update");
const OUT = path.resolve(process.env.OUT || path.join(ROOT, "design/v3/build-shots", UPDATE ? "" : "_run"));
for (const bad of ["design/v2", "design/shots"]) if (OUT === path.join(ROOT, bad) || OUT.startsWith(path.join(ROOT, bad) + path.sep)) { console.error("refusing to write shots into " + bad); process.exit(2); }
const only = args.find((a) => !a.startsWith("--"));
const PAGES = ["summary", "runs", "run", "issues", "issue", "agents", "files", "log"];
const noTr = () => { try { delete self.Translator; } catch (e) {} };
(async () => {
  const { server, base } = await H.startServer();
  const browser = await chromium.launch();
  const fails = [];
  fs.mkdirSync(OUT, { recursive: true });
  const runId = F.ago(0) + "-levana-redesign";
  const hash = { summary: "#/", run: "#/run/" + runId, issue: "#/issue/41", files: "#/files/lessons/kotev.md" };
  const session = async (width, mode, state, fn) => {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: mode, locale: "th-TH" });
    await ctx.addInitScript(() => { try { localStorage.setItem("levana_token", "ghp_test"); } catch (e) {} });
    await ctx.addInitScript(noTr);
    await H.routes(ctx, state, []);
    const page = await ctx.newPage(), errs = [];
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    page.on("pageerror", (e) => errs.push(String(e)));
    await fn(page, errs);
    await ctx.close();
  };
  const go = async (page, h) => { await page.goto(base + h); await page.evaluate(() => { document.documentElement.dataset.mode = document.documentElement.dataset.mode; }); await page.waitForSelector("#main[aria-busy=false]", { timeout: 8000 }); await page.waitForTimeout(200); };
  const measure = (page) => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, small: [...document.querySelectorAll("a,button,input,select,summary")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && e.offsetParent !== null && !e.matches(".skip,.sr") && !e.closest("p,.md,td,.issue,.tnode,.gl") && r.height < 43.5; }).map((e) => e.outerHTML.slice(0, 70)).slice(0, 3) }));
  const shot = (page, tag) => page.screenshot({ path: path.join(OUT, tag + ".png"), fullPage: true });
  for (const width of [390, 1440]) for (const mode of ["light", "dark"]) {
    await session(width, mode, { gql: "ok", usage: "live" }, async (page, errs) => {
      for (const name of PAGES) {
        if (only && only !== name) continue;
        errs.length = 0;
        const tag = `${name}-${width}-${mode}`;
        try { await go(page, hash[name] || "#/" + name); } catch (e) { fails.push(tag + ": did not finish loading"); continue; }
        const m = await measure(page);
        if (!(await page.$("h1"))) fails.push(tag + ": no h1");
        if (m.sw > m.iw) fails.push(`${tag}: horizontal scroll ${m.sw}>${m.iw}`);
        if (errs.length) fails.push(`${tag}: console ${errs.join(" | ").slice(0, 200)}`);
        if (m.small.length) fails.push(`${tag}: small targets ${m.small.join(" ; ")}`);
        await shot(page, tag);
        console.log(tag);
      }
    });
  }
  if (!only || only === "states") {
    for (const width of [390, 1440]) {
      for (const [st, state] of [["empty", { gql: "empty", usage: "missing" }], ["error", { gql: "502", usage: "live" }], ["stale", { gql: "ok", usage: "stale" }], ["missing", { gql: "ok", usage: "missing" }]]) {
        await session(width, "light", state, async (page) => {
          await page.goto(base + "#/").catch(() => {});
          await page.waitForSelector("#main[aria-busy=false]", { timeout: 20000 }).catch(() => fails.push("state " + st + " " + width + ": not settled"));
          await page.waitForTimeout(200);
          await shot(page, `summary-${st}-${width}-light`);
          console.log("summary-" + st + "-" + width);
        });
      }
      await session(width, "light", { gql: "ok", usage: "live", delay: 1500 }, async (page) => {
        await page.goto(base + "#/");
        await page.waitForSelector(".skl", { timeout: 4000 }).catch(() => fails.push("loading skeleton not shown " + width));
        await shot(page, `summary-loading-${width}-light`);
      });
    }
    await session(1440, "light", { gql: "ok", usage: "live" }, async (page) => {
      for (const gm of ["a", "b"]) {
        await go(page, "#/files/lessons/kotev.md?view=graph&gm=" + gm);
        await page.waitForTimeout(2500);
        await shot(page, `files-graph-${gm}-1440-light`);
      }
      await go(page, "#/log");
      await page.click(".xbtn").catch(() => {});
      await shot(page, "log-expanded-1440-light");
    });
    const vshot = (page, tag) => page.screenshot({ path: path.join(OUT, tag + ".png") });
    const settled = (page, sel) => page.waitForFunction((q) => { const e = document.querySelector(q); return e && getComputedStyle(e).visibility === "visible" && e.getAnimations().length === 0; }, sel, { timeout: 4000 }).then(() => page.waitForTimeout(400));
    for (const mode of ["light", "dark"]) {
      await session(390, mode, { gql: "ok", usage: "live" }, async (page) => {
        await go(page, "#/files/lessons/kotev.md");
        if (mode === "light") {
          await page.click("#treeBtn");
          await settled(page, ".tree.open");
          await vshot(page, "tree-sheet-390-light");
          await page.keyboard.press("Escape");
          await page.waitForTimeout(400);
        }
        await page.click("#menuBtn");
        await settled(page, ".side.open");
        await vshot(page, "drawer-390-" + mode);
      });
    }
  }
  await browser.close(); server.close();
  console.log(fails.length ? "FAIL\n" + fails.join("\n") : "ALL OK");
  process.exit(fails.length ? 1 : 0);
})();
