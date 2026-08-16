#!/bin/bash
#
# Scheduled GEO content regeneration (task #2026-08-14_017). Runs
# `node scripts/geo-generate-content.mjs --client=<id> --top=10` for every
# GEO-entitled client, discovered dynamically from data/clients/*/client.json
# (never hardcoded — a new geo client is picked up automatically the next
# time this cron fires).
#
# A client is considered GEO-entitled when its client.json `entitlements`
# array includes "geo" AND it has a data/clients/<id>/pareto.json. As of
# 2026-08-15 that's ajudaica, retter, wao, aasada — but this script does not
# hardcode that list.
#
# The generator's write path is status-preserving: it will never overwrite
# an action already approved/sent/done/published (it skips those, logging
# "SKIPPED (protected status: ...)"), and it archives (never deletes) every
# other prior action into tasks/geo/_archive/ before writing the fresh set —
# see scripts/geo-generate-content.mjs archiveNonProtectedActions(). This
# cron is therefore safe to run unattended on a schedule.
#
# There is no managed job scheduler on this VPS (no Vercel Cron) — this is a
# plain system crontab entry. Install with `crontab -e` (as the `wao` user,
# same user pm2 runs the app as) using EXACTLY this line:
#
#   CRON_TZ=Asia/Jerusalem
#   0 4 * * 0 /home/wao/htdocs/www.wao.co.il/scripts/cron/regenerate-geo.sh >> /home/wao/wao-runtime-data/geo-regen-cron.log 2>&1
#
# Weekly (Sunday 04:00 Israel time) — pareto/GSC data moves slowly, weekly
# regeneration is enough. `CRON_TZ=Asia/Jerusalem` keeps the wall-clock hour
# correct across the DST transition (same reasoning as
# scripts/cron/charge-subscriptions.sh — see that file's header for the full
# explanation of why CRON_TZ is used instead of a fixed UTC hour).
#
# Adjust the absolute paths above to match the actual deployed location if
# different. Installing this crontab line is Eitan's manual server step —
# same category as the billing cron in charge-subscriptions.sh. This script
# does not install itself, does not commit, and does not deploy anything —
# it only regenerates data files on disk.
#
# ## Secrets
#
# GEMINI_API_KEY (primary content-generation provider, per spec
# 2026-08-15_022) is sourced from an env file, never hardcoded here. Point
# CRON_SECRET_ENV_FILE at wherever that lives on the VPS — defaults to the
# same .env.production deploy.sh already loads. QWEN_API_KEY/QWEN_BASE_URL
# (the fallback provider) are optional here — if missing, this script only
# warns; the generator degrades to Gemini-only, which is still a valid run.

set -euo pipefail

LOCK_FILE="/tmp/wao-geo-regen-cron.lock"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLIENTS_DIR="${REPO_ROOT}/data/clients"
CRON_SECRET_ENV_FILE="${CRON_SECRET_ENV_FILE:-/home/wao/htdocs/www.wao.co.il/.env.production}"

# Self-relocking idiom (mirrors charge-subscriptions.sh): re-exec this same
# script under `flock -n`, guarded by an env var so the re-exec only happens
# once. `-n` (non-blocking): if a prior run is still in flight, this run
# exits immediately instead of queueing.
if [[ "${WAO_GEO_REGEN_CRON_LOCKED:-}" != "1" ]]; then
  exec env WAO_GEO_REGEN_CRON_LOCKED=1 flock -n "$LOCK_FILE" "$0" "$@"
fi

if [[ -f "$CRON_SECRET_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CRON_SECRET_ENV_FILE"
  set +a
fi

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "$(date -Iseconds) ERROR: GEMINI_API_KEY is not set (checked ${CRON_SECRET_ENV_FILE}). Aborting." >&2
  exit 1
fi

if [[ -z "${QWEN_API_KEY:-}" || -z "${QWEN_BASE_URL:-}" ]]; then
  echo "$(date -Iseconds) WARNING: QWEN_API_KEY/QWEN_BASE_URL not set — fallback provider unavailable, generator will run Gemini-only." >&2
fi

# Dynamic discovery: a client is GEO-entitled when client.json's
# `entitlements` array contains "geo" AND pareto.json exists. Never hardcode
# the client-id list — a new geo client is picked up automatically.
GEO_CLIENTS=()
if [[ -d "$CLIENTS_DIR" ]]; then
  for client_dir in "$CLIENTS_DIR"/*/; do
    client_id="$(basename "$client_dir")"
    client_json="${client_dir}client.json"
    pareto_json="${client_dir}pareto.json"
    [[ -f "$client_json" ]] || continue
    [[ -f "$pareto_json" ]] || continue
    if node -e "process.exit(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).entitlements?.includes('geo') ? 0 : 1)" "$client_json"; then
      GEO_CLIENTS+=("$client_id")
    fi
  done
fi

if [[ ${#GEO_CLIENTS[@]} -eq 0 ]]; then
  echo "$(date -Iseconds) No GEO-entitled clients found under ${CLIENTS_DIR}. Nothing to do."
  exit 0
fi

echo "$(date -Iseconds) GEO-entitled clients discovered: ${GEO_CLIENTS[*]}"

FAILED_CLIENTS=()
for client_id in "${GEO_CLIENTS[@]}"; do
  echo "$(date -Iseconds) Regenerating GEO content for '${client_id}'..."
  if ( cd "$REPO_ROOT" && node scripts/geo-generate-content.mjs --client="${client_id}" --top=10 ); then
    echo "$(date -Iseconds) '${client_id}' regeneration complete."
  else
    echo "$(date -Iseconds) ERROR: '${client_id}' regeneration failed — continuing to the next client." >&2
    FAILED_CLIENTS+=("$client_id")
  fi
done

if [[ ${#FAILED_CLIENTS[@]} -gt 0 ]]; then
  echo "$(date -Iseconds) Done with failures: ${FAILED_CLIENTS[*]}" >&2
  exit 1
fi

echo "$(date -Iseconds) All GEO-entitled clients regenerated successfully."
