// node design/v2/d4/src/shoot.mjs  -> shots/*.png + measure.json
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
const here = dirname(fileURLToPath(import.meta.url)), out = join(here, '..');
const browser = await pw.chromium.launch();
const jobs = [];
for (const p of ['today', 'run', 'agents']) for (const w of [390, 1440]) for (const m of ['light', 'dark']) jobs.push([p, w, m, 'ready']);
for (const p of ['today', 'run', 'agents']) for (const s of ['loading', 'empty', 'error']) { jobs.push([p, 390, 'light', s]); jobs.push([p, 1440, 'dark', s]); }
for (const p of ['today', 'run', 'agents']) jobs.push([p, 320, 'light', 'ready']);
const report = {};
for (const [p, w, m, s] of jobs) {
  const pg = await browser.newPage({ viewport: { width: w, height: w < 1000 ? 844 : 900 }, deviceScaleFactor: w < 1000 ? 2 : 1 });
  await pg.goto('file://' + join(out, `mockup-${p}.html`) + `?shot=1&mode=${m}&state=${s}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  await pg.evaluate(() => document.fonts.ready);
  await pg.addStyleTag({ content: '*{animation:none!important}' });
  const name = `${p}-${w}-${m}${s === 'ready' ? '' : '-' + s}`;
  await pg.screenshot({ path: join(out, 'shots', name + '.png'), fullPage: true });
  report[name] = await pg.evaluate(() => {
    const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const bgOf = el => { while (el) { const b = getComputedStyle(el).backgroundColor; if (b && !b.startsWith('rgba(0, 0, 0, 0)') && b !== 'transparent') return b; el = el.parentElement; } return getComputedStyle(document.body).backgroundColor; };
    const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0' && !el.closest('[aria-hidden=true],.mock,.skip,.sr'); };
    let minC = 99, minCEl = '', minFont = 99, minFontEl = '', small = [];
    document.querySelectorAll('body *').forEach(el => {
      if (!vis(el)) return;
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (own) {
        const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
        if (cs.color.includes('0, 0, 0, 0)')) return;
        if (fs < minFont) { minFont = fs; minFontEl = el.className || el.tagName; }
        const a = lum(cs.color), b = lum(bgOf(el)), c = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        if (c < minC) { minC = c; minCEl = (el.className || el.tagName) + ' "' + el.textContent.trim().slice(0, 20) + '"'; }
      }
    });
    document.querySelectorAll('a,button,select,summary').forEach(el => { if (!vis(el)) return; const r = el.getBoundingClientRect(); if (r.width < 44 || r.height < 44) small.push(`${el.className || el.tagName}:${Math.round(r.width)}x${Math.round(r.height)}`); });
    return { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, height: document.documentElement.scrollHeight,
      minContrast: +minC.toFixed(2), minCEl, minFont, minFontEl, small: small.slice(0, 8),
      firstQ: (document.querySelector('.queue,.approve')?.getBoundingClientRect().top | 0) };
  });
  await pg.close();
}
await browser.close();
writeFileSync(join(out, 'src', 'measure.json'), JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) console.log(k, `sw=${v.scrollW}/${v.clientW} h=${v.height} minC=${v.minContrast}(${v.minCEl}) font=${v.minFont} small=${v.small.length ? v.small.join(' ') : '-'} q@${v.firstQ}`);
