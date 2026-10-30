const http = require("node:http"), fs = require("node:fs"), path = require("node:path");
const F = require("./fixtures");
const ROOT = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png", ".txt": "text/plain" };

const startServer = async () => {
  const server = http.createServer((q, r) => {
    const p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
    fs.readFile(p.startsWith(ROOT) ? p : "/nope", (e, b) => e ? (r.writeHead(404), r.end()) : (r.writeHead(200, { "content-type": MIME[path.extname(p)] || "text/plain" }), r.end(b)));
  });
  await new Promise((r) => server.listen(0, r));
  return { server, base: "http://localhost:" + server.address().port + "/" };
};

const MD = {
  "lessons/kotev.md": "# kotev lessons\n\n- ใช้ `grep` ก่อน ดู [rosh](rosh.md) และ agents/bochek.md\n- เทสต์ issue #41 ก่อนส่ง\n\n```\nnode --test\n```\n",
  "lessons/rosh.md": "# rosh lessons\n\n- ดู [kotev](kotev.md)\n",
  "agents/kotev.md": "---\nname: kotev\n---\nbody\n",
  "README.md": "# readme\n\nดู [kotev](lessons/kotev.md) และ agents/kotev.md\n"
};
const TREE = { sha: "t", truncated: false, tree: [{ path: "lessons", type: "tree" }, { path: "lessons/kotev.md", type: "blob", sha: "a1" }, { path: "lessons/rosh.md", type: "blob", sha: "a2" }, { path: "agents", type: "tree" }, { path: "agents/kotev.md", type: "blob", sha: "a3" }, { path: "README.md", type: "blob", sha: "a4" }, { path: "logo.png", type: "blob", sha: "a5" }] };

// state: { gql: ok|401|502|empty, usage: live|stale|missing|404 }, sb: collected Supabase POST bodies
const routes = async (ctx, state, sb) => {
  await ctx.route("https://api.github.com/**", (r) => {
    const req = r.request(), u = req.url();
    if (req.method() === "OPTIONS") return r.fulfill({ status: 204, headers: F.CORS });
    const hd = Object.assign({ "x-ratelimit-remaining": "4990", "content-type": "application/json" }, F.CORS);
    const send = (status, body) => r.fulfill({ status, headers: hd, body: typeof body === "string" ? body : JSON.stringify(body) });
    if (u.endsWith("/graphql")) {
      const body = JSON.parse(req.postData() || "{}");
      if (state.gql === "401") return send(401, { message: "Bad credentials" });
      if (state.gql === "502") return send(502, {});
      const aliases = (body.query || "").match(/f\d+: object\(expression: "[^"]+"\)/g);
      if (aliases) return send(200, { data: Object.fromEntries(aliases.map((a) => { const m = /(f\d+): object\(expression: "[^:]*:([^"]+)"\)/.exec(a); return [m[1], { text: MD[m[2]] || "" }]; })) });
      return send(200, { data: state.gql === "empty" ? F.empty() : F.data() });
    }
    if (u.endsWith("/rate_limit")) return state.gql === "401" ? send(401, { message: "Bad credentials" }) : send(200, {});
    if (u.includes("/contents/usage.json")) {
      const v = F.usage(state.usage || "live");
      return v ? r.fulfill({ status: 200, headers: Object.assign({}, hd, { "content-type": "text/plain" }), body: JSON.stringify(v) }) : send(404, { message: "Not Found" });
    }
    if (u.includes("/git/trees/")) return send(200, TREE);
    const m = /\/contents\/([^?]+)/.exec(u);
    if (m && MD[decodeURIComponent(m[1])]) return r.fulfill({ status: 200, headers: Object.assign({}, hd, { "content-type": "text/plain" }), body: MD[decodeURIComponent(m[1])] });
    send(200, []);
  });
  await ctx.route("https://*.supabase.co/**", (r) => {
    const req = r.request();
    if (req.method() === "OPTIONS") return r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (req.method() === "POST" && sb) { try { sb.push(...JSON.parse(req.postData())); } catch (e) {} }
    r.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" }, body: "" });
  });
};
module.exports = { startServer, routes, ROOT, F, MD, TREE };
