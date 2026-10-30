# v3 layout research (Q5, Q6)

Rosh, 2026-10-30. Run: /home/user/claude-dotfiles/runs/2026-10-30-levana-v3.md
Quotes came from WebFetch on 2026-10-30. [U] = not fetched or not confirmed; check before you rely on it.

## Q5. What is the claude.ai layout called, and its rules

**Name.** Designers use more than one name for this layout:
- Shell level: "app shell" / "UI shell" with a "side nav" (Carbon: "UI shell", "left panel"; Atlassian: "navigation system" layout with top nav, side nav, main and panel slots). Apple calls the left column a "sidebar".
- Content level: a history list next to one open conversation is **list-detail** (also called master-detail). Android/Material: "divides the app window into two side-by-side panes: one for the list, one for the detail." https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts
- For Levana: an **app shell with a persistent side nav** on every page. The Files page adds a list-detail split (tree | document).

**Rules (each with its source)**
1. What the sidebar is for: "navigate between areas of your app or top-level collections of content." Show "no more than two levels of hierarchy". https://developer.apple.com/design/human-interface-guidelines/sidebars (read via the HIG JSON feed)
2. Do not hide it by default: "Consider letting people hide the sidebar" but "Avoid hiding the sidebar by default to ensure that it remains discoverable." (same Apple source)
3. When a side nav is worth it: "more than five secondary navigation items, or if you expect a user to switch between secondary items frequently." Levana has 9 items, so the side nav fits. Carbon: the left panel is "positioned below the header and fixed to the left." https://carbondesignsystem.com/components/UI-shell-left-panel/usage/
4. Widths:
   - Atlassian side nav defaults to 320px. Users can resize it from 240px up to 50% of the viewport. Double-clicking the splitter collapses it. https://atlassian.design/components/navigation-system/layout/examples
   - Primer pane minWidth defaults to 256px. https://primer.style/product/components/page-layout/
   - So Tzayar's 240px sits at the low end of the documented range. That is fine.
5. Collapse behavior:
   - Atlassian: on smaller screens "the side nav automatically collapses to make room for the content". It reopens as an overlay. On xs/xxs screens the overlay's max width is "320px or 90% of the screen width". The side nav is toggled from a top-nav button or a keyboard shortcut, which is off by default. (Atlassian source)
   - This matches Rin's choice: a drawer with a scrim on mobile.
6. Breakpoints:
   - Primer switches the sidebar to its narrow behavior "below 768px". Its `responsiveVariant: 'fullscreen'` makes the sidebar cover the viewport like a dialog. Primer's page does not define its regular/wide breakpoints. (Primer source)
   - Tzayar's 1024 split is a project choice. No source fetched for it [U].
   - Material 3 window size classes are compact <600dp, medium 600-839, expanded >=840 [U]. m3.material.io returns a JS shell, so this was not read.
7. Sidebar slots:
   - Atlassian: SideNavHeader at the top, a scrollable SideNavBody that grows, SideNavFooter at the bottom.
   - Main area: "Use the main area for the page header and main page content."
   - The optional right panel defaults to 365px and overlays the main area at small breakpoints. (Atlassian source)
8. Panes beside the content:
   - Primer `PageLayout.Pane` "sits only beside the content area". `PageLayout.Sidebar` is full-height navigation.
   - A pane can be `sticky` ("stick to the top of the screen while the content scrolls"). `offsetHeader` clears a sticky header. (Primer source)
   - This fits the sticky Files tree.
9. Pane sizes for list-detail / supporting pane:
   - At expanded width, list and detail show side by side. At medium and compact width, only one of them shows.
   - Supporting pane: 70/30 split at expanded width. At compact width it goes below the main content or into a bottom sheet. (Android canonical-layouts source)
   - So below 1024, the Files tree as a drawer/sheet matches this guidance.
