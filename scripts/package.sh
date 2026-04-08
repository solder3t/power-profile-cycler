#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

UUID="$(sed -n 's/.*"uuid": "\(.*\)".*/\1/p' "$ROOT_DIR/metadata.json" | head -n1)"

mkdir -p "$DIST_DIR"
rm -f "$DIST_DIR"/*.zip

glib-compile-schemas --strict "$ROOT_DIR/schemas"

gnome-extensions pack "$ROOT_DIR" \
    --force \
    --out-dir "$DIST_DIR" \
    --extra-source="$ROOT_DIR/prefs.js" \
    --schema="$ROOT_DIR/schemas/org.gnome.shell.extensions.power-profile-cycler.gschema.xml"

echo "Created package:"
ls -1 "$DIST_DIR/$UUID".shell-extension.zip
