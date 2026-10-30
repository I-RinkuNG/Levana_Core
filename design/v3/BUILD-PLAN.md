# Levana v3 — build plan (Bona, 2026-10-30)

For Kotev. Target UI = `design/v3/mockup.html` + `DESIGN.md` (approved). Inputs: CHANGE-REQUEST.md (C1-C19), qa-baseline.md (Bochek), research.md + factcheck.md, research-layout.md.
Stack stays: vanilla JS, no build step, globals `KeshUI / KeshLogic / KeshApi / KeshParse / KeshViews`, `node --test`, Playwright e2e.
Kesh decisions applied: mobile Summary shows **3** issues (PC 5); location = **Intl timezone only**; usage stale = **15 min after captured_at OR now > resets_at** (constant `USAGE_STALE_MS` in logic.js, one place to change).

## 0. Ground rules
- One chunk = one commit (or a few), message `v3 C<n>: ...`. Run `node --test "test/*.test.js"` before each commit.
- Do not delete files. Files to remove are listed in chunk 11 and wait for Rin.
- Never write into `design/v2/**` or `design/shots/**`. Build shots go to `design/v3/build-shots/`.
- Never log or store the GitHub token, file contents or issue bodies in the Log.

## 1. File-by-file changes

| File | Change |
|---|---|
| `index.html` | Replace topbar/bottom-nav markup with shell: `<aside id="side">` (brand, 6 links, theme toggle), mobile `<header class="mhead">` (56px, menu button 44px, page title), `<main id="main">`. Script tags: add `config.js`, `logbus.js`, `usage.js`(api part is in api.js, see below), `translate.js`, `views/summary.js`, `views/log.js`, `views/graph.js`; drop tags for `views/today.js, usage.js, lessons.js, errors.js, more.js` (files stay until chunk 11). force-graph is NOT a script tag (lazy-loaded). |
| `style.css` | Port mockup CSS: tokens `--side-w 240 --tree-w 280 --page-w 1040 --head-h 56 --r-sm 8 --warn/--warn-bg`; sidebar persistent >=1024, drawer <1024 (scrim, Esc, focus trap, focus return); `--surface` main, no grey canvas; ring, dot matrix, KPI dl 2x2, issue rows (line-clamp 2), tables, tree, graph panel, log table sticky header; skeletons (reduced motion off). Remove bottom-nav, tabs, op-card, power-bar, queue rules. |
| `app.js` | New `renderSide(page)` (6 items, `aria-current`), drawer controller, H1 row (title + freshness + 44px refresh). Remove counts badges. Route via `L.parseRoute`; legacy redirects (see routes). Emit log events (section 6). Token form: add `get token` link `https://github.com/settings/personal-access-tokens` (`target=_blank rel="noopener noreferrer"`, sr "เปิดแท็บใหม่"). |
| `logic.js` | `parseRoute` / `navModel` rewritten for 6 pages + redirects. Remove `TOKENS_PER_PCT`, `pct5h`, `window5h` (incl. dead `timed` branch), reserve/projection, `actionQueue`. Add `usageState(u, now)`, `kpis7d(runs, lessonsTexts, now)`, `agentTable(runs, days)`, `issueRows(issues, n)`, `buildGraph(files, agents, issues, mode)`, `fmtTok` fix, `activeRun` uses `status==="open"`. GQL: issues paging (`pageInfo{hasNextPage endCursor}`, `$after`), add `oid` to Blob fragment (translation cache key). |
| `parse.js` | Run status rule, `isRun`, `Handoffs?` heading, `has_followups` (section 2). |
| `api.js` | Bearer-null fix, `recheck` clears `g`,`ws`,`u`; issues pagination loop; `usage()`; `tree()` (git trees recursive); `mdBatch(paths)` for graph; `retrying` sets ok only when no GraphQL `errors`; `logErr` forwards into `KeshLog` (keep localStorage key read for migration, then stop writing it). |
| `ui.js` | Add `ring(pct, state)`, `dots(pct, state)`, `dl(items)`, `issueRow(i)`, `table(cols, rows, opts)`, `chip(icon, word, tone)`. Remove `opCard`, `tab`, power bar helpers once unused. |
| `views/summary.js` (new) | Order: USAGE + KPI (6fr/5fr >=1024, stacked mobile), GIT ISSUE (5 PC / 3 mobile via `matchMedia('(min-width:1024px)')` at render + CSS hide of rows 4-5 as backup), TOKEN ต่อ AGENT table (mobile first 5 + "แสดงทั้ง 10 agent"). Token-expired banner when `apiStatus.code===401`. Footer row of USAGE: token chip + `ตรวจใหม่` + `get token` (primary when expired). |
| `views/runs.js` | `run คืออะไร` `<details>` one line; filters ทั้งหมด / เสร็จ / กำลังทำ / มีงานค้างต่อ with counts; search; table (name, start, handoffs, tokens, status chip, followups chip, `ตีกลับ n`). Mobile stacked rows. |
| `views/run.js` | Keep; show status chip + followups chip per new fields. |
| `views/issues.js` | Restyle rows only using `issueRow` (same as Summary). Full list (now paginated). |
| `views/agents.js` | H1 + table only: swatch letter, name, หน้าที่, ทำงานล่าสุด, lessons link `#/files/lessons/<name>.md`. Remove SQUAD header/legend. |
| `views/files.js` | Rewrite: tree (from `A.tree()`, `role=tree`, search, chevrons, sticky own scroll) + document (marked + DOMPurify, 72ch) + sticky toolbar (path, segmented `เอกสาร | กราฟ`, translate button). Lessons are just `lessons/` in the tree (C16 merge). <1024: tree in full-screen sheet opened by `ไฟล์`. Route `#/files/<path>` and `#/files/<path>?view=graph&gm=a|b`. |
| `views/graph.js` (new) | Lazy-load force-graph, render, right panel (mode radio A/B, legend, neighbour list), zoom + / − / fit (44px). |
| `translate.js` (new) | Section 5. |
| `logbus.js` (new) | `KeshLog`: build entry, local ring buffer, Supabase queue/flush (section 6). |
| `config.js` (new) | `window.LEVANA_CFG = { supabaseUrl: "", supabaseKey: "", usageBranch: "levana-usage", usagePath: "usage.json" }`. Empty = Supabase off (local only). |
| `views/log.js` (new) | Log table per DESIGN §3 Log; source = Supabase when signed in, else local buffer + queue; `ส่งออก JSONL`; sign-in form (magic link) for Rin. |
| `vendor/force-graph.min.js` (new), `vendor/LICENSES.txt`, `vendor/SHA256SUMS` (new) | Section 4. |
| `README.md` | New pages, usage.json source, Supabase setup steps (copy of section 6 Rin list), statusline install. |
| `e2e/smoke.js`, `e2e/behaviours.js`, `e2e/fixtures.js` | Section 8. |
| claude-dotfiles: `scripts/statusline.py`, `scripts/push_usage.py`, `scripts/test_statusline.py`, `.gitignore` (+`state/`) | Section 3. |

