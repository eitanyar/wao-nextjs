# GBP Magnet — Hebrew Page-Copy Bundle (DRAFT)

- Author: waocopy (Tamar)
- Date: 2026-10-03
- Task: 2026-10-03_028 (kanban t_5ad067e3)
- Status: DRAFT ONLY — no implementation, no page, no route change
- Gates ahead: waohebrewqa language QA -> Eitan human voice spot-check -> waoengineer byte-exact application
- Key-count note: the handoff AC says "27 required keys", but the handoff's own enumerated list (§Specification item 3) contains exactly 26 key IDs. All 26 enumerated keys are authored below, byte-identical; the "27" is a contract typo flagged to waostrategy.
- Placeholder mapping (spec §7): page.headline = {{GBP_MAGNET_HEADLINE}}, page.formIntro = {{GBP_MAGNET_FORM_INTRO}}, page.previewTease = {{GBP_MAGNET_PREVIEW_TEASE}}, page.unlockCta = {{GBP_MAGNET_UNLOCK_CTA}}, page.consentLine = {{GBP_MAGNET_CONSENT_LINE}}, state.noMatch = {{GBP_MAGNET_NO_MATCH}}, page.nextStepGeneric = {{GBP_MAGNET_NEXT_STEP_GENERIC}}. The five {{ROUTING_LINE_*}} variants are intentionally NOT authored (routing tree not wired).

## Page / hero

page.headline: איך העסק שלך נראה בגוגל מול המתחרים?
page.formIntro: כתוב את שם העסק, העיר והתחום — ותוך שניות תראה איפה אתה עומד.
page.previewTease: זאת רק ההצצה. בדוח המלא תראה גם את קצב הביקורות האחרונות, ומה כדאי לעשות עכשיו.
page.unlockCta: פתח את הדוח המלא

## Consent / legal

page.consentLine: אני מסכים ש-WAO תיצור איתי קשר בנוגע לבדיקה הזאת.
(Structural note, not a string: standalone checkbox per VISION.md Gate 1 ECL precedent — gates the unlock form only; the free preview never requires it. Contact permission only, nothing bundled.)
page.privacyNote: הפרטים שלך נשארים אצל WAO ולא מועברים לצד שלישי דרך הטופס הזה.

## Preview form

form.businessNameLabel: שם העסק
form.cityLabel: עיר
form.categoryLabel: תחום העסק
form.previewCta: השווה אותי למתחרה

## Unlock form

form.nameLabel: שם מלא
form.phoneLabel: טלפון
form.emailLabel: אימייל

## Report

report.previewHeading: הצצה ראשונה — אתה מול מתחרה אחד
report.fullHeading: הדוח המלא — אתה מול המתחרים
report.yourBusiness: העסק שלך
report.competitorsHeading: מתחרים באזור שלך
report.ratingLabel: דירוג ממוצע
report.reviewCountLabel: מספר ביקורות
report.paceLabel: קצב ביקורות אחרונות
report.smallSampleDisclaimer: מדגם קטן — זו הערכה גסה, לא מדידה מדויקת.

## Routing (v1 generic — single line per spec §7)

page.nextStepGeneric: מה עכשיו? נתקשר אליך עם תוכנית פעולה קונקרטית לעסק שלך.

## States

state.noMatch: לא מצאנו את העסק בגוגל. בדוק את האיות של השם, ונסה שוב עם העיר.
state.rateLimited: ביצעת כמה בדיקות ברצף — נסה שוב בעוד כמה דקות.
state.unavailable: השירות לא זמין כרגע. נסה שוב מאוחר יותר.
state.validationError: כמה שדות צריכים תיקון. בדוק את השדות המסומנים ושלח שוב.
