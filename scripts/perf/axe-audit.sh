#!/usr/bin/env bash
# scripts/perf/axe-audit.sh — run axe-core accessibility scan on PBF URLs.
#
# Sprint 11 S11-D5-T1. Zero committed npm deps — uses @axe-core/cli via npx.
#
# Usage:
#   bash scripts/perf/axe-audit.sh https://staging.printbyfalcon.com
#
# Exits 1 if any page has one or more SERIOUS or CRITICAL violations. MODERATE
# + MINOR are reported but don't fail the run — they're fair-game polish for
# the M1-eve UI pass.

set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "usage: $0 <base-url>" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="$SCRIPT_DIR/reports"
mkdir -p "$REPORT_DIR"

# Pages most likely to host real-world a11y issues. Admin routes omitted per
# PRD §8 (admin best-effort, lower bar).
PAGES=(
  "/ar"
  "/en"
  "/ar/products"
  "/en/products"
  "/ar/search?q=toner"
  "/ar/cart"
  "/ar/checkout"
  "/ar/b2b/signup"
  "/ar/privacy"
  "/ar/terms"
)

failures=()

for path in "${PAGES[@]}"; do
  url="${BASE_URL%/}${path}"
  label="$(echo "$path" | sed 's|[/?=&]|_|g' | sed 's|^_||')"
  out="$REPORT_DIR/$(date +%F)-axe-${label}.json"

  echo ""
  echo "=== axe-core $url"
  # --tags wcag2a,wcag2aa covers PRD §8 target (WCAG 2.1 Level AA).
  # --exit=0 so we can check the JSON ourselves and distinguish severity.
  npx --yes @axe-core/cli@latest \
    "$url" \
    --tags wcag2a,wcag2aa \
    --save "$out" \
    --exit=0

  # Count serious/critical violations.
  serious=$(node -e "
    const r = require('$out');
    const v = (r[0] && r[0].violations) || [];
    console.log(v.filter(x => ['serious','critical'].includes(x.impact)).length);
  ")
  echo "  serious/critical violations: $serious"

  if (( serious > 0 )); then
    failures+=("$url  ($serious serious/critical)")
  fi
done

echo ""
if (( ${#failures[@]} > 0 )); then
  echo "FAIL — ${#failures[@]} page(s) have serious/critical a11y violations:"
  printf '  - %s\n' "${failures[@]}"
  echo ""
  echo "Inspect the JSON reports in $REPORT_DIR for details."
  exit 1
fi

echo "OK — zero serious/critical a11y violations across ${#PAGES[@]} pages."
