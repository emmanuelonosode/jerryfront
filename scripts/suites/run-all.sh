#!/usr/bin/env bash
# Behavioural browser suites, run one at a time against `next dev` on :3210.
#
# PACED DELIBERATELY. Running these concurrently produces spurious failures:
# each launches its own Chrome, and several instances competing for CPU make
# pages miss the fixed settle timeouts the suites use before asserting. The
# failures look like real defects and are not, which is worse than being slow.
#
# Selectors in these suites target `main form`, not `form`. The site chrome now
# carries two forms of its own — the header search and the footer newsletter —
# and the header's comes first in the DOM, so a bare `document.querySelector`
# ('form')` silently returns the search box on every page. That failed seven
# suites at once while the pages themselves were correct, which is a much more
# confusing signal than a missing element.
#
# Usage: npm run verify:browser   (needs `npm run dev` already running)
set -u
BASE="${BASE:-http://localhost:3210}"

if [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/" 2>/dev/null)" != "200" ]; then
  echo "No dev server at $BASE — start it with 'npm run dev' first." >&2
  exit 1
fi

pass=0; fail=0; failed=()
for suite in "$(dirname "$0")"/verify-*.mjs; do
  name=$(basename "$suite" .mjs)
  out=$(node "$suite" 2>&1)
  if [ $? -eq 0 ] && ! grep -qE "\[FAIL\]" <<<"$out"; then
    echo "  PASS  $name  — $(grep -oE '[0-9]+/[0-9]+ passed' <<<"$out" | tail -1)"
    pass=$((pass+1))
  else
    echo "  FAIL  $name"
    grep -E "\[FAIL\]" <<<"$out" | sed 's/^/        /'
    fail=$((fail+1)); failed+=("$name")
  fi
  sleep 2
done

echo ""
echo "  $pass suite(s) passed, $fail failed"
[ $fail -gt 0 ] && printf '        %s\n' "${failed[@]}"
exit $((fail > 0 ? 1 : 0))
