#!/bin/bash
#
# Site-Bot lifecycle notices, once a day (launch-readiness step 5):
#   - review-request kit email retries for live sites (go-live email that could not go out at deploy time),
#   - cancel-confirmation catch-up (within 2 days of the cancel),
#   - "offline soon" email to the owner 7 days before the site's offline date (cancel effective date + 30 days),
#   - staff take-down reminder on the offline date.
# Every step is idempotent in the DB (site_bot_notices), so running it twice, or late, sends nothing twice.
#
# Install with `crontab -e` as the `wao` user (same user pm2 runs the app as), EXACTLY:
#
#   CRON_TZ=Asia/Jerusalem
#   30 9 * * * /home/wao/htdocs/www.wao.co.il/scripts/cron/site-bot-lifecycle-notices.sh >> /home/wao/wao-runtime-data/site-bot-lifecycle-cron.log 2>&1
#
# 09:30 Israel time, so owner emails arrive in business hours. Same CRON_SECRET / env-file / flock conventions as
# charge-subscriptions.sh (see its header for why CRON_TZ and /tmp locks are fine).

set -euo pipefail

LOCK_FILE="/tmp/wao-site-bot-lifecycle-cron.lock"
APP_URL="${WAO_APP_BASE_URL:-https://www.wao.co.il}"
CRON_SECRET_ENV_FILE="${CRON_SECRET_ENV_FILE:-/home/wao/htdocs/www.wao.co.il/.env.production}"

if [[ "${WAO_SITE_BOT_LIFECYCLE_CRON_LOCKED:-}" != "1" ]]; then
  exec env WAO_SITE_BOT_LIFECYCLE_CRON_LOCKED=1 flock -n "$LOCK_FILE" "$0" "$@"
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

echo "$(date -Iseconds) Running Site-Bot lifecycle notices..."
curl --fail --silent --show-error \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_URL}/api/site-bot/cron/lifecycle-notices"
echo ""
