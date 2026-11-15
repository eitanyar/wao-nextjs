# Site Bot free audit: two "fail" lines that sound like a free fix (2026-11-15)

Same reader and rules as docs/copy/briefs/site-bot-audit-screens-clarity-2026-11-15.md (read it). Fable 5.2 item 8: on a FREE check these lines sound as if WAO will fix it for free. Rewrite so that anything WAO does is clearly part of the paid service (199 ₪ + מע״מ לחודש), and give the one thing he can do himself for free. Short, spoken, singular male, no emoji.

Current values (byte-exact from src/lib/site-bot/scorecardCopy.ts):
```json
{
 "DIM_DESCRIPTION_FAIL": "אין תיאור בפרופיל. זו ההזדמנות שלך להסביר מה אתה עושה. אנחנו נכתוב את זה כמו שצריך — בדיוק בשביל זה אנחנו כאן.",
 "DIM_PHONE_WEBSITE_FAIL": "חסר טלפון או אתר בפרופיל. שם בדיוק אתה מאבד לקוחות. וזה מה שאנחנו מסדרים בשבילך."
}
```

Return JSON only: {"scorecard":{"DIM_DESCRIPTION_FAIL":"...","DIM_PHONE_WEBSITE_FAIL":"..."},"why":"..."}
