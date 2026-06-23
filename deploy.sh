#!/bin/bash
set -e

# Load nvm so npm/node are available in non-interactive SSH sessions
source ~/.nvm/nvm.sh

cd /home/wao/htdocs/www.wao.co.il

echo "⬇️ Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building..."
npm run build

echo "📁 Copying static files..."
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

echo "♻️ Restarting app..."
pm2 restart wao-app --update-env

echo "✅ Done."
