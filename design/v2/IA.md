# Levana v2: information architecture

Levana answers one question for Rin each time it opens: **"Is there anything I need to do, and how much of the 5-hour budget is gone?"** Everything else is one tap deeper.

## Navigation
| | Mobile (<1024px): bottom bar, 5 items, icon + label, 64px | Desktop (>=1024px): side nav, all items, 3 groups |
|---|---|---|
| 1 | **วันนี้** (Today), the home page | Work: วันนี้ · Runs · Issues · Agents |
| 2 | **Runs** | Data: การใช้ token · Lessons · ไฟล์ |
| 3 | **Issues** | System: Errors |
| 4 | **Agents** | |
| 5 | **เพิ่มเติม** (More) → การใช้ token, Lessons, ไฟล์, Errors | |

Counts sit beside desktop items (Runs 29, Issues 3, Errors 1). The active item uses weight plus a bar or fill, not colour alone.

## What changed from v1 (7 views → 8 destinations, 5 on mobile)
- **Overview merged into Today.** Both repeated the same KPIs. Today now leads with actions.
- **Stats → "การใช้ token" (Usage).** Charts per run, agent, and 5h window. The headline figures also appear on Today and on each Run.
- **New: Run detail** (Runs → one run). This is the data-heavy page: handoff chart, agent split, handoff list with disclosure.
- **New: Lessons** gets its own page with search and filter (Rin asked for search over runs + lessons).
- **Errors** stays a page, and any live error is also raised as a banner or action on Today.
- **Files** moves to "More". Its 29 cards become a sortable table grouped by folder (runs/, agents/, lessons/, design/, research/).

## Pages: purpose and first screen (390x844)
| Page | Purpose | Shows first | Then |
|---|---|---|---|
| วันนี้ | What needs me now | Action queue (token expiry, run waiting, open issue), each with a 44px action | 5h budget (one hero %), 3 KPIs (handoffs, bounce rate, open issues), active run's last handoffs, recent runs (top 4-5 + "ดูทั้งหมด"), token per agent (collapsed on mobile) |
| Runs | Find a run | Search + filter (status, date, agent) above the list | Rows: name, date, status chip, tokens, bounce count |
| Run detail | What happened in one run, at what cost | Request + approved flow with the current step, 4 KPIs (tokens, % of 5h, handoffs, bounces) | Token-per-handoff chart (bounces hatched + icon), handoff list (expand for result), agent split table, compare with earlier runs (desktop) |
| Issues | GitHub issues | Open issues sorted by age | Closed, collapsed |
| Agents | Who does what, how reliably | 10 agents: role, tokens, bounce rate | Agent page: lessons, recent handoffs |
| การใช้ token | Spending over time | 5h window now + reset time | Tokens per run, per agent, bounce rate per agent, lessons usage |
| Lessons | Reuse what worked | Search box + agent filter | Lessons grouped by agent (<=7 per group, then "ดูทั้งหมด") |
| ไฟล์ | Browse workspace files | Table grouped by folder, sortable | Not applicable |
| Errors | Diagnose fetch problems | Latest error, cause, retry | History |

## Rules every page follows
Header (<=56px mobile) holds the page title, refresh (44px), and theme toggle, and shows "อัปเดต HH:MM (X นาทีที่แล้ว)" next to the title. Loading uses a skeleton of the real layout. Empty states say "ยังไม่มี…", the cause, and the next action. Errors keep the cached data with a "ข้อมูลเก่า HH:MM" tag and a retry button. Detail is at most 2 levels deep.
