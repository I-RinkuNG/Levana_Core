# Visual check r2 of #74 fixes (5508fa1, 146306b), Tzayar

Method: own Playwright script (e2e/harness, token init-script, 3s graph wait, deviceScaleFactor 2), screenshots in scratchpad only (nothing tracked touched). Eyeballed all 4 graph shots plus DOM measurement. Not a heuristic evaluation.

## 1. Graph B, edges vs labels (5508fa1) - PASS
- 390 light, 390 dark, 1440 light, 1440 dark (canvas 356x398 and 558x728 CSS px): no edge is visible through any label text. Checked README.md, lessons/kotev.md, agents/kotev.md, rosh.md, Kotev, Rosh, Bochek. Where an edge passes under a label the `--surface` halo masks it, so the text reads on a clean ground in both modes.
- Why it works now (code read, views/graph.js:93-98): labels are drawn in `onRenderFramePost`, after links and nodes, so the halo (strokeText, lineWidth 5/k, lineJoin round) sits above edges. In f524419 the halo was in the node pass, so later-drawn links painted over it. That is the likely cause Kotev could not find.
- Side effect, sev 0-1 (cosmetic): halo also clips edge ends that terminate near a label (e.g. the README-to-lessons edge starts just under the "README.md" text, rosh.md edge stub next to its square). Reads as edges meeting the label; no action.

## 2. Agents 390, Lessons link x (146306b) - PASS
- Lessons link left x on all 10 cards at 390: 259.7 on every card (Kotev, Tzayar, Bona, Oseh, Tak, Bochek, Amet, Rosh, Cheker, Zekher). Spread 0px (was 152-161, about 9px drift). Tokens cell width 172px each; row pitch 153px (y 202, 355, ... 1579), even.
- 1440 unchanged: the new rule is inside `@media (max-width:599px)` (style.css:240-251), so it cannot apply at 1440. Measured at 1440: Lessons x is 1262.1 or 1270.7 by row, the same table-column behaviour as before (not touched by this commit), row pitch 65px. Sev 1 nit, pre-existing, not from this fix: 8.6px x variation at 1440 (link text width differs per row, presumably right-aligned cell).

## Verdict
2/2 PASS. Leftover: sev 0-1 cosmetic only.
