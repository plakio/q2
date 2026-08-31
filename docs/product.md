# Q2 product definition

> Q2 is a self-hosted collaborative workspace for WordPress.

Q2 turns a current WordPress site into an application for asynchronous communication, discussion, documentation, knowledge sharing, tasks, and project updates. It is inspired by lessons from P2 but is an independent open-source plugin with its own identity and implementation.

## Principles

1. WordPress owns the data. Posts, pages, comments, users, media, tags, revisions, and patterns remain normal WordPress objects.
2. The workspace is the daily surface. Members should not need wp-admin for normal collaboration.
3. Conversation and knowledge are distinct. Posts are chronological and discussion-oriented; pages are durable and revision-oriented.
4. Unread and notifications remain distinct. One tracks unseen shared activity; the other tracks events involving the current user.
5. Gutenberg is the authoring model, including a reduced block editor for comments.
6. Permissions are WordPress capabilities enforced on the server.
7. The active theme is irrelevant to the private Q2 shell.
8. Q2 works without Jetpack, BuddyPress, o2, P2tenberg, SaaS, or a Q2 theme.

## Primary users and jobs

- A member publishes an update, question, proposal, or decision and discusses it in threaded replies.
- A member catches up on new posts/comments without conflating them with direct notifications.
- A mentioned or assigned member sees why their attention is needed.
- A team maintains durable pages for policy, process, plans, and onboarding.
- A project owner embeds tasks and a derived status summary in ordinary block content.
- An administrator manages membership and workspace settings through WordPress roles/capabilities.

## Navigation

The shell has Feed, Notifications, Search, Pages, Projects, Tasks, Media, People, and Starter Buttons, plus account controls. On mobile the primary navigation becomes a compact drawer/bottom-accessible control without changing information architecture.

The complete Q2 application lives at the site homepage `/`. Sections use home-scoped fragment state such as `/#notifications` and `/#pages`, so they do not compete with WordPress content routes. `/q2/` remains only as a compatibility entry.

## Releases

### Foundation (implemented by this milestone)

- Activatable plugin, homepage application entry plus `/q2/` compatibility route, login/access boundary, theme-independent document shell.
- Responsive React shell, route navigation, REST bootstrap, loading/empty/error states.
- Native post feed read path and a lightweight post composer.
- Architecture and schema prepared for collaboration tables without prematurely creating unfinished product features.

### Core collaboration

- Embedded curated block editor for posts/pages and reduced editor for comments.
- Inline post/comment editing, native threaded comments, incremental loading, tags, People.
- Mentions, accurate unread state, notifications, follows, Like, and three feed modes.

### Knowledge and work

- Pages navigation/search/pattern starters/media UX.
- `q2/task`, `q2/project-status`, and `q2/changelog` with assignment notifications.
- Tasks listing (assigned to me or all tasks) with overdue filtering.

### Later

- Multisite workspaces, guests across sites, crossposting, network search/glossary.
- Realtime feed, push, presence, collaborative editing, and reply-by-email.

## Explicit non-goals

Q2 is not P2 compatibility software, a theme, a headless/Next.js application, a replacement identity system, or a project-management database. Initial Q2 does not promise realtime collaboration or multi-workspace behavior.

## Success measures

- A member can enter Q2, publish, read, and navigate without wp-admin.
- Disabling Q2 leaves primary content inspectable as posts/pages/comments.
- Every mutation fails safely when the WordPress capability is absent.
- The shell works with arbitrary active themes and at keyboard/mobile widths.
- Notification and unread query latency remains index-driven as history grows.
