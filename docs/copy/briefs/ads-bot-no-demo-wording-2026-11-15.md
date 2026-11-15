# Ads Bot: remove «דמו / לדוגמה» wording (2026-11-15)

**Founder rule (15.11):** nothing on our pages may read as a demo, example or placeholder. The free Ads Bot intake now runs on the visitor's OWN business: he answers the bot's questions and sees the plan and his own Google ad before he pays anything (the example-business mode is no longer linked). The /google-ads buttons already read «לבנות מודעה לעסק שלי».

**Facts to keep exactly:** free to try; it runs on his business; he sees the plan the bot builds (area, budget, search terms) and his ad before paying; subscription {net} ₪ + מע״מ a month with no commitment (keep the token {net} where a price appears — in the how-it-works JSON the price is written as «249 ₪ + מע״מ בחודש», keep that exact text); ad budget separate, minimum 1,500 ₪ a month paid straight to Google; most money goes to the advertising itself (keep the markdown link «[פרסום בגוגל](/google-ads)» exactly).

**Strings to replace (byte-exact current values):**
1. `onboarding_title` — the browser-tab title of the intake chat page (noindex page; the site appends « | WAO»). Current: «דמו חינם: תוכנית Google Ads לעסק לדוגמה». ≤ 45 chars, must name Google Ads or «גוגל».
2. `onboarding_eyebrow` — small label above the intake chat H1. Current: «דמו חינם של בוט מודעות». ≤ 30 chars.
3. `hiw_closing_h2` — closing H2 on /google-ads/how-it-works. Current: «לפני שאתה מחליט — תראה את הכול על עסק לדוגמה».
4. `hiw_closing_body` — the paragraph under it. Current: «הדמו חינם, ורץ על עסק לדוגמה — אתה רואה את הבוט בלי לגעת בכסף שלך. המנוי עולה 249 ₪ + מע״מ בחודש, בלי התחייבות. תקציב הפרסום נפרד: מינימום 1,500 ₪ בחודש, שאתה משלם ישירות לגוגל. רוב הכסף הולך ל[פרסום בגוגל](/google-ads) עצמו, והחלק שלנו קבוע וידוע מראש.»
5. `hiw_closing_cta` — the closing button. Current: «דמו חינם על עסק לדוגמה». Use exactly «לבנות מודעה לעסק שלי» for consistency unless you have a strong reason.

**Return JSON only:** {"onboarding_title":"","onboarding_eyebrow":"","hiw_closing_h2":"","hiw_closing_body":"","hiw_closing_cta":"","why":""}
