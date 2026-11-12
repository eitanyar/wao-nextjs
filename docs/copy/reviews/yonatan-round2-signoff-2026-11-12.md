# Yonatan: round-2 anchor sign-off (2026-11-12)

Saved by Adam from Yonatan's hand-back.

## How-it-works page: PASS
- **H1** `איך בוט מודעות עובד: שמונה צעדים מהחיפוש ועד הפנייה`; **title** `איך בוט מודעות עובד: 8 צעדים מהחיפוש בגוגל ועד הפנייה` + template `‏ | WAO`. Product-name swap confirmed.
- **Hub mechanism → page:** anchor `איך בוט מודעות עובד` (reserved for /google-ads/how-it-works only).
- **Step 5 → article:** `ציון איכות` → /knowledge/google-ads-quality-score.
- **Closing → hub:** `פרסום בגוגל` → /google-ads, once.
- **Closing button:** `דמו חינם על עסק לדוגמה` → DEMO_HREF.
- **Schema:** Breadcrumb דף הבית › פרסום בגוגל › איך זה עובד; WebPage about /google-ads#service; no HowTo, FAQPage or Offer; sitemap entry; SiloNav "פרסום בגוגל" silo (hub + 2 spokes). Meta: option 1.
- **Housekeeping:** this file's `article_elements` and `glossary_fixes` blocks are IGNORED. The article file is the only source for the article, and Noa/Dror pick ONE glossary-fix draft before the engineer applies B5.
- **Maya:** check how `WAO (Ads Bot)` renders in the answer block (.tsx, no renderMixed).

## Quality Score article: CONDITIONS
Slug, H1, metaTitle (with the literal `‏ | WAO`; page.tsx renders it as absolute), titleShort, summary, B3, B4 (i), (ii), (iv), B5 (glossaryTerms off), B6 and B7 all PASS.
- **A1:** Ad Strength's Hebrew term is `חוזק המודעה` (Google Help 9921843 iw: "מדד חוזק המודעה"; labels נמוך / ממוצע / טוב / מצוין). Replace "עוצמת מודעה" everywhere (section 4 H2 and definition, box row, FAQ 4). Approved H2 head: `חוזק המודעה: פתק מהעורך, לא ציון במכרז` (the wording after the colon may change; the head term stays). Tamar → Noa.
- **A2:** the CTA button text must NOT be `איך בוט מודעות עובד` or `פרסום בגוגל`. The href stays /google-ads. Use a demo-led label. Tamar → Noa.
- **A3:** the breadcrumb follows the template: `ראשי › מאגר ידע › ציון איכות ודירוג מודעה` (engineer; no code change).
- **A4:** the sources line must link all 4 topics. Dror adds Ad Strength (9921843) and negative keywords (2453972), and sources the Optimization Score note against Help 9061546 ("ציון האופטימיזציה", 0–100%: how well the account settings support its performance potential). Dror → Tamar if the wording changes.
- **B8** (not blocking): DataForSEO volume/AIO check later.
- **Publish day:** Dror re-reads every Google statement; updatedDate = publish day.