### Routes
`#/` = Summary · `#/runs` · `#/run/<id>` · `#/issues` · `#/issue/<n>` · `#/agents` · `#/files[/<path>][?view=graph&gm=a|b]` · `#/log`.
Redirects with `history.replaceState` (no extra history entry): `#/today`→`#/`, `#/usage`→`#/`, `#/lessons`→`#/files/lessons`, `#/lessons/<x>`→`#/files/lessons/<x>.md`, `#/errors`→`#/log`, `#/more`→`#/`. Unknown → `#/`.

## 2. parse.js run status (C12)
In `parseRunLog`:
- Heading: `inHandoffs = /^Handoffs?\b/i.test(current)` (fixes autoharness-review, zekher-z1-z2-z4).
- `finished` = any of: a section key matching `/^(ผลสุดท้าย|สรุป|ผล|สถานะ)/`; `meta["ผล"]` non-empty; `handoffs.length && handoffs.every(h => nonEmpty(h.result))` (use the field name `parseHandoffTable` already returns).
- `status = finished ? "done" : (!handoffs.length || !nonEmpty(last(handoffs).result)) ? "open" : "done"`. Only `"done" | "open"`.
- `has_followups = pending_items.length > 0` (no longer overrides status). Grep every `"pending"` consumer (logic.js, views) and switch to `has_followups`.
- New export `isRun(name, run)`: false if `name` starts with `_`, or `run.handoffs.length === 0` and no `# Run:` title (`tm` null). If the 3 known non-runs (affiliate-pipeline-research-qc1, ai-mascot-research-qc1, 2026-10-29-retro) still pass, tighten to "no parsed handoffs → not a run" and note it in the commit.
- `api.js ws()`: `runs = of("runs").filter(x => !x.name.startsWith("_")).map(parse).filter(r => KeshParse.isRun(r.run_id, r))`. `aggregate` gets the filtered list.

