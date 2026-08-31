# Modern WordPress.com P2 research

Research date: 2026-08-31. “Observed” means documented by a first-party P2 or WordPress.com source. It does not mean the feature is available to self-hosted WordPress.

## Product shape

Modern P2 is a WordPress.com-hosted, Gutenberg-based collaboration product. A workspace contains one or more P2 sites; posts are chronological conversations, while pages are durable, collaboratively edited knowledge. WordPress.com says the current product cannot be self-hosted. Q2 must therefore reproduce useful behavior with public WordPress APIs rather than assume access to P2 services.

## Feature inventory

| Area | Observed behavior | Status / confidence | Q2 consequence |
|---|---|---|---|
| Posts | Gutenberg-authored posts form the chronological async stream. | Public, high | Native `post` and `post_content`. |
| Pages | Stable documentation; multiple people can update it; creation date is secondary. | Public, high | Native hierarchical `page`. |
| Comments | Chronological threaded replies; reply to a post or comment; the same block editor used for posts/pages; inline edit and trash. | Public, high | Native comments containing sanitized block markup. |
| Mentions | Autocomplete for workspace members in posts, pages, and comments; multiple mentions and `@all`; notification on publish. | Public, high | Q2 parser/index and permission-gated `@all`. |
| Likes | Notifications and email for likes are documented; notification UI can filter Likes. | Public, high | Start with one idempotent Like reaction. |
| Following | Users explicitly follow a post for comment notifications. New posts are emailed by default in the documented generation. | Public, high | Per-thread subscription, distinct from site membership. |
| Notifications | Web/admin-bar notifications; All/Unread and Comments/Follows/Likes filters; email and browser delivery; keyboard navigation; display limited to latest 100. | Public, high | Durable in-app event inbox with channel adapters; do not copy the 100-row storage limit. |
| Feed modes | Default = full posts/comments hidden; Expanded = posts and comments; Compact = inbox-like. Selection is saved in the browser per device. | Public, high | Three modes; initially store user preference so it follows the user, with local fallback. |
| Unread feed | Modern public help establishes unread notification filters but does not fully document P2020-style New Posts/New Comments views. | Uncertain, medium | Preserve the independently valuable unread-content model from P2020, but label it a Q2 choice. |
| Search | Searches post/page title and body plus media title, alt text, filename and single-image captions; excludes comments, tags, categories and gallery captions. | Public, high | Q2 intentionally expands to comments, people, and tags. |
| Patterns | Admin-created P2 Patterns can be used in the inserter and pinned as Starter Buttons on the composer. | Public, high | Use native synced/unsynced patterns and an allowlisted starter option. |
| Tasks | Task text, assignee, pending/in-progress/done, start date and due date. Assignment notifies after publish. | Public, high | `q2/task` block with native user IDs in attributes. |
| Project status | Counts all Task blocks in the current post/page, calculates completed percentage, and supports a project due date. Presence changes task checkbox cycling to include in-progress. | Public, high | `q2/project-status`, derived from sibling task blocks rather than duplicate task state. |
| Changelog | New, Improved, Fixed, or a custom label/color; arbitrary body text. | Public, high | `q2/changelog`; validate custom label/color. |
| Members | Workspace members can join all contained P2s and search workspace-wide; guests are scoped to joined P2s; public visitors may comment but not post. | Public, high | WordPress users/roles now; multisite evaluation later. |
| Roles | Administrator, Editor, Author, Contributor, Follower/Viewer map broadly to WordPress permissions. | Public, high | Use capability checks, never a parallel ACL. |
| Workspaces | Multiple connected P2s, centralized users, cross-site search/crossposting, shared glossary, guests, and a workspace home. | Public, high; hosting-specific implementation unknown | Map a future workspace to a multisite network by default, but do not add synthetic IDs in phase one. |
| Realtime editing | Same-document collaboration, peer avatars/colors, independent undo, same-block editing. Help labels it Beta/limited. | Beta, high | Not an MVP dependency. WordPress Core 7.0 removed RTC before release. |
| Embeds/integrations | P2 marketing says 20+ integrations and names Figma, GitHub and Google Docs. Gutenberg supports rich embeds. | Public behavior, implementation unknown | Core embeds first; optional adapters later. |
| Email | New-post mail, followed-comment mail, like mail, accepted-invitation mail, and reply-by-email for comment mail. | WordPress.com-specific delivery, high | Channel interface first; email phase later; reply-by-email later. |

## Product details worth preserving

- Posts are “email-like” discussion records; pages are “document-like” shared knowledge.
- Notification state answers whether an event involving the user was handled. Feed unread state answers whether new content has been reviewed. They are separate axes.
- Rich comments are not an enhancement to a textarea in P2; they use the block editor itself.
- Default, Expanded, and Compact are information-density modes, not three separate feeds.
- Task and Project Status blocks are content primitives. They are not separate project/task databases.

## Unknowns and cautions

- Public help content describes a product generation from roughly 2020–2022 and may not represent every 2026 account or plan.
- No first-party public contract was found for P2 persistence, realtime protocol, notification schema, or crossposting API.
- “Activity indicators,” optimistic update details, and mobile parity are visually suggested but insufficiently specified to reproduce exactly.
- Modern P2’s documented search exclusions should not be treated as desirable constraints.

## Sources

- [P2 overview](https://wordpress.com/p2/)
- [P2 FAQ](https://wordpress.com/p2/faq/)
- [P2 Help Center](https://p2help.wordpress.com/)
- [Posts versus Pages](https://p2help.wordpress.com/using-p2/posts-vs-pages/)
- [Comments](https://p2help.wordpress.com/using-p2/comments/)
- [Mentions](https://p2help.wordpress.com/using-p2/the-editor/mentions/)
- [Display options](https://p2help.wordpress.com/using-p2/the-interface/main-column/display-options/)
- [Notifications](https://p2help.wordpress.com/using-p2/notifications/)
- [Email notifications](https://p2help.wordpress.com/using-p2/notifications/email-notifications/)
- [Search](https://p2help.wordpress.com/using-p2/search/)
- [P2 Patterns](https://p2help.wordpress.com/using-p2/p2-patterns/)
- [Task and Project Status blocks](https://p2help.wordpress.com/using-p2/the-editor/blocks/tasks-project-status/)
- [Changelog block](https://p2help.wordpress.com/using-p2/the-editor/blocks/changelog-block/)
- [Workspace](https://p2help.wordpress.com/managing-p2/the-workspace/)
- [Members, guests and visitors](https://p2help.wordpress.com/managing-p2/managing-people/members-guests-and-visitors/)
- [Collaboration beta](https://p2help.wordpress.com/using-p2/the-editor/collaboration/)

