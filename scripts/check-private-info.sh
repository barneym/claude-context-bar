#!/usr/bin/env bash
# Blocks a commit if a staged file contains a private identifier.
# Patterns live in .private-patterns (gitignored, one extended regex per line,
# # comments allowed) so the list itself is never published.
# Without that file the check passes with a warning, so other contributors aren't blocked.
set -euo pipefail

root=$(git rev-parse --show-toplevel)
patterns="$root/.private-patterns"

if [[ ! -f "$patterns" ]]; then
  echo "check-private-info: no .private-patterns file, skipping" >&2
  exit 0
fi

regex=$(grep -vE '^\s*(#|$)' "$patterns" | paste -sd'|' -)
[[ -z "$regex" ]] && exit 0

status=0
for f in "$@"; do
  [[ -f "$f" ]] || continue
  if hits=$(grep -nIiE -- "$regex" "$f"); then
    echo "check-private-info: private identifier in $f:" >&2
    echo "$hits" | sed 's/^/  /' >&2
    status=1
  fi
done
exit $status
