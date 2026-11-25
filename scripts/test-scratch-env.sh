# Sourced by `npm run test` (package.json) before the test chain, in the same shell, so every test process inherits it.
# The dev email outbox (payments/email.ts, site-bot/clientMessageEmail.ts: SITE_BOT_EMAIL_OUTBOX_PATH, default
# data/payments/email-outbox.jsonl) always points at a fresh scratch file: no test can append under data/payments.
# A test that sets its own absolute SITE_BOT_EMAIL_OUTBOX_PATH still wins inside its process.
WAO_TEST_SCRATCH_DIR="$(mktemp -d "${TMPDIR:-/tmp}/wao-test-scratch-XXXXXX")" || exit 1
export WAO_TEST_SCRATCH_DIR
export SITE_BOT_EMAIL_OUTBOX_PATH="$WAO_TEST_SCRATCH_DIR/email-outbox.jsonl"
