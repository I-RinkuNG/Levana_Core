# Visual re-check of 4b0a7b3, ce9e4ba, 408109f (claude-dotfiles#74), Tzayar

Method: eyeballed the fresh smoke shots (1440 light graph A/B, log 1440 light, log-expanded, log 390 dark, files 390) and 6 extra graph shots I took (A/B at 390 light, 390 dark, 1440 dark; scratchpad only, not committed). Not measured, not a heuristic evaluation. Not opened: log-1440-dark, log-390-light (same CSS as the viewed ones).

## Verdict
No blockers. Items 1-3 pass on desktop light. Mobile graph mode B is the one real defect (sev 2). Rest is minor.

## 1. Graph mode B, 1440
- PASS: file nodes are separated (README / rosh / agents/kotev about 60-130px apart), no node overlap; agents and issues sit on outer rings; labels are 13px and no label sits on another label. Dark 1440 identical and readable.
- FAIL sev 1: edges cross labels "README.md" and "rosh.md" (the line runs through the text). Still readable. views/graph.js:90 (label drawn below node with no edge-avoid; add a surface-colour halo, `ctx.strokeText` with lineWidth 3/k, before fillText).
- FAIL sev 1: in B the graph is fitted at zoom about 1 (centre cluster about 440px of a 560px canvas, 10px squares) while A is zoomed to 2.5. Nodes look tiny next to 13px labels. views/graph.js:108 (cap/fit differs; acceptable, note only).

## 2. Log 1440
- PASS: Route is one line, 24ch, ellipsis ("#/files/lessons/kot..."); full route + device ("อุปกรณ์: HeadlessChrome 153 . Linux") in the expanded row; all rows 69px, even; message column single-line. style.css:320.
- FAIL sev 1 (docs): DESIGN.md:33 still lists device and timezone as table columns; build moved device to the expanded row and tz is only in the JSON. Update DESIGN.md line 33.
- FAIL sev 1: cells are top-aligned while the chevron is centred, so time/level/event baselines and the chevron differ by about 12px per row. style.css:320 area (`table.log td{vertical-align:middle}`).

## 3. Graph mode A, 1440
- PASS: labels 13px; neighbour list has one entry each ("README.md . ลิงก์", "rosh.md . ลิงก์"); no duplicates.
- PASS (acceptable): graph spans about 420 of 560px canvas, about 70px empty each side, and fills the canvas height (nodes from y=240 to y=660 of 730). Centred composition is fine for a 4-node graph; no need to stretch. Optional: mode A could fit wider with a lower padding (zoomToFit padding 60 at graph.js:108), not needed.

## 4. 390 and dark
- Graph A 390 dark: PASS. Clear, 13px labels, edges visible, no overlap; canvas 674px tall leaves a lot of empty vertical space (content about 250px of 674px).
- Graph A/B dark 1440: PASS (contrast fine, agent letters readable, selected ring orange).
- Graph B 390 (light, same in dark): FAIL sev 2. Cluster is about 200px wide inside a 358x674px canvas; agents sit 15-25px apart so 3-4 agent labels are dropped (unlabelled dots near README, Cheker/Zekher side) and the rest crowd: "Tzayar/Rosh", "README.md" on the central node, "agents/kotev.md" touching "lessons/kotev.md". Node dots about 8px, below the 44px tap target (taps are via the neighbour list, so the sev stays 2). Cause: canvas height clamp(360px, 100vh-170px, 860px) gives 674px but the ring layout is not scaled to the portrait aspect and zoomToFit is width-limited. views/graph.js:66 (use a shorter canvas on mobile, e.g. `clamp(320px,70vw,520px)`), :14 `layout` (use smaller ring radii or ellipse so it fits portrait), :108 (padding 60 is large on 358px).
- FAIL sev 1: at 390 the panel (modes, legend, neighbours) starts at y=870, below the 844px fold, so the user must scroll to switch mode. Same fix as above (graph.js:66).
- Log 390 dark: PASS (stacked rows, level icon + word, chevrons about 44px, export button one line). Log 390 light not opened.
- Log expanded 1440: PASS. Device line and route line readable above the JSON.

## Fail list
| # | Sev | Item | Hint |
|---|-----|------|------|
| 1 | 2 | Graph B at 390: tiny cluster in tall canvas, labels dropped/crowded | views/graph.js:66, :14, :108 |
| 2 | 1 | Graph panel below the fold at 390 | views/graph.js:66 |
| 3 | 1 | Edges cross labels in B 1440 | views/graph.js:90 |
| 4 | 1 | Log cells top-aligned vs centred chevron | style.css:320 |
| 5 | 1 | DESIGN.md:33 still lists device/tz columns | design/v3/DESIGN.md:33 |

Self-score delta: R22 no longer fails for Log route or graph B at 1440; remaining R22-type risk is graph B at 390 (sev 2). Ship gate (self-score): passes; fail #1 recommended before ship, not blocking.

---

# Round 2: re-check of f524419, 436deb1 (Tzayar)

Method: eyeballed shots-r2 (graph B 390 light/dark, graph B 1440 light, log 1440, log expanded) plus one extra graph B 1440 dark shot (scratchpad only). Read style.css:320-321 and DESIGN.md:33. Not a heuristic evaluation. Not opened: graph A 390 (not part of the fixes).

| # | Item | Result | Sev | Evidence |
|---|------|--------|-----|----------|
| 1 | Graph B 390 light + dark | PASS (residual sev 1) | 1 | Canvas about 395px tall (was 674); issue diamonds span x=36..346 so the cluster fills the width. All 9 agent labels now drawn, none dropped, no label-on-label overlap. Residual: the centre file labels (README.md, rosh.md, agents/kotev.md, lessons/kotev.md) sit about 15-20px apart and are tight but legible. Light and dark identical in layout. |
| 2 | 390 panel above 844 fold | PASS | 0 | Panel heading "โหมด" at y about 620, panel top about 608-611; the mode radios (y 640-780) are fully above 844. |
| 3 | Label halo, 1440 light + dark | PASS | 0 | graph.js:92 strokeText with surface colour, 4/k. The vertical README.md to lessons edge no longer runs through "README.md", "rosh.md" or "lessons/kotev.md"; dark equal. |
| 4 | Log cells vertically centred | PASS | 0 | style.css:320 `table.log td{vertical-align:middle}`. Time y=228, level y=227, event y=229, chevron y=229 (was about 12px off). |
| 5 | DESIGN.md:33 vs build | PASS | 0 | Lists time, level, event, route, message, chevron; tz column only at >=1600px (matches style.css:321, hidden 600-1599); device line in the expanded row (matches the log-expanded shot). |

Note only (unchanged, sev 1): at 1440 graph B the cluster is still about 300px wide in a 560px canvas with 10px nodes; acceptable.

Verdict: no fails. Fail #1 from round 1 (sev 2) is closed; items 2-5 closed. Ship gate (self-check): passes.
