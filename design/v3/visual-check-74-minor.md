# Visual check of Kotev's #74 minor fixes (1307ab5, b5a0aa0), Tzayar

Method: own Playwright script (e2e/harness, fixtures, token init-script, 2.5s graph wait) at 390 light+dark and 1440 light+dark. Screenshots in scratchpad only (not tracked): /tmp/claude-0/-home-user/e8e1a462-caf0-5722-a1d9-ab9c9e2b029b/scratchpad/ graphb-{390,1440}-{light,dark}.png, agents-{390-light,390-dark,1440-light}.png, summary-{390-light,390-dark,1440-light}.png. Eyeballed plus computed font-family; not a heuristic evaluation. Opened: graphb-390-light/dark, graphb-1440-dark, agents-390-light, summary-390-light.

## 1. Graph mode B at 390 - PASS
- All 20 labels shown (agents, issues, 4 files), none skipped visibly, none overlapping. Central file labels (README, rosh, agents/kotev, lessons/kotev) now sit about 50-110px apart (was 15-20px). Dark is identical and readable.
- Leftover sev 1 (already known, not new): edges run through "README.md" and "lessons/kotev.md" text; still readable. Halo (strokeText) would fix it.
- Graph B 1440 (dark viewed): small cluster as accepted; labels readable, no overlap.

## 2. Agents at 390 - PASS
- Every row is 3 lines: role, last run, then Tokens + Lessons on one line; no orphan wrap, rows evenly spaced (about 153px).
- Sev 0-1 nit: Lessons link x-position drifts by row (about 161px after "263k", 152px after "12k"/"—") because the two items are inline, not columns. Cosmetic.

## 3. Thai in mono table headers - PASS
- Computed font-family on th with Thai (หน้าที่, ทำงานล่าสุด, Tokens 7 วัน in Agents; ต่อ handoff, สัดส่วน, ตีกลับ in Summary): "JetBrains Mono", "Noto Sans Thai", ui-monospace... Thai glyphs render in Noto Sans Thai (consistent stroke, correct tone marks) in Summary 390 shot; no serif/system fallback look. Agents 390 headers are hidden (card layout, height 0) so Thai there is only seen at 1440 (computed stack identical).

## Verdict
3/3 PASS, no blockers. Only leftover: sev 1 edge-through-label in graph B.
