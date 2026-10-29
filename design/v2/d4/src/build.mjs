// Builds self-contained mockup-today/run/agents.html. Run: node design/v2/d4/src/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const src = dirname(fileURLToPath(import.meta.url)), out = join(src, '..');
const r = f => readFileSync(join(src, f), 'utf8');
const css = r('../tokens.css') + '\n' + r('d4.css'), icons = r('icons.html'), js = r('mockup.js');
const pages = {
  today: { title: 'วันนี้', file: 'today.html', states: true },
  run: { title: 'Run 029', file: 'run.html', states: true },
  agents: { title: 'Agents', file: 'agents.html', states: true },
};
const navItem = (p, key, href, icon, label, cnt, cls = '') =>
  `<a href="${href}"${cls ? ` class="${cls}"` : ''}${p === key ? ' aria-current="page"' : ''}><svg class="ico" aria-hidden="true"><use href="#i-${icon}"/></svg><span>${label}</span>${cnt ? `<span class="cnt">${cnt}</span>` : ''}</a>`;
for (const [k, p] of Object.entries(pages)) {
  const nav = `<aside class="nav" aria-label="เมนูหลัก">
    <div class="brand"><span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3v18h14" /><path d="M10 3v13h9" /></svg></span><b>LEVANA</b><span class="tag" translate="no">core</span></div>
    <nav>
      ${navItem(k, 'today', 'mockup-today.html', 'today', 'วันนี้')}
      ${navItem(k, 'run', 'mockup-run.html', 'runs', 'Runs', '29')}
      ${navItem(k, 'issues', '#', 'issues', 'Issues', '3')}
      ${navItem(k, 'agents', 'mockup-agents.html', 'agents', 'Agents', '10')}
      ${navItem(k, 'more', '#', 'more', 'เพิ่มเติม', '', 'm-only')}
      ${navItem(k, 'usage', '#', 'usage', 'การใช้ token', '', 'd-only')}
      ${navItem(k, 'lessons', '#', 'lessons', 'Lessons', '9', 'd-only')}
      ${navItem(k, 'files', '#', 'files', 'ไฟล์', '', 'd-only')}
      ${navItem(k, 'errors', '#', 'errors', 'Errors', '1', 'd-only')}
    </nav>
    <p class="nav-foot meta mono" translate="no">claude-dotfiles<br>main · 1a4e9f3</p>
  </aside>`;
  const mock = p.states ? `<div class="mock" role="group" aria-label="ตัวเลือก mockup (ไม่ใช่ส่วนของ design)">
  <label>สถานะ <select data-mock="state"><option value="ready">ปกติ</option><option value="loading">กำลังโหลด</option><option value="empty">ว่าง</option><option value="error">ผิดพลาด</option></select></label>
</div>` : '';
  writeFileSync(join(out, `mockup-${k}.html`), `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#e9eaef">
<title>${p.title} · Levana D4</title>
<script>(function(){var q=new URLSearchParams(location.search),m=q.get('mode');try{m=m||localStorage.getItem('lvn-mode')}catch(e){}document.documentElement.dataset.mode=m||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')})()</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600&family=Anuphan:wght@600&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
${css}
</style>
</head>
<body>
${icons}
<a class="skip" href="#main">ข้ามไปเนื้อหา</a>
<div class="app" data-state="ready">
  ${nav}
  <div class="col">
${r(p.file)}
  </div>
</div>
${mock}
<script>
${js}
</script>
</body>
</html>
`);
}
console.log('built mockup-today/run/agents.html');
