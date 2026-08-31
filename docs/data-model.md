# Q2 data model

## Native WordPress ownership

| Q2 concept | Storage | Notes |
|---|---|---|
| Post/update/thread | `wp_posts`, `post_type=post` | Blocks in `post_content`; tags are native terms. |
| Page/document | `wp_posts`, `post_type=page` | `post_parent`, revisions, autosaves, author. |
| Comment/reply | `wp_comments` | `comment_parent`; allowed block serialization in `comment_content`. |
| Person | `wp_users` + ordinary roles/caps | No Q2 identity table. |
| Media/file | attachment post | Core media lifecycle. |
| Tag | `post_tag` term | No duplicate tag index. |
| Pattern/starter | Core block pattern entities/APIs | Q2 option stores only the selected starter references/order. |
| Task/project/changelog | `q2/task` etc. blocks + `wp_q2_tasks` table | Block data is the source of truth; the table is an index keyed by `block_id` for status summaries and assignment notifications. |
| Feed mode | User meta `q2_feed_view` | Small, one-value preference; appropriate for user meta. |

## Collaboration tables

Relationship and event state has high cardinality and query patterns poorly served by serialized user meta. Tables use `$wpdb->prefix`, so they are naturally site-scoped on multisite.

### `{$wpdb->prefix}q2_notifications`

- `id` bigint unsigned primary key
- `user_id`, `actor_user_id` bigint unsigned
- `type` varchar(40)
- `object_type` varchar(20), `object_id` bigint unsigned
- `secondary_object_type`, `secondary_object_id` for a comment/task beneath a post
- `payload` longtext JSON for display metadata only, never authorization
- `created_at`, `read_at` datetime UTC
- unique optional `dedupe_key` varchar(191)
- indexes `(user_id, read_at, created_at, id)`, `(user_id, type, created_at)`, object tuple

### `{$wpdb->prefix}q2_reads`

- `user_id`, `object_type`, `object_id`
- `last_seen_event_id` bigint unsigned
- `read_at` datetime UTC
- primary key `(user_id, object_type, object_id)`
- index `(user_id, read_at)`

An event cursor supports new comments on an already-read thread without destructive timestamp ambiguity. Workspace-wide “catch up” may later add a per-user stream cursor, but does not replace per-thread state.

### `{$wpdb->prefix}q2_follows`

- `user_id`, `object_type`, `object_id`, `created_at`
- primary key `(user_id, object_type, object_id)`
- reverse index `(object_type, object_id, user_id)` for fan-out

### `{$wpdb->prefix}q2_reactions`

- `id` bigint unsigned primary key
- `user_id`, `object_type`, `object_id`
- `reaction` varchar(32), initially `like`
- `created_at`
- unique `(user_id, object_type, object_id, reaction)`
- count index `(object_type, object_id, reaction)`

### `{$wpdb->prefix}q2_mentions`

- `id` bigint unsigned primary key
- `mentioned_user_id`, `actor_user_id`
- `object_type`, `object_id`, `parent_post_id`
- `mention_key` varchar(60) (`username` or `all`)
- `created_at`
- unique `(mentioned_user_id, object_type, object_id)`
- indexes for user feed and object cleanup

### `{$wpdb->prefix}q2_tasks`

- `id` bigint unsigned primary key
- `block_id` varchar(64) — stable UUID for the `q2/task` block
- `parent_post_id` bigint unsigned — owning post/page
- `actor_user_id`, `title`, `status` (`todo`/`in_progress`/`done`), `due_date`
- `assignees` JSON array of user IDs
- `version` optimistic counter
- `created_at`, `updated_at`
- unique `(block_id)` — one row per block
- indexes `(parent_post_id, status, due_date)`, `(status, due_date)`, `(parent_post_id, due_date)` for project-status and overdue queries

The table is rebuilt from parsed block content on every post save (`Q2\Tasks\Sync`), so the post body remains the source of truth and the table provides indexable aggregate views and assignment notifications.

## Why tables

Notifications are append-heavy and filtered by recipient/type/read time. Follows/reactions/mentions require uniqueness plus fast forward and reverse lookups. Packing these into user meta creates serialized blobs or unbounded rows with weak composite indexing; post meta makes recipient-centric queries expensive. Dedicated tables make correctness and cleanup explicit.

Tables are introduced only with the feature phase that uses them, through versioned `dbDelta` migrations and a stored `q2_db_version`. The foundation does not create speculative unused tables.

## Lifecycle

Post/comment deletion hooks delete or anonymize related Q2 rows. User deletion removes recipient relationship/read rows and applies the site’s chosen notification actor-retention policy. Multisite uninstall is explicit and conservative: deactivation never deletes content or tables; uninstall removes Q2-owned tables/options only after an administrator selects data removal.

