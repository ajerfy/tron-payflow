#!/usr/bin/env bash
# Creates a small source-only zip for sharing (no node_modules, no build artifacts).
# Usage: from repo root:
#   chmod +x scripts/package-for-share.sh
#   ./scripts/package-for-share.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NAME="TRON_Payments_DeFi_source"
OUT="${NAME}_$(date +%Y%m%d).zip"

if command -v zip >/dev/null 2>&1; then
  zip -r -q "$OUT" . \
    -x "*.git/*" \
    -x "*/node_modules/*" \
    -x "*/dist/*" \
    -x "*/build/*" \
    -x "*/out/*" \
    -x "*/cache/*" \
    -x "*/artifacts/*" \
    -x "*/typechain-types/*" \
    -x "*/coverage/*" \
    -x "*.log" \
    -x ".DS_Store" \
    -x "*.zip"
  echo "Created: $ROOT/$OUT"
else
  echo "zip not found. Install with: brew install zip" >&2
  exit 1
fi
