# Q2 Multisite workspaces

## Mapping

A Q2 workspace maps to a site in a WordPress Multisite network. Each collaboration space, project, or team therefore has site-local posts, pages, comments, media, terms, options, roles, navigation, Q2 tables, and URLs while sharing network user identities.

Q2 can still be activated on an ordinary single-site installation. On Multisite it may be activated per site or network-wide. Network activation provisions existing sites and automatically provisions newly initialized sites.

## Benefits

- Native content isolation and per-space permissions.
- Shared user identities without duplicating membership in Q2-owned tables.
- Existing domain/path mapping, exports, backups, and site lifecycle.
- `$wpdb->prefix` naturally scopes Q2 collaboration tables to a site.

## Current behavior

- Projects lists readable Q2 sites in the current network and opens the selected workspace at its canonical home URL.
- Ordinary users see sites they have joined. Super administrators can access every healthy Q2-enabled site in the network.
- Workspace identity, Links navigation, feed preferences, content, permissions, task indexes, and collaboration data are site-local.
- Deactivation preserves data. When Q2 is network-active, deleting a site includes its Q2 tables in WordPress's normal table cleanup.

## Future network features

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
