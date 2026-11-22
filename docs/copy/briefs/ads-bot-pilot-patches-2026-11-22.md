# Brief: Ads Bot pilot, copy patches (2026-11-22)

Persona: Israeli one-person local-service business owner (plumber, locksmith, etc.), skeptical, ROI-minded. Singular male. Ads Bot = ₪249 + VAT per month, WAO opens a new Google Ads account for him, he is invited as ADMIN, adds his own card in Google's screen. Written support only, handled mostly by AI; no promise of a response time, no calls.

Deliver byte-exact `old -> new` patches (use --patches) against the exact current strings. Where the old string is quoted below it is verbatim from the repo; for strings I describe by location, read the file first.

## 1. docs/legal/ads-bot-terms-of-use.md, section 7 (line ~72)
Old sentence: `החיוב מתבצע בתחילת כל חודש.`
Intent: the first charge is made on the day of sign-up, then every month on the same day of the month. The 30-day money-back period (line ~78) still starts when the first ad goes on air, not at payment.

## 2. Same file, line ~201 (support)
Old: `תמיכה: בצ׳אט עם איתן, מייסד WAO, ובדוא״ל בכתובת eitan@wao.co.il. זמן מענה משוער: עד 24 שעות בימי עסקים.`
Intent: support is written only (chat and email), most handled by an AI assistant, a person steps in when needed. No response-time promise.

## 3. Same file: one new sentence for the advertiser line
Intent: Google shows the business owner's legal name publicly as the advertiser (Google's advertiser verification). Propose where it goes and the old->new anchor.

## 4. src/app/api/bot/route.ts line ~621
Old contains `אני אشرح` (Arabic letters inside Hebrew). Fix to Hebrew `אני אסביר` or the natural equivalent, keep the rest of the string byte-identical.

## 5. src/app/(app)/google-ads/onboarding/page.tsx
a) Line ~1164: `הדף ייבנה אוטומטית לאחר התשלום` is false. Replace with a true line: the page is prepared after we approve the details together (no payment promise, no automatic).
b) Lines ~1177-1200, in COMPLETED state: `בונה את הדף שלך... זה ייקח כמה שניות`, `🎉 הדף שלך מוכן!`, `👉 צפה בדף הנחיתה שלך` and any "campaign is live / check your email" text. Read the file and give true replacements: the details were received, the page and campaign are prepared and reviewed by WAO, nothing is live yet, we write by email when approval is needed. Keep emoji handling byte-exact.

## 6. New strings (return as a JSON object with keys, not patches)
- checkout page: title, price line (₪249 + VAT, total 293.82), line that the 30-day money-back period starts when the first ad goes on air, consent checkbox text (terms link + autonomy consent), pay button, success and failure messages.
- pay-link email after approval: subject + body.
- Hebrew written guide for completing Google's advertiser-verification task from a link we send him (steps, short, no UI-fluid specifics, mentions: name exactly as on ID, own card, individual vs organization).

Voice: blunt, plain, Sabra, no hedging headline; safeguards are one proof line. All new strings voice-safe, 12-15 words per sentence.
