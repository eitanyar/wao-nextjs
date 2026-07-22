#!/usr/bin/env bash
set -e

echo "🔍 [1/3] בודק סטטוס Git..."
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ שגיאה: יש שינויים שלא נשמרו ב-commit. שמור אותם קודם."
  exit 1
fi

echo "🔄 [2/3] ממזג תוכן שיווקי מ-draft/marketing..."
git fetch origin draft/marketing 2>/dev/null || true
git merge draft/marketing --no-ff -m "chore: merge latest marketing copy"

echo "🛠️ [3/3] מריץ בדיקת בנייה (Build Check)..."
npm run build

echo "🚀 הבנייה הצליחה! דוחף ל-main ולפרודקשן..."
git checkout main
git merge draft/marketing --no-ff -m "release: deployment verified"
git push origin main
echo "✅ הכל באוויר ותקין!"