Tests (`test/parse.test.js`, real runs via `KESH_ROOT`, skip if absent):
- `_template.md` and the 3 non-runs are excluded.
- Each of these is `done`: channel-and-render-build, followups, session-close, shutaf-next-steps, retro-fixes, ux-principles, levana-fetch-error, branch-cleanup, merge-kesh-main, lab-team-setup, retro-skill, autoharness-review, zekher-z1-z2-z4 (match by name suffix, since date prefix differs).
- autoharness-review and zekher-z1-z2-z4 have `handoffs.length > 0`.
- The 6 former "pending" runs: `status==="done"` and `has_followups===true`.
- Global: `open` count <= 2 (only in-progress runs; do not hard-code levana-v3, it will close).
Unit fixtures (no KESH_ROOT): one file each for `## สรุป`, singular `## Handoff`, meta `**ผล:**`, handoffs-only all-results, last-handoff-empty (open), `_template`.

## 3. Usage data (C14, C15)
Source = Claude Code statusline JSON `rate_limits.five_hour|seven_day.{used_percentage, resets_at}` (factcheck PASS). Delete the token→% conversion entirely.

### 3a. claude-dotfiles `scripts/statusline.py` (Python 3, stdlib only; same style as `scripts/runlog.py`, cross-platform)
1. Read stdin JSON. Never crash: any error → print a short line, exit 0.
2. `rl = data.get("rate_limits") or {}`. For each of `five_hour`, `seven_day`: keep only if dict with numeric `used_percentage`; `resets_at` int or null.
3. If `five_hour` is absent: do NOT overwrite the file (keeps last good value; Levana marks it stale after 15 min / reset). Print `5h —`.
4. Else write `~/.claude/state/usage.json` atomically (write `.tmp`, `os.replace`):
   `{"schema":1,"five_hour":{"used_percentage":42.0,"resets_at":1761830760},"seven_day":{...}|null,"captured_at":"2026-10-30T05:58:12Z"}`. No host name, no paths, no session id.
5. Upload throttle (state in `~/.claude/state/usage.upload.json`: `last_upload_at`, `last_pct`): upload if >= 300 s since last upload, or |pct − last_pct| >= 5 and >= 60 s. Upload = spawn `push_usage.py` detached (`subprocess.Popen`, Windows `creationflags=DETACHED_PROCESS|CREATE_NEW_PROCESS_GROUP`, stdout/err to `state/push.log`) so the statusline returns fast. Lock file `state/push.lock` (skip if younger than 60 s).
6. Print the status line: `5h 42% · รีเซ็ต 14:26 · 7d 18%`.
`scripts/push_usage.py`: uses `gh api` (subprocess). GET `repos/i-rinkung/claude-dotfiles/contents/usage.json?ref=levana-usage` → sha (404 = new); PUT with base64 content, `branch=levana-usage`, message `usage <captured_at>`; on 409/422 refetch sha once. If branch missing: create `refs/heads/levana-usage` from current `main` sha via `gh api .../git/refs`. Never touches the working tree or `main`.
`.gitignore`: add `state/`.
`scripts/test_statusline.py` (unittest, runs in cloud): missing `rate_limits` → no write; only seven_day → no write; full → schema exact; throttle math; atomic write; bad JSON → exit 0. Mock Popen.

