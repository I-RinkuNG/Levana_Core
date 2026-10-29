# Levana_Core v2/D4 — production build plan (Bona -> Kotev)

Spec: `DESIGN.md` + `tokens.css` (values), `IA.md` (pages), mockups for Today/Run/Agents. Static Pages, no build step. Branch `claude/redesign-v2`.
Rule: fetch layer, parsing, tests stay. UI layer is replaced.

## 0. Decisions
| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Fonts (R21) | **Vendor WOFF2 into `fonts/`**, thai+latin subset: Noto Sans Thai 400/600, Anuphan 600, JetBrains Mono 400/600 (5 files). `@font-face` + `font-display:swap`; `<link rel=preload as=font crossorigin>` for Noto Sans Thai 400/600 only. | CDN = third-party request + no preload + privacy; files are OFL, ~150-250 KB total, cached by Pages. Fallback stack `system-ui, "Noto Sans Thai", sans-serif`. Add `fonts/LICENSE-OFL.txt`. |
| D2 | marked / DOMPurify (currently CDN?) | Check index.html. If CDN, vendor into `vendor/` the same way. | Same reasoning; keep as-is if already local. |
| D3 | Token API status | New `apiStatus` state (see §3), replaces expiry everywhere | Rin's answer |
| D4 | Reserved 5h segment | Hatched cyan segment = estimated tokens still to be spent by remaining stages of the active run ("จองให้ Kotev" label = next agent name). Estimate = mean `tokens` of that agent's last 10 handoffs. **Needs Rin to confirm this meaning** (mockup only shows the look). If no active run: segment hidden. | Spec gives look not source |
| D5 | Bounce threshold | `BOUNCE_WARN = 0.20`; strictly `> 0.20` = red text + icon + red bar + `.op.warn` | Rin's answer |

Needs Rin: D4 meaning only. No DB change, no new package (fonts are files, not npm), no deletes except replacing the old CSS/markup (git history keeps it; Kotev rewrites files in place, no `git rm` needed).

