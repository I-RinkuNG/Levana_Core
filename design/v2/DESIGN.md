# Levana v2 design system

Files: `tokens.css` (all values) · `mockup-a|b|c.html` (open directly in a browser; `?page=today|run&state=ready|loading|empty|error&mode=light|dark`; the "mockup" button bottom-right switches these) · `shots/` · `IA.md` · `src/` (partials + `build.mjs`; run `node design/v2/src/build.mjs` to rebuild the 3 HTML files).

Mode: Operate (daily tool). Ambition shows as precision; the game references give the frame shapes, palettes and numerals, not decoration. No game assets, logos or game fonts. All fonts are OFL Google Fonts.

## Shared foundations (all directions)
- **Spacing:** 4 / 8 / 12 / 16 / 24 / 32 / 48 only. Panel padding is 16 on mobile and 24 from 600px up. Gaps between groups are 16 on mobile and 24 on desktop.
- **Type:** 3 text sizes + 1 display size.
  - 13px is for meta and EN mono labels (secondary only).
  - 17px is for Thai body, controls, and primary data.
  - 24px (A: 28px) is for page titles and KPI values.
  - The one hero figure per screen is 32-48px.
  - Weights are 400 and 600. Line-height is 1.6 for body, 1.3 for headings, 1.15 for figures.
  - Numbers use `tabular-nums`. Thai text is never uppercased or letter-spaced; only EN mono labels are (0.06em).
  - Thai measure is 32em (about 60 characters).
- **Wrap:** `overflow-wrap:anywhere; word-break:normal`. No fixed heights on Thai text. Only the handoff summaries in lists use a 2-line clamp.
- **Grid:** 1 column below 1024px. From 1024px: 240px side nav plus content (max 1200) in 2fr/1fr columns. Mobile order is set with `order`, so actions come first and secondary panels last.
- **Tap targets:** 44px minimum (measured: 0 under 44 across 30 captures). The bottom bar is 64px.
- **States:** skeleton that mirrors the layout (shimmer is off under reduced-motion); empty = cause + next step; error = banner + retry + stale data at 72% opacity with a "ข้อมูลเก่า" chip.
- **Motion:** 140ms colour/background transitions only. `--dur:0ms` under `prefers-reduced-motion`.
- **Status:** always icon + Thai text in a pale tint with same-hue ink (run/ok/bad/neutral). Never colour alone.
- **Charts** (validated with the dataviz `validate_palette.js`, all pairs, light + dark):
  - 3 categorical slots `--c1..c3` follow the agent, not the rank, plus grey `--c-other`.
  - Bounces get hatching and an icon.
  - Bars carry direct values; a legend shows when there are 2+ series; the agent table doubles as the table view.
  - Bar rows are focusable and show a tooltip on hover or focus.
- **Token names by role:** `--bg --surface --surface-2 --sunken --line --line-strong --ink --ink-2 --slab --on-slab --accent --accent-ink --on-accent --hi --on-hi --danger(-bg) --warn(-bg) --ok(-bg) --focus --c1..3 --c-other --grid`, plus fonts `--font-body/-display/-mono`, shape `--cut --radius --radius-ctl`.

## Directions
| | A · Terminal (Arknights-leaning) | B · Codex (Chaos Zero Nightmare-leaning) | C · Relay (Ark × CZN palette, Cyberpunk 2077 dialog shapes) |
|---|---|---|---|
| Idea | Operator terminal: white panels, black label slabs, condensed numerals like sanity counters | Codex/team-formation menus: soft lavender sheets, pill "Enter" actions, countdown-style hero figure in a thin HUD frame with tick marks | Incoming-message dialog: crimson hairline frame, notched label tab, cut bottom-right corner, corner marker square |
| Light bg / surface / ink | #e9ecef / #fff / #121417 | #f1eff7 / #fff / #1c1830 | #e6e6ea / #f7f7f8 / #141418 |
| Dark bg / surface / ink | #111315 / #1a1d20 / #eceff2 | #0f0d17 / #191624 / #efebfa | #0d0c0f / #16141a / #f1eef3 |
| Accent | cyan #0072ad / #38bdf8 | orchid #5b35c9 / #a58bff | crimson #c0182f / #ff4d5e |
| Highlight | caution yellow #ffd60a (fills only) | orange #e8590c / #ff8a3d | signal yellow #f5d90a / #f7e01d (dark label slabs) |
| Chart c1-c3 light | #0a85c2 #b07f00 #c2255c | #5b35c9 #e8590c #0f9d8a | #c0182f #0090a8 #6a4bd0 |
| Chart c1-c3 dark | #1e95cc #b8890a #e0457b | #9271f0 #d9661c #1a9e8a | #f0475a #1fa5b0 #9a7cf0 |
| Frame | 1px line, 12px cut top-right (two-layer clip-path), slab label bleeds to the left edge, 4px yellow stripe on the lead panel; Run header = name card with red bar | 14px radius, tone step (light) / 1px inset line (dark), pill tags + buttons, primary button with ring "enter" glyph | 1px crimson frame on lead/dialog panels, 16px cut bottom-right, notched tab label, 8px corner square |
| Fonts | IBM Plex Sans Thai · Barlow Condensed (numerals/EN) · IBM Plex Mono | Noto Sans Thai · Anuphan · JetBrains Mono | IBM Plex Sans Thai · Chakra Petch (Thai-capable, squared) · IBM Plex Mono |
| Nav active | 4px accent bar + bordered row; mobile yellow top bar | Filled slab row; mobile pill behind icon | Crimson-framed row + corner square; mobile yellow/crimson top bar |

## Production notes for Kotev
- Self-host WOFF2 (thai+latin subset), preload the 400/600 body weights, and use `font-display:swap` (the mockups use the Google CDN).
- Format numbers and dates with `Intl.NumberFormat('th-TH')` / `Intl.DateTimeFormat`. The mockup hardcodes them.
- Sync filter chips and fold state to the URL. Add `translate="no"` on ids and agent names (already in the mockup).
- Keep `<meta name="theme-color">` synced to `--bg` (the mockup's JS does this). Save the theme choice in `localStorage['lvn-mode']`; the default follows the system setting.
