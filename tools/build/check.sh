#!/bin/sh
# check.sh — verify a built tree by inspecting the ARTIFACT, never the exit code
# of the thing that produced it.
#
# The build prints "0 failed". That is a status. This reads the pages.
#
# It found a real defect the first time it ran: state_synchronization links to
# /post/reliability_and_flow_control/, which 404s on the live site today and has
# presumably done so for years. The correct article is live at a different slug.
#
# Usage:  sh tools/build/check.sh          (from the repo root, after a build)

set -eu
cd "$(dirname "$0")/../.." 2>/dev/null || true
OUT=out
[ -d "$OUT/post" ] || { echo "no $OUT/post — run the build first"; exit 2; }

pages=$(find "$OUT/post" -name '*.html' | wc -l | tr -d ' ')
echo "pages: $pages"

fails=0

echo "-- script tags (there must be none: the math is pre-rendered) --"
n=$(grep -l '<script' "$OUT"/post/*.html 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = "0" ] || { grep -l '<script' "$OUT"/post/*.html; fails=$((fails+1)); }
echo "   $n page(s) with script tags"

echo "-- unresolved assets --"
grep -ohE '(src|href)="\.\./[^\"]+"' "$OUT"/post/*.html \
  | sed 's/.*="\.\.\///;s/"//' | sort -u > .refs.tmp
while read -r p; do
  [ -e "$OUT/$p" ] || { echo "   MISSING $p"; fails=$((fails+1)); }
done < .refs.tmp
echo "   $(wc -l < .refs.tmp | tr -d ' ') distinct refs checked"
rm -f .refs.tmp

echo "-- dead inter-article links --"
grep -ohE 'href="[a-z0-9_]+\.html"' "$OUT"/post/*.html \
  | sed 's/href="//;s/"//' | sort -u | while read -r h; do
    [ -f "$OUT/post/$h" ] || echo "   DEAD $h"
  done

echo "-- suspiciously small pages (a silent conversion failure looks like this) --"
find "$OUT/post" -name '*.html' -size -3k


echo "-- titleless pages and leaked front matter --"
for f in "$OUT"/post/*.html; do
  t=$(grep -o '<title>[^<]*</title>' "$f" | head -1)
  case "$t" in "<title></title>"|"") echo "   NO TITLE $(basename "$f")"; fails=$((fails+1));; esac
done
n=$(grep -lE '^(draft|featured|focal_point|categories|tags|summary|date):' "$OUT"/post/*.html 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = "0" ] || { grep -lE '^(draft|featured|focal_point|categories|tags|summary|date):' "$OUT"/post/*.html; fails=$((fails+1)); }
echo "   $n page(s) with raw front matter in the body"

echo "-- index covers every built page --"
if [ -f "$OUT/index.html" ]; then
  for f in "$OUT"/post/*.html; do
    b=$(basename "$f")
    grep -q "post/$b" "$OUT/index.html" || { echo "   NOT INDEXED $b"; fails=$((fails+1)); }
  done
fi

echo "-- math actually present where the source had it --"
src_eq=$(grep -oh '\[latex\]' content/post/*.md 2>/dev/null | wc -l | tr -d ' ')
out_eq=$(grep -oh 'class="katex' "$OUT"/post/*.html 2>/dev/null | wc -l | tr -d ' ')
echo "   [latex] in source: $src_eq   katex spans in output: $out_eq"
[ "$src_eq" -gt 0 ] && [ "$out_eq" -eq 0 ] && { echo "   ERROR: source has math, output has none"; fails=$((fails+1)); }

echo "-----"
[ "$fails" -eq 0 ] && echo "clean" || echo "$fails problem class(es) — read them, do not just re-run"
exit 0
