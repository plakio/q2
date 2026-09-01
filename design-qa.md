# Q2 Modern P2 Visual QA

- Current targeted source visual truth:
	- `/home/oscar/.codex/attachments/39bf42ad-04d7-4b13-9e0a-48e1bf6fce74/codex-clipboard-feaaaf48-34b1-4330-9bc6-33b0fbe678d8.png` (2402 × 1478): disabled composer action, titled post, post overflow menu, and Reply/Follow/Like actions.
	- `/home/oscar/.codex/attachments/5c3ab2ab-a171-4b75-bbc8-f76d54947423/codex-clipboard-ef85d43b-6ce7-4fc0-8dc9-24fe5dbb47f9.png` (1530 × 1024): full-screen post editing.
	- `/home/oscar/.codex/attachments/4d7f7ed1-a19b-4ea2-813b-211092ead5ef/codex-clipboard-3a5acafc-0f30-4a92-bae8-9e727f4a5631.png` (1562 × 1078): nested replies, inline tags, and compact comment actions.
	- `/home/oscar/.codex/attachments/4cc89f04-4473-44a5-bb94-f348c453e29a/codex-clipboard-c4fc0d6b-0f17-4b90-96fa-c7cb8bcb5506.png` (432 × 886): notification tabs, date groups, avatars, and type badges.
	- `/home/oscar/.codex/attachments/dab118ce-0d38-4785-9c9a-ed071211fb7c/codex-clipboard-9a97c901-445a-4941-9d4f-10d655f6bf86.png` (2294 × 1156): Survey and Files block presentation.
	- Earlier workspace identity references retained below for regression coverage:
  - `/home/oscar/.codex/attachments/6e47f2d8-17ef-418c-9f6c-1e78f1118fe5/codex-clipboard-5d21e4a5-0a66-42cc-b7ce-0dbe375e6afd.png` (491 × 624): workspace icon placement and sidebar hierarchy.
  - `/home/oscar/.codex/attachments/ddbe68fe-26d2-4fe2-82d3-7d7c951c4e76/codex-clipboard-828d234e-8a44-4c98-8ad4-c7cfe1fcf8b2.png` (649 × 154): workspace selector identity.
- Source visual truth:
  - `/home/oscar/.codex/attachments/82795677-d28e-4274-ae83-65bf3247dadb/codex-clipboard-e8ec3091-0697-4910-91f1-ec9cc6a810dd.png` (2047 × 1187)
  - `/home/oscar/.codex/attachments/5f63bee8-8c6c-4f12-8c55-4cd30f901b4d/codex-clipboard-28f3ce5f-56d7-4506-89f9-d6855f2b1387.png` (2048 × 1280)
  - `/home/oscar/.codex/attachments/42924e41-d84c-4d9e-b572-99435da328da/codex-clipboard-6ec0aba6-92c8-4618-ab15-cf59d5ade351.png` (1947 × 1073)
- Implementation: `https://wp.plak.work/`
- Previous implementation screenshot: `/home/oscar/.codex/attachments/3c9a761e-4693-4cb3-9cfe-f09da00f8b8c/codex-clipboard-cd831953-dc17-4f62-b988-d9f29c4d83b6.png` (3536 × 2614); this predates the current icon and post-menu changes and is not valid post-change evidence.
- Current implementation screenshot: unavailable. Codex Desktop did not expose the required in-app browser surface, the local web server is not running, and WordPress cannot connect to its local database from this session.
- Reported mismatch screenshot: `/home/oscar/.codex/attachments/d5a7b406-7407-4852-8343-f714938c9589/codex-clipboard-f5022ab9-9c5b-434a-86a0-e88c2b67c465.png` (806 × 640); it shows the pre-fix split state, with the WordPress `W` icon in the top selector and the Q2 image in the sidebar.
- Side-by-side comparison: `/home/oscar/.codex/visualizations/2026/08/31/01a05966-827e-7982-9c72-11930abc6367/q2-design-comparison.png` (2800 × 900).
- Intended desktop viewport: 1440 × 1000 CSS px at density 1.
- Intended mobile viewport: 390 × 844 CSS px at density 1.
- State: authenticated empty feed with composer, default filters, workspace sidebar, and one member.

