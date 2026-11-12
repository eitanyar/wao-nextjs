# Noa: final gate on round 3 (2026-11-12)

Saved by Adam. Replacement strings are copied verbatim from Noa's hand-back. Adam applied the 4 FIXes to the r3 files (Python str.replace, counts asserted).

## Adam's rulings
- **Article CTA href stays `/google-ads`** (Yonatan A2), so the support line `בעמוד פרסום בגוגל מחכה גם דמו` stays. The DEMO_HREF ruling applies only to the how-it-works page's ppc_cta_branch.
- **Phrase negatives:** Noa's 14 plus `להורדה חינם` and `להורדה בחינם` (the most common free-download pattern; Dror's intent covers it). `יד 2` is NOT added (Dror's call, later).
- **The how-it-works file's `negative_free_intent_phrases` block (21 entries) is discarded.** The leads-subtitle add-on at the bottom of the pron-test file is discarded too; the leads-subtitles file is the only source.
- **Round 5:** the tone trio uses Noa's format (identical text, only the tag changes); drop n42 and n43; keep n59 next to item 1; the optional A2 till line is NOT added (result promise).
- **Writing upgrades 1–2:** accepted for waocopy (one colon per sentence; a pronoun that opens a clause in a note about two similar terms refers to the note's topic, and the other term is named in full).

## Verdicts
| File | Verdict |
|---|---|
| Explainer A | SHIP |
| Explainer B | SHIP |
| FAQ | FIX (2), applied |
| Nurture (PARKED) | SHIP |
| 30s / 15s / 6s | SHIP |
| Situation shorts | SHIP (optional: `שֶׁסִּימַּנְתָּ` → `שֶׁסִּימַנְתָּ` in the pronunciation entry) |
| Pron test | FIX (1), applied |
| How-it-works page | SHIP |
| Quality Score article | FIX (1), applied |
| Leads subtitles | SHIP |

## FIXes (applied)
- FAQ q12 a: `אחר כך הפניות מהדף יושבות ברשימה אחת: לחיצה אחת מסמנת פנייה: אמיתית או לא,` → `אחר כך הפניות מהדף יושבות ברשימה אחת. לחיצה אחת מסמנת פנייה: אמיתית או לא,`
- FAQ q14 a: `ואם מצב פניות נותן תוצאות פחות טובות, הוא מתוכנן לחזור לבד למצב קליקים.` → `ואם מצב פניות נותן תוצאות פחות טובות, הקמפיין מתוכנן לחזור לבד למצב קליקים.`
- Pron test n58 (voice + display, count 2): `פניות נוחתות ברשימה אחת בטלפון שלך, ואתה מסמן` → `פניות מהדף נוחתות ברשימה אחת בטלפון שלך, ואתה מסמן`
- Article box note: `לפי גוגל, ציון האיכות לא משתמש בציון הזה, והוא לא אומר כלום על המודעה שלך מול המתחרים.` → `לפי גוגל, הוא לא אומר כלום על המודעה שלך מול המתחרים, וגם ציון האיכות לא משתמש בו.`

## Leads subtitles (byte-exact patches for the engineer)
- `src/app/(app)/leads/page.tsx:30`: `סמן ליד איכותי, ועדכן הכנסה כשסוגרים עסקה — זה מאמן את גוגל לשלוח לידים טובים יותר.` → `סמן אם הפנייה אמיתית או לא, ועדכן הכנסה כשסגרת עסקה.` (line 29 unchanged)
- `src/app/(product)/client/leads/page.tsx:44`: `כל הפניות שנכנסו מהקמפיין שלך — כולל לחיצות על טלפון ווואטסאפ. סמן ליד איכותי, ועדכן כשסגרת עסקה.` → `סמן אם הפנייה אמיתית או לא, ועדכן כשסגרת עסקה.`

## Engineer notes on the article
- (a) Glossary `proposed_fixes` have no `old` strings: pull the exact current text from the file and replace only the stated span.
- (b) The box `columns` has 3 headers but 4 cells per row: the term column needs an empty header, or the renderer must handle it.

## Final phrase-match negatives (Noa-proofed)
הורדה בחינם
להוריד בחינם
קורס בחינם
מדריך בחינם
תוכנה בחינם
אפליקציה בחינם
הורדה חינם
להוריד חינם
קורס חינם
מדריך חינם
תוכנה חינם
אפליקציה חינם
להורדה בחינם
להורדה חינם
יד שנייה
יד שניה

Never block: bare חינם, הצעת מחיר (בחינם), בדיקה/ייעוץ חינם.

## Items a–d (old strings still present): all intended
a. Explainer A E4-08 display (the fix was voice-only). b. Pron test n62 display. c. Pron test n32 digits vs n57 words. d. Nurture `הדמו פתוח:` before a link button.