Why a separate branch via Contents API: no commits on `main` (merges to main need Rin), no working-tree conflicts with Rin's edits, one tiny file. Cadence ~1 commit / 5 min only while Claude Code is active on the PC. Cloud sessions do not run it (statusLine is set only in the PC's settings).

### 3b. Levana side
- `api.js usage()` = `get("u", () => api("/contents/" + CFG.usagePath + "?ref=" + CFG.usageBranch, true).then(JSON.parse))`; 404 or bad JSON → `null`. Refetch on Summary load, on `ตรวจใหม่`, and every 5 min while `document.visibilityState==="visible"`.
- `logic.usageState(u, now)` → `{state:"missing"}` if no `u`/no `five_hour`; `stale` if `now - captured_at > USAGE_STALE_MS (15*60e3)` or `now > resets_at*1000` (`resetPassed: true` → text "รอบนี้รีเซ็ตแล้วตอน hh:mm"); else `live` with `pct` (0-100 clamp), `resetsAt`, `capturedAt`. Ring >=600px, 20-dot matrix <600px (filled = round(pct/5)). Stale = grey + `ข้อมูลเก่า` chip; missing = dashed "—" + cause line.

## 4. force-graph + graph model (C17)
Vendor pin:
- Download `https://cdn.jsdelivr.net/npm/force-graph@1.52.0/dist/force-graph.min.js` to `vendor/force-graph.min.js`. Check size = 173,081 B; if different, stop and report.
- `vendor/SHA256SUMS`: `sha256sum vendor/*.js` lines for all vendor files (marked, purify, force-graph). Append to `vendor/LICENSES.txt`: name, version 1.52.0, source URL, sha256, MIT text from the package LICENSE, plus a note that the UMD bundles d3-force etc. (copy the header banner of the min file if present).
- Test `test/vendor.test.js`: recompute sha256 of each vendor file and compare with SHA256SUMS.
- Load lazily: `views/graph.js` injects `<script src="vendor/force-graph.min.js">` on first graph open (promise memo); no SRI needed (same origin), hash test guards it.

Data (built in `logic.buildGraph(files, agents, issues, mode)`, pure, testable):
- `node = {id, kind:"file"|"agent"|"issue", label, path?, agent?, number?, color?}`; ids `f:<path>`, `a:<name>`, `i:<n>`.
- `link = {source, target, kind:"link"|"mention"|"relation"}`; dedupe by `source|target|kind`; no self links.
- Mode A (files only): `link` = markdown links `[..](x.md)` resolved relative to the file's dir (strip `#anchor`, ignore http); `mention` = bare `name.md` or `dir/name.md` text that resolves to a known file. Skip fenced/inline code. Unresolved targets dropped.
- Mode B = A + agent nodes (from `agents/*.md`) + issue nodes (open and closed from snap): `relation` when a file names an agent (`\b<Name>\b` case-insensitive, against the 10 agent names) or `#<n>` / `issues/<n>` for an existing issue; `agents/<x>.md` and `lessons/<x>.md` always relate to `a:<x>`.
- Files in scope: all `.md` in the tree. Content fetch: `A.mdBatch(paths)` via GraphQL aliases (`f0: object(expression:"main:plans/x.md"){...on Blob{text}}`), 50 per request; runs/agents/lessons reuse snap. Only when graph view first opens. Cap 400 files (note in panel if capped).
- Render: `nodeCanvasObject` shapes (file square, agent circle + letter + agent colour, issue diamond + `#`), `linkLineDash` (mention `[4,3]`, relation `[1,3]`), labels >= 13px rendered, `onNodeClick` → `location.hash = "#/files/" + path` (agent → `agents/<x>.md`, issue → `#/issue/<n>`). Panel neighbour list = keyboard/screen-reader fallback (links). Reduced motion: `cooldownTicks(0)` after `warmupTicks(100)`.

