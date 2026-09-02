=== Q2 ===
Contributors: q2contributors
Tags: collaboration, workspace, gutenberg, intranet, knowledge-base
Requires at least: 7.1
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.2.13
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Q2 is a modern, self-hosted collaborative workspace for WordPress.

== Description ==

Q2 provides a theme-independent workspace application while keeping posts, pages, comments, users, media, tags, and blocks native to WordPress.

Q2 is an independent project inspired by product lessons from P2. It is not an official continuation, fork, or compatibility layer.

The private workspace includes a post feed and Gutenberg composer, threaded comments, pages, search, media, notifications, people, projects, tasks, workspace branding, and the Q2 Task, Project Status, Changelog, Survey, and Files blocks.

Q2 follows the WordPress site language. English (en_US) is the source language, and Spanish (es_ES) translations are included.

== Installation ==

1. Download the latest versioned Q2 ZIP from GitHub Releases.
2. In WordPress, go to Plugins > Add New Plugin > Upload Plugin.
3. Select the ZIP, install it, and activate Q2.
4. Sign in and visit the site homepage. Q2 uses the homepage as the private workspace; `/q2/` remains available as a compatibility entry.
5. To use Spanish, choose Español under Settings > General > Site Language.

For Multisite, network-activate Q2 to make every existing and future site an independent workspace. Members can switch among joined workspaces from Projects; network administrators can access all Q2 workspaces.

== Changelog ==

= 0.2.9 =

* Place workspace Links below Team in the sidebar.

= 0.2.8 =

* Add Multisite lifecycle support with one Q2 workspace per site.
* Add the Projects screen for switching between accessible workspaces.
* Provision existing and newly created sites during network activation.
* Keep feed preferences, navigation, content, and collaboration data site-local.
* Fix task reminder actor data and cron cleanup during deactivation.

= 0.2.7 =

* Manage workspace links with the native Gutenberg Navigation editor.
* Migrate existing sidebar links while retaining the previous option as a fallback.
* Display nested navigation links in the workspace sidebar.

= 0.2.4 =

* Add workspace cover and icon controls shared by the header and workspace card.
* Improve post and page editing, navigation actions, and task-block synchronization.
* Add English and Spanish locale support.

= 0.2.2 =
* Allow opt-in task state mutations through PATCH /q2/v1/tasks/(block_id) so members can mark a task done without re-saving the full post.
* Send a daily Q2 cron reminder to assignees with tasks due on or before the next day, deduped by (task, date, recipient).
* Surface the new task_due_soon notification type in the Notifications inbox.

= 0.2.0 =
* Add the Pages screen with hierarchical navigation, full Gutenberg editing, and parent cycle protection.
* Add the universal Search screen that indexes posts, pages, comments, people, and tags.
* Add the Media screen with MIME filtering, image previews, and inline metadata editing.
* Add the Starter Buttons manager so administrators can curate block patterns.
* Add the q2/task block with assignees, due dates, and status, persisted in a new wp_q2_tasks table for indexable summaries and assignment notifications.
* Add the q2/project-status and q2/changelog Gutenberg blocks.
* Add a modern P2-inspired responsive application design.
* Add Gutenberg post creation and inline editing with tags.
* Add incremental chronological feed loading.
* Add rich native WordPress comments, threaded replies, inline editing, and deletion controls.
* Add the authenticated people directory.
* Add member and @all mention autocomplete with durable mention notifications.
* Add accurate unread post/comment filters, My Posts, and My Mentions.
* Add in-app notifications, thread following, Likes, and persistent feed views.

= 0.1.3 =
* Add automatic updates from public GitHub Releases and reproducible build/release tooling.

= 0.1.2 =
* Register the homepage explicitly and keep every Q2 section inside the home SPA.

= 0.1.1 =
* Make the site homepage the primary Q2 Feed entry while retaining `/q2/` compatibility routes.

= 0.1.0 =
* Add research and architecture documentation.
* Add the application route, responsive shell, native feed, and block-serialized lightweight composer foundation.
