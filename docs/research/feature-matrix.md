# Feature matrix

Legend: Core = ready primitive; UI = Q2 UI/domain logic; Table = Q2 indexed persistence; Later = intentionally deferred.

| Feature | P2020 | Modern P2 | Current WordPress | Q2 decision |
|---|---|---|---|---|
| Front-end feed | Theme/o2 | Yes | Query/REST primitives | UI using native posts |
| Front-end Gutenberg | P2tenberg/o2 | Yes | Editor packages | Curated embedded editor |
| Rich comments | P2tenberg/o2 | Same editor | Comment REST + blocks primitives | Native comment + allowed block markup |
| Threading/edit/delete | o2/Core | Yes | Core | Core objects + Q2 inline UI |
| New Posts/New Comments | Theme timestamps/internal seen code | Public docs unclear | Query primitives | Table; preserve as Q2 feature |
| My Posts | Theme/Core author route | Available through filtering/navigation | Core | Core query filter |
| My Mentions | Jetpack/private modules | Yes | No native mentions | Table + parser |
| `@all` | Not complete self-hosted | Yes | No | Capability-gated Q2 mention target |
| Likes | Jetpack/wp.com | Yes | No | Table; Like first, reaction-ready schema |
| Thread follows | o2/wp.com | Yes | No post subscription API | Table |
| Notifications | Private wp.com modules | Web/email/browser | Hooks/email primitives | Table + in-app UI; channel seam |
| Infinite loading | Jetpack | Yes/likely | REST pagination | Cursor/incremental UI |
| Feed modes | Not found in self-host port | Default/Expanded/Compact | No | UI + user preference |
| Pages | Core/theme | Knowledge/wiki | Core page/revisions | Native pages |
| Search | Core theme search | Posts/pages/media, notable exclusions | Core partial | Aggregated Q2 search improves scope |
| People | Theme widget | Members/guests/profiles | Users/roles | Native users; no second identity |
| Patterns/starters | No | Yes | Patterns | Native patterns + pinned allowlist |
| Tasks | No | Task block | Custom blocks possible | `q2/task` |
| Project status | No | Derived block | Block parsing/context primitives | `q2/project-status` derived from tasks |
| Changelog | No | Block + custom types | Custom blocks possible | `q2/changelog` |
| Workspaces | Blog/site assumptions | Connected P2 workspace | Multisite | Later design on multisite |
| Crossposting/global search | wp.com traces | Yes | Multisite primitives only | Later |
| Realtime editing | Live feed via o2, not RTC authoring | Limited beta | Removed from 7.0; future work | Later, adapter boundary only |
| Theme independence | No | Hosted product theme | Plugin templates possible | Required |

## Opportunities to improve

Q2 can search comments, users, and tags that documented P2 search omits; keep notification history beyond an arbitrary UI cap; use accurate per-user read state rather than only timestamps; expose stable extension hooks; and retain all primary content in inspectable WordPress objects.