## 5. Translator (C18)
`translate.js` (`KeshTr`):
- Detect: `available = "Translator" in self && !matchMedia("(pointer:coarse)").matches`. Not available → hide button, log `translate_unavailable` once per session (detail: reason `no_api|mobile`).
- Direction: Thai ratio of doc text (`/[\u0E00-\u0E7F]/`) > 0.2 → `th→en` (label `แปลเป็น EN`), else `en→th` (`แปลเป็น TH`). On click only (user activation): `await Translator.availability({sourceLanguage, targetLanguage})`; `"unavailable"` → toast + log; else `Translator.create({..., monitor(m){ m.addEventListener("downloadprogress", ...) }})` inside the click handler before any other await that could lose activation (call `create` first, then `availability` only for messaging). Memo the translator per direction.
- Walk: TreeWalker over text nodes of the rendered doc; skip ancestors `pre, code, kbd, samp, script, style, [translate=no]`; skip whitespace/number-only nodes. Translate per text node, concurrency 4, keep structure.
- Toggle: keep the original rendered DOM (clone) per file; pressed again → restore. `aria-pressed`, label `แสดงต้นฉบับ (TH)`. Display only, never writes files.
- Cache: in memory Map + `localStorage["levana_tr_v1"]` keyed `dir|sha1(text)` (use `crypto.subtle.digest` SHA-1, hex 12 chars), LRU cap 1500 entries; whole doc fast-path key `dir|blobOid` when the oid is known.
- Log `translate_used` (path, dir, nodes, ms, cache hits). No text in log.

## 6. Supabase log (C19)
### Rin must do (Kotev cannot)
1. Create a Supabase project (free). Copy **Project URL** and the **publishable key** (`sb_publishable_...`; legacy anon key also works) into `config.js` (or send to Kesh). Both are public by design (factcheck); RLS protects data.
2. SQL editor → run:
```sql
create table public.levana_log (
  id bigint generated always as identity primary key,
  ts timestamptz not null,
  received_at timestamptz not null default now(),
  level text not null check (level in ('debug','info','warn','error')),
  event text not null check (char_length(event) <= 64),
  route text check (char_length(route) <= 200),
  device jsonb,
  tz text check (char_length(tz) <= 64),
  message text check (char_length(message) <= 2000),
  detail jsonb check (pg_column_size(detail) <= 8192),
  session_id text check (char_length(session_id) <= 40),
  app_version text check (char_length(app_version) <= 40)
);
create index levana_log_ts on public.levana_log (ts desc);
alter table public.levana_log enable row level security;
revoke all on public.levana_log from anon, authenticated;
grant insert on public.levana_log to anon, authenticated;
grant select on public.levana_log to authenticated;
create policy log_insert on public.levana_log for insert to anon, authenticated with check (true);
create policy log_read_rin on public.levana_log for select to authenticated
  using (auth.uid() = '<RIN_USER_ID>'::uuid);
```
3. Auth → Users → "Add user" / send magic link to Rin's own email; copy the user id into `<RIN_USER_ID>` and re-run that policy. Then Auth settings: **disable new sign-ups**. Add the Pages URL to Auth → URL configuration (redirect allow list).
4. Optional: open the Log page at least weekly, or the free project pauses after 7 days of low activity (restorable).

### Reading (no secret in the page)
Two ways: (a) Supabase dashboard Table editor; (b) Log page sign-in: email field → `POST {url}/auth/v1/otp {email, create_user:false}` → magic link returns to `#/log` with `access_token` in the hash → store in `sessionStorage`, strip from URL, read with `GET {url}/rest/v1/levana_log?select=*&order=ts.desc&limit=200` + `Authorization: Bearer <access_token>`. Expired token → show sign-in again. Only Rin's uid passes RLS.

