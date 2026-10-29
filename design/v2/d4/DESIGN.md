# Levana v2 · D4 — final design spec (build from this)

D4 = the merge Rin chose after round 2: **D3 layout + colour roles, D2 type + rounded cards + spacing, D1 numbered label tabs + operator cards.**
Source of truth for values: `tokens.css`. Mockups: `mockup-today.html`, `mockup-run.html`, `mockup-agents.html` (open from file; `?mode=light|dark&state=ready|loading|empty|error&shot=1`).
Mockup source (Kotev may reuse markup/CSS): `src/d4.css`, `src/today.html`, `src/run.html`, `src/gen-agents.mjs`, `src/build.mjs`, measurements `src/shoot.mjs` -> `src/measure.json`.

## 1. Principles
1. **Orange = press, cyan = data.** `--act*` only on buttons, links, active nav icon, action tabs (`QUEUE`, `ACTION`). `--data*` on every measured value mark (bars, diamonds, %). Op-card initial blocks use `--agent-*` identity colours (see Agent identity). Never orange on a chart, never cyan on a button.
2. **Status is never colour alone.** ok / bad / running chips always carry an icon + Thai word. Bounce > 20% = `--bad` text + warning icon + red bar.
3. **Every panel has a numbered tab** (`WORD NN` or `WORD n/m`), mono, inside the padding. No panel without one (fixes D1 "Run ล่าสุด" bug).
4. **Brackets are rare:** only the 3 main panels — action queue, 5h budget, active run (stage track). Other panels are plain rounded cards.
5. Action before numbers: the first panel on mobile is always what Rin must do.

