const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const ago = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return ymd(d); };

const run = (title, date, flow, rows, done) => `# Run: ${title} (${date})

**คำขอ:** ${title}
**Flow ที่อนุมัติ:** ${flow}

## Handoffs
| # | จาก → ถึง | เหตุผล | ผล | tokens |
|---|---|---|---|---|
${rows.map((r, i) => `| ${i + 1} | ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} |`).join("\n")}
${done ? "\n## ผลสุดท้าย\n- เสร็จ\n" : ""}`;

const RUNS = () => ({
  [ago(0) + "-levana-redesign"]: run("levana-redesign", ago(0), "Kesh → Tzayar (ออกแบบ) → Amet (ตรวจ) → Kotev (สร้าง) → Bochek (ทดสอบ)", [
    ["Rin → Kesh", "รับงาน", "แตกงาน", "16,000"],
    ["Kesh → Tzayar", "ออกแบบ", "ได้ D4", "12,000"],
    ["Tzayar → Amet", "ตรวจข้อเท็จจริง", "ตัวเลข contrast ไม่ตรง", "96,000"],
    ["Tzayar → Amet (ตีกลับรอบ 1, สาเหตุ: ตัวเลขไม่ตรงแหล่ง)", "แก้", "ผ่าน", "38,000"],
    ["Amet → Kotev", "สร้าง", "", "41,000"]
  ]),
  [ago(0) + "-token-api-check"]: run("token-api-check", ago(0), "Kesh → Kotev (สร้าง) → Bochek (ทดสอบ)", [
    ["Kesh → Kotev", "สร้าง", "เสร็จ", "58,000"],
    ["Kotev → Bochek", "ทดสอบ", "test ขาด", "30,000"],
    ["Kotev → Bochek (ตีกลับรอบ 1, สาเหตุ: test ขาด)", "แก้", "ผ่าน", "20,000"]
  ], true),
  [ago(1) + "-lessons-search"]: run("lessons-search", ago(1), "Kesh → Kotev (สร้าง) → Bochek (ทดสอบ)", [
    ["Kesh → Kotev", "สร้าง", "เสร็จ", "164,000"],
    ["Kotev → Bochek", "ทดสอบ", "ผ่าน", "40,000"]
  ], true)
});
const AGENTS = ["rosh", "cheker", "amet", "zekher", "bona", "kotev", "bochek", "tak", "oseh", "tzayar"];
const blob = (name, text) => ({ name: name + ".md", type: "blob", object: { text, isTruncated: false, byteSize: text.length } });
const tree = (files) => ({ entries: files.map(([n, t]) => blob(n, t)) });
const issue = (n, title, state, d) => ({ number: n, title, state, body: "## รายละเอียด\n\n- ข้อ 1\n- ข้อ 2\n\n<script>alert(1)</script>", createdAt: d + "T08:00:00Z", closedAt: state === "CLOSED" ? d + "T09:00:00Z" : null, url: "https://github.com/i-rinkung/claude-dotfiles/issues/" + n, author: { login: "i-rinkung" }, comments: { totalCount: 0 }, labels: { nodes: [] } });

const data = () => ({
  rateLimit: { cost: 1, remaining: 4990 },
  repository: {
    ref: { target: { history: { nodes: [{ oid: "1a4e9f3aaaaaaa", message: "init", author: { name: "Rin", date: ago(0) + "T01:00:00Z" } }] } } },
    runs: tree(Object.entries(RUNS()).map(([k, v]) => [k, v])),
    agents: tree(AGENTS.map((a) => [a, `---\nname: ${a}\ndescription: "${a} agent"\ntools: Read, Grep\nmodel: sonnet\n---\n\nbody`])),
    lessons: tree(AGENTS.slice(0, 6).map((a, i) => [a, "# lessons\n\n" + Array.from({ length: 3 + i * 2 }, (_, j) => `- 2026-10-2${j % 9} ${a} ใช้ grep แทน find ได้ผล (run ${j})`).join("\n")])),
    issues: { nodes: [issue(41, "หน้า Files โหลดช้าบนมือถือ", "OPEN", ago(2)), issue(40, "เพิ่ม search lessons", "OPEN", ago(5)), issue(30, "แก้ token form", "CLOSED", ago(9))] }
  }
});
const empty = () => ({ rateLimit: { cost: 1, remaining: 4990 }, repository: { ref: { target: { history: { nodes: [] } } }, runs: null, agents: null, lessons: null, issues: { nodes: [] } } });

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type,accept",
  "access-control-expose-headers": "ETag, Link, Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-RateLimit-Used, X-RateLimit-Resource"
};
module.exports = { data, empty, CORS, ago };