### Client (no SDK; `fetch` only)
Insert: `POST {url}/rest/v1/levana_log`, headers `apikey: <key>`, `Content-Type: application/json`, `Prefer: return=minimal` (required: anon has no SELECT), body = array (batch). If key is a legacy JWT also send `Authorization: Bearer <key>`.
Entry: `{ts: ISO with offset, level, event, route: location.hash, device: {brands, mobile, platform} from navigator.userAgentData (fallback: {ua: navigator.userAgent.slice(0,160)}), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, message, detail, session_id (random per tab), app_version}`. No geolocation, no IP, no token, no file text.
Queue: `localStorage["levana_logq"]` (cap 500, drop oldest + count dropped); local view buffer `levana_log_local` (cap 1000). Flush: on load, on `online`, every 30 s, on `visibilitychange` hidden with `fetch(..., {keepalive:true})`; batch <= 50; 4xx (not 408/429) → drop batch and log locally `log_rejected`; 5xx/network → keep, backoff 30 s → 5 min. Not configured (`supabaseUrl` empty) → local only, Log header shows "เก็บในเครื่องนี้เท่านั้น (ยังไม่ตั้งค่า Supabase)".
Events: `app_start` (viewport, mode), `route_view`, `fetch_error` (code, status, path, remaining, retryAfter), `api_status` (on change), `token_saved`/`token_cleared` (no value), `recheck`, `usage_state` (live/stale/missing on change), `file_open` (path), `graph_open` (mode, nodes, links), `translate_used`/`translate_unavailable`, `export_jsonl`, `js_error` (window `error` + `unhandledrejection`, message + source:line, 2000 chars max), `log_rejected`.
Log page: filters (search, level counts, time range 1h/24h/7d/all, device), table, expand row JSON, `ส่งออก JSONL` (current filter, Blob download). Header "Supabase · เขียนล่าสุด hh:mm:ss" from last successful flush.

## 7. Bugs from qa-baseline
| Bug | Fix | Test |
|---|---|---|
| api.js:108 recheck keeps `cache.ws` | delete `g`, `ws`, `u` | fetch.test: recheck → ws() returns a new object |
| api.js:28/47 `Bearer null` | add `Authorization` only when `token()`; no token → throw `{code:"auth"}` before fetch | fetch.test: no token → no fetch call, code auth |
| issues(first:100) no paging | loop `after: endCursor` while `hasNextPage`, max 10 pages; merge into snap issues | fetch.test with 2-page fixture |
| logic.js:21 fmtTok `1000k` | choose unit after rounding (`Math.round(n/1000) >= 1000` → M) | logic.test: 999600 → "1.0M" (match existing M format), 999 → "999", 1500 → "2k"/existing style |
| activeRun / actionQueue | activeRun filters `status==="open"`; remove actionQueue (C7) | logic-v2.test updated |
| `_template.md`, non-runs | section 2 | parse.test |
| `pending` overrides done | section 2 | parse.test |
| dead `timed` branch, TOKENS_PER_PCT | removed with window5h | delete their tests |
| retrying marks partial GQL as OK | set ok only if no `errors`; partial → keep ok but `notes` | fetch.test |
| history(first:10) | display only; leave, note in README | — |

