# Homepage human rewrite: Noa QA, 2026-11-11

Reviewed: docs/copy/homepage-human-rewrite-2026-11-11.waocopy.json (24 patches). Saved by Adam from Noa's hand-back, unedited in substance.

## Verdict: SHIP WITH FIXES
- Required fixes: P0, P4, P8, P17. Recommended: P13 (cut), P22.
- No [RED], no corruptions, no ASCII quotes in Hebrew, no double spaces, singular masculine holds.
- En-dashes: all five remaining keys replaced (P0, P6, P7, P8, P9) → zero after patches.

## Facts and hard keeps
- FAQ Q4 (P17): no "from day one", profile before website, "usually" wording. Dropped "so the flow starts uneven" → fixed below.
- FAQ Q5 (P19): correct. Founder line (P2): matches §5. Call tracking: nothing mentions or implies it.
- Hard keeps untouched. Video heading (P3) doesn't describe the video.
- CTA labels now two: "תראה לי את המודעה שלי" (nav, hero, final) and "תראה לי מודעה לעסק שלי" (card).

## Required / recommended replacements (byte-exact `new`)
- **P0 hero.body** [ORANGE] length (also the meta description, ~163 chars) + [AI] "מחפש עכשיו" ×3:
  `אתה כל היום אצל לקוחות, ואין לך זמן לשווק. מי שמחפש את השירות שלך בגוגל צריך להגיע אליך, לא למתחרה. תראה איך ייראו המודעה ודף הנחיתה שלך, לפני שאתה משלם שקל.`
- **P4 partner status_line** [ORANGE] "מודעות תצוגה" is a calque (Google Israel: רשת המדיה):
  `WAO רשומה בספריית השותפים של גוגל, עם הסמכות במודעות חיפוש ובמודעות מדיה.`
- **P8 demo_status** [AI] second sentence repeats the button and hero:
  `שום מודעה לא עולה לאוויר בלי האישור שלך.`
- **P13 final_cta.body** [AI] (recommended) second sentence restates heading and button:
  `ספר לנו מה אתה עושה ובאיזה אזור.`
- **P17 FAQ Q4** [ORANGE] calques ("דירוגים משתלמים", "סביב חודשים 6 עד 12"), wrong preposition, "בדרך כלל" ×3, unexplained "תקופת למידה":
  `במודעות, פניות יכולות להגיע תוך כמה ימים מהאישור של גוגל, שלוקח בדרך כלל עד יום עסקים. בשבועות הראשונים גוגל עוד לומדת את הקמפיין, אז הקצב לא יציב. כמה פניות יגיעו תלוי בביקוש באזור, בתחרות ובתקציב. הפרופיל העסקי בגוגל מתחיל להביא שיחות לרוב בחודשים הראשונים. האתר עצמו מטפס בגוגל לאט יותר, ובדרך כלל משתלם אחרי חצי שנה עד שנה.`
  Dror/Yonatan to confirm "אחרי חצי שנה עד שנה" and "גוגל עוד לומדת את הקמפיין".
- **P22 footer blurb line 3** [ORANGE] (recommended) "הניסיון שלנו … החל ב-2006" calque + person switch:
  `אנחנו בשיווק דיגיטלי מאז 2006.`

## Engineer flags
- P5 sets paths.intro to "" → empty `<p>` in `.astra-section-intro` (AstraHome.tsx:82); video_proof.context_line already does the same (:72). Contract test (homepage-astra.contract.test.mjs:156–163) requires paths.intro exactly once in the section, so a naive `{x && <p>{x}</p>}` guard fails it.
- Update finalHash + docs mirror (docs/copy/astra-authority-first-homepage-copy.qwen38-v3-2026-09-30.json), the astra-homepage-copy.json docs/src equality (test line 41) and expectedHash.
- Yonatan heads-up: meta description changes with P0.

## [YELLOW] for Tamar (optional)
P0 "אצל לקוחות" → "עם לקוחות" (covers clinic/studio owners); P3 "לקוחות WAO" reads like a label → "המלצות מלקוחות WAO"; P7 "שלך" ×3; P11 "מה אתה עושה" ×4 on the page; P15 ads bring people, not inquiries, to a site; P19 "מתנהלת"/"בכל עת" formal (keep consistent with legal copy); P22 fold 2006 into sentence one.

## How human
~60% before → ~80% as delivered → ~85% with fixes.

## Proposed writing upgrades (await approval)
1. A hero/intro string that doubles as meta description fits ~155 chars, hook early.
2. Don't end a body text by repeating the button directly below it.
3. When a settled fact includes its consequence, keep the consequence; a technical term needs its plain-language effect.
4. Don't switch between first and third person for the brand inside one paragraph.
5. Prefer spoken time spans to numeric ranges; never translate English duration/result patterns literally.
