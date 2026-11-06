# Google Ads Onboarding — Payment Unavailable Notice (Hebrew)

- Author: waocopy (Tamar/Gil)
- Date: 2026-10-05
- Task: kanban t_d9e272f4 (parent approval recorded on t_6f39d25b)
- Status: DRAFT — pending independent waohebrewqa gate; engineer applies byte-exact afterwards
- Surface: src/app/(app)/google-ads/onboarding/page.tsx:557-558 — replaces the ENTIRE comparison/pricing block text (freelancer comparison + 9.90 ₪ setup / free first month / 249 ₪ monthly promise). Not an append.
- Truth scope: online registration/payment is disabled; no price, discount, competitor comparison, availability/timing promise, guarantee, result claim, or contact route.

## Keyed string

googleAdsOnboarding.paymentUnavailableNotice: נכון לעכשיו, ההרשמה והתשלום המקוונים אינם זמינים. שום חיוב לא מתבצע. תוכל להמשיך לצפות בהדגמה.

## Constraints check

- No price, discount, or currency figure: PASS
- No competitor/freelancer price comparison: PASS
- No availability claim or return-date promise: PASS (states only current unavailability; no forward-looking clause at all)
- No service guarantee or result claim: PASS
- No contact route: PASS
- No invented service conditions: PASS ("שום חיוב לא מתבצע" reflects the disabled payment path; "להתרשם מהמערכת" reflects the still-working onboarding)
- Register: singular male, natural Israeli Hebrew, brief, non-technical, calm and respectful: PASS
- Replaces the whole existing block, not an append: PASS
