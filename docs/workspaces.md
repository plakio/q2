# Future Q2 workspaces

## Recommended mapping

A Q2 workspace should default to a WordPress Multisite network, and each collaboration space/project/team to a site within that network. WordPress already supplies site-local posts/pages/comments/terms/options, network users, per-site roles, site IDs, domain/path routing, and mature administration APIs.

This mapping is not finalized product behavior and is not part of the initial release.

## Benefits

- Native content isolation and per-space permissions.
- Shared user identities without duplicating membership in Q2-owned tables.
- Existing domain/path mapping, exports, backups, and site lifecycle.
- `$wpdb->prefix` naturally scopes Q2 collaboration tables to a site.

## Gaps Q2 must solve

- Workspace home and navigation across joined sites.
- Member versus guest semantics: a network member is not automatically a member of every site, which can model guests but needs clear UI.
- Network-wide search with per-result access checks and indexing strategy.
- Crossposting provenance, updates, deletion, and comment ownership.
- Shared glossary/pattern policy and central member administration.
- Notification aggregation across site tables without unsafe fan-out queries.

## Rejected early alternatives

- A custom `workspace_id` on every row duplicates a boundary WordPress already has and complicates native queries.
- One site plus a workspace taxonomy does not isolate comments, media, options, URLs, roles, and REST access adequately.
- Separate WordPress installations lose shared identity and central navigation.

## Portability rules now

- Never assume blog ID `1` or hard-code table prefixes.
- Generate URLs with WordPress functions.
- Keep primary content in site-local native objects.
- Include blog ID in network-level event references only when an actual network aggregate is introduced.
- Keep access checks in the target site context when using `switch_to_blog()` and always restore context.

## Open decisions before implementation

Network notification storage (aggregate table versus bounded per-site reads), global-search indexing, crosspost copy versus reference semantics, guest invitation UX, glossary ownership, network administrator capabilities, and single-site-to-multisite migration all need prototypes and scale tests.