## Full-view comparison evidence

The primary feed reference and authenticated Q2 screenshot were normalized into 1400 × 900 panels and compared side by side. The major regions align: charcoal topbar, workspace sidebar, composer strip, filter row, and centered feed surface. The captured Q2 state is empty, so post typography/actions cannot yet be compared against the populated reference.

## Focused region comparison evidence

The topbar/workspace switcher, sidebar identity/navigation/team area, composer, and filter row were readable in the combined comparison. Post content and mobile remain unavailable in a matching state.

## Findings

- [P2] The five new reference states cannot yet be visually certified.
  - Location: composer, titled post, full-screen editor, nested replies, notifications, Survey, and Files.
  - Evidence: all source images were opened at original resolution, but there is no browser-rendered post-change implementation capture to place beside them.
  - Impact: code-level behavior and styling pass automated checks, but exact typography, spacing, wrapping, and interaction-state fidelity remain unverified.
  - Fix: restore the authenticated WordPress runtime, capture each matching state at desktop and mobile widths, place each implementation capture beside its source, and resolve any P0–P2 differences.

## Implemented fidelity surfaces pending visual confirmation

- Typography: system UI stack, heavier post headings, compact UI labels, and editorial body rhythm.
- Spacing/layout: 72 px topbar, proportional sidebar, wide composer strip, centered 47 rem reading column, and border-separated posts.
- Colors/tokens: charcoal topbar, WordPress blue accent, neutral sidebar, white reading surface, and restrained borders.
- Image quality/assets: native WordPress Site Icon and real user avatars; WordPress icon library for interface icons.
- Copy/content: WordPress Site Title and description, current user name, real post content, and real site members.

## Comparison history

- Iteration 1: structural implementation completed from the three source references.
- Iteration 2: authenticated desktop capture showed a sidebar cover that was too short and too many navigation rows before Team. The cover was increased to 12.75 rem, the sidebar was aligned to P2's Posts/Pages model, and Notifications moved to the topbar. A post-fix capture is still required.
- Iteration 3: code-level fixes anchored the workspace icon to its wrapper, replaced workspace image labels with edit/delete icons, replaced the post Edit label with an ellipsis menu, increased its action text to 0.95 rem, synchronized the saved workspace icon with the topbar selector, and prevented the Pages empty state from rendering `00`. Build, lint, and unit tests pass, but the missing authenticated post-change browser capture keeps visual QA blocked.
- Iteration 4: the reported mismatch proved that event-based synchronization was not reliable in the active page and that the top selector used the WordPress Site Icon while the sidebar used Q2 as its empty fallback. The workspace icon was lifted into `App` as the single shared state and is now passed to the top selector, selector menu, and sidebar editor. Selection and removal update all three surfaces immediately; API failure restores the prior icon. With no custom icon, every surface now uses the same Q2 fallback. Build, lint, PHP lint, and all 18 unit tests pass. A post-fix authenticated capture is still required for visual certification.
- Iteration 5: implemented the five new references: empty-content publish gating, post titles, a full-screen post editor, refined overflow/actions, visible nested reply hierarchy, inline `+tag` labels, grouped notification tabs, a persistent one-vote-per-member Survey block, and a media-backed Files block. The bundle, PHP/JS/style lint, translations, and all 20 unit tests pass. Visual comparison remains blocked because the authenticated WordPress runtime and in-app browser are unavailable.

## Implementation checklist

- Capture the revised authenticated desktop feed at 1440 × 1000.
- Capture authenticated mobile feed at 390 × 844.
- Compare both captures with the source references in one visual input.
- Fix all P0/P1/P2 differences and repeat capture.
- Verify composer focus/publish, route navigation, search submit, mobile menu, console errors, and keyboard focus.

Blocker: no authenticated, post-change implementation screenshot or browser surface was available for the required combined visual comparison and interaction/console checks; the local WordPress database and HTTP server are also unavailable.

final result: blocked
