# v3 fix round 1 (from visual-check.md + Bochek step 5)

## Major (Tzayar)
- F1 Log 1440: message column ~50px, words break mid-word (R22). Give message column real width (min ~32ch / flexible), other columns fixed. Shot: log-1440-light.
- F2 Summary stale at 390: dot matrix stays blue and % stays full ink while "ข้อมูลเก่า" shows. Use the same stale styling as the 1440 ring (grey dots, muted %). Shot: summary-stale-390-light.
- F3 Graph: mode A shows two nodes both labelled "kotev.md" with no edges (use path-unique ids, label with folder when names clash; edges from md links + filename mentions must appear with fixtures); mode B labels overlap and render ~11px — spec 13px, reduce overlap (label only on hover/zoom or collision skip). Shot: files-graph-a-1440-light.
- F4 Drawer shot captured mid-transition: retake drawer-390 (light/dark) and tree-sheet-390 as viewport-only shots after transition ends.

## Minor (Tzayar)
- F5 Page h1 shows a focus ring in 1440 shots (focus programmatic h1 without visible ring: :focus:not(:focus-visible) or outline none on tabindex=-1).
- F6 Summary "missing" state: stray black bar above "ยังไม่มีค่า".
- F7 Log export button wraps to two lines at 390.
- F8 Mobile Runs stat pairs spacing loose.

## Low (Bochek)
- F9 scripts/statusline.py: reject non-finite numbers (NaN/Infinity) with math.isfinite → treat as missing; add test.
- F10 scripts/statusline.py: push.log rotate/cap (e.g. keep last 200 lines or 64KB).
- F11 logbus.js: scrub also gho_/ghs_/ghu_; refuse a key that decodes to role service_role (guard + comment).
- F12 e2e/smoke.js: default output must not dirty tracked files — write to an untracked dir (e.g. design/v3/build-shots/_run/ gitignored) and only update tracked shots with an explicit flag.

## Docs
- F13 DESIGN.md: "mobile Summary shows top 3 issues, desktop top 5".