## 8. Tests
- Update: `logic-v2.test.js` (navModel 6 items + redirects, activeRun, remove queue/window tests), `logic.test.js` (fmtTok, remove pct5h), `fetch.test.js` (bugs above, usage 404 → null), `parse.test.js` (section 2), `aggregate-db.test.js` (filtered runs count).
- Add: `test/usage.test.js` (usageState live/stale-by-age/stale-by-reset/missing/clamp; boundary exactly 15 min), `test/graph.test.js` (buildGraph A/B on fixture tree: relative links, anchors, mentions, code skipped, agent/issue relations, dedupe), `test/logbus.test.js` (entry shape, no token field, queue cap, batch split, 4xx drop vs 5xx keep, unconfigured = local), `test/translate.test.js` (direction heuristic, skip-selector walker on a jsdom-free fake node tree or pure function over a node list, cache key), `test/vendor.test.js`.
- e2e: `smoke.js` default `OUT = design/v3/build-shots`; abort if resolved OUT is inside `design/v2` or `design/shots`. Fixtures: route-intercept GitHub (GQL, trees, usage.json on `levana-usage` live/stale/missing/404), Supabase (`**/rest/v1/levana_log` 201), force-graph served from vendor. Shots: 6 pages × 1440/390 × light/dark + summary states (loading, empty, error, stale, missing) + files graph A/B 1440 + log expanded row. `behaviours.js`: drawer (open, Esc, focus return, tab trap), redirects, runs filters counts, issue count 5 vs 3, tree keyboard, graph node click → file, translate hidden when no `Translator`, log queue flush after `online`.
- `.github/workflows/test.yml`: unchanged command; ensure new tests do not need KESH_ROOT (skip like parse.test).

## 9. Chunks (commit separately, in order)
Parallel: chunk 1, 2, 3 and 9 are independent (different files; 9 is in claude-dotfiles). 4 needs 1. 5-8 need 4. 10 last.

| # | Chunk | Done-check |
|---|---|---|
| 1 | parse.js status + isRun + Handoffs? + has_followups; api ws filter; consumers of "pending" | parse tests green incl. real-runs block with KESH_ROOT=/home/user/claude-dotfiles; open <= 2 |
| 2 | Bug fixes: Bearer null, recheck, issues paging, fmtTok, retrying partial | new fetch/logic tests green |
| 3 | Vendor force-graph + SHA256SUMS + LICENSES + vendor.test | size 173,081 B; vendor.test green |
| 4 | Shell: index.html, style.css base, app.js sidebar/drawer/H1 row, logic parseRoute/navModel + redirects; old views unlinked; `get token` link | all 6 routes render (existing content ok); redirects test; behaviours drawer test |
| 5 | Usage: logic.usageState, api.usage, views/summary.js (USAGE, KPI, GIT ISSUE 5/3, agent table), remove window5h/queue/KPI tiles | usage.test green; summary shots 1440/390 incl. stale + missing |
| 6 | Runs, Issues, Agents views restyle | runs filter counts match parse; shots |
| 7 | Files: tree + doc + toolbar + mobile sheet; graph.js + buildGraph + mdBatch; translate.js | graph.test, translate.test green; click node opens file in e2e |
| 8 | logbus.js + config.js + views/log.js + event wiring + sign-in | logbus.test green; works with empty config (local only); e2e flush mocked |
| 9 | claude-dotfiles statusline.py + push_usage.py + test + .gitignore | `python -m unittest scripts/test_statusline.py` green; sample stdin produces exact schema |
| 10 | e2e smoke/behaviours update, README, full shot set in `design/v3/build-shots/` | `node --test` all green, `node e2e/smoke.js` ALL OK, `node e2e/behaviours.js` ALL OK, `git status` shows no change under design/v2 |
| 11 | (waits for Rin) delete `views/today.js, usage.js, lessons.js, errors.js, more.js` and dead ui helpers | Rin approval recorded in run log |

## Open questions for Rin (blockers only)
1. **PC setup for usage (blocks real 5h data, not the build):** OK to install/use GitHub CLI `gh` (`gh auth login`, scope `repo`) and add to `~/.claude/settings.json`: `"statusLine": {"type":"command","command":"python C:/Users/<you>/.claude/scripts/statusline.py"}`? This pushes `usage.json` about every 5 min to a new branch `levana-usage` (not main). Needs Python 3 on PATH (already used by `scripts/runlog.py`).
2. **Supabase (database change, blocks remote log only):** create the project, run the SQL in section 6, paste URL + publishable key, set your user id, disable sign-ups. Until then the Log works locally. Accept that anyone who finds the page could insert (not read) log rows?
3. **Deletes (chunk 11):** approve removing `views/today.js, usage.js, lessons.js, errors.js, more.js` after v3 works.
