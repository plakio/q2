#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_FILE="$ROOT_DIR/q2.php"
BUMP="${1:-patch}"

cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
	printf 'Error: the working tree must be clean before a release.\n' >&2
	git status --short
	exit 1
fi

if [[ "$(git branch --show-current)" != "main" ]]; then
	printf 'Error: releases must be created from the main branch.\n' >&2
	exit 1
fi

CURRENT_VERSION="$(php -r '$contents = file_get_contents($argv[1]); preg_match("/Version:\\s*([^\\s]+)/", $contents, $matches); echo $matches[1] ?? "";' "$PLUGIN_FILE")"
if [[ ! "$CURRENT_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	printf 'Error: could not read a semantic Version header from q2.php.\n' >&2
	exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
case "$BUMP" in
	patch) PATCH=$((PATCH + 1)) ;;
	minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
	major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
	[0-9]*.[0-9]*.[0-9]*) NEW_VERSION="$BUMP" ;;
	*)
		printf 'Usage: npm run release -- [patch|minor|major|x.y.z]\n' >&2
		exit 1
		;;
esac
NEW_VERSION="${NEW_VERSION:-$MAJOR.$MINOR.$PATCH}"

if [[ ! "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || \
	! php -r 'exit(version_compare($argv[2], $argv[1], ">") ? 0 : 1);' "$CURRENT_VERSION" "$NEW_VERSION"; then
	printf 'Error: release version %s must be greater than %s.\n' "$NEW_VERSION" "$CURRENT_VERSION" >&2
	exit 1
fi

if git rev-parse "v$NEW_VERSION" >/dev/null 2>&1; then
	printf 'Error: tag v%s already exists.\n' "$NEW_VERSION" >&2
	exit 1
fi

php -r '
$file = $argv[1];
$version = $argv[2];
$contents = file_get_contents($file);
$contents = preg_replace_callback(
    "/^( \\* Version:\\s+)[^\\s]+/m",
    static fn(array $matches): string => $matches[1] . $version,
    $contents,
    1
);
$contents = preg_replace_callback(
    "/^(define\\( \\x27Q2_VERSION\\x27, \\x27)[^\\x27]+(\\x27 \\);)$/m",
    static fn(array $matches): string => $matches[1] . $version . $matches[2],
    $contents,
    1
);
file_put_contents($file, $contents);
' "$PLUGIN_FILE" "$NEW_VERSION"

php -r '
$file = $argv[1];
$version = $argv[2];
$contents = file_get_contents($file);
$contents = preg_replace_callback(
    "/^(Stable tag:\\s*).+$/m",
    static fn(array $matches): string => $matches[1] . $version,
    $contents,
    1
);
file_put_contents($file, $contents);
' "$ROOT_DIR/readme.txt" "$NEW_VERSION"

npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version
npm run check
npm run build

git add q2.php readme.txt package.json package-lock.json build
git commit -m "Release $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Q2 $NEW_VERSION"
git push origin HEAD "v$NEW_VERSION"

printf 'Pushed Q2 %s. GitHub Actions will publish the clean release ZIP.\n' "$NEW_VERSION"
