#!/usr/bin/env bash
# Site Bot paid-journey rehearsal dev server (paid-journey v2 M0.5).
#
#   scripts/site-bot-rehearsal-dev.sh [port] [dist-dir] [data-dir]
#   defaults: 4031  .next-rehearsal  scratch/rehearsal-data
#
# - SITE_BOT_PAID_FLOW=1 opens /site-bot/start and /site-bot/pay/* (dev only; prod ignores it).
# - SITE_BOT_RESEARCH_PROVIDERS=fixture: research runs on synthetic fixtures, zero network.
# - WAO_CLIENTS_DIR / WAO_SITES_DIR / WAO_SITE_RESEARCH_DIR point OUTSIDE data/ so a rehearsal
#   never writes live client data (data/clients) or tracked dirs (data/sites).
# - Mock payments/invoices; every other side-effect credential blanked (an empty value beats
#   .env.local, because @next/env never overrides an already-set variable).
# - Optional outbound guard: set REHEARSAL_NODE_REQUIRE=/abs/path/guard.cjs to preload one.
#
# STALE-SHELL QWEN TRAP (B17): for the same reason, a QWEN_BASE_URL / QWEN_API_KEY exported in
# your shell (old dashscope-intl values) silently beats the token-plan values in .env.local.
# This launcher unsets them with `env -u`; plain `npm run dev` warns about them (predev hook).
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${1:-4031}"
DIST="${2:-.next-rehearsal}"
DATA="$(realpath -m "${3:-scratch/rehearsal-data}")"
mkdir -p "$DATA/clients" "$DATA/sites" "$DATA/site-research"

NODE_OPTS="${NODE_OPTIONS:-}"
if [[ -n "${REHEARSAL_NODE_REQUIRE:-}" ]]; then NODE_OPTS="--require ${REHEARSAL_NODE_REQUIRE} ${NODE_OPTS}"; fi

exec env -u QWEN_BASE_URL -u QWEN_API_KEY -u QWEN_CHAT_MODEL \
  SITE_BOT_PAID_FLOW=1 SITE_BOT_RESEARCH_PROVIDERS=fixture \
  WAO_DEPLOY_DIST_DIR="$DIST" NEXT_TELEMETRY_DISABLED=1 \
  WAO_CLIENTS_DIR="$DATA/clients" WAO_SITES_DIR="$DATA/sites" WAO_SITE_RESEARCH_DIR="$DATA/site-research" \
  PAYMENT_PROVIDER=mock INVOICE_PROVIDER=mock TAKBULL_API_KEY= TAKBULL_API_SECRET= YAAD_TERMINAL_NUMBER= YAAD_API_KEY= \
  DATAFORSEO_TOKEN= DATAFORSEO_LOGIN= DATAFORSEO_PASSWORD= NEURONWRITER_API_KEY= NEURONWRITER_PROJECT_ID= \
  CLOUDFLARE_API_TOKEN= CLOUDFLARE_ACCOUNT_ID= CLOUDFLARE_ZONE_ID= FRAUD_BLOCKER_API_KEY= \
  GBP_CLIENT_ID= GBP_CLIENT_SECRET= GBP_REFRESH_TOKEN= GBP_INTEGRATION_ENABLED=false \
  GOOGLE_MAPS_API_KEY= PLACES_API_KEY= RESEND_API_KEY= GSC_REFRESH_TOKEN= \
  GOOGLE_ADS_DEVELOPER_TOKEN= GOOGLE_ADS_REFRESH_TOKEN= GOOGLE_DATAMANAGER_REFRESH_TOKEN= \
  AZURE_OPENAI_ENDPOINT= ELEVENLABS_API_KEY= \
  NODE_OPTIONS="$NODE_OPTS" \
  npx next dev --port "$PORT" --hostname 127.0.0.1
