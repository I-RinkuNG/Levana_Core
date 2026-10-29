// Builds self-contained mockup-d1/d2/d3.html. Run: node design/v2/round2/src/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const src = dirname(fileURLToPath(import.meta.url)), out = join(src, '..');
const r = f => readFileSync(join(src, f), 'utf8');
const base = r('base.css'), body = r('icons.html') + r('body.html'), js = r('mockup.js');
const fonts = {
  d1: 'family=IBM+Plex+Sans+Thai:wght@400;600&family=Barlow+Condensed:wght@600&family=IBM+Plex+Mono:wght@400;600',
  d2: 'family=Noto+Sans+Thai:wght@400;600&family=Anuphan:wght@600&family=JetBrains+Mono:wght@400;600',
  d3: 'family=IBM+Plex+Sans+Thai:wght@400;600&family=Chakra+Petch:wght@600&family=IBM+Plex+Mono:wght@400;600',
};
const names = { d1: 'D1 · Depot', d2: 'D2 · Formation', d3: 'D3 · Sortie' };
for (const d of ['d1', 'd2', 'd3']) {
  writeFileSync(join(out, `mockup-${d}.html`), `<!doctype html>
<html lang="th" data-dir="${d}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#111315">
<title>Levana v2 round 2 — ${names[d]}</title>
<script>(function(){var q=new URLSearchParams(location.search),m=q.get('mode');try{m=m||localStorage.getItem('lvn-mode')}catch(e){}document.documentElement.dataset.mode=m||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')})()</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts[d]}&display=swap">
<style>
${base}
${r(d + '.css')}
</style>
</head>
<body>
${body}
<script>
${js}
</script>
</body>
</html>
`);
}
console.log('built mockup-d1/d2/d3.html');
