# Q2

Q2 is a modern, self-hosted collaborative workspace built natively on WordPress and Gutenberg. It is an independent project inspired by product lessons from P2; it is not an official continuation, fork, or compatibility layer.

The authenticated homepage becomes a theme-independent workspace for posts, threaded discussions, pages, media, search, notifications, people, projects, and tasks. Content stays in native WordPress posts, pages, comments, users, media, tags, revisions, and blocks. Q2 includes workspace cover and icon controls plus Task, Project Status, Changelog, Survey, and Files blocks.

Try Q2 in your browser with the <a href="https://playground.wordpress.net/?plugin=https://github.com/plakio/q2/archive/refs/heads/main.zip" target="_blank" rel="noopener noreferrer">WordPress Playground demo</a>.

## Requirements

- WordPress 7.1+
- PHP 8.1+
- Node 24+ and npm 11+ for development

## Installation

### From a release ZIP

1. Download `q2-X.Y.Z.zip` from the [latest GitHub release](https://github.com/plakio/q2/releases/latest).
2. In WordPress, go to **Plugins → Add New Plugin → Upload Plugin**.
3. Select the ZIP, choose **Install Now**, and activate Q2.
4. Sign in and visit the site homepage. Q2 uses the homepage as the private workspace; `/q2/` is retained as a compatibility entry.

### From source

Clone or copy the repository to `wp-content/plugins/q2`, then run:

```sh
npm install
composer install
npm run build:assets
```

Activate Q2 in WordPress and visit the site homepage while signed in.

Q2 uses the WordPress site language. English (`en_US`) is the source language, and Spanish (`es_ES`) translations are included. Change the locale under **Settings → General → Site Language**.

## Development

```sh
npm install
composer install
npm run build:assets
composer lint
npm run check
```

Use `npm run start` for a development build with file watching. `npm run i18n:update` refreshes the translation template and Spanish catalog after source strings change; `npm run i18n:build` compiles the PHP and JavaScript translation files.

`npm run build` compiles the application and creates a clean versioned plugin ZIP with its SHA-256 checksum in `dist/`. Development files, dependencies, local agent configuration, credentials, and caches are excluded.

## Releases and updates

Q2 uses public [GitHub Releases](https://github.com/plakio/q2/releases) as its WordPress update source; no GitHub token is required in `wp-config.php`. WordPress compares the installed version with the latest stable `vX.Y.Z` release and installs its versioned `q2-X.Y.Z.zip` asset.

From a clean `main` branch, create a release with:

```sh
npm run release              # patch bump
npm run release -- minor
npm run release -- 1.0.0
```

The release command updates version files, runs checks, builds the ZIP, commits, tags, and pushes. The tag triggers `.github/workflows/release.yml`, which publishes the clean ZIP and checksums using GitHub’s automatic Actions token.

The product definition is in [`docs/product.md`](docs/product.md), architecture is in [`docs/architecture.md`](docs/architecture.md), and the data model is in [`docs/data-model.md`](docs/data-model.md).

## License

Q2 is free software licensed under the [GNU General Public License, version 2 or later](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html) (`GPL-2.0-or-later`).
