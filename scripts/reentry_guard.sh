#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT="${REPO_ROOT}/PROGRESS_REPORT.md"
MAX_AGE_DAYS=7
MAX_AGE_SECONDS=$((MAX_AGE_DAYS * 24 * 60 * 60))

now_epoch="$(date +%s)"

if [ ! -f "$REPORT" ]; then
  echo "Re-Entry Gate: PROGRESS_REPORT.md is missing."
  echo "Action required: run docs/PROTOCOL_REENTRY_AND_PROGRESS.md to generate it."
  exit 1
fi

# macOS uses: stat -f %m
# Linux uses: stat -c %Y
if report_mtime_epoch="$(stat -f %m "$REPORT" 2>/dev/null)"; then
  :
else
  report_mtime_epoch="$(stat -c %Y "$REPORT")"
fi

age_seconds=$((now_epoch - report_mtime_epoch))

if [ "$age_seconds" -gt "$MAX_AGE_SECONDS" ]; then
  echo "Re-Entry Gate: PROGRESS_REPORT.md is older than ${MAX_AGE_DAYS} days."
  echo "Action required: run docs/PROTOCOL_REENTRY_AND_PROGRESS.md to refresh it."
  exit 1
fi

echo "Re-Entry Gate: OK. PROGRESS_REPORT.md is present and recent."
