#!/usr/bin/env bash
# Lints what npm would actually ship: packs @goopui/{core,vue,react,nuxt} and runs publint
# (exports/files/main/types consistency) and @arethetypeswrong/cli (does TypeScript resolve the
# right .d.ts under every moduleResolution) on each tarball.
#
# All four packages are ESM-only by design (`"type": "module"`, an `import` condition and no
# `require`), so attw runs with `--profile esm-only`: it still checks node16 (ESM importers) and
# bundler resolution, and skips the CommonJS `require()` rows, which can never work for an
# ESM-only package and are expected to fail. `./goop.css` is excluded from attw: it is a
# stylesheet export for bundlers/Tailwind, not a module TypeScript should resolve (publint still
# checks that the file exists).
#
# Usage: pnpm check:exports            pack fresh tarballs (run after `pnpm build`)
#        bash scripts/check-exports.sh <dir>   check the goopui-*.tgz already in <dir>
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/node_modules/.bin"
if [ $# -gt 0 ]; then
  TGZ="$(cd "$1" && pwd)"
  OWN=0
else
  TGZ="$(mktemp -d "${TMPDIR:-/tmp}/goop-exports.XXXXXX")"
  OWN=1
  for p in core vue react nuxt; do
    (cd "$ROOT/packages/$p" && pnpm pack --pack-destination "$TGZ" >/dev/null) || { echo "pack failed: $p"; exit 1; }
  done
fi

fail=0
results=()
for p in core vue react nuxt; do
  t="$(ls "$TGZ"/goopui-"$p"-*.tgz 2>/dev/null | head -1)"
  if [ -z "$t" ]; then echo "FAIL  no tarball for @goopui/$p in $TGZ"; fail=1; continue; fi
  echo "=== @goopui/$p  ($(basename "$t"))"
  ok=1
  # --strict turns publint warnings into errors; suggestions are printed but don't fail.
  "$BIN/publint" run "$t" --strict || ok=0
  "$BIN/attw" "$t" --profile esm-only --exclude-entrypoints goop.css --format table-flipped || ok=0
  if [ $ok = 1 ]; then results+=("PASS  @goopui/$p"); else results+=("FAIL  @goopui/$p"); fail=1; fi
  echo
done

echo "Summary:"; printf '  %s\n' "${results[@]}"
[ $OWN = 1 ] && [ $fail = 0 ] && rm -rf "$TGZ"
exit $fail