## 2. Tokens (see tokens.css for every value)
| Group | Tokens | Notes |
|---|---|---|
| Fonts | `--font-disp` Anuphan 600 · `--font-body` Noto Sans Thai 400/600 · `--font-mono` JetBrains Mono 400/600 | All OFL, Thai-capable. Self-host WOFF2 (thai+latin subset), `font-display:swap`, preload Noto Sans Thai 400/600. Mockup uses Google Fonts CDN only for convenience. |
| Type scale | meta 13 · small 15 · body 17 · h2 20 · h1 28 · val 32 · hero 56 | body lh 1.6, headings 1.3, display 1.15. Meta (13) only for secondary info. Numbers: `tabular-nums`. |
| Spacing | 4 / 8 / 12 / 16 / 24 / 32 / 48 | `--pad`/`--gap` = 16 mobile, 24 at >=1024 (D2's relaxed rhythm). |
| Shape | `--r` 14 card · `--r-in` 10 inner card · `--r-tab` 6 tab · `--r-ctl` pill buttons/chips | |
| Bracket | `--br` 16 arm · `--br-w` 2 · `--br-off` 6 outside the card | drawn by `.br::before` (8 linear-gradients). Card gets `margin:6px` so brackets never touch neighbours. |
| Colour light | bg #e9eaef · surface #fff · surface-2 #f3f4f7 · sunken #dfe1e7 · ink #14151b · ink-2 #4a4d5a · slab #14151b | |
| Colour dark | bg #0f1015 · surface #181920 · surface-2 #1f2029 · ink #eeeef3 · ink-2 #a6a8b6 · slab #2c2e3a | dark cards get `inset 0 0 0 1px var(--line)` |
| Action | `--act` #b8440b / #ff8a3d · `--on-act` #fff / #1a0d02 · `--act-ink` (link text) #a63d09 / #ffa264 | |
| Data | `--data` (marks) #0a7ea8 / #249bce · `--data-ink` (text) #0b6383 / #5cc8ef · `--data-bg` chip bg · `--data-tint` op-card initial bg | |
| Status | `--ok` #1b6e45 / #55d394 · `--bad` (text) #b3192b / #ff7a85 · `--bad-mark` (chart marks) #b3192b / #ec5866 | `--bad` text and `--bad-mark` differ in dark on purpose (validator lightness band). |
| Motion | `--dur` 140ms, `--ease` | 0ms + no animation under `prefers-reduced-motion`. Only hover colour/border, skeleton pulse. |

### Chart palette (dataviz validator, run 2026-10-29)
Series actually drawn: `--data` (single series: 5h used, token bars, reasons) and `--bad-mark` (over-threshold bounce bar, bounced stage diamond). Reserved 5h segment = same cyan with 135° hatch texture + legend label (texture is the secondary encoding, not decoration).
- Light `#0a7ea8,#b3192b` on #fff: all 5 checks PASS (CVD ΔE 18.2 deutan, normal 29.4, contrast >=3:1).
- Dark `#249bce,#ec5866` on #181920: all 5 checks PASS (CVD ΔE 16.3 protan, normal 29.3). First dark try (#38b6e8/#ff7a85) FAILED the lightness band (L>0.67) — that is why marks use `--bad-mark`/`--data`, while text keeps the brighter `--bad`/`--data-ink`.
- `--ok` green is NOT a chart colour (green/red deutan ΔE 3.6 in dark — fails). It appears only in chips with icon + word.

## 3. Components
| Component | Class | Spec |
|---|---|---|
| Panel | `.blk` | surface, r14, pad 16/24. Header `.hd` = `.tab` + `h2` (+ optional `.more` link right). |
| Main panel | `.blk.br` | + corner brackets. Only: queue, 5h budget, active run / stage track. |
| Label tab | `.tab` (`.tab.act` for action panels) | slab bg, mono 13/600, letter-spacing .08em, radius 6, 3px 8px, diamond pip (cyan; orange for `.act`). Text = `WORD NN`. Today: `QUEUE 03` `WINDOW 3/5` `STAGE 4/6` `KPI 03` `LOG 29` `SQUAD 4/10` (mobile `2/10`). Run: `ACTION 01` `STAGE 4/6` `HANDOFF 06` `BOUNCE 01` `RUN 029` `AGENT 05`. Agents: `SQUAD 10`, group tabs `BUILD 05` `CHECK 05`. Empty state shows `00`. |
| Status strip | `.strip` | D3 top strip: one rounded surface, cells divided by 1px `--line`. Mono label + display value. 3 cells <600 (5H · API · BOUNCE), 5 cells >=600. |
| Brief | `.brief` | slab line with mono `BRIEF`/`ALERT`. Desktop only on Today (duplicates queue on mobile). |
| Action queue | `.q-list > .q` | numbered `01–03` via CSS counter (display 28/24px, ink-2; red for `.q-bad`), mono verb (APPROVE/ALERT/ISSUE), Thai title + meta, one button. Only item 1 is `.btn.primary`; others outline. Mobile: button top-right beside verb. |
| 5h budget | `.meter` | **Hero = countdown** `รีเซ็ตใน 01:48:20` (56px display). Secondary: `ใช้แล้ว 62%` (28px, data-ink). Bar 16px: used (cyan) · 2px gap · reserved (hatched cyan, "จองให้ Kotev") · rest sunken. Legend with % + ≈token. Foot: `1% ≈ 15k token` + projection. Bar has `role=img` + full aria-label. |
| Stage track | `.stages` | diamonds 14px rotated squares + mono step number `01–06`. done = filled cyan; now = 18px cyan with ring + cyan name; bounced = filled `--bad-mark` + meta "ตีกลับ n" in red; todo = outline. 3 per row on mobile and in narrow columns, 6 per row 600–1023. |
| Operator card | `.op` | D1 card, rounded 10: initial block (`--agent-<name>` bg via `data-ag="<name>"`, `--on-agent` text, 48px letter, 40px on mobile; mono index top-right) → name slab (caps) → role, token value (24px), cyan bar vs max, bounce line. `.op.warn` (bounce >20%): 2px red edge + icon + red bounce text; identity block stays. Agents page adds `dl` (handoff, ตีกลับ %), bounce bar on a 0–50% scale with a 2px ink tick at 20%, and a `lessons N` link (44px). |
| Run rows | `.rows` | mono id, name, tokens right, status chip. 4 on desktop, 3 on mobile. |
| Handoff timeline | `.tl` | mobile: `# · from › to · chip` / time / token bar + value / bounce reason box (`--bad-bg`). >=1024: table-like 4 columns with `.tl-head` (`# · จาก → ถึง · TOKEN · ผล`). Token bars cyan, relative to largest handoff. |
| Bounce reasons | `.reasons` | label + count + cyan bar (counts are data, not status). |
| KPI | `.kpi` | mono label, 32px value, meta. 3-across on mobile, stacked rows in narrow desktop columns. |
| System / token API | `.sys` | key icon, "GitHub token API" + chip ใช้ได้ / ใช้ไม่ได้ (401), `ตรวจล่าสุด HH:MM (n นาทีที่แล้ว)`, button "ตรวจอีกครั้ง" (44px). |
| Buttons | `.btn`, `.btn.primary`, `.iconbtn`, `.more` | all >= 44px. Pills. Hover: border/text → orange (outline) or `--act-hover` (primary). Focus: 2px `--focus` outline, offset 2. |

## 4. Layout per breakpoint
| Width | Shell | Content |
|---|---|---|
| < 600 | bottom nav (5: วันนี้ · Runs · Issues · Agents · เพิ่มเติม), 56px items, page padding 16, bottom 96 | single column in task order (CSS `order`): **Today** strip (5H · RESET · BOUNCE, then full-width GitHub token API row with 44px re-check button) → queue → 5h → stage → runs → squad (top 2 cards, tab `SQUAD 2/10`, bottom row = over-threshold alert + "ดูทั้งหมด 10" link). KPI + brief hidden. No SYS panel at any width. **Run** approve → stage → handoffs → bounce → agent tokens (summary hidden; in strip). **Agents** strip → alert → BUILD group → CHECK group (2-col cards). |
| 600–1023 | bottom nav, padding 24 | single column, strip 5 cells, stages 6-across, cards 4-across, queue button right. |
| >= 1024 | 232px side rail (slab pill for current page, counts), padding 32 | **3 columns (D3), each column stacks its own panels** (no grid-area row coupling). Today 4fr/6fr/4fr: [5h, KPI] [queue, stage] [squad, runs]. Run 3fr/7fr/4fr: [summary, agent tokens] [stage, handoff table] [approve, bounce reasons]. Agents: full width, 5 cards per group row. |

Max content width 1400. No page-level horizontal scroll at 320/390/1440 (measured).

## 5. States (every view)
| State | Behaviour |
|---|---|
| loading | Header, strip labels and every panel tab + title stay; content becomes skeleton blocks shaped like the content (`.sk i`, pulse 1.2s, off under reduced motion). Freshness line reads "กำลังโหลด…". `aria-busy` on `.app`. Never a blank screen. |
| empty | Panel stays with tab `00`; `.empty` row: icon + bold Thai cause + next step (+ primary button where an action exists, e.g. "เริ่ม run ใหม่"). Today: queue/stage/log empty. Run: "ยังไม่มี handoff — Kesh เพิ่งรับงาน…". Agents: "ยังไม่มีสถิติใน 7 วัน". |
| error | `role=alert` banner under strip: what failed + HTTP code + time + which data you are seeing + "ลองอีกครั้ง". Old data stays visible; each stale panel title gets "· ข้อมูล HH:MM". Strip API cell flips to ใช้ไม่ได้ (red text), sys chip flips to ใช้ไม่ได้ (401). |
| refreshing | keep data, freshness line `aria-live=polite` updates. |

## 6. Accessibility / content rules
- Contrast measured on all 33 screenshots: min 5.18:1 (ok chip text on ok-bg, light). Focus ring 2px `--focus` (3:1+ on both surfaces).
- `overflow-wrap:anywhere; word-break:normal` globally; Thai titles wrap (never ellipsis).
- Icons decorative `aria-hidden`; arrows in timeline have `.sr` text "ส่งให้"; bars have `role=img` + Thai aria-label.
- Agent names / ids `translate="no"`. Thai quotes use “ ”.
- Theme: system default + toggle (`data-theme-toggle`, remembers in localStorage `lvn-mode`), `color-scheme` set, `theme-color` follows `--bg`.

## 7. Don'ts
- No orange in charts, no cyan buttons. No brackets on secondary panels. No green as a chart series. No glow, no clip-path corners (D4 is rounded). No Arknights / CZN / Cyberpunk assets, logos or fonts.

## 8. Open for Kotev / Rin
- Mobile page length is 2.6–2.8 viewports (rule says <= 2.5) — see SCORE.md R15.
- Mockup switcher (`.mock`) is not part of the product.

## Agent identity colours
Identity only: the op-card initial block (and a card stripe if one is added later). Never on charts, bars, diamonds or other data marks. Always shown with the letter + name, never colour alone. Hues avoid action orange, data cyan, status red and status green. Tokens are in `tokens.css` (`--agent-<name>`, text `--on-agent`: #fff in light, #14151b in dark). Hook: `.op[data-ag=<name>]`.

| Agent | Light / Dark | Text contrast L / D | Why |
|---|---|---|---|
| Rosh | #4c4c9e / #b0b6ff | 7.41 / 9.53 | Indigo: research lead, deep and scholarly, the most "thinking" colour |
| Cheker | #645642 / #c9bba9 | 7.11 / 9.68 | Kraft-paper beige: raw material, collected without interpretation |
| Amet | #6b5600 / #d0be76 | 7.10 / 9.81 | Gold: the gold-standard seal on a verified fact |
| Zekher | #773b84 / #dea6ea | 7.66 / 9.32 | Plum: archive ink, the team's memory |
| Bona | #24569f / #91c0ff | 7.22 / 9.70 | Blueprint blue: the architect who draws the plan first |
| Kotev | #426323 / #aaca91 | 6.91 / 10.03 | Moss: steady workhorse builder, a terminal tone that stays clear of status green |
| Bochek | #8b306a / #f59ecf | 7.70 / 9.26 | Magenta marker: QA's highlighter, loud without being error red |
| Tak | #585858 / #bebebe | 7.11 / 9.80 | Graphite: the optimizer strips things down to the essentials |
| Oseh | #455b6d / #acc1d3 | 7.07 / 9.82 | Steel: plain machinery that just runs the command |
| Tzayar | #654199 / #c9acff | 7.58 / 9.39 | Violet: the designer, the creative hue |
