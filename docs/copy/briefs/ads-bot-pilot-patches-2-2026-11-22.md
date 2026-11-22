# Brief: Ads Bot pilot, copy patches round 2 (2026-11-22)
Same persona/offer as docs/copy/briefs/ads-bot-pilot-patches-2026-11-22.md. Deliver byte-exact old->new patches (--patches). Also: the earlier run answered the guide question by sending the owner to the chat; keep that.

## A. terms advertiser sentence
File docs/legal/ads-bot-terms-of-use.md line 19 (verbatim): `דמי השירות נפרדים מתקציב הפרסום. תקציב הפרסום משולם ישירות ל-Google. איננו מקבלים את תקציב הפרסום, איננו מחזיקים בו, ולא נחזיר אותו. את פרטי התשלום שלך ואת מסמכי האימות ש-Google מבקשת אתה מוסר ישירות ל-Google. פרטי כרטיס האשראי שלך ומסמכי הזהות אינם מגיעים אלינו, ואיננו מטפלים בהם.`
Intent: append your advertiser-name sentence (Google publicly shows his legal name as the advertiser, part of Google's advertiser verification) at the end of this paragraph. Patch must keep the old paragraph byte-identical up to the insertion.

## B. COMPLETED banner, src/app/(app)/google-ads/onboarding/page.tsx line 1209 (verbatim)
`🎉 הקמפיין באוויר! בדוק את תיבת המייל שלך לסיכום ופרטים על מה קורה עכשיו.`
False: nothing is live. Replace consistently with the earlier COMPLETED replacements (details received; we prepare and review; we write by email when we need his approval). Emoji byte-exact. Note the earlier `🎉 סיימת את החלק שלך!` already exists above it; avoid saying the same thing twice.

## C. Click-cap claim, src/lib/google-ads/landingCopy.generated.ts line 44 (verbatim inside one string)
`בהתחלה הוא גם שם תקרה של 15 ₪ על מחיר הקליק, כדי שלא תשלם יותר מדי בזמן שהסימונים שלך מצטברים.`
False: ceilings are per trade, not a flat 15. Replace with "a click-price ceiling set for your trade" wording, no number. The same sentence also exists in docs/copy/google-ads-r2-final-candidate-2026-11-12.txt; give a patch for each file (old string must be the same exact substring; read both files).
Also check src/lib/bot/prompts.ts and src/lib/google-ads/ad-claims-guard.test.ts for "15 ₪" statements aimed at customers and list them (patch only the customer-facing ones).
