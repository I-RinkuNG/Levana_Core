# D4 self-score (Tzayar) — ux-playbook §7

**This is a self-score. It does not replace an independent heuristic evaluation (Bochek + a 3rd evaluator, blind).**
Scope: Today, Run detail, Agents × 390/1440 × light/dark (+ loading/empty/error on all three; + 320px light). 33 Playwright shots in `shots/`, numbers from `src/measure.json` (`node src/shoot.mjs`).

| R | Result | Evidence (measured) | Sev | Note / fix |
|---|---|---|---|---|
| R1 | PASS | script: 0 visible a/button/select under 44×44 in all 33 shots (fixed: `.more` was 39px wide, run iconbtns shrank to 36px → `min-width`, `flex:none`) | 0 | |
| R2 | PASS | body 17px; min font 13px only on meta/mono labels; row data 15px | 0 | |
| R3 | PASS | body lh 1.6, h 1.3, display 1.15; no fixed height on Thai multi-line text | 0 | |
| R4 | PASS | widest body text: approve copy in 4fr column ≈ 40 Thai chars; queue meta ≈ 45 | 0 | |
| R5 | FAIL | scale 4/8/12/16/24/32/48 everywhere except micro values: tab padding 3px, gaps 2px/6px, bracket offset 6px | 1 | #4 consistency. Accept as micro-adjust or round to 4/8 in build |
| R6 | PASS | brackets on 3 panels only; Agents outer panel flattened so cards are the only frame; Today squad = 1 nested layer | 0 | |
| R7 | FAIL | text sizes 13/15/17 + headings 20/28 + display 24/32/56; weights 400/600 | 1 | #8. Display sizes are numbers only; consider dropping 15 → 17 later |
| R8 | PASS | bottom nav 5 items with labels, 5th = เพิ่มเติม | 0 | |
| R9 | PASS | scrollWidth = clientWidth at 320, 390, 1440 on all pages | 0 | 360 not shot separately (320 passes) |
| R10 | PASS | loading: skeleton + "กำลังโหลด…" + aria-busy; refresh keeps data, aria-live freshness | 0 | timing is Kotev's |
| R11 | PASS | skeletons keep tabs, titles, strip labels; shaped like rows/cards (`*-loading.png`) | 0 | |
| R12 | N/A | static mockup | – | Kotev: ≤10 requests/view |
| R13 | PASS | 390: queue top y=246 (Today; strip now carries the API row), approve y=235 (Run); KPI panel hidden on mobile | 0 | |
| R14 | PASS | ≤2 levels (Today → Run detail → reason box inline) | 0 | |
| R15 | FAIL (Today PASS) | 390 page height: Today **2093px (2.48 vp) PASS** (was 2366: squad shows top 2 + alert row with "ดูทั้งหมด 10", SYS panel folded into strip); Run 2205 (2.61), Agents 2305 (2.73) still over; limit 2110 | 2 | Run/Agents unchanged this round. Backlog: Agents mobile could collapse CHECK group behind a toggle; Run could fold the bounce panel into handoffs |
| R16 | PASS | Agents 10 cards grouped 5 + 5 (BUILD / CHECK) | 0 | |
| R17 | PASS | "อัปเดต 14:32 (2 นาทีที่แล้ว)" under title + 44px refresh on all pages | 0 | |
| R18 | PASS | min text contrast 5.18:1 over 33 shots (ok chip, light); dark min 5.37. Agent identity blocks (computed): light white-on-colour 6.91 (Kotev) to 7.70 (Bochek); dark #14151b-on-colour 9.26 (Bochek) to 10.03 (Kotev) | 0 | |
| R19 | PASS | "Run 029 levana-redesign-d4" wraps to 2 lines at 390/320, not cut | 0 | |
| R20 | PASS | loading/empty/error on Today, Run, Agents (`*-loading/-empty/-error.png`), Thai cause + next step | 0 | |
| R21 | FAIL | Noto Sans Thai + Anuphan + JetBrains Mono, swap — but via Google CDN, no preload | 1 | spec in DESIGN.md §2 says self-host WOFF2 + preload; build task |
| R22 | PASS | global `overflow-wrap:anywhere; word-break:normal`; no ellipsis | 0 | |
| R23 | PASS | reduced-motion: `--dur:0`, all animation/transition none | 0 | |
| R24 | PASS | 320px clean; zoom 200% ≈ 720px falls in the 600–1023 single-column layout (not shot separately) | 0 | rem migration optional |
| R25 | PASS | no severity ≥3 | – | |

**Summary:** 20 PASS · 4 FAIL (R5 sev1, R7 sev1, R15 sev2, R21 sev1) · 1 N/A. Highest severity 2. **Ship gate: PASS** (sev 3–4 = 0). Backlog: R15.

## Other checks run
- **dataviz palette validator:** light `#0a7ea8,#b3192b` / #fff PASS 5/5; dark `#249bce,#ec5866` / #181920 PASS 5/5 (first dark try failed lightness band → fixed).
- **web-design-guidelines:** fixed: svg `aria-label` without role → `.sr` text; straight quotes → “ ”; added `aria-live` freshness; `scroll-padding-bottom` so the fixed bottom nav never covers focus. Remaining: fonts not preloaded (R21).
- **impeccable critique (DEGRADED: single-context, launcher not executable, no sub-agent tool):** detector flagged `wide-tracking` (.06em on mono — only short caps labels, kept), `monotonous-spacing` (2/4px micro gaps), advisory `repeating-stripes` (= the reserved-budget hatch, a data texture Rin asked for; kept). Design review: hierarchy reads queue → countdown → stage; mid column on Today desktop ends ~270px above the side columns (acceptable, no holes); op-card initial tint uses data cyan as identity colour (minor, consider neutral tint).

Round 2026-10-29b (Rin answers): agent identity colours, SYS into strip, Today squad top-2 on mobile. Self-score only; it does not replace an independent heuristic evaluation.
