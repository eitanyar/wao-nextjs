# Yonatan: SEO/GEO review of how-it-works page + Quality Score article (2026-11-12)

Saved by Adam from Yonatan's hand-back (web checked 2026-11-12).

## Adam's rulings
- **Product name:** "בוט מודעות" (Noa; it's the entity used in voice, on the hub and in ads). Yonatan's signed H1/title use "בוט הפרסום". Ruling: H1 `איך בוט מודעות עובד: שמונה צעדים מהחיפוש ועד הפנייה`; title `איך בוט מודעות עובד: 8 צעדים מהחיפוש בגוגל ועד הפנייה`. Yonatan to confirm the swap in his next pass. Bind the Latin "Ads Bot" once in the answer block.
- **Hub consistency** (condition 5): the live /google-ads mechanism moment 3 uses the present tense ("עובר לבד", "מכוונת"). Patch it to the "designed to" frame, together with the line-27 gender fix, in a hub patch round. The weekly-report line 48 waits on the engineer making the digest match. The hub's Eitan mention is the pre-sale "talk to Eitan" funnel (product decision 2026-11-06); the no-founder-name rule is for ads, so it's unchanged.
- **Closed jobs:** "ולפחות שתי עבודות שנסגרו" is the second condition, never the trigger alone (Dror).

## How-it-works page: CONDITIONS
- Own URL `/google-ads/how-it-works`, canonical and indexed. Title: see the ruling above, rendering `…ועד הפנייה‏ | WAO`. Meta: option 1. REJECTED: H1/title option 2 ("ניהול קמפיינים בגוגל" is the hub's) and title option 3 (DIY intent, would collide with the course).
- The page never uses "פרסום בגוגל" or "ניהול קמפיינים בגוגל" in its title, H1 or H2s.
- **Condition 1:** a 2-sentence answer block above the story intro, entity first (what WAO's בוט מודעות (Ads Bot) is, plus the core principle).
- **Condition 2:** links. Hub mechanism block → this page (anchor `איך בוט מודעות עובד`); this page → hub (anchor exactly `פרסום בגוגל`, once, in the closing); step 5 → the article (anchor `ציון איכות`); closing button → the hub demo (DEMO_HREF); no link to the DIY course.
- **Condition 3:** schema. Breadcrumb דף הבית › פרסום בגוגל › איך זה עובד; WebPage about the hub #service; no HowTo, no FAQPage, no Offer; video markup per step later; add to the sitemap.
- **Condition 4:** a SiloNav "פרסום בגוגל" silo (hub plus the two spokes).

## Quality Score article: CONDITIONS (B5 blocks shipping)
- Slug `google-ads-quality-score`.
- H1 `ציון איכות ודירוג מודעה: למה שני אינסטלטורים משלמים אחרת על אותו קליק`.
- metaTitle `ציון איכות בגוגל אדס: למה המתחרה משלם פחות על אותו קליק‏ | WAO`.
- titleShort `ציון איכות ודירוג מודעה`.
- summary = meta option 2, plus "בגוגל אדס" after "ציון האיכות".
- **B1:** a new KnowledgeCategory `ppc`, label `גוגל אדס` (engineer).
- **B2:** a `ppc` CTA branch → /google-ads (engineer + Tamar), no price.
- **B3:** Google's official Hebrew terms, once each: ערכי הסף לדירוג המודעה; חוויית המשתמש בדף הנחיתה; נכסי מודעה (שפעם נקראו תוספים), then נכסים.
- **B4:** (i) a "בקצרה" box comparing Quality Score / Ad Rank / Ad Strength (what it is, its scale, whether it's in the auction); (ii) Google: the actual price per click is often lower than the bid; (iii) Quality Score vs Optimization Score ("ציון אופטימיזציה"), with Dror sourcing it; (iv) a visible "עודכן: נובמבר 2026" plus a sources line (needs renderer support for external links, engineer).
- **B5, BLOCKING:** src/data/glossary.ts:334 (Ad Rank = Bid × QS), :304 (+$0.01 CPC formula) and :329 ("saves money on every click") contradict Google. Fix them (Dror facts → Tamar → engineer), or leave glossaryTerms off the article. Also course page google-ads-course/page.tsx:980 ("LCP over 3 seconds = low QS").
- **B6:** the WAO passage anchor is exactly `פרסום בגוגל` → /google-ads. pillarLinks: hub plus how-it-works. Inline links: /knowledge/core-web-vitals, /knowledge/search-intent, /training/google-ads-course/negetive-term-keywords, /training/google-ads-course/google-ads-landing-pages, /training/google-ads-course/google-ads-extensions-call-button. relatedSlugs: core-web-vitals, search-intent, google-my-business.
- **B7:** Article + Breadcrumb + FAQPage (6 pairs); updatedDate = publish day after Dror's re-check.
- **B8 (should):** a DataForSEO volume and AIO check on ציון איכות / quality score / דירוג מודעה / ad rank / עלות לקליק גוגל.

Sources: Google Help 6167118 and 1722122 (en + iw); FAQPage changelog (rich results ended 2026-05-07); arXiv 2605.14021; Digital Applied AIO citation study.
