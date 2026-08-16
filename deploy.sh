#!/bin/bash
set -e

# Load nvm so npm/node are available in non-interactive SSH sessions
source ~/.nvm/nvm.sh

cd /home/wao/htdocs/www.wao.co.il

if [[ ! -f .env.production ]]; then
  echo "❌ Missing .env.production on the server."
  exit 1
fi

set -a
source .env.production
set +a

if [[ -z "${CLIENT_PORTAL_SECRET:-}" ]]; then
  echo "❌ CLIENT_PORTAL_SECRET must be set in .env.production."
  exit 1
fi

# Deploy target: branch or tag, defaults to hermes-migration (production).
TARGET=${1:-hermes-migration}

echo "🔄 Fetching all branches and tags..."
git fetch --all --tags

if git show-ref --verify --quiet refs/heads/"$TARGET" || git show-ref --verify --quiet refs/remotes/origin/"$TARGET"; then
  echo "⬇️ Pulling branch: $TARGET..."
  git checkout "$TARGET"
  git pull origin "$TARGET"
else
  echo "⬇️ Checking out tag: $TARGET..."
  git checkout "$TARGET"
fi

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building..."
npm run build

echo "📁 Copying static files..."
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

WAO_RUNTIME_DATA_DIR="${WAO_RUNTIME_DATA_DIR:-/home/wao/wao-runtime-data}"
mkdir -p "$WAO_RUNTIME_DATA_DIR"
if [[ -d .next/standalone/data ]]; then
  cp -an .next/standalone/data/. "$WAO_RUNTIME_DATA_DIR"/
fi
rm -rf .next/standalone/data
ln -s "$WAO_RUNTIME_DATA_DIR" .next/standalone/data

echo "♻️ Restarting app..."
pm2 restart wao --update-env

echo "🔍 Verifying Google Ads sandbox..."
node scripts/verify-google-ads-sandbox.mjs

echo "✅ Done. Successfully deployed: $TARGET"
