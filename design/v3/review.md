# Levana v2 build review vs CR v3 (Tzayar, step 1)

Sampled: today 390/1440 light, usage, files, runs, issues, lessons 1440 light; D4 DESIGN.md + tokens.css. Dark not re-viewed (same layout).
Fact check: the 1440 shots already have a left sidebar (~230px). Mobile has a bottom bar (4 + "เพิ่มเติม"). So C1 is probably about the mobile bottom bar and/or how heavy the sidebar looks. Kesh/Rin to confirm; I assume "sidebar on every width".

## C1 navbar -> sidebar
- Now: desktop sidebar is a white strip that stops at 900px (screenshot artifact; check it is sticky + full height in the build). Mobile = fixed bottom bar that floats mid-page in the Today shot. The "Errors" and "ไฟล์" items sit under "เพิ่มเติม" on mobile.
- v3: one sidebar component for all widths. >=1024 persistent 240px, sticky, full height. <1024 slide-in drawer from a 44px menu button in the header, with a scrim, Esc and focus trap, and the full list (9 items, no "more" menu).
- Tradeoff: playbook R8/§4 say don't hide nav in a hamburger. Mitigate: current page title always in the header, drawer opens in 1 tap. Needs Kesh/Rin OK because it overrides the playbook.

## C2 PC looks like a website (layout proposal)
- Now: 1440 = sidebar + 3 equal-ish bracketed/numbered cards on a grey canvas (Today). That is the dashboard-template look. Same on Usage, Lessons, Files (2-col card grid).
- Proposal (>=1024):
  - Sidebar 240 | main. Main is a single reading column, max-width ~960, left-aligned under a page H1 (the page header is the only chrome). No tiles grid.
  - Sections separated by whitespace + H2 + hairline, not by card boxes. A card only wraps things that are real objects (an issue, a run row).
  - Lists become full-width rows/tables (like GitHub/Docs), with hover rows.
  - Lessons/Files page (C16): 3 panes: sidebar 240 | explorer tree 280 (sticky, scrolls alone, collapsible) | document pane (max 72ch Thai, ~760px). Graph and translate toggle sit in the document pane toolbar. Below 1024 the tree becomes a "ไฟล์" drawer/sheet opened from a toolbar button.
  - Summary page: lead with a 1-line status sentence, then the sections in the order of C8-C11 (see below), each with a plain H2. No numbered tab labels.
- Keep from taste: bracket corners only as a single accent on the page hero/the Usage hero, mono EN micro labels, diagonal cut on the active nav item. Drop the numbered tabs `WINDOW 4/5` etc. (these are C3 noise).

## C3 / C13 remove explanatory + decorative text
- Now: every panel has a black pill tab (`QUEUE 03`, `SQUAD 4/10`, `KPI 03`, `LOG 03`, `LESSON 03`, `runs 3`) plus a Thai title = 2 headings per block; sublines like "7 วันล่าสุด · เรียงตาม token", "1% ≈ 15k · ตามอัตรานี้จะเหลือ 71% ตอนรีเซ็ต", "รีเซ็ตใน (ประมาณ)", Agents header text. Sidebar footer `claude-dotfiles main` and "core" suffix are decoration.
- v3: one heading per section, no pill tabs, no count-tabs. Keep micro text only if it changes a decision (e.g. "ข้อมูลเก่า"). Delete sidebar footer or move repo/branch into a tiny tooltip. Rule: a line stays only if you can say what Rin does differently because of it.
- Agents page: header strip removed; just the grid/table of 10.

## C4 status strip smaller
- Now: Today strip is a white card ~88px tall, 5 cells (5H / RESET / RUN / BOUNCE / TOKEN API) with mono label above value and a 3rd line; on mobile it is 2 rows ~160px.
- v3: no strip. Put 3 inline facts in the page header row, one line, 28px high: `ใช้ 21% · รีเซ็ต 01:26 · token ใช้ได้`. Token status = small dot + word, with the C6 buttons (below). Moves the 5H facts into the C8 USAGE block, so the strip disappears.

## C5 RUN cell "002 · 4/5"
- Now: shows run log sequence and handoff 4/5. Meaningless (also on mobile it is hidden/cut).
- v3: delete it. The only useful form is "run ที่กำลังทำ: levana-v3 · ขั้น 4 จาก 5 · Kotev" and that already exists as the STAGE panel, so keep it only there (and only when a run is truly open, see C12). Never show a bare run number alone; names over numbers.

