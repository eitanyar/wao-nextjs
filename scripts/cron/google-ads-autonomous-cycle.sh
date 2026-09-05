#!/bin/bash
set -euo pipefail

LOCK_FILE="${WAO_AUTONOMOUS_CYCLE_LOCK_FILE:-/tmp/wao-google-ads-autonomous-cycle.lock}"
APP_URL="${WAO_APP_BASE_URL:-https://www.wao.co.il}"
CRON_SECRET_ENV_FILE="${CRON_SECRET_ENV_FILE:-/home/wao/htdocs/www.wao.co.il/.env.production}"
REQUEST_TIMEOUT_SECONDS="${WAO_AUTONOMOUS_CYCLE_TIMEOUT_SECONDS:-300}"

if [[ "${WAO_AUTONOMOUS_CYCLE_LOCKED:-}" != "1" ]]; then
  exec env WAO_AUTONOMOUS_CYCLE_LOCKED=1 flock -n "$LOCK_FILE" "$0" "$@"
fi

if [[ -f "$CRON_SECRET_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CRON_SECRET_ENV_FILE"
  set +a
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "$(date -Iseconds) ERROR: CRON_SECRET is not set. Aborting." >&2
  exit 1
fi

timeout "$REQUEST_TIMEOUT_SECONDS" curl --fail --silent --show-error \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_URL}/api/google-ads/autonomous-cycle"
echo
