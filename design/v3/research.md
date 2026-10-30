# Levana v3 research (C15, C17, C18, C19)

Rosh, 2026-10-30. Run log: runs/2026-10-30-levana-v3.md.
Tags: [V] = read on the primary source page this run. [S] = search-result snippet only, page not opened. [U] = unverified (from my own knowledge or inference).

---

## Q1 (C15) Real 5-hour usage

**Answer:** Yes. Claude Code's status line JSON has official fields for this: `rate_limits.five_hour.used_percentage` (0–100) and `rate_limits.five_hour.resets_at` (Unix epoch seconds), plus `seven_day.*`. claude.ai Settings > Usage shows the same bars, but only to a person; there is no API for it. Limits are not a fixed number of tokens, so "1% = 15k tokens" is not valid.

**Recommendation:** Have a status line script save `{five_hour, seven_day, captured_at}` to a JSON file in claude-dotfiles, e.g. `state/usage.json`. Commit it through the normal git flow (or a Stop hook), and have Levana read it. Show the number as "as of <captured_at>". Once `resets_at` has passed, show it as stale. Delete the fixed token-to-% conversion.

Claims:
1. [V] The status line gets `rate_limits.five_hour.used_percentage` / `seven_day.used_percentage` ("Percentage of the 5-hour or 7-day rate limit consumed, from 0 to 100") and `*.resets_at` ("Unix epoch seconds when the 5-hour or 7-day rate limit window resets"). Source: https://code.claude.com/docs/en/statusline (field table, "Rate limit usage" section).
2. [V] `rate_limits` "appears only for claude.ai Pro and Max subscribers … and only after the first API response in the session. Each window … may be independently absent, and Claude Code drops a window once its `resets_at` time passes." Same page. This means Levana must handle the field being missing.
3. [V] The status line script is any shell command that gets JSON on stdin, so it can also write a file. Writing the file is my inference [U]. Same page.
4. [V] The OpenTelemetry metrics (`claude_code.token.usage`, `claude_code.cost.usage`, …) do not include a subscription 5h/weekly % metric. I read only the first 100k characters of the page, so a later event is not ruled out. Source: https://code.claude.com/docs/en/monitoring-usage
5. [V] Plan usage depends on "the length and complexity of your conversations", "the features you use", "which Claude model you're chatting with" and "the effort level you've selected". The session limit "resets every five hours", and there are weekly limits. The article never states a token quota. Source: https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work
6. [S] Settings > Usage on claude.ai shows progress bars for the 5-hour session and weekly limits. Limits are shared between Claude and Claude Code. Source: https://support.claude.com/en/articles/11049741-what-is-the-max-plan
7. [U] The `anthropic-ratelimit-*` response headers belong to API-key (Console) traffic, not to the subscription 5h window. I did not open https://platform.claude.com/docs/en/api/rate-limits this run.
8. [U] `/usage` in Claude Code shows plan usage interactively. It is not machine-readable, so it cannot feed the page. The statusline page mentions `/usage` only for prompt-cache stats.
9. [U] It is not checked whether the status line runs in Claude Code cloud sessions. If it does not, the file updates only from the Windows PC.

---

## Q2 (C18) EN↔TH translation in the browser, display only

**Answer:** Chrome's built-in Translator API (plus the Language Detector API) is free and runs on-device. Thai (`th`) is in Chrome's language list. It works only on desktop Chrome 138+ and Edge 148+, not on mobile, Firefox or Safari. It needs HTTPS (GitHub Pages qualifies) and a user click to call `create()`.

**Recommendation:** Add a "TH/EN" toggle button. Detect support with `'Translator' in self`. On click: `Translator.create({sourceLanguage, targetLanguage})`, then translate the rendered text block by block. Skip `<code>`/`<pre>`. Cache results per file in sessionStorage. When the API is missing, hide the button or show "translation needs desktop Chrome/Edge". Optionally offer a link that opens the text in Google Translate [U]. Paid fallback, as a note only: Google Cloud Translation or DeepL API. Both need an API key, which a static page cannot hide [U].

Claims:
1. [V] Built into Chrome, and the model downloads on first use. Supported in Chrome 138 / Edge 148. "Don't work on mobile devices". Thai `th` is listed, and the list "may change". Top-level and same-origin iframes are allowed by default; cross-origin iframes need `allow="translator"`. Not available in Workers. Source: https://developer.chrome.com/docs/ai/translator-api
2. [V] MDN marks it Experimental, not Baseline, "secure context only". `create()` needs transient user activation. It has Permissions-Policy directives `translator` and `language-detector`. Source: https://developer.mozilla.org/en-US/docs/Web/API/Translator_and_Language_Detector_APIs
3. [S] Firefox and Safari: not supported. Use the global `Translator`, not the deprecated `window.ai.translator`. Source: https://developer.chrome.com/docs/modern-web-guidance/guides/built-in-ai/translator
4. [U] Not checked: whether translation quality is good for technical Thai, and whether Thai is supported by the Language Detector specifically.

---

## Q3 (C17) Graph of linked .md files

**Answer:** **force-graph** (vasturiano) fits best. It is MIT licensed, ships as a single UMD file (`dist/force-graph.min.js`, 173,081 bytes at v1.52.0), and draws on canvas using d3-force. It has `onNodeClick(node, event)` built in. Its own example handles about 75k elements, so 200 nodes is easy.

