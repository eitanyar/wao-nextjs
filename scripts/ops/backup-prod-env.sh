#!/bin/bash
#
# Encrypted off-server backup of production .env.production.
#
# The file is encrypted ON THE SERVER with the public backup certificate (openssl CMS, AES-256), so the
# plaintext never leaves it. Only the encrypted copy is written locally. Decrypting needs the private key
# (backup-key.pem, itself locked by the passphrase Eitan keeps in Google Password Manager).
#
# Run after EVERY change to .env.production on the server:
#   scripts/ops/backup-prod-env.sh
# Then upload the newest .cms file (and, once, backup-key.pem + backup-cert.pem + README) to the Drive folder.
#
# Restore (on a trusted machine):
#   openssl cms -decrypt -binary -inform DER -in <file>.cms -inkey backup-key.pem -recip backup-cert.pem -out .env.production
#   (prompts for the passphrase)

set -euo pipefail

DIR="${WAO_ENV_BACKUP_DIR:-$HOME/.wao-secrets/env-backup}"
KEY="${WAO_DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519_wao_hermes_deploy}"
HOST="${WAO_DEPLOY_HOST:-wao@91.98.195.242}"
CERT="$DIR/backup-cert.pem"

[[ -f "$CERT" ]] || { echo "missing $CERT" >&2; exit 1; }
umask 077
STAMP="$(date -u +%Y%m%dT%H%MZ)"
OUT="$DIR/env-production-$STAMP.cms"

# Certificate goes up on stdin; the encrypted DER comes back on stdout; the server prints the plaintext hash on stderr.
HASH_FILE="$(mktemp)"
ssh -i "$KEY" -o BatchMode=yes "$HOST" '
  set -euo pipefail
  c=$(mktemp); trap "rm -f $c" EXIT; cat > "$c"
  f=~/htdocs/www.wao.co.il/.env.production
  sha256sum "$f" | cut -d" " -f1 >&2
  openssl cms -encrypt -binary -aes256 -outform DER -in "$f" "$c"
' < "$CERT" > "$OUT" 2> "$HASH_FILE"

SERVER_HASH="$(tr -d '[:space:]' < "$HASH_FILE")"; rm -f "$HASH_FILE"
[[ "$SERVER_HASH" =~ ^[0-9a-f]{64}$ ]] || { echo "server hash missing; backup not trusted" >&2; rm -f "$OUT"; exit 1; }
[[ -s "$OUT" ]] || { echo "empty backup" >&2; rm -f "$OUT"; exit 1; }
echo "$SERVER_HASH" > "$OUT.sha256"

# Optional self-check without showing plaintext: WAO_ENV_BACKUP_PASSFILE=<file holding the passphrase>.
if [[ -n "${WAO_ENV_BACKUP_PASSFILE:-}" ]]; then
  LOCAL_HASH="$(openssl cms -decrypt -binary -inform DER -in "$OUT" -inkey "$DIR/backup-key.pem" -recip "$CERT" \
    -passin "file:$WAO_ENV_BACKUP_PASSFILE" | sha256sum | cut -d' ' -f1)"
  [[ "$LOCAL_HASH" == "$SERVER_HASH" ]] || { echo "decrypt check FAILED" >&2; exit 1; }
  echo "decrypt check OK"
fi

echo "backup: $OUT ($(stat -c %s "$OUT") bytes, plaintext sha256 $SERVER_HASH)"
