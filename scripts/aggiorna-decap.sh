#!/usr/bin/env sh
# Scarica una versione precisa di Decap CMS dal registro npm e copia in public/admin/decap/
# solo i file già compilati che servono al pannello. Uso: sh scripts/aggiorna-decap.sh 3.16.3
set -eu
VERSION="${1:?Indica la versione, es. 3.16.3}"
DEST="public/admin/decap"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

(cd "$TMP" && npm pack "decap-cms@$VERSION" --silent >/dev/null && tar -xzf decap-cms-*.tgz)
rm -rf "$DEST"
mkdir -p "$DEST"
cp "$TMP"/package/dist/*decap-cms.js "$DEST"/
cp "$TMP"/package/dist/*.wasm "$DEST"/
cp "$TMP"/package/dist/decap-cms.js.LICENSE.txt "$TMP"/package/LICENSE "$DEST"/ 2>/dev/null || true
echo "$VERSION" > "$DEST/VERSIONE"
echo "Decap CMS $VERSION copiato in $DEST"