**Recommendation:** Vendor-pin `force-graph@1.52.0/dist/force-graph.min.js` into `vendor/` and add it to `vendor/LICENSES.txt`. Build `{nodes, links}` from the .md link scan. For mode (b), add agent and issue nodes with a `group` field and colour them with `nodeAutoColorBy('group')` [U]. Wire `onNodeClick` to open the file in the main pane.

| Library | Version (jsDelivr latest) | Min file | License | Notes |
|---|---|---|---|---|
| force-graph | 1.52.0 | 173 KB | MIT | Canvas plus d3-force, one file, click/hover/zoom built in |
| cytoscape | 3.34.4 | 436 KB (`cytoscape.min.js`) | MIT | Bigger. Strong graph analysis features. Built-in `cose` force layout [U] |
| d3-force (+ d3-selection etc.) | not checked | not checked | ISC [U] | You write your own rendering and zoom; more code |
| sigma.js v3 | not checked | not checked | MIT [U] | WebGL. Needs graphology and a separate layout package, and is mainly ESM/bundler [U]. The docs page returned 404 |

Sources:
- [V] https://github.com/vasturiano/force-graph (MIT, canvas plus d3-force, jsDelivr script tag, `onNodeClick(node, event)`, ~75k-element example)
- [V] https://data.jsdelivr.com/v1/package/npm/force-graph and https://data.jsdelivr.com/v1/package/npm/force-graph@1.52.0/flat (version, file size)
- [V] https://github.com/cytoscape/cytoscape.js (MIT), https://data.jsdelivr.com/v1/package/npm/cytoscape@3.34.4/flat (435,649 bytes)
- [U] sigma.js and d3 rows: from my own knowledge; https://www.sigmajs.org/docs/get-started/quickstart/ returned 404.

---

## Q4 (C19) Activity log on a static site

**Answer:** A static page has nowhere shared to write logs unless you add a write-capable backend. The options are: (a) local only (IndexedDB), which is safe but stays on one device; (b) GitHub API commits, which need a token with **write** access stored in the browser and so break the read-only design; (c) a free hosted database (Supabase) with an insert-only policy, which keeps logs searchable across devices without a GitHub write token. Analytics tools such as Cloudflare Web Analytics and GoatCounter only count page views. They cannot do detailed, searchable per-event logs.

**Recommendation:** Two stages.
1. Stage 1 (now, no risk): a `log.js` that writes each event to IndexedDB. Each event records time (ISO plus `Intl` timezone), page/action, UA-CH low-entropy values (`brands`, `mobile`, `platform`), screen size and language. It also records approximate location from timezone only. The Log page can search, filter and export to JSON/CSV.
2. Stage 2 (if Rin wants cross-device logs): Supabase free project with a `logs` table. Use RLS to allow anon INSERT only and SELECT only for Rin's logged-in user [U on the exact policy]. GPS location only after an explicit opt-in click using the Geolocation API.

Do not put a GitHub write token in the browser.

Claims:
1. [V] UA-CH: `navigator.userAgentData` is "Limited availability", not Baseline. Low-entropy values are `brands`, `mobile`, `platform`. High-entropy values (`architecture`, `model`, `platformVersion`, `fullVersionList`) come from `getHighEntropyValues()`. Source: https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API
   [U] Chromium only (not Firefox/Safari) and needs a secure context; MDN's compatibility table was not shown.
2. [V] Geolocation: "available only in secure contexts (HTTPS)", and "users must grant explicit permission via a prompt". Source: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
3. [U] A browser cannot see its own public IP. IP-based city/country needs a third-party lookup service (sends the IP to that vendor) or a server-side header such as Cloudflare's `CF-IPCountry`, which a pure GitHub Pages site does not have.
4. [V] GitHub "Create or update file contents" needs `sha` when updating a file, and classic tokens need the `repo` scope. The page does not name the fine-grained permission. Source: https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28
   [U] For fine-grained tokens this is "Contents: write". Anyone holding the stored token could rewrite files in claude-dotfiles. Concurrent writes conflict on `sha`.
5. [V] Supabase free plan: "two free projects", 500 MB database per project. Source: https://supabase.com/docs/guides/platform/billing-on-supabase
   [S] Free projects pause after 7 days of low activity, can be resumed, and keep their data. Source: https://supabase.com/docs/guides/platform/free-project-pausing
6. [S] Cloudflare Web Analytics is free, has no cookies, and covers page views, visitors and performance. No custom-event feature was found; the lack of custom events is not confirmed. Source: https://developers.cloudflare.com/web-analytics/about/
7. [U] GoatCounter: page-view counter, free for non-commercial use. Not opened this run.
8. [U] Privacy: Rin is the only user, so logging Rin's own activity is low risk. If the site is ever shared, Thailand's PDPA would apply to location and device data: use consent or opt-in and keep the data minimal. Not researched this run.

---

## Items for Amet to verify (if a check pass is wanted)
- Q1 rows 1, 2, 5 (exact quotes on code.claude.com/docs/en/statusline and support article 11647753).
- Q2 rows 1, 2 (Chrome 138 / Edge 148, desktop only, Thai listed; MDN user activation).
- Q3 force-graph size and version (jsDelivr flat listing).
- Q4 rows 2, 5.
