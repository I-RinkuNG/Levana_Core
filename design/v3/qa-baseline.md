# Levana_Core QA baseline (before v3) — Bochek, 2026-10-30
Branch claude/jolly-lovelace-7zrde4. KESH_ROOT=/home/user/claude-dotfiles. Scratch scripts: /tmp/claude-0/-home-user/e3ba1557-2a2a-5529-b8e5-337e4eecd0e2/scratchpad/c12.js, c11.js

## 1. Test runs
- `node --test "test/*.test.js"`: tests 69, pass 69, fail 0.
- Playwright global OK. `node e2e/smoke.js`: "ALL OK". `node e2e/behaviours.js`: "ALL 25 OK".
- Note: tests only touch real runs via the 1 aggregate test; none assert status open/done on real logs (so C12 passes green).

## 2. C12 status (real parser, runs/*.md = 40 files)
- Parsed 40: done 16, open 17, pending 7. But `_template.md` is parsed as a run (done, 2 handoffs) -> real run logs 39: done 15 / open 17 / pending 7. (api.js:81 takes every runs/*.md.)
- parse.js:302 `pending_items.length ? "pending" : hasFinal ? "done" : "open"`; hasFinal (parse.js:297) = a section starting "ผลสุดท้าย". Only 17 files have it.
- Why each of the 17 "open":
  - Not runs at all (3): 2026-10-26-affiliate-pipeline-research-qc1, 2026-10-26-ai-mascot-research-qc1 (QC reports, no Handoffs), 2026-10-29-retro (retro doc).
  - Finished, different closing heading `## สรุป` (5): channel-and-render-build, followups, session-close, shutaf-next-steps, retro-fixes.
  - Finished, heading `## ผล` / `## ผล Phase B` / `## สถานะ` / `## หมายเหตุ` (4): ux-principles, levana-fetch-error, branch-cleanup, merge-kesh-main.
  - Finished but no closing section, only a Handoffs table (2): lab-team-setup, retro-skill.
  - Singular `## Handoff` heading + meta `**ผล:** เสร็จ ...` (2): autoharness-review, zekher-z1-z2-z4. parse.js:252 `/^Handoffs\b/` fails on "Handoff" -> 0 handoffs parsed (token/bounce data lost too).
  - Really unfinished (1): 2026-10-30-levana-v3 (current run).
- Also: 6 of 7 "pending" runs are finished (have `## ผล` + `## ค้าง` follow-ups); only fb-post-reader has ผลสุดท้าย. "pending" there means "follow-ups exist", not unfinished.
- Suggested rule: (a) skip files that are not runs (name starts with `_`, or no `# Run:` title and no Handoff(s) table). (b) accept `/^Handoffs?\b/`. (c) finished = any of: section starting ผลสุดท้าย|สรุป|ผล|สถานะ, or meta `ผล:` non-empty, or all handoffs have a result. (d) open only when none of (c) and latest handoff has empty result. (e) keep "pending" as a separate flag (has_followups) instead of overriding done. Expected: ~34 done, 1 open.

## 3. C15 5h % vs real Claude usage (logic.js)
- Source is only handoff-table token cells in run logs (parse.js:76 parseTokens, computeTokens:159). Cells with no number are null and count 0: 70 of 199 handoffs (35%) have null tokens; 9 of 39 runs have tokens_total null.
- Missed: Kesh/main-session own tokens (rows from Kesh self are mostly null), any chat outside run logs, other Claude surfaces (web/app/Code) sharing the same limit, input/cache vs output weighting (cell is whatever the writer typed; "~" approximations).
- Cumulative cells ("(สะสม)") are converted to deltas per agent only by last-seen value (parse.js:166); a missing earlier row breaks the delta.
- Window start is a guess: parser never sets `started_at` (grep: only read at parse.js:512, logic.js:150-155) so the `timed` branch is dead; window5h always uses the `estimated` branch (logic.js:156-158): fixed 5h blocks from LOCAL midnight (00-05-10-15-20), not Anthropic's rolling window that starts at first message.
- `used` = ALL tokens of runs whose id starts with today's date (logic.js:159), not only those inside the block; runs dated today but done in an earlier block are counted. Run date has no time, so day-boundary and timezone (browser local vs author's) mismatch.
- Run dated yesterday that spans past midnight: 0 counted.
- TOKENS_PER_PCT = 15000 (logic.js:3) is a constant guess; real limit depends on plan, model and caching. Check: today 234,912 tokens -> 15.66% shown. No calibration source.
- reservedTokens / projection reuse same constant; projection (logic.js:116) extrapolates linearly from a guessed start.
- Browser clock only; no real server value. No API in repo reports Claude usage.

## 4. C11 Token ต่อ agent shows bounce, no tokens
- NOT reproduced from code+data: ui.js:54 opCard always renders `fmtTok(c.tokens)` (class op-val, 24px) and views/today.js:83-87 passes real cards; with real runs agentCards(7d) gives kotev 1334784, rosh 1276301, amet 842127, cheker 794485, bochek 730373 ... (c11.js). v2 screenshot design/v2/build-shots/today-1440-light.png shows numbers (mock data).
- Likely causes of what Rin sees: (1) compact card (full=false) shows token at the top but bounce as a red warning line, so bounce dominates; (2) tokens are the handoff-table estimates (null cells = 0, so agents with unmeasured work read "0"/low: tak 88k/1 handoff); (3) no "actual used" source (see C15); (4) ui.js:60 "token 7 วัน" label only on full cards. Needs Rin's screenshot to confirm which. Cannot verify live GitHub data (no token).
- Related bug: agentCards ranks within group then ranks again globally (logic.js:238-239); Today re-sorts and renumbers (today.js:81) — OK but rank in card is not stable across pages.

## 5. Bugs v3 will keep
- api.js:81 and logic.js: `_template.md` and non-run docs in runs/ are parsed as runs (counted in Runs, Usage "RUNS", aggregate g1).
- api.js:108 `recheck()` deletes cache.g only; `cache.ws` (derived from snap) stays, so Today/Runs keep old data after recheck. Repro: call KeshApi.recheck() then KeshApi.ws() -> same object.
- api.js GQL: issues(first:100) and history(first:10) have no pagination; repo with >100 issues silently truncated (logic.js:56). Files over GitHub blob size -> `partial` and are dropped (logic.js mapGraphql).
- logic.js GQL_QUERY only fetches runs/agents/lessons; views/files.js:11 loops plans/research via separate REST (dir()), which still use per-file requests. Check C16 explorer cost.
- api.js:30 `Authorization: "Bearer null"` is sent when no token (token() returns null); onceGql same (api.js:44). Produces 401 instead of a clean no-token path.
- api.js:70-75 `retrying` calls setStatus(true) on any success, including GraphQL partial responses (logged but status says OK).
- parse.js:252 Handoff vs Handoffs (see C12). parse.js:302 `pending` overrides `done`.
- logic.js:164 activeRun = newest non-done run -> with the 17 false "open" runs it picks a wrong run; actionQueue (logic.js:261) then shows "รออนุมัติ" for it. Fixing C12 fixes this; C7 removes the queue.
- logic.js:21 fmtTok: 999600 -> "1000k" (rounds before M threshold). Minor.
- logic.js:150-155 dead `timed` branch (started_at never set) — remove or implement.
- No test covers status derivation on real run logs, window5h estimated branch, or recheck cache behaviour.
