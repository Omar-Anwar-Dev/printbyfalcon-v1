#!/usr/bin/env bash
# scripts/perf/lighthouse.sh — batch-run Lighthouse across the PBF URL list.
#
# Usage:
#   bash scripts/perf/lighthouse.sh https://staging.printbyfalcon.com
#
# Requires `lighthouse` on PATH (npm install -g lighthouse).
# Exits 1 if any page drops below the mobile/desktop Performance targets.

set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "usage: $0 <base-url>" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL_LIST="$SCRIPT_DIR/lighthouse-urls.txt"
REPORT_DIR="$SCRIPT_DIR/reports"
mkdir -p "$REPORT_DIR"

MOBILE_TARGET=90
DESKTOP_TARGET=95
failures=()

run_one() {
  local url="$1"
  local preset="$2"  # "mobile" | "desktop"
  local target="$3"
  local label
  label="$(echo "$url" | sed 's|[/?=&]|_|g' | sed 's|^_||')"
  local out="$REPORT_DIR/$(date +%F)-${preset}-${label}.json"

  echo ""
  echo "=== Lighthouse [$preset] $url"
  if [[ "$preset" == "mobile" ]]; then
    lighthouse "$url" \
      --chrome-flags="--headless=new --no-sandbox" \
      --preset=mobile \
      --quiet \
      --only-categories=performance,accessibility,best-practices,seo \
      --output=json \
      --output-path="$out"
  else
    lighthouse "$url" \
      --chrome-flags="--headless=new --no-sandbox" \
      --preset=desktop \
      --quiet \
      --only-categories=performance,accessibility,best-practices,seo \
      --output=json \
      --output-path="$out"
  fi

  local perf a11y bp seo
  perf=$(node -e "console.log(Math.round(require('$out').categories.performance.score * 100))")
  a11y=$(node -e "console.log(Math.round(require('$out').categories.accessibility.score * 100))")
  bp=$(node -e "console.log(Math.round(require('$out').categories['best-practices'].score * 100))")
  seo=$(node -e "console.log(Math.round(require('$out').categories.seo.score * 100))")

  printf "  performance=%s  accessibility=%s  best-practices=%s  seo=%s\n" \
    "$perf" "$a11y" "$bp" "$seo"

  if (( perf < target )); then
    failures+=("[$preset] $url performance=$perf (<$target)")
  fi
}

while IFS= read -r path; do
  [[ -z "$path" || "$path" =~ ^[[:space:]]*# ]] && continue
  url="${BASE_URL%/}${path}"
  run_one "$url" mobile "$MOBILE_TARGET"
  run_one "$url" desktop "$DESKTOP_TARGET"
done < "$URL_LIST"

echo ""
if (( ${#failures[@]} > 0 )); then
  echo "FAIL — ${#failures[@]} page(s) below target:"
  printf '  - %s\n' "${failures[@]}"
  exit 1
fi

echo "OK — all pages met performance targets."
