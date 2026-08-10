#!/bin/bash
# Rsyncs public/media/videos/ (gitignored by *.mp4) to the production server,
# since deploy.sh only runs `git pull` and untracked files never reach it.
# Run this from the local repo BEFORE `./deploy.sh` on the server, so its
# `cp -r public .next/standalone/` step picks up the videos.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_KEY="${WAO_SSH_KEY:-$HOME/.ssh/id_ed25519}"
SERVER="wao@91.98.195.242"
REMOTE_DIR="/home/wao/htdocs/www.wao.co.il/public/media/videos/"

echo "🎬 Syncing $REPO_DIR/public/media/videos/ -> $SERVER:$REMOTE_DIR"
rsync -avz --progress \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$REPO_DIR/public/media/videos/" \
  "$SERVER:$REMOTE_DIR"

echo "✅ Media sync done. Now run deploy.sh on the server."
