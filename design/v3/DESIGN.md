# Levana v3 — layout spec (Tzayar, 2026-10-30)

Mockup: `mockup.html` (open from file; fonts are the repo's `../../fonts/*.woff2`, no network). Query flags: `?page=summary|runs|issues|agents|files|log`, `&mode=light|dark`, `&state=ready|loading|empty|error|stale|missing`, `&view=graph&gm=b`, `&shot=1`. Tokens: unchanged from D4 (`design/v2/d4/tokens.css`) plus `--side-w 240`, `--tree-w 280`, `--page-w 1040`, `--head-h 56`, `--r-sm 8`, `--warn/--warn-bg`. Fonts, colours, spacing scale, 44px tap, motion all as D4.

## 1. Shell
| Width | Behaviour |
|---|---|
| <1024 | Sidebar = drawer (fixed, `min(320px,90vw)`), opened from the 44px menu button in a 56px sticky header that always shows the current page title. Scrim, Esc closes, Tab trapped, focus returns to the button. Page `<h1>` becomes screen-reader only (title already in header). Padding 16. |
| >=1024 | Sidebar persistent, sticky, full height, 240px, `--bg` fill; main = `--surface` (white / near-black), no grey canvas. Header bar hidden; page `<h1>` 28px. Padding 32. |
| Content width | Single column, max 1040 (Log 1160, Files full width). Left aligned; no centred dashboard grid. |
Sidebar: brand text, 6 items (สรุป, Runs, Issues, Agents, Files, Log), icon + label, active = 3px orange bar + white fill + 600 weight + one cut corner. Footer = theme toggle only. No repo/branch text, no counts.

## 2. Page grammar (anti-template)
Pages have only an H1 row (title left; freshness + 44px refresh right). Sections are separated by whitespace and one hairline, headed by a plain H2. There are no label tabs, no numbered tabs, no captions. Each section uses the form that fits its data: ring (USAGE), definition list (KPI), link rows (GIT ISSUE), table (agents, runs, log), tree + document (Files). The only ornament is corner brackets on the USAGE block.

## 3. Pages
**Summary** (order fixed): USAGE | 7-day KPI side by side at >=1024 (6fr/5fr), stacked on mobile; GIT ISSUE; TOKEN ต่อ AGENT.
- USAGE: ring 168px, `%` 56px in centre, from `rate_limits.five_hour.used_percentage`. Beside it: `รีเซ็ต 14:26 (อีก 1 ชม. 28 น.)` from `resets_at`, and `ณ 12:58` (captured_at). <600px: 20-dot matrix (1 dot = 5%, filled = round(%/5)) + 56px number; ring hidden. No legend, no conversion, no reserve. Footer row: Token API chip (icon + word) + `ตรวจใหม่` + `get token` (external icon, `target=_blank rel="noopener noreferrer"`, sr text "เปิดแท็บใหม่"). `get token` turns primary (orange) when token is expired.
- KPI (no tiles, 2x2 with hairlines): tokens per handoff + delta vs previous 7d (icon + sign + figure); bounce count "14 จาก 114" + % + worst agent n/m (red only if >20%); runs done / open; lessons added 7d.
- GIT ISSUE: top 5 open. Row = state icon + `#n` + title (600), 2-line excerpt (line-clamp, Thai wraps), label chips (dot + word), right meta: age, comment count, assignee (wraps under on mobile). Whole row is a link. "ดู issue ทั้งหมด (n)" below.
- Agent table: sorted by tokens; columns agent (swatch + name), tokens, handoffs, tokens/handoff, share, bounce n/m. Only bounce >20% highlighted (red + warning icon + %). Mobile: handoffs, share and tokens/handoff columns drop (tokens/handoff moves into the name cell), first 5 rows + "แสดงทั้ง 10 agent".
- Token-expired notice: conditional banner (state=error). No QUEUE, no BRIEF, no RUN cell.

**Runs**: `run คืออะไร` disclosure (one line, only place run is defined), text filters (ทั้งหมด / เสร็จ / กำลังทำ / มีงานค้างต่อ with counts), search, table: run name, start, handoffs, tokens, status. Status per Bochek's rule: chip `เสร็จ` or `กำลังทำ` (open = no finish evidence AND latest handoff has no result); `มีงานค้างต่อ` is a separate flag chip (has_followups), `ตีกลับ n` red chip. Non-runs (`_template.md`, QC/retro docs) never appear. Mobile: stacked rows.

**Issues**: restyled only (same rows as GIT ISSUE, full list). Not otherwise changed (Rin: OK).

**Agents**: H1 then a table only: swatch letter, name, หน้าที่, ทำงานล่าสุด, lessons link. No header strip or legend.

**Files** (merges Lessons): list-detail. >=1024: sidebar 240 | tree 280 (sticky, own scroll, search on top, folders with chevron, `role=tree`) | document. Toolbar (sticky): path, segmented `เอกสาร | กราฟ`, `แปลเป็น EN` button. Document = rendered md, 72ch. Graph view replaces the document: SVG canvas + right panel (280): mode radio (A links/mentions between .md files, B + agent and issue nodes), legend, and a text list of neighbours (keyboard/screen-reader fallback). Node shapes: file = square, agent = circle with letter + agent colour, issue = diamond with #; edge style: solid = link, dashed = mention, dotted = agent/issue relation. Labels 19px in viewBox (>=13px rendered at 495px canvas). Zoom + / − / fit 44px. Production: force-graph (Rosh), click node opens file. <1024: tree = full-screen sheet opened by `ไฟล์` button (focus trap, Esc); graph stacks canvas above panel.
- Translate: button shown only where `'Translator' in self` and desktop Chrome/Edge; hidden elsewhere (mobile, Firefox, Safari) and the Log records `translate_unavailable`. It toggles label `แปลเป็น EN` / `แสดงต้นฉบับ (TH)` with `aria-pressed`; display-only, skips `<code>/<pre>`. In the mockup the button is always drawn at >=1024 and hidden below.

**Log** (was Errors): filter row (search, level text-filters with counts, time range, device), sticky-header table: time, level (icon + word), event, route, device, timezone, message, 44px expand chevron; expanded row shows the JSON entry. Header shows "Supabase · เขียนล่าสุด hh:mm:ss" and `ส่งออก JSONL`. `LogEntry` = ts (ISO with offset), level, event, route, device (UA-CH brands/mobile/platform), tz (Intl timezone = the only location), message, detail json. Mobile: stacked row time/level/event/message + chevron; route, device, tz appear in the expanded JSON.

## 4. States (all pages; switch with `state=`)
| State | Treatment |
|---|---|
| loading | Skeleton shaped like the content (ring circle, rows) under the real H1 row; pulse off under reduced motion. |
| empty | Per list: icon + bold cause + next step + 44px button (Issues: none open; Runs: no run files / token; Log: where logs come from, Supabase pause note). |
| error | Banner (role=alert): what failed, HTTP code, time, which data is shown (old), `ลองอีกครั้ง` + `get token`; token chip red "หมดอายุ". Old data stays visible. |
| usage stale | Ring grey + `ข้อมูลเก่า` chip (icon + word) + "ณ 09:12" and "รอบนี้รีเซ็ตแล้วตอน 09:26". Value not shown as live. |
| usage missing | Dashed empty ring "—" (20 empty dots on mobile) + "ยังไม่มีค่า 5 ชั่วโมง" + cause (no usage.json / not Pro-Max / no message yet). |

## 5. What changed from D4
Removed: bottom nav, numbered/pill label tabs, status strip, BRIEF, QUEUE, RUN cell, KPI tiles, operator cards/SQUAD header, token-to-% conversion + reserve segment + legend, grey canvas + rounded card grid, Usage page, Lessons page (merged into Files), Errors page. Added: side nav at every width, ring + dot matrix, usage freshness states, get token button, 4 new KPIs, GIT ISSUE rows, agent token table, Runs status flags, Files tree + document + graph + translate, Log table. Kept: D4 colours (orange = press, cyan = data), fonts, spacing scale, 44px taps, status = icon + word, bracket accent (now USAGE only), diagonal cut on the active nav item.

## 6. Notes for build
- Run status derivation, `## Handoff` singular, `_template.md` skip: see qa-baseline.md §2; the mockup assumes ~34 done / 1 open.
- usage.json shape: `{five_hour:{used_percentage,resets_at}, seven_day:{...}, captured_at}`; stale when `now > resets_at` or captured_at older than a set limit (suggest 15 min, Kesh/Rin to confirm).
- Agent identity colours appear only on swatches and graph agent nodes.
