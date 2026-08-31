# P2 history and Q2’s relationship to it

## Original P2

P2 began as a WordPress theme for microblogging. First-party 2009 material documents front-end quick posting, live Ajax updates, inline threaded comments, multiple post formats, and theme customization. The implementation belonged to the theme era: templates, JavaScript, and WordPress’s normal post/comment model worked together on the public front end.

## o2 and P2020 era

o2 moved much of the application behavior into a plugin: front-side create/edit, comment interactions, subscriptions, keyboard behavior, and live/incremental updates. P2020 supplied the 2020 theme and product-specific presentation plus filters such as New Posts, New Comments, My Posts, and My Mentions. P2tenberg embedded Gutenberg in o2’s posting and comment surfaces. Jetpack and WordPress.com-only modules supplied likes, infinite scroll, mentions, notification infrastructure, and subscriptions.

This era proves the value of an app-like front end, but it also demonstrates why Q2 must not revive that stack: responsibilities were distributed across a theme, o2, P2tenberg, Jetpack, and private platform code.

## Modern WordPress.com P2

Modern P2 reframed the stream as one surface inside a workspace product. It added or formalized Gutenberg posts/pages/comments, three feed display modes, member and guest scopes, workspace-wide search, crossposting, shared glossary, patterns/Starter Buttons, and work blocks for tasks, project status, and changelogs. Realtime collaborative editing was documented as limited beta.

## Q2

Q2 is an independent, self-hosted WordPress plugin. It is neither an official successor nor a compatibility layer. It preserves the product lessons—front-end work, async streams, threaded rich discussion, durable knowledge, unread state, and block-native work objects—while using current WordPress APIs and its own `Q2`/`q2` identity.

| Generation | Primary shape | Editing | Collaboration infrastructure |
|---|---|---|---|
| Original P2 | Theme | Front-end form/editor | Theme Ajax + Core posts/comments |
| o2/P2020 | Theme plus several plugins | o2 + P2tenberg | o2, Jetpack, wp.com modules |
| Modern P2 | Hosted workspace product | Gutenberg throughout | WordPress.com services and APIs |
| Q2 | Independent plugin | Current Gutenberg packages | Core primitives + Q2 persistence |

Sources: [A New P2 (2009)](https://wordpress.com/blog/2009/11/19/a-new-p2/), [P2 Help](https://p2help.wordpress.com/), and the [P2020 repository](https://github.com/oscarhugopaz/p2020) at audited commit `3f46704775efcf1b8f4ec906637b76fa2a0b3cee`.

