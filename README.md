# Q2

Q2 is a modern, self-hosted collaborative workspace built natively on WordPress and Gutenberg. It is an independent project inspired by product lessons from P2; it is not an official continuation, fork, or compatibility layer.

This repository currently contains the research, product/architecture specification, and Phase 2 application foundation. The complete SPA lives at the site homepage while signed in; sections use URLs such as `/#notifications`. `/q2/` remains available only for compatibility.

## Requirements

- WordPress 7.1+
- PHP 8.1+
- Node 24+ and npm 11+ for development

## Development

```sh
npm install
npm run build
composer install
composer lint
```

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

Research starts at [`docs/research/p2-modern.md`](docs/research/p2-modern.md). Architecture is in [`docs/architecture.md`](docs/architecture.md).

## License

GPL-2.0-or-later.