## 1. File structure
```
index.html        REPLACE  shell: header, <nav id=nav>, <main id=app>, theme-color, preload fonts, script order
style.css         REPLACE  = tokens.css verbatim (first) + components from design/v2/d4/src/d4.css, split by section comments
fonts/*.woff2     NEW
app.js            SPLIT    keep top ~170 lines (api/snap/retry/log/tokenForm) -> api.js; views -> views/*.js; router -> app.js
api.js            NEW      moved unchanged: h-less. api, snap, ws, get/memo, logErr/readLog, fail, tokenForm, apiStatus
logic.js          KEEP+ADD pure functions in §3
parse.js          KEEP     (only add if §3 says so)
ui.js             NEW      component functions (h(), tab, blk, strip, meter, stages, opCard, ...), no data fetching
views/{today,runs,run,issues,issue,agents,usage,lessons,files,errors,more}.js   NEW  one `render(ctx) -> Node` each
test/*.test.js    KEEP; ADD test/logic-v2.test.js, test/ui.test.js (pure builders), e2e/ (Playwright, dev-only)
design/           KEEP, untouched
```
Script tags in order: logic, parse, api, ui, views/*, app (classic scripts, globals `KeshLogic/KeshParse/KeshApi/KeshUI/KeshViews`, same IIFE style as today; keeps `node --test` requiring logic/parse unchanged). No modules, no bundler. If any new pure code lives outside logic.js, also export via `module.exports` guard like existing files do.

Old views removed: overview (merged), stats (-> usage), old `hud/panel/card` helpers.

## 2. Router and shell
- Hash routes: `#today` (default), `#runs`, `#run/<run_id>`, `#issues`, `#issue/<n>`, `#agents`, `#usage`, `#lessons`, `#files`, `#errors`, `#more`.
- `parseRoute(hash) -> {page, arg}` (pure, logic.js). Unknown -> today. `navModel(counts) -> {bottom[5], rail[3 groups], activeKey}` (pure); `#run/x` highlights Runs, `#issue/n` Issues, usage/lessons/files/errors highlight เพิ่มเติม on mobile and itself on rail.
- `route()`: set `aria-busy`, render **skeleton first** (each view exports `skeleton()` with the real tabs/titles, spec §5), then `await view.load()`, then `view.render(data)`. On failure: keep last rendered DOM + `role=alert` banner (spec §5 error) + per-panel "· ข้อมูล HH:MM". Focus moves to `<h1>` on route change; scroll top.
- Freshness line `aria-live=polite`: "อัปเดต HH:MM (n นาทีที่แล้ว)", refresh iconbtn 44px = clear `cache` + re-route. Theme toggle `lvn-mode` (system default).
- Rail >=1024 with counts (Runs, Issues open, Errors from `readLog().length`); bottom nav <1024.

## 3. Data per page (existing -> new pure functions in logic.js)
All new functions pure, take plain data, no DOM, no Date.now unless `now` arg.

Existing, reuse: `ws()` {runs, agents, lessons, lessonTexts, issues, agg}; `pct5h`, `isToday`, `tokensByAgent`, `rejectRates`, `classify*`, `retryDelay`, `pushLog`, `memo`, `mapGraphql`; `KeshParse.parseRunLog/parseFlow/computeTokens/aggregate/countLessons/parseFrontmatter`; `partial`/`notes` from snap.

New:
```
window5h(runs, nowMs) -> {startMs, resetMs, remainingMs, usedTokens, usedPct}
   // 5h window start = earliest run today within 5h of now (assumption: derive from run_id timestamps; if run_id has date only, fall back to calendar day and flag "ประมาณ" in the UI). Confirm in first commit by inspecting real run_ids.
reservedTokens(activeRun, runs, n=10) -> {tokens, pct, agent} | null
meterSegments(usedPct, reservedPct) -> {used, reserved, rest}   // clamps to 100, sum==100
fmtCountdown(ms) -> "HH:MM:SS"      projection(usedPct, elapsedMs) -> {pctAtReset}
bounceLevel(rate) -> "ok"|"bad"     // > BOUNCE_WARN
bounceBarPct(rate) -> 0..100 (scale 0-50%, clamps)  + tickPct = 40
activeRun(runs) -> run|null         // newest status!=="done"
stageModel(run) -> [{n, agent, state:"done"|"now"|"todo"|"bounced", bounces}]   // from run.flow + handoffs
actionQueue({runs, issues, apiStatus, rates}) -> [{kind:"APPROVE"|"ALERT"|"ISSUE", title, meta, href, danger}] max 3, ordered approve > alert > issue
handoffRows(run) -> [{n, from, to, tokens, relPct, bounced, reason}]   // relPct vs largest
foldBounces(rows) -> rows with reason box inline (replaces BOUNCE panel, R15)
bounceReasons(run) -> [{reason, count}]   // shown inside HANDOFF panel footer, not own panel
agentTokens(run) -> [{agent, tokens, pct}]
agentCards(w, windowDays=7) -> [{name, group:"BUILD"|"CHECK", role, tokens, relPct, handoffs, bounceRate, level, lessons}]
   // group map constant AGENT_GROUPS: BUILD = Rosh Cheker Zekher Kotev Bona? -> take from mockup src/gen-agents.mjs, copy exactly
runRows(runs, {q, status, agent}) -> filtered, sorted desc by run_id
usageSeries(runs) -> {perRun[], perAgent[], bounceByAgent[], lessonsByAgent[]}   // thin wrapper over aggregate()
groupFiles(files, sort) -> [{folder, items:[{name,size,date}]}]
lessonGroups(lessonTexts, q, agent) -> [{agent, items[], more}]  // <=7 then more
searchLessons(lessonTexts, q) -> hits with snippet
apiStatus (in api.js, state not pure): {ok:boolean, code, checkedAt}; set by every snap success (ok) / 401 (bad). recheck() = bust cache("g") + one cheap authenticated GET /rate_limit (via existing retrying/once); updates checkedAt.
ageText(ms) -> "n นาทีที่แล้ว"; hhmm(ms)
```
Page matrix (components from DESIGN §3; `blk` = panel with `.tab`):
| Page | Data | Layout / components |
|---|---|---|
| Today | window5h, reservedTokens, meterSegments, actionQueue, stageModel(activeRun), runRows(top4/3), agentCards top2 + over-threshold alert, KPI | spec §4 exactly: strip -> QUEUE (br) -> WINDOW (br, meter) -> STAGE (br) -> LOG -> SQUAD; desktop 4/6/4 columns, brief + KPI desktop only |
| Runs | runRows + search `.search` + status chips (filter `.btn` pills) | strip? no. `blk` tab `LOG nn` containing `.rows` (not limited to 3/4), filters above, row = link to `#run/id`. empty: tab `00` |
| Run detail | activeRun-style fns on chosen run: stageModel, handoffRows(+folded bounces), agentTokens, bounceReasons | spec mockup-run; mobile order approve -> STAGE -> HANDOFF(with inline bounce boxes + reasons footer) -> AGENT. No BOUNCE panel (R15). Desktop 3/7/4: reasons go in right column as `.reasons` inside HANDOFF footer on mobile only; on >=1024 keep right-column BOUNCE card (CSS-only toggle via same markup, one DOM source) |
| Issues | `snap().issues` | open/closed seg (`.btn` pills), `blk` tab `ISSUE nn`, list rows like `.rows` (number mono, title wrap, user, age, link). Closed collapsed with `<details>` |
| Issue detail | issue body via existing `md()` (marked+DOMPurify) | single `blk` tab `ISSUE #n`, h1 title, chip open/closed, body, back link (44px), "เปิดใน GitHub" outline btn |
| Agents | agentCards, strip (agents, avg bounce, over-threshold count), alert | spec mockup-agents; `.op` cards with dl + bounce bar + 20% tick; BUILD 05 / CHECK 05 tabs; **mobile: CHECK group in `<details>`/toggle button (44px, "แสดง CHECK 05"), closed by default <600, open >=600 (set `open` via matchMedia on render + resize)**; 5/row >=1024 |
| การใช้ token | usageSeries, window5h | strip (5H, reset); `blk` WINDOW meter; `blk` TOKEN/RUN (cyan bars `.reasons` style, last 10 runs); `blk` TOKEN/AGENT (op bars); `blk` BOUNCE/AGENT (bars, red >20% with tick); lessons count list. Pure CSS bars, `role=img` + aria-label. No chart lib |
| Lessons | lessonGroups, searchLessons | search + agent chip filter; per agent `blk` tab `LESSON nn`, <=7 rows then "ดูทั้งหมด" (details). Snippet highlight with `<mark>` styled `--data-bg` |
| ไฟล์ | groupFiles | per folder `blk` tab `runs 29` etc. table-like `.rows` (name mono, size, date), sort buttons (name/date), row click -> inline md viewer (existing `md()`), mobile single column |
| Errors | `readLog()` | latest error `blk.br`? no (brackets rare) -> plain `blk` tab `ERROR nn`: code chip (icon+word), cause text from classify, time, "ลองอีกครั้ง" primary; history `.rows`; "ล้าง log" outline (localStorage only) |
| เพิ่มเติม (mobile) | navModel | list of 4 links, 56px rows, with counts |
| Token form | existing `tokenForm(msg)` | restyle as `blk` tab `TOKEN 01` centered, input + primary "บันทึก", help text, shows `apiStatus` chip after save; reuse on any `auth` error. Token stays in localStorage `levana_token` (unchanged) |
Strip cells (Today): 5H % · RESET countdown · BOUNCE % · (>=600) RUNS · ISSUES; API cell (sys row on mobile) = `apiStatus` chip ใช้ได้/ใช้ไม่ได้ + "ตรวจล่าสุด HH:MM" + "ตรวจอีกครั้ง".

## 4. Components (ui.js, each `(props) -> Node`, only `h()` + textContent, no innerHTML except sanitized md)
`h`, `icon(name)` (inline SVG sprite in index.html), `tab(word, nn, act?)`, `blk({tab,title,more,br,children})`, `strip(cells)`, `chip(kind,text)` (icon+word), `btn/iconbtn`, `queueItem`, `meter(segs, legend)`, `stages(model)`, `opCard(card, {full})`, `rows(items)`, `tlRow/tlTable`, `reasons`, `kpi`, `sysRow(apiStatus)`, `empty({icon,title,next,action})`, `skeleton(shape)`, `banner(err)`. Mobile/desktop differences are CSS only (one DOM). Copy markup from `src/today.html`, `src/run.html`, `src/gen-agents.mjs`.

## 5. Commit order (small, each leaves app working; tests green at every commit)
1. `fonts/` + LICENSE; `@font-face`; no visual change yet. (parallel with 2)
2. Move fetch layer to `api.js` verbatim (no behaviour change), add `apiStatus` + recheck. Run 48 tests + manual load.
3. logic.js: add pure fns in §3 group A (route, nav, bounce, meter, window5h, fmt) + tests.
4. style.css <- tokens + d4.css; ui.js primitives (tab/blk/strip/chip/btn/empty/skeleton/banner); new shell/index.html, router with `#more` + placeholders for unported pages (old views still reachable until replaced).
5. Today (needs logic group B: stageModel, actionQueue, activeRun, reservedTokens, agentCards) + tests.
6. Agents (+ CHECK toggle) . 7. Runs list + Run detail (handoffRows, foldBounces, reasons, agentTokens) + tests. (6 and 7 parallel after 5)
8. Issues + Issue detail. 9. Lessons + Files (parallel with 8).
10. Usage + Errors + token form restyle.
11. Delete old views/helpers/CSS (dead code), loading/empty/error states audit across pages, a11y pass (focus, aria-live, reduced motion, 44px).
12. Playwright suite + screenshots; fix; update README.
Parallel: 1||2; 6||7; 8||9. Same-file conflicts: logic.js (use separate commits, or worktrees).

## 6. Test plan
- Unit (`node --test test/*.test.js`), keep 48, add approx 45: for each §3 fn - normal, empty, boundary (bounce exactly 0.20 = ok, 0.21 = bad; meter clamps >100; window reset edge at 5h; stageModel with bounced + parallel flow; handoffRows relPct with single/zero-token; actionQueue ordering and cap 3; parseRoute unknown/`#run/<id>` with odd chars; groupFiles sort; lessonGroups >7). ui.test.js: builders run under a tiny fake DOM only if cheap; otherwise skip and rely on Playwright.
- Playwright (`e2e/`, dev-only, not on Pages; Kotev installs in a temp dir, not committed deps - **flag: adds `package.json` devDependency; Rin OK?** Alternative: global playwright, script only). Mock `https://api.github.com/graphql` via `page.route` returning fixture JSON built from 3 real-shaped run logs (done, open with bounce, pending) + agents + lessons + 2 issues; also fixtures: 401, 403 rate, timeout (state=error), empty repo (state=empty), slow (state=loading).
- Per page x {390, 1440} x {light, dark}: loads without console errors, no horizontal scroll (`scrollWidth<=innerWidth`), all interactive >=44px, h1 present, tab text matches `WORD NN`, screenshot saved to `e2e/shots/` (gitignored). Page height at 390 <= 2110px for Today/Run/Agents (R15 check). Axe-core contrast optional.
- Behaviours: Agents CHECK collapsed at 390 and expandable; Run has no BOUNCE panel at 390 and shows inline bounce reason; bounce 25% card has `.warn`; re-check button updates "ตรวจล่าสุด"; 401 flips chips and shows banner with cached data; retry button works; theme toggle persists.
- Manual: real token against the live repo once; lighthouse font preload check (no FOIT, Thai glyph shown).

## 7. Risks
- 5h window start/reset is not in the data (run_id may be date-only) -> `window5h` may be an estimate; label "ประมาณ" and ask Rin for the real rule. Highest risk.
- Reserved segment meaning (D4) unconfirmed.
- Single DOM for mobile/desktop (Run bounce, Agents toggle) needs careful CSS/`matchMedia`; test both widths.
- Font weight: Thai subset must include U+0E00-0E7F plus latin; verify no tofu. Anuphan only 600, so no italics/other weights in CSS.
- Rewriting views silently drops v1 behaviours (search across issues+runs+lessons from old Today). Mitigate: Runs/Issues/Lessons each have own search; global search not rebuilt (note to Rin).
- GraphQL snapshot limits (first:100 issues, partial files) - keep partial notes banner on every page via shared `banner`.
- R5/R7 sev1 leftovers: round micro spacing to 4/8 and drop 15px size where trivial; otherwise leave.
- Playwright dependency decision.

## 8. Size estimate
CSS ~700-900 lines (tokens 120 + d4 components + 11 pages); ui.js ~350; views ~900 total; api.js ~170 (moved); logic.js +300; tests +450; e2e ~250. Net app code roughly 1270 -> ~2600 lines excluding tests/fonts. About 12 commits, 2-3 Kotev sessions; heaviest: steps 4-5 and 12.
