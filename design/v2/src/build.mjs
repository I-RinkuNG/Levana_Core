// Builds self-contained mockup-a/b/c.html from src/ partials. Run: node design/v2/src/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const src = dirname(fileURLToPath(import.meta.url)), out = join(src, '..');
const r = f => readFileSync(join(src, f), 'utf8');
const tokens = readFileSync(join(out, 'tokens.css'), 'utf8');
const css = r('mockup.css'), body = r('body.html'), js = r('mockup.js');
const fonts = {
  a: 'family=IBM+Plex+Sans+Thai:wght@400;600&family=Barlow+Condensed:wght@600&family=IBM+Plex+Mono:wght@400;600',
  b: 'family=Noto+Sans+Thai:wght@400;600&family=Anuphan:wght@600&family=JetBrains+Mono:wght@400;600',
  c: 'family=IBM+Plex+Sans+Thai:wght@400;600&family=Chakra+Petch:wght@600&family=IBM+Plex+Mono:wght@400;600',
};
const names = { a: 'A · Terminal', b: 'B · Codex', c: 'C · Relay' };
for (const d of ['a', 'b', 'c']) {
  const html = `<!doctype html>
<html lang="th" data-dir="${d}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#111315">
<title>Levana v2 mockup — ${names[d]}</title>
<script>(function(){var q=new URLSearchParams(location.search),m=q.get('mode');try{m=m||localStorage.getItem('lvn-mode')}catch(e){}document.documentElement.dataset.mode=m||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')})()</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts[d]}&display=swap">
<style>
${tokens}
${css}
</style>
</head>
<body>
${body}
<script>
${js}
</script>
</body>
</html>
`;
  writeFileSync(join(out, `mockup-${d}.html`), html);
}
console.log('built mockup-a/b/c.html');
