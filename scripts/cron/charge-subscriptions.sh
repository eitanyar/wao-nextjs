#!/bin/bash
#
# Recurring-billing cron entrypoint (task #9, extended by the card-update-flow
# task). Hits the three authenticated internal API routes that drive the
# subscription engine:
#   - POST /api/subscriptions/cron/charge               (charge + retry/expiry logic)
#   - POST /api/subscriptions/cron/reminders             (trial-ending reminder emails)
#   - POST /api/subscriptions/cron/card-expiry-notices   (proactive "card expiring soon" emails)
#
# There is no managed job scheduler on this VPS (no Vercel Cron) — this is a
# plain system crontab entry. Install with `crontab -e` (as the `wao` user,
# same user pm2 runs the app as) using EXACTLY this line:
#
#   CRON_TZ=Asia/Jerusalem
#   0 3 * * * /home/wao/htdocs/www.wao.co.il/scripts/cron/charge-subscriptions.sh >> /home/wao/wao-runtime-data/billing-cron.log 2>&1
#
# Adjust the absolute path to this script and the log path to match the
# actual deployed location if different.
#
# ## Why `CRON_TZ=Asia/Jerusalem` instead of a fixed UTC hour
#
# Asia/Jerusalem observes DST, so "03:00 Israel time" is NOT a fixed UTC
# offset year-round (UTC+2 in winter, UTC+3 in summer) — a hardcoded UTC cron
# hour would drift an hour wrong for roughly half the year. `CRON_TZ=` (a
# per-crontab-line timezone override, supported by modern cron/systemd-cron)
# is the cleanest fix: the schedule is always "03:00 wall-clock time in
# Jerusalem", DST-adjusted automatically by the OS's tz database, no manual
# UTC-offset math required twice a year.
#
# ## Why the exact hour isn't actually safety-critical
#
# Both /cron/charge and /cron/reminders are driven entirely by DB state
# (`next_charge_at <= now`, "has a reminder already been sent") — NOT by
# "did it happen to run at exactly 3am". Calling either route extra times, or
# an hour later than intended, does nothing extra: rows not yet due are
# simply not touched. So even if `CRON_TZ` support were ever missing/broken
# on some cron implementation (unlikely on any current Debian/Ubuntu cron),
# the worst case is a same-day timing drift, not a billing-correctness bug.
# This script's belt-and-suspenders posture (flock + idempotent routes) is
# intentionally layered so that WHEN this fires matters far less than usual
# for a billing cron.
#
# ## Lock file path: /tmp
#
# `flock -n` locks are tied to a live process holding an open file
# descriptor, not to whether the lock *file* exists on disk — so a lock file
# surviving in /tmp across a reboot (or being cleared by systemd-tmpfiles)
# does NOT cause a stale/stuck lock; there is no state to go stale. Given
# that, /tmp is fine here: it needs no special permissions setup, and cron
# environments are minimal (no guarantee of a persistent-data directory being
# writable by the crontab's own environment before the app itself creates
# it). If this ever needs to survive being cleared mid-run (extremely long
# job), move it into $WAO_RUNTIME_DATA_DIR instead — not needed for this job,
# which is expected to run in seconds to low minutes.
#
# ## Secrets
#
# CRON_SECRET is sourced from an env file, never hardcoded in this script.
# Point CRON_SECRET_ENV_FILE (below) at wherever that lives on the VPS —
# defaults to the same `.env.production` deploy.sh already loads.

set -euo pipefail

LOCK_FILE="/tmp/wao-billing-cron.lock"
APP_URL="${WAO_APP_BASE_URL:-https://www.wao.co.il}"
CRON_SECRET_ENV_FILE="${CRON_SECRET_ENV_FILE:-/home/wao/htdocs/www.wao.co.il/.env.production}"

# Self-relocking idiom: re-exec this same script under `flock -n`, guarded by
# an env var so the re-exec only happens once. `-n` (non-blocking): if
# another instance already holds the lock (a slow prior run still in
# flight), this run exits immediately instead of queueing — exactly the
# overlap protection required by the brief. Using `exec` + this guard (rather
# than piping the whole script body into `flock -c "..."`) avoids fragile
# quoting/shell-portability issues with passing a multi-line function body
# through `-c`.
if [[ "${WAO_BILLING_CRON_LOCKED:-}" != "1" ]]; then
  exec env WAO_BILLING_CRON_LOCKED=1 flock -n "$LOCK_FILE" "$0" "$@"
fi

if [[ -f "$CRON_SECRET_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CRON_SECRET_ENV_FILE"
  set +a
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "$(date -Iseconds) ERROR: CRON_SECRET is not set (checked ${CRON_SECRET_ENV_FILE}). Aborting." >&2
  exit 1
fi

echo "$(date -Iseconds) Running subscription charge cron..."
curl --fail --silent --show-error \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_URL}/api/subscriptions/cron/charge"
echo ""

echo "$(date -Iseconds) Running subscription reminder cron..."
curl --fail --silent --show-error \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_URL}/api/subscriptions/cron/reminders"
echo ""

echo "$(date -Iseconds) Running card-expiry-notice cron..."
curl --fail --silent --show-error \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_URL}/api/subscriptions/cron/card-expiry-notices"
echo ""
