# Levana v3 visual check: build vs mockup (Tzayar, step 5)

Method: eyeballed build-shots against mockup.html / DESIGN.md. Heights read from PNG headers (px / 844). No new shots made; check-shots/ not created. Not a measured re-run of the R-checklist, so the R table is a self-score delta only, not a heuristic evaluation.
Viewed: summary 390/1440 light, summary 390/1440 dark, summary stale (390, 1440), missing 390, runs 390/1440, files 1440, graph A/B, drawer, tree sheet, log 390/1440, agents 390. Header-only (not opened): agents/issues/issue/run 1440 + dark variants, issue/run/issues 390, log-expanded, summary loading/error/empty. Treat those as unchecked.

## Verdict
No blockers. 3 majors (stale mobile dots, Log message wrap, drawer shot unusable as evidence). Layout, hierarchy, tokens, dark mode, tap sizes match the mockup closely.

## Per page
**Summary 1440 light/dark: matches.** Ring, KPI 2x2, 5 issues, 10-agent table, bracket accent, bounce highlight only on >20%. Differences:
- minor: page `<h1>` shows a boxed focus ring in every 1440 shot (route-change focus on h1). Fine for keyboard; if it appears on mouse/programmatic nav it looks like a stray frame. Suggest `:focus:not(:focus-visible){outline:0}` on h1[tabindex=-1]. (summary-1440-light)
- minor: sidebar ends at y=900 in full-page shots (screenshot artefact, sticky; not a build bug).
- minor: label chips on issue rows absent (data has none); excerpt text is raw "รายละเอียด ข้อ 1 ข้อ 2 alert(1)", fine for the fixture.
- minor: agent swatch letters duplicate (B Bochek/B Bona, T Tak/T Tzayar); colour distinguishes, name sits beside. Same as mockup.

**Summary 390 light/dark: matches, differs on issue count.** 2046px = 2.42 vp. Build shows 3 issues on mobile; DESIGN.md says top 5. Keep 3 and update DESIGN.md (see R15). minor: get token wraps to a second row under the chip + ตรวจใหม่ (mockup the same at 390). Dark: contrast/dots/chips fine.

**Summary stale: partly matches.**
- major: 390 stale still shows blue filled dots (4/20) and full-ink 21% beside the chip; DESIGN.md says value not shown as live, grey. Desktop ring correctly grey (summary-stale-1440-light) but 21% stays full black. Make dots grey/hollow-grey and dim the number. (summary-stale-390-light)

**Summary missing: matches with minor.** Cause copy present, 20 empty dots. minor: a stray thick black bar above "ยังไม่มีค่า" reads as a broken dash; use the "—" at 56px or drop it. minor: copy mentions `usage.json`/`rate_limits` jargon (mockup had the same cause list; keep, but put plain cause first). (summary-missing-390-light)

**Runs: matches.** Filters with counts, chips (icon+word), ตีกลับ red chip, stacked rows on mobile. minor: mobile stat pair "Handoffs 3 / Tokens 108,000" right-aligned under left-aligned date looks loose; put on one row. 1440 has large empty space only because the fixture has 3 runs.

**Issues / Issue / Run detail: not opened.** Only dimensions: run-390 = 2.85 vp (detail page, outside R15 dashboard scope but worth a look).

**Agents 390: matches** (swatch + name + role + last + lessons link). minor: lesson link "Lessons 13 ข้อ" mixed EN/TH; fine.

**Files 1440: matches** (sidebar | tree | doc, segmented toggle, breadcrumb). minor: `แปลเป็น EN` absent; correct per spec (Translator not in headless Chromium), the Log records `translate_unavailable`. Confirm in real Chrome.

**Graph A/B 1440: matches structure, with defects.**
- major: Graph A shows two nodes both labelled "kotev.md" (lessons/ and agents/) with no folder hint, and no edges; neighbour panel says none. Disambiguate labels (parent/ name) or show a tooltip. (files-graph-a-1440-light)
- minor: B has overlapping labels (Kotev over kotev.md, Rosh over rosh.md); graph label text renders about 11px, below the 13px spec. Canvas is 520px tall and leaves the lower half empty; use the viewport height.
- Legend, shapes (square/circle+letter/diamond), line styles all present. Edges in B hard to see at this size.

**Drawer 390: cannot verify.** drawer-390-light shows the drawer half off-screen (content clipped at x<0), a mid-transition capture, with the fixed drawer painted mid-page in a full-page shot. Not evidence of a bug; needs a viewport-only shot after transition end (or wait for `transitionend` / use reduced motion). Treated as major only because focus-trap/visibility cannot be confirmed.

**Tree sheet 390: matches** (full-screen sheet, search, close 44px, tree). minor: full-page capture lets the document show through below the sheet (same fixed-position artefact; use viewport-only shot).

**Log 1440: differs.**
- major: message column is ~50px wide, so Thai and Latin words break mid-word ("Transla/tor", "summa/ry"); row heights uneven. Violates R22. Widen message (drop timezone or device to a second line / the expanded row) and keep `overflow-wrap:anywhere` only as a last resort. (log-1440-light)
- minor: header text "เก็บในเครื่องนี้เท่านั้น (ยังไม่ตั้งค่า Supabase)" is accurate; fine. Table otherwise matches.

**Log 390: matches** (stacked rows + 44px chevron, level icon+word). minor: export button wraps to two lines; shorten to "ส่งออก".

## R1-R25 change vs mockup self-score
Only changed or at-risk rows; all others unchanged from the mockup score (not re-measured).
| R | Mockup | Build | Evidence | Sev | Note |
|---|---|---|---|---|---|
| R15 | fail (3.08 vp, 5 issues) | PASS, thin | summary-390 = 2046px = 2.42 vp with 3 issues; +2 issues (~245px) would be ~2.71 and fail | 1 (keep 3 on mobile) | Update DESIGN.md: mobile Summary shows top 3, desktop top 5. Other 390 pages: agents 1.97, log 1.88, files 1.37, runs 1.07 pass |
| R22 | pass | FAIL | log-1440-light mid-word breaks | 3 | fix before ship |
| R16 | pass | pass | Files tree grouped | 0 | |
| R20 | pass | pass for sampled states; loading/error/empty shots not opened | | | check |
| R19, R9, R1, R2, R18 | pass | no failure seen in sampled shots (taps look 44, no horizontal scroll visible, dark contrast fine) | not measured | | run measure script |
| R25 | pass | cannot claim | 3 sev-3 items above | 3 | |
Ship gate (self-score): NOT passed until Log wrap, stale mobile and graph label/dup issues are fixed and the drawer is re-shot.

## Fix order for Kotev
1. Log message column wrap (R22). 2. Stale state: grey dots + dim number on mobile. 3. Graph: disambiguate duplicate labels, fit height, label size 13px+, avoid overlap. 4. Retake drawer/tree-sheet as viewport shots after transition. 5. h1 focus ring only on :focus-visible. 6. Missing-state dash glyph. 7. Update DESIGN.md for mobile top-3 issues.
