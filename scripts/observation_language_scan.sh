#!/usr/bin/env bash
set -euo pipefail

TOKENS=("recommended" "important" "significant" "strongest" "deserve")
TARGET_DIRS=("src/app" "src/components" "src/app/insights")

echo "Observation Language Scan"
echo "Tokens: ${TOKENS[*]}"
echo

dirs=()
for d in "${TARGET_DIRS[@]}"; do
  if [ -d "$d" ]; then
    dirs+=("$d")
  fi
done

if [ "${#dirs[@]}" -eq 0 ]; then
  echo "No target directories found. Nothing to scan."
  exit 0
fi

total_matches=0

for token in "${TOKENS[@]}"; do
  echo "Token: $token"

  # Whole word, case insensitive, show line number, skip binary
  # Suppress grep nonzero exit when no matches
  matches="$(grep -RIn --binary-files=without-match -E "\\b${token}\\b" "${dirs[@]}" 2>/dev/null || true)"

  if [ -n "$matches" ]; then
    echo "$matches"
    count="$(printf "%s\n" "$matches" | wc -l | tr -d ' ')"
    echo "Count($token): $count"
    total_matches=$((total_matches + count))
  else
    echo "No matches"
    echo "Count($token): 0"
  fi

  echo
done

echo "Total matches: $total_matches"

if [ "$total_matches" -gt 0 ]; then
  echo "Result: FAIL (matches found)"
  exit 1
fi

echo "Result: OK (no matches found)"
exit 0
