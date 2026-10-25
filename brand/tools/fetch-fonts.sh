#!/bin/sh
# Downloads the OFL-licensed fonts the wordmarks are outlined from (google/fonts repo).
# They are only needed to rebuild the SVGs; the shipped SVGs contain outlines, not fonts.
set -eu
DIR="$(cd "$(dirname "$0")" && pwd)/.fonts"
mkdir -p "$DIR"
BASE="https://raw.githubusercontent.com/google/fonts/main/ofl"
for f in \
  "geist/Geist%5Bwght%5D.ttf geist_Geist[wght].ttf" \
  "outfit/Outfit%5Bwght%5D.ttf outfit_Outfit[wght].ttf" \
  "bricolagegrotesque/BricolageGrotesque%5Bopsz,wdth,wght%5D.ttf bricolagegrotesque_BricolageGrotesque[opsz,wdth,wght].ttf" \
  "dmsans/DMSans%5Bopsz,wght%5D.ttf dmsans_DMSans[opsz,wght].ttf"; do
  src="${f%% *}"
  dst="${f#* }"
  [ -f "$DIR/$dst" ] || curl -sfL "$BASE/$src" -o "$DIR/$dst"
  echo "$DIR/$dst"
done
