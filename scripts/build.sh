#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_SLUG="q2"
DIST_DIR="$ROOT_DIR/dist"
PLUGIN_FILE="$ROOT_DIR/q2.php"
VERSION="$(php -r '$contents = file_get_contents($argv[1]); preg_match("/Version:\\s*([^\\s]+)/", $contents, $matches); echo $matches[1] ?? "";' "$PLUGIN_FILE")"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	printf 'Error: q2.php must contain a semantic x.y.z Version header.\n' >&2
	exit 1
fi

cd "$ROOT_DIR"
npm run build:assets

STAGING_ROOT="$(mktemp -d)"
trap 'rm -rf "$STAGING_ROOT"' EXIT
PACKAGE_DIR="$STAGING_ROOT/$PLUGIN_SLUG"
rm -rf "$DIST_DIR"
mkdir -p "$PACKAGE_DIR" "$DIST_DIR"

for path in q2.php readme.txt README.md build includes templates; do
	if [[ -e "$ROOT_DIR/$path" ]]; then
		rsync -a --no-owner --no-group "$ROOT_DIR/$path" "$PACKAGE_DIR/"
	fi
done

if [[ -d "$ROOT_DIR/languages" ]]; then
	rsync -a --no-owner --no-group "$ROOT_DIR/languages" "$PACKAGE_DIR/"
fi

ZIP_FILE="$DIST_DIR/$PLUGIN_SLUG-$VERSION.zip"
( cd "$STAGING_ROOT" && zip -qr "$ZIP_FILE" "$PLUGIN_SLUG" )
shasum -a 256 "$ZIP_FILE" > "$ZIP_FILE.sha256"

if ! unzip -Z1 "$ZIP_FILE" | grep -Fxq "$PLUGIN_SLUG/q2.php"; then
	printf 'Error: release ZIP must contain %s/q2.php.\n' "$PLUGIN_SLUG" >&2
	exit 1
fi

if unzip -Z1 "$ZIP_FILE" | grep -Ev "^$PLUGIN_SLUG/" | grep -q '.'; then
	printf 'Error: release ZIP must contain only the %s root directory.\n' "$PLUGIN_SLUG" >&2
	exit 1
fi

if unzip -Z1 "$ZIP_FILE" | grep -Eq '(^|/)(node_modules|vendor|src|scripts|docs|\.git|\.env)(/|$)'; then
	printf 'Error: release ZIP contains development-only or sensitive files.\n' >&2
	exit 1
fi

printf 'Built %s\n' "$ZIP_FILE"
