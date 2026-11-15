#!/bin/bash
#
# Daily Qwen 3.8 Max reliability check (realistic-payload health probe).
# One structured FAQ-style generation call per Qwen endpoint in use — NOT a trivial ping.
# See scripts/qwen-health-check.mjs and task 2026-08-14_019.
#
# Since D3 (2026-11-15) Qwen is not a production dependency by default: the probe only checks the
# Qwen providers that LLM_PROVIDER_* switches actually select, and logs outcome=SKIPPED (exit 0)
# when every workload is on gemini. Missing QWEN_* is no longer an abort.
#
# There is no managed job scheduler on this VPS (no Vercel Cron) — this is a
# plain system crontab entry. Eitan installs it manually with `crontab -e`
# (as the `wao` user, same user pm2 runs the app as) using EXACTLY this line:
#
#   CRON_TZ=Asia/Jerusalem
#   0 8 * * * /home/wao/htdocs/www.wao.co.il/scripts/cron/qwen-health-check.sh >/dev/null
#
# stdout is discarded so an OK run stays silent (no daily-green cron mail).
# The probe itself appends the structured line to
# /home/wao/wao-runtime-data/qwen-health.log. On SLOW/FAIL it writes an ALERT
# line to that log, prints ALERT to stderr, and exits non-zero so cron mail /
# monitoring surfaces the trouble. Do NOT redirect stderr if you want cron
# mail on ALERT. Do NOT auto-install this crontab from deploy or the check.
#
# Adjust the absolute path to this script if the deployed location differs.
#
# ## Why `CRON_TZ=Asia/Jerusalem` instead of a fixed UTC hour
#
# Asia/Jerusalem observes DST, so "08:00 Israel time" is NOT a fixed UTC
# offset year-round. `CRON_TZ=` keeps the schedule at 08:00 wall-clock
# Jerusalem time.
#
# ## Lock file path: /tmp
#
# Same flock rationale as charge-subscriptions.sh: `flock -n` is process-
# held, so a leftover lock file in /tmp is not a stale lock.
#
# ## Secrets
#
# LLM_PROVIDER_* and the Qwen credentials (QWEN_METERED_API_KEY/QWEN_METERED_BASE_URL,
# QWEN_API_KEY/QWEN_BASE_URL) are sourced from an env file, never hardcoded. Override
# QWEN_ENV_FILE if needed; defaults to the same `.env.production` deploy.sh already loads.
# Locally, falls back to the repo `.env.local` when the production path is absent.
# Sourcing a `.env.production` file sets NODE_ENV=production (unless already set) so the
# production token-plan guard applies to the probe exactly as it does to the app.

set -euo pipefail

LOCK_FILE="/tmp/wao-qwen-health-cron.lock"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
QWEN_ENV_FILE="${QWEN_ENV_FILE:-/home/wao/htdocs/www.wao.co.il/.env.production}"
DEFAULT_RUNTIME_DIR="/home/wao/wao-runtime-data"

# Self-relocking idiom: re-exec this same script under `flock -n`, guarded by
# an env var so the re-exec only happens once. `-n` (non-blocking): if
# another instance already holds the lock, this run exits immediately.
if [[ "${WAO_QWEN_HEALTH_CRON_LOCKED:-}" != "1" ]]; then
  exec env WAO_QWEN_HEALTH_CRON_LOCKED=1 flock -n "$LOCK_FILE" "$0" "$@"
fi

if [[ ! -f "$QWEN_ENV_FILE" ]]; then
  if [[ -f "$REPO_ROOT/.env.local" ]]; then
    QWEN_ENV_FILE="$REPO_ROOT/.env.local"
  elif [[ -f "$REPO_ROOT/.env.production" ]]; then
    QWEN_ENV_FILE="$REPO_ROOT/.env.production"
  fi
fi

if [[ -f "$QWEN_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$QWEN_ENV_FILE"
  set +a
  if [[ "$(basename "$QWEN_ENV_FILE")" == ".env.production" ]]; then
    export NODE_ENV="${NODE_ENV:-production}"
  fi
fi

if [[ -z "${WAO_RUNTIME_DATA_DIR:-}" ]]; then
  if [[ -d "$DEFAULT_RUNTIME_DIR" && -w "$DEFAULT_RUNTIME_DIR" ]]; then
    WAO_RUNTIME_DATA_DIR="$DEFAULT_RUNTIME_DIR"
  elif mkdir -p "$DEFAULT_RUNTIME_DIR" 2>/dev/null && [[ -w "$DEFAULT_RUNTIME_DIR" ]]; then
    WAO_RUNTIME_DATA_DIR="$DEFAULT_RUNTIME_DIR"
  else
    WAO_RUNTIME_DATA_DIR="${TMPDIR:-/tmp}/wao-runtime-data"
    mkdir -p "$WAO_RUNTIME_DATA_DIR"
  fi
else
  mkdir -p "$WAO_RUNTIME_DATA_DIR"
fi
export WAO_RUNTIME_DATA_DIR
export QWEN_HEALTH_LOG="${QWEN_HEALTH_LOG:-$WAO_RUNTIME_DATA_DIR/qwen-health.log}"

# Cron PATH is minimal; match deploy.sh and load nvm when present.
if [[ -f "${HOME}/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  source "${HOME}/.nvm/nvm.sh"
fi
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH}"

if ! command -v node >/dev/null 2>&1; then
  echo "$(date -Iseconds) ERROR: node is not on PATH. Aborting." >&2
  exit 1
fi

node "$REPO_ROOT/scripts/qwen-health-check.mjs"
