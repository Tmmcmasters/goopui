#!/usr/bin/env bash
# Removes macOS AppleDouble files (._*) that macOS writes next to every file
# on non-APFS drives like this exFAT one. They hold extended attributes only,
# so deleting them is safe. They break shadcn-nuxt scanning and Nitro builds.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
count=$(find "$root" -name '._*' -type f | wc -l | tr -d ' ')
find "$root" -name '._*' -type f -delete
echo "Removed $count AppleDouble (._*) files under $root"
