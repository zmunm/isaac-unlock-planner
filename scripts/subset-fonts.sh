#!/bin/sh
# Builds the small Galmuri files the page loads first: ASCII, a few symbols, and only the Hangul the
# UI strings use. The full files stay as a fallback for other Hangul (e.g. Steam nicknames).
# Needs fonttools with brotli: runs it through uvx, so only uv has to be installed.
# Rerun after changing Korean UI text in src/i18n.tsx.
set -eu
cd "$(dirname "$0")/.."
hangul=$(node -e "
  const s = require('fs').readFileSync('src/i18n.tsx', 'utf8') + require('fs').readFileSync('src/App.tsx', 'utf8')
  process.stdout.write([...new Set(s.match(/[가-힣]/g))].join(''))
")
for weight in Galmuri11 Galmuri11-Bold; do
  uvx --from 'fonttools[woff]' pyftsubset "src/fonts/$weight.woff2" \
    --unicodes='U+0020-007E,U+00A0-00FF,U+2010-2027,U+2190-2193,U+2713,U+00D7' \
    --text="$hangul" \
    --flavor=woff2 \
    --output-file="src/fonts/$weight-subset.woff2"
done
ls -l src/fonts/*-subset.woff2
