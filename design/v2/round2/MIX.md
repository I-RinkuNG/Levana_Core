# Levana v2 round 2: three A×B mixes (Today page)

Files: `mockup-d1|d2|d3.html` (each opens on its own; `?mode=light|dark&state=ready|loading|empty|error&shot=1`). Use the theme button to switch light/dark and the "สถานะ" select to switch state. `shots/d<n>-today-<390|1440>-<light|dark>.png`. Source: `src/` (`base.css` is shared; `d1|d2|d3.css` hold the tokens and the composition for each draft). Rebuild with `node design/v2/round2/src/build.mjs`.

**Kept from round 1 in every draft:** the IA, action queue first, 44px targets, 17px body, Thai line-height 1.6, AA contrast, motion of 140ms or less (0 under reduced-motion), and status shown as icon plus text.

**Rin's answers, applied in every draft:**
- The 5h meter has a hatched "จองให้ Kotev" segment for the running agent (8%) between used and left.
- Any bounce rate over 20% is red with an icon: Bochek at 24% gets a queue alert, a red agent card, and a red figure in the BRIEF line.
- The "token expires" message is gone. The ระบบ panel now shows **GitHub token API: ใช้ได้ / ใช้ไม่ได้ (401)**, "ตรวจล่าสุด 14:30", and a re-check button. The header strip shows `API ใช้ได้`.

**What changes between drafts is the composition, not only the colour.** Round 1's three directions shared one layout. Here each draft has its own grid, its own form for the queue, meter, run and agents, and its own frame language.

## D1 · Depot (closest to Arknights home menu)
The screen is a terminal home menu. Big tiles carry big condensed verbs (APPROVE / ALERT / ISSUE) like the "Combat / Operator" tiles. The lead tile is a black slab with a caution stripe. The 5h figure reads like a sanity counter ("62 % / 100"). The active run is a stage map.

