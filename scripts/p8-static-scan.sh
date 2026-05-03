#!/usr/bin/env bash
# P8 Reviewer static-scan helper.
#
# Runs the four scans defined in docs/p8-architecture.md §9.4. Each scan must
# print zero non-whitelisted hits for the Reviewer to APPROVE. Exits with
# non-zero status if any scan finds a violation.
#
# Usage: bash scripts/p8-static-scan.sh

set -u

cd "$(dirname "$0")/.." || exit 1

red() { printf '\033[31m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
section() { printf '\n\033[1;36m── %s ──\033[0m\n' "$1"; }

fail=0

# Scan A — no hex literals in admin CSS (rgba shadows allowed).
section "A. Hex literals in admin CSS (rgba shadows allowed)"
hits_a="$(grep -rnEH '#[0-9a-fA-F]{3,8}' \
  src/components/Admin*/ src/pages/Admin.css 2>/dev/null \
  | grep -v 'rgba(0' \
  || true)"
if [ -n "$hits_a" ]; then
  red "FAIL — hex literals found in admin CSS:"
  echo "$hits_a"
  fail=1
else
  green "OK — no non-shadow hex literals in admin CSS"
fi

# Scan B — no console.log / localStorage / Authorization in admin chrome.
section "B. console.log / localStorage / Authorization in admin chrome"
hits_b="$(grep -rn 'console\.log\|localStorage\|Authorization' \
  src/components/Admin*/ src/pages/Admin.* 2>/dev/null \
  | grep -v 'src/lib/githubApi' \
  || true)"
if [ -n "$hits_b" ]; then
  red "FAIL — security-sensitive identifiers found in admin chrome:"
  echo "$hits_b"
  fail=1
else
  green "OK — no console.log / localStorage / Authorization in admin chrome"
fi

# Scan C — no t() calls in admin chrome (admin is Chinese-inline).
section "C. t() / uiLanguage imports in admin chrome"
hits_c="$(grep -rnE "from '\.\./\.\./lib/uiLanguage|\\bt\\(" \
  src/components/Admin*/ src/pages/Admin.jsx 2>/dev/null \
  | grep -v '\.test\.jsx' \
  | grep -v 'fieldKey' \
  || true)"
if [ -n "$hits_c" ]; then
  red "FAIL — t() or uiLanguage usage in admin chrome:"
  echo "$hits_c"
  fail=1
else
  green "OK — no t() calls in admin chrome"
fi

# Scan D — no admin.* keys in i18n.json.
section "D. admin.* keys in src/data/i18n.json"
hits_d="$(grep -nE '"admin\.' src/data/i18n.json 2>/dev/null || true)"
if [ -n "$hits_d" ]; then
  red "FAIL — admin.* keys found in i18n.json:"
  echo "$hits_d"
  fail=1
else
  green "OK — no admin.* keys in i18n.json"
fi

# Scan E (added) — sanity: locked files unchanged.
section "E. Locked files byte-identical to pre-P8 baseline"
EXPECTED_GH_API="1f5f84235981b66b463b261caa801f792e4246ca"
EXPECTED_UI_LANG="3a77c714892a2c221a6080e5e836749e03bd59c8"
EXPECTED_I18N="77014b9068695a4c0de957127887d8223bd9750d"
actual_gh="$(git rev-parse HEAD:src/lib/githubApi.js 2>/dev/null || echo missing)"
actual_ui="$(git rev-parse HEAD:src/lib/uiLanguage.js 2>/dev/null || echo missing)"
actual_i18n="$(git rev-parse HEAD:src/data/i18n.json 2>/dev/null || echo missing)"
if [ "$actual_gh" != "$EXPECTED_GH_API" ]; then
  red "FAIL — src/lib/githubApi.js modified (expected $EXPECTED_GH_API, got $actual_gh)"
  fail=1
else
  green "OK — src/lib/githubApi.js byte-identical"
fi
if [ "$actual_ui" != "$EXPECTED_UI_LANG" ]; then
  red "FAIL — src/lib/uiLanguage.js modified (expected $EXPECTED_UI_LANG, got $actual_ui)"
  fail=1
else
  green "OK — src/lib/uiLanguage.js byte-identical"
fi
if [ "$actual_i18n" != "$EXPECTED_I18N" ]; then
  red "FAIL — src/data/i18n.json modified (expected $EXPECTED_I18N, got $actual_i18n)"
  fail=1
else
  green "OK — src/data/i18n.json byte-identical"
fi

echo ""
if [ "$fail" -eq 0 ]; then
  green "ALL SCANS PASSED"
else
  red "ONE OR MORE SCANS FAILED"
fi
exit "$fail"
