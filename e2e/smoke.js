// Dev-only smoke test: node e2e/smoke.js  (needs global playwright + `npx http-server`-style static server on :8099 or auto-started)
const { chromium } = require("playwright");
const http = require("node:http"), fs = require("node:fs"), path = require("node:path");
const F = require("./fixtures");
const ROOT = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png" };
const server = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
  fs.readFile(p.startsWith(ROOT) ? p : "/nope", (e, b) => e ? (r.writeHead(404), r.end()) : (r.writeHead(200, { "content-type": MIME[path.extname(p)] || "text/plain" }), r.end(b)));
});
const PAGES = ["today", "runs", "run", "issues", "issue", "agents", "usage", "lessons", "files", "errors", "more"];
const OUT = path.join(ROOT, "design/v2/build-shots");
const only = process.argv[2];
(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = "http://localhost:" + server.address().port + "/";
  const browser = await chromium.launch();
  const fails = [];
  fs.mkdirSync(OUT, { recursive: true });
  const runId = F.ago(0) + "-levana-redesign";
  const hash = { run: "#run/" + runId, issue: "#issue/41" };
  for (const width of [390, 1440]) for (const mode of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: mode, locale: "th-TH" });
    await ctx.addInitScript(() => { try { localStorage.setItem("levana_token", "ghp_test"); } catch (e) {} });
    const errs = [];
    await ctx.route("https://api.github.com/**", (r) => {
      const req = r.request();
      if (req.method() === "OPTIONS") return r.fulfill({ status: 204, headers: F.CORS });
      const u = req.url();
      const body = u.endsWith("/graphql") ? { data: F.data() } : u.endsWith("/rate_limit") ? { rate: { remaining: 4990 } } : u.includes("/contents/") ? (req.headers().accept || "").includes("raw") ? "# md\n\nhello" : [] : u.includes("/branches") ? [{ name: "main" }] : {};
      r.fulfill({ status: 200, headers: Object.assign({ "x-ratelimit-remaining": "4990", "content-type": typeof body === "string" ? "text/plain" : "application/json" }, F.CORS), body: typeof body === "string" ? body : JSON.stringify(body) });
    });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    page.on("pageerror", (e) => errs.push(String(e)));
    for (const name of PAGES) {
      if (only && only !== name) continue;
      errs.length = 0;
      await page.goto(base + (hash[name] || "#" + name));
      await page.evaluate((m) => { document.documentElement.dataset.mode = m; }, mode);
      await page.reload();
      await page.waitForSelector("#main[aria-busy=false]", { timeout: 8000 }).catch(() => fails.push(`${name} ${width} ${mode}: no h1 / still busy`));
      await page.waitForTimeout(150);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight, small: [...document.querySelectorAll("a,button,input,select,summary")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && !e.matches(".skip,.sr") && !e.closest("p,.md") && r.height < 43.5; }).map((e) => e.outerHTML.slice(0, 70)).slice(0, 3) }));
      if (!(await page.$("h1"))) fails.push(`${name} ${width} ${mode}: no h1`);
      const tag = `${name}-${width}-${mode}`;
      if (m.sw > m.iw) fails.push(`${tag}: horizontal scroll ${m.sw}>${m.iw}`);
      if (errs.length) fails.push(`${tag}: console ${errs.join(" | ").slice(0, 200)}`);
      if (m.small.length) fails.push(`${tag}: small targets ${m.small.join(" ; ")}`);
      console.log(tag, "h=" + m.h);
      if (process.env.SECTIONS && width === 390 && mode === "light") console.log(await page.evaluate(() => [...document.querySelectorAll("#main > *, .tri > .zone > *")].filter((e) => e.offsetParent).map((e) => (e.className.slice(0, 24) || e.tagName) + " " + Math.round(e.getBoundingClientRect().height)).join("\n")));
      await page.screenshot({ path: path.join(OUT, tag + ".png"), fullPage: true });
    }
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(fails.length ? "FAIL\n" + fails.join("\n") : "ALL OK");
  process.exit(fails.length ? 1 : 0);
})();
