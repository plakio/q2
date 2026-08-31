# Current WordPress capability map

Baseline researched on 2026-08-31 against stable WordPress 7.1 and current developer documentation.

| Requirement | Classification | Primitive / Q2 work |
|---|---|---|
| Posts/pages/users/media/tags/comments | Core provides | Core entities and REST controllers. |
| Gutenberg serialization/rendering | Core provides | Blocks in `post_content`; `do_blocks()`/normal content filters. |
| React components and state | WP packages provide | `@wordpress/element`, `components`, `data`, `core-data`. |
| Authenticated app requests | Core provides | Cookie authentication and `X-WP-Nonce`; `api-fetch` middleware is bootstrapped by WP. |
| Record reads/writes, autosave, revisions | Core provides | `core-data` entities/selectors/actions and editor stores. |
| Full embedded editor | Core primitives; Q2 UI required | `EditorProvider`, block editor settings/assets, curated allowed blocks. |
| Rich comment editor | Core primitives; custom persistence/UI | Serialize allowed blocks to native `comment_content`; sanitize and validate server-side. |
| Threaded comments | Core provides | `comment_parent`, comment REST API. |
| Mentions | Custom implementation/persistence | Extract canonical user slugs, validate access, maintain mention rows/events. |
| Notifications | Custom persistence | Indexed Q2 event/inbox table and domain endpoint. |
| Unread state | Custom persistence | Per-user content cursor/read table; separate from notification read state. |
| Follows and reactions | Custom persistence | Unique indexed relationship rows; idempotent REST mutations. |
| Search | Core primitives; Q2 aggregation required | Core search for post/page; custom comment/user/tag/media adapters. |
| Feed view modes | Q2 UI | Query + presentation state; user preference REST/meta. |
| Patterns | Core provides | Block pattern APIs; Q2 allowlist and Starter Buttons UI. |
| Task/project/changelog | Custom blocks | `q2/*` block metadata and attributes; native serialized content. |
| DataViews | Package provides | Candidate for Pages/People/Projects lists, not required for stream. |
| Block Bindings | Core provides | Useful later for server-backed task properties; unnecessary for first static block attributes. |
| Interactivity API | Core provides | Useful for isolated public block interactions; shell remains React. |
| Script Modules | Core provides | Candidate for interactive blocks; regular extracted script dependencies are simpler for shell foundation. |
| Realtime collaboration | Not stable in Core 7.1 | Do not require; WordPress 7.0 removed RTC pre-release. Preserve event seams. |
| Workspace boundary | Core provides candidate | WordPress Multisite sites/network/users; needs product work. |

## Baseline

- WordPress 7.1 or newer.
- PHP 8.1 or newer.
- Node 24 LTS-compatible development line and npm 11 for contributors.
- Current evergreen Chrome, Firefox, Safari, and Edge; progressive responsive layout, keyboard access, and reduced-motion support.

The modern baseline avoids compatibility shims for editor APIs and aligns with the audited Cortext implementation. A later compatibility decision may lower the WordPress minimum after automated matrix testing, but phase one intentionally targets current stable Core.

## Security boundaries

REST nonces address request forgery, not authorization. Every Q2 endpoint must have a `permission_callback`, call object-level capabilities, validate enumerations/IDs, use prepared database access, and escape on render. Block comment content is passed through the same KSES policy appropriate to the acting user and the Q2 block allowlist.

## Sources

- [`@wordpress/core-data`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-core-data/)
- [REST authentication](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/)
- [REST posts](https://developer.wordpress.org/rest-api/reference/posts/)
- [REST comments](https://developer.wordpress.org/rest-api/reference/comments/)
- [Block Editor packages](https://developer.wordpress.org/block-editor/reference-guides/packages/)
- [Block Bindings](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-bindings/)
- [Interactivity API](https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/)
- [DataViews](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-dataviews/)
- [WordPress 7.0 RTC removal](https://make.wordpress.org/core/2026/05/08/rtc-removed-from-7-0/)