10. Material nav drawer [U]:
    - Standard (persistent) drawer at expanded widths, modal drawer at compact/medium widths, about 360dp max width. M3 Expressive moves toward an expanded navigation rail.
    - Not read: m3.material.io and m2.material.io both return a title-only JS shell.

## Q6. Rules for internal ops pages (Summary, Log, Files)

1. **Put the most important thing first.** Carbon: "Prioritize data by importance, then create a clear visual hierarchy." Also: "Place the most important at the top of the page and follow the F-pattern for the remaining elements." https://carbondesignsystem.com/data-visualization/dashboards/
   - On Summary, the usage ring and any blocking issue go at the top left. Everything else goes below them.
2. **Keep the metric count small and drop extras.** Carbon: "Limit the number of metrics" (no number given). Also: "Non-essential information should be provided as needed." (Carbon source)
   - Tzayar's 4 metrics is a reasonable pick. The "4-6 KPIs" figure seen elsewhere comes only from third-party blogs [U].
3. **The Summary page should read at a glance on one screen.** NN/g: "Operational dashboards aim to impart critical information quickly to users as they are engaged in time-sensitive tasks." Dashboards are "a single-page view that imparts at-a-glance information" and are not "expansive views of complex data." https://www.nngroup.com/articles/dashboards-preattentive/
   - Detail belongs on Runs, Log and Files, not on Summary.
4. **Use rows or tables, not cards, for anything people scan, search or compare.**
   - NN/g on cards: "Cards are not appropriate when users search for a specific item from a list." Also: "Cards are also a poor choice when users need to compare between multiple options." A list "is more scannable than cards." https://www.nngroup.com/articles/cards-component/
   - This applies to Runs, Log and the agent token table.
5. **Build tables for finding, comparing and acting.** NN/g lists the table tasks: "Find record(s) that fit specific criteria", "Compare data", "View, edit or add a single row's data", "Take action(s) on records". Also: "Freeze header rows ... (if the table is larger than the screen)". Light borders and zebra striping help scanning. https://www.nngroup.com/articles/data-tables/
   - On the Log table: a sticky header, light dividers, no boxed cards.
6. **Start headings and rows with the words that carry the information.** NN/g: "Include the most important points in the first two paragraphs." Also: "Start headings and subheadings with the words carrying most information." https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
   - This fits Rin's rule "a line stays only if it changes a decision". Drop decorative captions.
7. **Keep the chrome quiet so the content leads.** Linear's redesign aimed to "reduce visual noise, maintain visual alignment, and increase the hierarchy and density of navigation elements." It also limited "how much chrome ... was used." https://linear.app/now/how-we-redesigned-the-linear-ui
   - For Levana: a neutral sidebar, no colored tiles, and one accent color.
8. **Be consistent across pages.** Carbon: "Always use consistent colors for each data set" and "All charts should use the same layout and spacing." (Carbon source)
   - For Levana: each agent keeps the same color in the ring, the token table and the Log.
9. **Files page is list-detail plus a sticky tree.**
   - The tree is the list and the document pane is the detail. They sit side by side at wide widths. At narrow widths only one shows, with the tree in a drawer or sheet. (Android canonical-layouts; Primer sticky pane, both cited above)
   - Show no more than two nav levels in the main sidebar (Apple). The deeper folder levels belong in the tree, not the sidebar.
10. **Persistent nav on desktop instead of a hamburger [U].** NN/g reports that hidden navigation lowers discoverability on desktop ("Hamburger Menus and Hidden Navigation Hurt UX Metrics", https://www.nngroup.com/articles/hamburger-menus/). Not fetched in this run.
    - This supports a persistent sidebar at >=1024 and a drawer only on small screens.

## Not verified / gaps
- Carbon side-nav widths and rail behavior: the usage page has none. The Storybook page was not read.
- No Vercel write-up was fetched.
- Rows 6 (Material size classes), 10 (Material drawer) and Q6-10 (hamburger study) are [U]. Amet should check them if Tzayar relies on them.