## C6 token API + "get token"
- Now: key icon + "ใช้ได้ / ตรวจ 08:33" + icon-only refresh (44px).
- v3: a small "Token API" row in the USAGE block footer or in the page header: status chip (ok/หมดอายุ/ไม่มี, icon + word) + two labeled buttons: "ตรวจใหม่" (refresh) and "get token" (external-link icon, opens https://github.com/settings/personal-access-tokens, `target=_blank rel="noopener noreferrer"`). Both >=44px tall, 8px gap. If expired/missing, "get token" becomes primary (orange) and the rest is quiet.

## C7 QUEUE
- Now: 3 numbered rows: 1 approve run, 2 and 3 are bounce alerts (derived). Big numerals 01/02/03 and a pill CTA per row; duplicates the BRIEF bar and the bounce KPI.
- v3: remove the block and the BRIEF bar. Alerts that remain real (token expired, run waiting for approval from the run log) go into one conditional notice line at the top of Summary, shown only when something is wrong. Nothing stored = nothing to maintain.

## C8 WINDOW -> USAGE, first block, no explanation
- Now: WINDOW 4/5, "งบ 5 ชั่วโมง", countdown 56px "01:26:39", 21%, bar, 3-item legend, 1% ≈ 15k note, plus the same facts again in the top strip.
- v3: heading "USAGE", first block on Summary and above the fold on 390. Content: % used (hero), "รีเซ็ตใน 1:26", token fact. No legend, no formula text. Visual per C14. Also merge the top strip into this (single source of the 5H number).

## C9 KPI replacement
- Now: HANDOFF 8 / BOUNCE 22% / ISSUES 2 with "เมื่อวาน 2", "เกิน 20%", "เก่าสุด 5 วัน". Handoff count alone doesn't tell what to do; ISSUES duplicates the Issues page; BOUNCE is already in the per-agent card.
- Proposed metrics (data Levana has; max 4, one line each):
  1. Tokens per handoff (avg, last 7d) with the trend vs previous 7d: shows efficiency; run logs have tokens + handoff rows.
  2. Bounce rate 7d, with the count "2 จาก 9" and which agent: the only one that implies action.
  3. Runs: finished vs open (after C12 fix) + longest-open age ("run ค้าง 5 วัน"): flags stale logs.
  4. Lessons added 7d (and agents with 0 lessons): shows whether the team is learning; from the lessons files + dates.
  Optional if room: bounce-to-fix flows (which flow pairs bounce most, e.g. Kotev -> Bochek), tokens/run median, open issue age.
- Format: a plain table/definition list, value + 1 short compare, no tiles.

## C10 LOG -> GIT ISSUE
- Now: "LOG 03 Run ล่าสุด" lists 3 run rows with mono id, name, token, chip. Issues only get "ISSUES 2" in KPI. The issue list page (OK per Rin) shows only #, title, author, date, age.
- v3: section "GIT ISSUE": open issues (top 5) as rows: `#41` title, labels as chips, assignee, age + comment count, 1-line body excerpt (2 lines clamp, Thai wrap), state chip with icon. Whole row links to the issue detail (v2 has an `issue` view). "ดูทั้งหมด" below. Runs stay in the Runs page only.

## C11 tokens per agent: show real tokens
- Now: SQUAD card of 4 operator tiles with big colored initial blocks (K, A, B, T) taking ~210px each; bounce % is the loudest datum; token shown as e.g. "263k" with a mini bar. Usage page also has TOKEN/AGENT bars and BOUNCE/AGENT bars separately. Rin sees bounce but no real token, i.e. the number is either an estimate or the plain-text value is not distinct from the bounce badge.
- Check source: tokens in handoff rows are what Kesh wrote, partly estimates. Show provenance in the header ("จาก run log, ที่ Kesh บันทึก") only once, small.
- Proposed per-agent row (table, 10 rows sorted by tokens): agent name | tokens total | handoffs | tokens per handoff | share of total (text %) | bounce n/m. Highlight only bounce over 20% (icon + text). Use a tiny inline range bar only if data-ink contrast >=3:1, otherwise numbers only. Replace tile grid with this table; keep the identity color as a 12px swatch next to the name.
- Add: tokens per handoff = tokens / handoffs: the figure that tells which agent is expensive.

## C12 (not visual, input for step 2)
- Runs page: all 3 rows show a chip, but Rin sees many "กำลังรัน": the parser marks open when `## ผลสุดท้าย` is missing. Design: add 4 explicit states: เสร็จ / กำลังรัน / ค้าง (open > N days, no final) / ตีกลับ, with an explainer line only in the empty filter state. Row layout: name, start date, handoffs n, tokens, state chip. Define RUN in one line in the page title area ("run = งาน 1 งานที่ Kesh ส่งต่อหลาย agent"), since Rin said unexplained.

## C14 5h usage without a bar/power meter (3 options)
- A. Ring/arc gauge: thin 270 deg arc with big % center (21%) and "รีเซ็ต 1:26" under it. Not a bar, reads at once, fine at 120px. Pair with text, ticks at 25/50/75. Con: still a "meter" feeling.
- B. Timeline strip of the 5 hours: 5 hour-columns/segments (h1..h5), each filled with that hour's token use (from handoff timestamps); a "now" marker. Shows when tokens were burnt, not just the sum. Needs per-hour data from handoff times; fallback to a single dot on the line.
- C. Number-first typographic: "21%" in 56px display + a dot-matrix of 20 dots (1 dot = 5%, ~75k tokens) where used dots are filled; remaining count as plain text "เหลือ 79%". Cheap, accessible, no gauge look.
- Recommend A for the hero + C as the narrow/mobile fallback. Not B unless per-hour data is reliable. (C15 true source is Bochek/Rosh, outside this review. Whatever visual: show "ประมาณ" label until value matches real.)

## C16 explorer tree
- Now: Files = 3 cards (runs 3, lessons 6, agents 10) with size in bytes; Lessons = per-agent cards of repeated "grep แทน find" rows. Neither opens a file; sorting buttons only.
- v3: tree grouped by folder (runs/, lessons/, agents/, design/, ... only what the API returns), expand/collapse with arrow keys, filename + type icon, search box at top that filters the tree. Selected file opens rendered markdown in the main pane; URL hash `#/files/<path>` so it is linkable. Empty pane state: "เลือกไฟล์ทางซ้าย". Lessons page = the same explorer pre-filtered to lessons/ (or fold Lessons into Files and keep the Lessons nav item as a shortcut). Layout in C2 above.

## C17 graph with 2 modes
- No graph exists in v2. v3: "Graph" toggle in the file toolbar (or a tab beside the document: เอกสาร | กราฟ). A segmented control in a side panel: `ไฟล์ <-> ไฟล์` (links/file name mentions) and `+ agent + issue`. Node shape/color per type (file = square, agent = circle with the agent identity color + letter, issue = diamond with #), always with a text label; edges differ by style (solid link, dashed mention) not color alone. Click node = open file/issue in the main pane; list view fallback below the canvas for keyboard/screen reader. Cap at ~60 nodes + zoom/pan buttons (44px).
- Mobile: graph full-screen sheet.

## C19 Errors -> Log
- Now: Errors is the last nav item, not sampled but listed as a separate page; no log fields.
- v3: "Log" page = table (sticky header on desktop): time (ISO + relative), level, event, view/route, device/UA (short), place (file/function or URL), message. Filters: level chips, date range, text search, device. Row expand (1 level) shows the full JSON. Mobile = stacked rows with time + level + event, tap to expand. Export button (copy/download JSONL). Empty state explains where logs come from. Note for Bona/Rosh: storage on a static site = repo file (script appends JSONL by commit), localStorage + download, or GitHub issue/Gist via the token. Design needs only a `LogEntry` shape: ts, level, event, route, device, location, detail.

## Other findings (not in CR)
- Today 390: bottom bar floats at mid-page in the shot (known `?shot=1` artifact), not a bug, but verify fixed bar doesn't cover the last row (needs bottom padding >= bar height).
- Text at 13px mono used for the micro labels is at the R2 floor; with C3 removals most disappear.
- Lessons page is 6 cards x repeated identical placeholder lines; once the tree exists this page is redundant.
- Issues and Run pages look fine structurally (list, search, chips). Issues "OK" per Rin: only restyle to the new section style (no pill tab).
- Dark mode, contrast and tap-target numbers carry over from d4 (>=6.14:1, 44px); recheck after restyle.

## Handoff for step 2 (mockup)
- Build: sidebar shell, Summary (USAGE, notice line, metrics table, GIT ISSUE, agent token table), Runs (4 states), Usage (hero ring + C), Files explorer + graph toggle, Log table. 390 + 1440, light + dark, loading/empty/error.
- Open questions for Kesh/Rin: (1) C1 mobile = drawer OK despite playbook R8? (2) C9 pick 4 metrics; (3) C14 A+C ok? (4) Is Lessons merged into Files?
