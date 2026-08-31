# Q2 architecture

## Runtime overview

```text
Browser /q2/*
  -> WordPress rewrite + Q2 template boundary
  -> server bootstrap (user, route, REST root/nonce, capabilities)
  -> React application shell
      -> @wordpress/core-data for posts/pages/users/media/comments
      -> @wordpress/api-fetch for q2/v1 collaboration operations
      -> embedded Gutenberg editor surfaces
WordPress database
  -> native posts/pages/comments/users/terms/attachments
  -> q2 collaboration relationship/event tables
```

Q2 is a plugin. An explicit root rewrite serves the complete application at the WordPress homepage. Sections use fragment routing within `/`, while a rewrite endpoint keeps old `/q2/` links available. The shell does not load the active theme header, footer, or styles. wp-admin stays independent.

## Bootstrap and routing

PHP registers explicit root and `q2` rewrite rules plus a query variable, then selects a theme-independent template. Requests require authentication and the `read` capability; unauthenticated users are redirected to the standard login URL with a safe return target.

The server prints only the application mount, accessible fallback text, and WordPress-enqueued assets. `window.q2Settings` contains non-secret bootstrap data: REST root/nonce, current user summary, route base, site label, and capability booleans. It is encoded with `wp_json_encode` and added before the extracted application script.

The initial shell uses dependency-free History API routing for its small route set. Routes are URL-addressable under `/q2/`; links retain normal `href` behavior, and the router intercepts same-origin unmodified clicks. A mature route tree may adopt the Core route package after its public contract proves sufficient. Unknown routes render a not-found state.

## Data access and state

- Core records use Core REST endpoints and `@wordpress/core-data` once editor-driven CRUD lands.
- Domain relationships/events use `q2/v1` controllers with object-level permission callbacks.
- UI-local state covers open panels, drafts, pagination, and optimistic transaction state.
- Server state is never duplicated into a bespoke global cache merely for convenience.
- Feed pagination uses stable date/ID cursors; the foundation can use Core page pagination until event/read semantics land.

Optimistic changes use a transaction ID and rollback snapshot. The server remains authoritative. Duplicate follows/reactions are idempotent through unique keys.

## Editor integration

Q2 will enqueue WordPress editor assets, get server editor settings from `get_block_editor_settings()`, and mount `EditorProvider` for a native entity record. The post/page inserter is allowlisted to collaboration-relevant Core blocks plus `q2/*`. Media uses `wp_enqueue_media()` and current editor media settings.

Comment editing uses an isolated block list restricted to paragraph, list, image, quote, and code (links are formats). Serialized blocks are stored in native `comment_content`. Server validation parses blocks and rejects disallowed block names before KSES sanitization. Plain historical comments continue to render.

## REST design

Namespace: `q2/v1`. Controllers are organized by domain: bootstrap, feed/read-state, notifications, mentions, follows, reactions, search, and preferences. Core record routes are not wrapped.

Every route:

- has a permission callback;
- checks the target object capability (`edit_post`, comment capabilities, etc.);
- uses schema validation/sanitization;
- returns `WP_Error` with actionable stable codes;
- supports idempotency where a relationship is toggled;
- never treats nonce success as authorization.

## Permissions

Q2 derives ordinary actions from Core capabilities. Q2-specific capabilities are limited to policy not represented by Core, initially `manage_q2` and `q2_mention_all`. Activation grants them to administrators; filters allow sites to customize role mapping. Future task assignment checks both the actor’s edit capability and the assignee’s site membership.

## Rendering and privacy

The Q2 app is private to authenticated users with `read`. Native public single post/page behavior remains controlled by WordPress status and the active theme. Q2 does not globally change post visibility on activation. Sites wanting a private workspace should configure site/content visibility as a separate explicit policy; a future Q2 setting may help enforce it.

Rendered content uses normal WordPress block/content filters in trusted server responses. React-generated labels are escaped by React; raw HTML is limited to server-rendered, KSES-filtered content.

## Caching and performance

- Rely on Core object caching for native records.
- Use composite indexes for per-user unread/notification/follow/reaction queries.
- Invalidate domain counts after writes; do not cache permission-sensitive payloads globally.
- Fetch visible fields only and pool queried core-data records before per-ID reads.
- Keep feed payloads bounded and lazy-load comment threads in Default/Compact modes.

## Extensibility

PHP events such as `q2_notification_created` and registered notification-channel interfaces will allow mail/push/integration adapters. Block types expose normal block filters. REST responses follow registered schemas. Public extension contracts will be versioned only after the first core workflows stabilize.

## Realtime seam

Mutations emit domain events independent of transport. Initially the UI refreshes on navigation/user action and may poll bounded “since cursor” endpoints. A future SSE/WebSocket/WordPress collaboration adapter can consume the same event sequence. Realtime is not required for data integrity.

## Failure and accessibility behavior

The shell includes a no-script message, initial loading status, route-level empty/error/retry states, focus-visible controls, landmarks, live regions for mutations, reduced-motion styles, and a skip link. Browser history navigation restores routes. Editor and modal focus management use WordPress components.
