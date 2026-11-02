# Visual check C11: Agents "Tokens 7 วัน" column (85797d1), Tzayar

Method: eyeballed agents-1440-light/dark, agents-390-light, summary-1440-light from shots-c11, plus diff of views/agents.js, style.css, parse.js. Not measured, not a heuristic evaluation. Not opened: agents-390-dark (same CSS as light).

## Verdict
PASS with 3 minor fails (sev 1-2). The column answers Rin's complaint. No bar needed. Keep 7 days.

## Checks
- Alignment: PASS. Header and figures share the right edge (x=1163 at 1440); `th.n`/`td.n` right-aligned. views/agents.js:12.
- Tabular nums: PASS. `td.n{font-variant-numeric:tabular-nums}` (style.css:217); body already sets it (style.css:48). 263k / 134k / 90k / 12k line up.
- Contrast / dark: PASS. Ink on surface in both themes, no new colour.
- Header clarity: PASS (sev 0). "7 วัน" matches the Summary section tag "TOKEN ต่อ AGENT 7 วัน". Do NOT switch to all-time: the Summary table and the whole v3 spec use the 7-day window, and a different window on the same agent would give two numbers for one name.
- Bar: PASS to skip. DESIGN.md:21 table convention has no bar; with 4 of 10 rows filled a bar adds noise. Revisit only if Rin asks for comparison.
- Mobile 390: PASS. Label "Tokens 7 วัน" prefixes the value; "–" rows show it too. Stacked, no overflow, 44px rows unaffected.

## Fails
1. FAIL sev 2: figure format differs from Summary. Summary shows full `263,000` and `0`; Agents shows `263k` and `–`. Same agent, same 7-day window, two formats. Fix: use `L.fmtTok` on Summary-style full numbers (`toLocaleString("en-US")`) or accept k on both; pick one. views/agents.js:20. Empty also differs: Agents uses an en dash `–`, the neighbouring column uses an em dash `—`, Summary shows `0`. Use `—` (or `0`) consistently.
2. FAIL sev 1: header casing/font. `th` is uppercase mono (style.css:214), so Thai "วัน" falls back to a different, slanted face and reads as "TOKENS 7 วัน" in mixed fonts; Summary has the same quirk on "ต่อ HANDOFF", so this is a system issue, not new. Optional: header "TOKENS" and put "7 วัน" in the h1 area or a sub-line. views/agents.js:12.
3. FAIL sev 1: context mismatch. The row cell before it shows only the latest run ("2 พ.ย. · token-api-check") while Tokens is the 7-day sum over all runs, so Kotev 263k can read as that one run. Cheap fix: the header wording already helps; no change needed unless Rin misreads. Pre-existing: data cells are top-aligned while swatch+name is centred (about 8-12px baseline gap per row), style.css:216 (`td{vertical-align:top}`; use `middle` for `.stack`-less agents table).

## Notes
- Mobile rows wrap unevenly (Bona: "ล่าสุด — Tokens 7 วัน –" then Lessons alone on the next line). Cosmetic, sev 1, style.css:245; could force Tokens and Lessons onto one line with `flex`.