| | What | Why (principle / playbook rule) |
|---|---|---|
| From A | Cut top-right corners (two-layer clip-path), black label slabs that bleed to the left edge, caution yellow, condensed numerals (Barlow Condensed), cyan accent | Rin taste §5 (cut corners, tactical numerals). Slabs label the panels without adding a second frame (R6) |
| From A | Square controls, 1px line frames | One shape vocabulary per draft (consistency, Nielsen #4) |
| From B | Pale per-agent tints on the operator cards, and the "brief" line as one solid fill strip | Identity tint, not data. Keeps hue for status (playbook §3: colour for emphasis, not quantity) |
| New | Asymmetric home-menu mosaic on desktop: meter + KPIs on the left (5fr); the queue on the right (7fr) as a 2×2 tile mosaic with the lead tile spanning 2 rows | The F-pattern puts the action top-right of the main column. The largest block answers the screen's question (R13, §6) |
| New | Stage-map relay: numbered nodes on a rail, done = filled, now = accent with an offset ring, plus a yellow ground stripe | Shows where the run is without a chart. Progressive disclosure (R14) |
| New | Operator cards: a 56px initial as the "portrait", the name on a slab band, the 7-day token count, and a bounce bar | Game "operator card" feel without any game art (no assets) |
| Game feel | Tile mosaic, slab captions, hazard stripe, sanity-style counter, stage nodes, black side rail with a yellow active item | |

## D2 · Formation (closest to CZN codex / team formation)
Soft lavender sheets and rounded cards. Pill controls throughout. The queue is a hand of three mission cards, each with a rarity bar along its foot. The 5h meter becomes a countdown screen: a dark panel with orange corner ticks and a 44px countdown. Agents are combatant cards.

| | What | Why |
|---|---|---|
| From B | 14px radius, pill buttons/chips/tags, lavender/orchid palette, Anuphan display, the "enter" ring glyph on the primary button | Rin taste §6 (CZN palette). Pills give a 44px target with no corner cut eating into it (§0) |
| From B | Countdown as the hero figure inside a thin HUD frame with corner ticks | The reset time is the second question ("how long until budget returns?"). One hero figure per panel (R7) |
| From A | A dark slab for the brief strip and the meter panel; mono tactical codes in outlined pills | Contrast step instead of nested frames (R6). Value and saturation carry the hierarchy (§3) |
| New | The queue as 3 equal mission cards on desktop (card deck), stacked on mobile. Each has a pill tag, a big ID numeral top-right, and a colour rarity bar keyed to its type (red = alert) | Cards fit here because the items differ in content (R16). Colour is backed by the tag text (never colour alone) |
| New | Stage-select pills for the relay; the current stage is a filled accent card | A familiar stage-select pattern. The current step reads at a glance (Nielsen #1) |
| New | Combatant cards: a 48px initial over a tint "portrait", the 7-day total bottom-left, the name, and a rarity bar | Matches the CZN combatant list (big numeral bottom-left) |
| New | Desktop grid "queue queue meter / relay relay kpis / squad squad runs" | Action plus budget in the first row at 1440×900 (R13). KPIs become a right rail of pill counters |
| Game feel | Card deck with rarity bars, countdown screen, codex capsule header (LVN pill + title), pill nav with a dark active capsule | |

## D3 · Sortie (balanced hybrid: deploy screen HUD)
Three zones, like a sortie/deploy screen. The left column is a status rail (segmented energy gauge, countdown chip, KPI rows, system). The centre is the mission brief (numbered orders 01-03, then the run's stage diamonds). The right column is the squad roster plus recent runs. Every panel sits in a 4-corner HUD bracket instead of a box.

| | What | Why |
|---|---|---|
| From A | Neutral steel ground, square panels, tactical mono codes with a diamond marker, diamond stage nodes (Arknights stage map), Chakra Petch numerals (squared, Thai-capable) | Rin taste §5 (bracket lines, tactical labels) |
| From B | Pill buttons and nav, orange highlight as the action colour (CZN), countdown chip | The orange accent marks only actions and the current stage (one accent, §3) |
| From A+B | A segmented 20-cell energy gauge (each cell = 5% ≈ 75k token) with the hatched reserve | The cells make "about how many 5% steps are left" countable without reading the number (preattentive, R13) |
| New | 4-corner bracket frames (L corners only, no full outline) | Grouping by proximity plus a light marker rather than a nested box (R6). Reads as a HUD targeting frame |
| New | Mission orders: large 01/02/03 numbers in the gutter (the order is the priority, so numbering carries information), verb label, Thai title, pill action | Section numbers are allowed here because the sequence is real priority (impeccable craft floor) |
| New | Roster rows for agents (initial, name/role, value, bounce, bar) | Denser and scannable in a narrow rail (R16) |
| Game feel | Three-zone deploy layout, HUD brackets, energy cells, diamond nodes, numbered orders | |

## Self-score (Playwright-measured; self-score, not an independent heuristic evaluation)
Measured on the final build. Viewports: 390×844 and 1440×900, light + dark (12 captures), plus 320px, 720px (≈200% zoom of 1440), the reduced-motion emulation, and loading/empty/error at 390.

| R | D1 | D2 | D3 | Evidence |
|---|---|---|---|---|
| R1 tap ≥44 | PASS | PASS | PASS | 0 interactive elements <44px in all 12 captures; bottom nav items 56px; gap 8px |
| R2 type | PASS | PASS | PASS | body 17px; smallest text 13px (meta/mono only) |
| R3 Thai lh | PASS | PASS | PASS | body lh 27.2px = 1.6; headings 1.3; no fixed height on Thai text |
| R4 measure | PASS | PASS | PASS | Longest Thai line at 1440 is in the D1 queue tile / D3 centre, under 60 characters |
| R5 spacing | PASS | PASS | PASS | Only 4/8/12/16/24/32/48 tokens; the 2px/6px are borders and the rarity bar, not spacing |
| R6 grouping | PASS | PASS | PASS | Queue/KPI containers are frameless; the cards inside are the only frame (1 level) |
| R7 ≤3 sizes + 2 weights | PASS* | PASS* | PASS* | 13/15/17/20 text + display numerals; weights 400/600. *15px is used for controls: same as round 1, noted |
| R8 nav ≤5 | PASS | PASS | PASS | 5 labelled items |
| R9 no overflow | PASS | PASS | PASS | scrollWidth = clientWidth at 320, 390, 1440 (nav 320/320) |
| R10 feedback | N/A | N/A | N/A | static mockup; the refresh spec carries over from round 1 |
| R11 skeleton | PASS | PASS | PASS | `state=loading` mirrors the blocks (st-loading capture) |
| R12 speed | N/A | N/A | N/A | production concern (fonts via CDN in the mockup) |
| R13 action first, KPI ≤4 | PASS | PASS | PASS | Queue top at y=160/155/160 (390), the first action fully visible in 844; 3 KPIs |
| R14 disclosure | PASS | PASS | PASS | The agent panel is a `<details>` collapsed on mobile; "ดูทั้งหมด 29" / "ดู agent ทั้ง 10" |
| R15 ≤2.5 viewports | PASS | PASS | PASS | Page height at 390 is 2071 / 2065 / 2026px (limit 2110) |
| R16 lists | PASS | PASS | PASS | top 4 runs, 4 of 10 agents |
| R17 freshness | PASS | PASS | PASS | "อัปเดต 14:32 (2 นาทีที่แล้ว)" under the title + 44px refresh |
| R18 contrast | PASS | PASS | PASS | Minimum text contrast 5.25/6.31 (D1 L/D), 4.87/6.56 (D2), 5.10/6.59 (D3) |
| R19 title | PASS | PASS | PASS | The h1 "วันนี้" is never cut |
| R20 states | PASS | PASS | PASS | loading / empty (cause + "เริ่ม run ใหม่") / error (401 cause + retry + stale data) |
| R21 fonts | PASS (mockup) | PASS (mockup) | PASS (mockup) | Thai stack + system-ui; self-host is a production note |
| R22 wrap | PASS | PASS | PASS | `overflow-wrap:anywhere`; no ellipsis |
| R23 reduced motion | PASS | PASS | PASS | Emulated reduce: animationName = none, --dur 0ms |
| R24 zoom/320 | PASS | PASS | PASS | No overflow at 320 or at 720 (≈200% of 1440) |
| R25 heuristic, sev ≥3 = 0 | PASS | PASS | PASS | Self-critique found no severity-3 issue (see the backlog) |

**Ship gate:** PASS for all three (severity 3-4 = 0). These severity-2 items go to the backlog:
- In the error state, stale data is at 72% opacity. text contrast there was not measured and may fall below 4.5:1. Use a "ข้อมูลเก่า" tag plus a muted background instead of opacity.
- D3 desktop leaves about 150px of empty space under the agent roster at 1440 (grid row coupling).
- D3 diamond nodes drop the stage numbers; the names carry the order.
- The D1 meter "/ 100" suffix is decorative and should be checked with Rin.
