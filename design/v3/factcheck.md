# Amet fact-check of research.md (2026-10-30)

10 PASS, 1 PASS with caveat, 0 FAIL (11 claims). Build can rely on all.

- PASS statusline `rate_limits.five_hour|seven_day.used_percentage` (0–100) + `.resets_at` (epoch s) — https://code.claude.com/docs/en/statusline
- PASS (caveat) Pro/Max only, or via a Claude apps gateway with spend limit; only after first API response; each window may be absent; dropped after `resets_at`; also `rate_limits.spend_limit.*` (v2.1.251+). Levana must handle missing field.
- PASS no official token quota per 5h → "1% = 15k" invalid — https://support.claude.com/en/articles/11647753
- PASS Translator API Chrome 138+, desktop only, `th` supported (list may change), `create()` needs user activation — https://developer.chrome.com/docs/ai/translator-api
- PASS force-graph 1.52.0 MIT (package.json), `dist/force-graph.min.js` 173,081 B, `onNodeClick(node, event)` — jsDelivr + README (master)
- PASS Supabase free pauses after 7 days low activity, restorable ≤1 year with data — https://supabase.com/docs/guides/platform/free-project-pausing
- PASS (principle) publishable/anon key safe on web page, limited by RLS; enable RLS on every table — https://supabase.com/docs/guides/api/api-keys. Exact policy (anon INSERT only, SELECT for Rin) still [U] until tested.

Not checked: Edge 148, Geolocation row, Supabase "2 free projects / 500 MB", MDN Translator page.
