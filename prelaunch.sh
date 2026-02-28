#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_URL="${API_URL:-http://localhost:3666}"
SKIP_BUILD=0

if [[ "${1:-}" == "--skip-build" ]]; then
  SKIP_BUILD=1
fi

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

PASS_ITEMS=()
FAIL_ITEMS=()
SKIP_ITEMS=()

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  PASS_ITEMS+=("$1")
  printf "[PASS] %s\n" "$1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  FAIL_ITEMS+=("$1")
  printf "[FAIL] %s\n" "$1"
}

skip() {
  SKIP_COUNT=$((SKIP_COUNT + 1))
  SKIP_ITEMS+=("$1")
  printf "[SKIP] %s\n" "$1"
}

run_check() {
  local name="$1"
  shift
  if "$@"; then
    pass "$name"
  else
    fail "$name"
  fi
}

check_cmd() {
  command -v "$1" >/dev/null 2>&1
}

check_http_ok() {
  local url="$1"
  local body
  body="$(curl -fsS --max-time 8 "$url" 2>/dev/null || true)"
  [[ "$body" == *'"status":"ok"'* ]]
}

check_http_auth_200() {
  local url="$1"
  local token="$2"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -H "Authorization: Bearer ${token}" "$url" || true)"
  [[ "$code" == "200" ]]
}

build_backend() {
  cd "${ROOT_DIR}/backend" || return 1
  npm ci >/tmp/learnlytica_prelaunch_backend_npm_ci.log 2>&1 || return 1
  npm run build >/tmp/learnlytica_prelaunch_backend_build.log 2>&1
}

build_frontend() {
  cd "${ROOT_DIR}/frontend" || return 1
  npm ci >/tmp/learnlytica_prelaunch_frontend_npm_ci.log 2>&1 || return 1
  npm run build >/tmp/learnlytica_prelaunch_frontend_build.log 2>&1
}

check_docker_image() {
  local image="$1"
  docker image inspect "$image" >/dev/null 2>&1
}

check_db_connection() {
  if [[ -z "${DATABASE_URL:-}" ]]; then
    return 2
  fi
  if ! check_cmd psql; then
    return 1
  fi
  psql "${DATABASE_URL}" -Atqc "select 1" >/tmp/learnlytica_prelaunch_db.log 2>&1
}

check_pm2_online() {
  if ! check_cmd pm2; then
    return 2
  fi
  pm2 list 2>/dev/null | grep -qi "online"
}

echo "== Learnlytica Prelaunch Check =="
echo "Root: ${ROOT_DIR}"
echo "API:  ${API_URL}"
if [[ $SKIP_BUILD -eq 1 ]]; then
  echo "Mode: skip build"
fi
echo

run_check "node installed" check_cmd node
run_check "npm installed" check_cmd npm
run_check "curl installed" check_cmd curl
run_check "docker installed" check_cmd docker
run_check "docker daemon reachable" docker info >/dev/null 2>&1

if [[ $SKIP_BUILD -eq 0 ]]; then
  run_check "backend build (npm ci + npm run build)" build_backend
  run_check "frontend build (npm ci + npm run build)" build_frontend
else
  skip "backend build (skipped by flag)"
  skip "frontend build (skipped by flag)"
fi

run_check "backend health endpoint" check_http_ok "${API_URL}/health"

for image in \
  "learnlytica/executor-node:latest" \
  "learnlytica/executor-python:latest" \
  "learnlytica/executor-java:latest" \
  "learnlytica/executor-playwright:latest" \
  "learnlytica/executor-dotnet:latest"
do
  run_check "docker image exists: ${image}" check_docker_image "${image}"
done

check_db_connection
db_status=$?
if [[ $db_status -eq 0 ]]; then
  pass "database connection (DATABASE_URL)"
elif [[ $db_status -eq 2 ]]; then
  skip "database connection (DATABASE_URL not set)"
else
  fail "database connection (DATABASE_URL)"
fi

check_pm2_online
pm2_status=$?
if [[ $pm2_status -eq 0 ]]; then
  pass "pm2 has online process"
elif [[ $pm2_status -eq 2 ]]; then
  skip "pm2 status check (pm2 not installed)"
else
  fail "pm2 has online process"
fi

if [[ -n "${AUTH_TOKEN:-}" ]]; then
  run_check "auth check: analytics system-monitor" check_http_auth_200 "${API_URL}/api/v1/analytics/system-monitor" "${AUTH_TOKEN}"
  run_check "auth check: executors health" check_http_auth_200 "${API_URL}/api/v1/analytics/executors/health" "${AUTH_TOKEN}"
  run_check "auth check: questions list" check_http_auth_200 "${API_URL}/api/v1/questions?page=1&limit=1" "${AUTH_TOKEN}"
else
  skip "auth checks (set AUTH_TOKEN to enable protected endpoint checks)"
fi

echo
echo "== Summary =="
echo "Passed: ${PASS_COUNT}"
echo "Failed: ${FAIL_COUNT}"
echo "Skipped: ${SKIP_COUNT}"

if [[ ${FAIL_COUNT} -gt 0 ]]; then
  echo
  echo "Failed checks:"
  for item in "${FAIL_ITEMS[@]}"; do
    echo "- ${item}"
  done
  echo
  echo "Prelaunch result: FAIL"
  exit 1
fi

echo
echo "Prelaunch result: PASS"
exit 0
