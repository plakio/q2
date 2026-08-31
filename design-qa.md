# Q2 Modern P2 Visual QA

- Source visual truth:
  - `/home/oscar/.codex/attachments/82795677-d28e-4274-ae83-65bf3247dadb/codex-clipboard-e8ec3091-0697-4910-91f1-ec9cc6a810dd.png` (2047 × 1187)
  - `/home/oscar/.codex/attachments/5f63bee8-8c6c-4f12-8c55-4cd30f901b4d/codex-clipboard-28f3ce5f-56d7-4506-89f9-d6855f2b1387.png` (2048 × 1280)
  - `/home/oscar/.codex/attachments/42924e41-d84c-4d9e-b572-99435da328da/codex-clipboard-6ec0aba6-92c8-4618-ab15-cf59d5ade351.png` (1947 × 1073)
- Implementation: `https://wp.plak.work/`
- Implementation screenshot: `/home/oscar/.codex/attachments/3c9a761e-4693-4cb3-9cfe-f09da00f8b8c/codex-clipboard-cd831953-dc17-4f62-b988-d9f29c4d83b6.png` (3536 × 2614).
- Side-by-side comparison: `/home/oscar/.codex/visualizations/2026/08/31/01a05966-827e-7982-9c72-11930abc6367/q2-design-comparison.png` (2800 × 900).
- Intended desktop viewport: 1440 × 1000 CSS px at density 1.
- Intended mobile viewport: 390 × 844 CSS px at density 1.
- State: authenticated empty feed with composer, default filters, workspace sidebar, and one member.

## Full-view comparison evidence

The primary feed reference and authenticated Q2 screenshot were normalized into 1400 × 900 panels and compared side by side. The major regions align: charcoal topbar, workspace sidebar, composer strip, filter row, and centered feed surface. The captured Q2 state is empty, so post typography/actions cannot yet be compared against the populated reference.

## Focused region comparison evidence

The topbar/workspace switcher, sidebar identity/navigation/team area, composer, and filter row were readable in the combined comparison. Post content and mobile remain unavailable in a matching state.

## Findings

- [P2] Populated post and mobile fidelity cannot yet be certified.
  - Location: feed posts and mobile breakpoint.
  - Evidence: the implementation capture shows an empty desktop feed, while the references show populated desktop posts and a mobile post.
  - Impact: post typography, action spacing, and responsive wrapping remain unverified.
  - Fix: create or load a representative post, capture desktop and mobile, and compare against the matching references.

## Implemented fidelity surfaces pending visual confirmation

- Typography: system UI stack, heavier post headings, compact UI labels, and editorial body rhythm.
- Spacing/layout: 72 px topbar, proportional sidebar, wide composer strip, centered 47 rem reading column, and border-separated posts.
- Colors/tokens: charcoal topbar, WordPress blue accent, neutral sidebar, white reading surface, and restrained borders.
- Image quality/assets: native WordPress Site Icon and real user avatars; WordPress icon library for interface icons.
- Copy/content: WordPress Site Title and description, current user name, real post content, and real site members.

## Comparison history

- Iteration 1: structural implementation completed from the three source references.
- Iteration 2: authenticated desktop capture showed a sidebar cover that was too short and too many navigation rows before Team. The cover was increased to 12.75 rem, the sidebar was aligned to P2's Posts/Pages model, and Notifications moved to the topbar. A post-fix capture is still required.

## Implementation checklist

- Capture the revised authenticated desktop feed at 1440 × 1000.
- Capture authenticated mobile feed at 390 × 844.
- Compare both captures with the source references in one visual input.
- Fix all P0/P1/P2 differences and repeat capture.
- Verify composer focus/publish, route navigation, search submit, mobile menu, console errors, and keyboard focus.

final result: blocked
