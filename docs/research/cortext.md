# Cortext architectural study

Audited repository: [Automattic/cortext](https://github.com/Automattic/cortext), commit `2f32c7ad91aa12cff1f6ac72f19775355360dc4f` (beta).

## Patterns to adopt

- A plugin-owned full-screen React shell can still inherit WordPress authentication, permissions, REST nonces, editor settings, media, and block assets.
- `@wordpress/core-data` should own ordinary record reads/writes, revisions, autosaves, and resolver caching; bespoke REST endpoints should cover domain operations rather than duplicate Core controllers.
- Server-bootstrap the output of `get_block_editor_settings()` and pass it to an `EditorProvider`; enqueue media and editor styles explicitly.
- Curate the block picker. A focused product should not expose every installed block.
- Keep content inspectable in WordPress and let the product shell be an experience layer.
- Separate shell styling from public content rendering and explicitly manage iframe editor styles.
- Use route state in the URL, loading/error boundaries, post locks, and autosave.
- Avoid repeated per-ID requests when a query already populated core-data’s query cache.

## Patterns not copied blindly

Cortext mounts in wp-admin and uses a dedicated document CPT because its knowledge-base model needs pages, collections, and typed rows. Q2 needs a front-end application route and native `post`/`page` objects. Cortext’s TanStack router, custom collections, relations, rollups, and sidecar field-value index solve different product problems and are not Q2 dependencies.

Cortext currently requires WordPress 7.1/PHP 8.1 in its audited main branch and is early beta. Q2 can learn from its current editor integration without making Cortext a dependency or claiming its internal APIs are stable.

## Concrete Q2 decision

Q2 serves an application template at a configurable front-end route (default `/q2/`) and may later offer an explicit “workspace homepage” option. It will not seize `/` on activation. This avoids canonical/template collisions and keeps public WordPress behavior reversible. The shell uses WordPress package dependencies extracted by `@wordpress/scripts`, Core REST for records, and `q2/v1` only for collaboration state.

Sources: [Cortext README](https://github.com/Automattic/cortext), [architecture](https://github.com/Automattic/cortext/blob/trunk/docs/architecture.md), [shell architecture](https://github.com/Automattic/cortext/blob/trunk/docs/architecture/shell.md), and [data model](https://github.com/Automattic/cortext/blob/trunk/docs/architecture/data-model.md).

