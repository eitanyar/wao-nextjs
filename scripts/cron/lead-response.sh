#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
APP_URL="${WAO_APP_BASE_URL:-https://www.wao.co.il}"
CRON_SECRET_ENV_FILE="${CRON_SECRET_ENV_FILE:-/home/wao/htdocs/www.wao.co.il/.env.production}"
REQUEST_TIMEOUT_SECONDS="${WAO_LEAD_RESPONSE_TIMEOUT_SECONDS:-300}"
DEFAULT_RUNTIME_DIR="/home/wao/wao-runtime-data"

if [[ ! -f "$CRON_SECRET_ENV_FILE" ]]; then
  if [[ -f "$REPO_ROOT/.env.local" ]]; then
    CRON_SECRET_ENV_FILE="$REPO_ROOT/.env.local"
  elif [[ -f "$REPO_ROOT/.env.production" ]]; then
    CRON_SECRET_ENV_FILE="$REPO_ROOT/.env.production"
  fi
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

if [[ -z "${WAO_RUNTIME_DATA_DIR:-}" ]]; then
  if [[ -d "$DEFAULT_RUNTIME_DIR" && -w "$DEFAULT_RUNTIME_DIR" ]] || mkdir -p "$DEFAULT_RUNTIME_DIR" 2>/dev/null && [[ -w "$DEFAULT_RUNTIME_DIR" ]]; then
    WAO_RUNTIME_DATA_DIR="$DEFAULT_RUNTIME_DIR"
  else
    WAO_RUNTIME_DATA_DIR="${TMPDIR:-/tmp}/wao-runtime-data"
    mkdir -p "$WAO_RUNTIME_DATA_DIR"
  fi
else
  mkdir -p "$WAO_RUNTIME_DATA_DIR"
fi

LOCK_FILE="${WAO_LEAD_RESPONSE_LOCK_FILE:-$WAO_RUNTIME_DATA_DIR/lead-response.lock}"
if [[ "${WAO_LEAD_RESPONSE_LOCKED:-}" != "1" ]]; then
  exec env WAO_LEAD_RESPONSE_LOCKED=1 flock -n "$LOCK_FILE" "$0" "$@"
fi

timeout "$REQUEST_TIMEOUT_SECONDS" curl --fail --silent --show-error \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_URL}/api/leads/response-cron"
echo
