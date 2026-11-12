# /google-ads facts pass: Noa QA (2026-11-12)

Saved by Adam from Noa's hand-back.

Noa: QA of the /google-ads facts pass (google-ads-facts-pass-2026-11-12.waocopy.json, 22 patches)

**Verdict:** Not ready to ship as is. The facts and VAT are right everywhere, but the new-account phrase repeats 6 times, the lead-feedback sentence appears word for word twice, and step 01 and step 04 are inconsistent. With the FIXes below applied, it is shippable.

Below, FIX means: replace this patch's `new` with the text given. The `old` values stay byte-exact against the before-file. Added patches use olds from the facts after-file, and each one is also present unchanged in the before-file.

## Per patch

- **#0 title — KEEP, but flag to Yonatan.** It is 56 chars including the RLM. It ends in Hebrew (מע״מ), then RLM, then " | WAO", so it is bidi-safe. The RLM byte carried over from the old string. The ₪249 + Hebrew mix resolves RTL correctly.
  - **Yonatan decision:** dropping "לחודש" lets the SERP read ₪249 as a one-time fee. That is risky on a retainer offer, although the meta description still says לחודש. I recommend restoring it. Under 60 chars that means cutting a Latin token. Both options end in Hebrew, so both are bidi-safe:
    - (a) `פרסום בגוגל — Google Ads ב-₪249 + מע״מ לחודש‏ | WAO` (51 chars, drops "עם Ads Bot")
    - (b) `פרסום בגוגל — Ads Bot ב-₪249 + מע״מ לחודש‏ | WAO` (48 chars, drops the "Google Ads" term)
  - The formula is Yonatan's call.
- **#1 meta/OG description — KEEP.** It is about 158 chars, at the edge of the limit. Yonatan should know any further addition gets cut off.
- **#2, #3 schema descriptions — KEEP.**
- **#4 "1500"→"249" — KEEP.** It occurs only once (the other amounts are written "1,500"). Engineer note, not a Hebrew issue: the Offer has no VAT/unit flag. Consider a `priceSpecification` with `valueAddedTaxIncluded:false` and a monthly unit (Eitan-Dev, with Yonatan's OK).
- **#5 FAQ 1 (x2) — FIX.** The new-account point lives in the hero and step 01. Here it is a repeat (rules 12, 31), and "שנפתח" is a vague passive. Keep the VAT only:
  `₪249 + מע״מ לחודש ל-WAO. בנוסף, אתה משלם מינימום של ₪1,500 לחודש למודעות ישירות לגוגל מחשבון Google Ads שלך. יש הסכם בכתב.`
- **#6 refund FAQ (x2) — KEEP.**
- **#7 FAQ 4 (x2) — FIX.** Four problems:
  - 🟠 "בין אם X, Y או Z" is broken grammar and a calque of "whether".
  - 🟠 "ואם היא נסגרה" reads as a condition ("and if it closed"), not "whether it closed".
  - "כטובה" is clumsy.
  - The feedback sentence duplicates step 04 word for word (rules 12, 31).

  The FAQ should answer "how do I know": the list and the report. Step 04 keeps the mechanism.
  `כל פנייה מדף הנחיתה, בטופס, בשיחה או בוואטסאפ, נכנסת לרשימת הפניות שלך. בדוח השבועי אתה רואה כמה פניות הגיעו ומה עלתה כל פנייה. אף אחד לא יכול להבטיח מספר פניות מראש.`
- **#8 step 01 desc — FIX.**
  - The desc repeats the title's "מתחיל מ" (rule 1).
  - Title and desc call the service two different things: "המשתלם ביותר" and "המרכזי עם ההזדמנות הגדולה ביותר".
  - "ההזדמנות הגדולה ביותר" is an abstract noun (rule 13).
  - "חשבון ישן" sounds as if he has an old account to throw away.

  `החשבון רשום על שמך, ו-Ads Bot בונה אותו מאפס בלי לגעת בחשבון שכבר יש לך. הוא מתחיל משירות אחד, זה שהכי משתלם לך לפרסם.`
- **#9 step 01 title — FIX.** Rule 32: the first action is opening the account, and the title should be in the same subject + present-verb form as the other steps.
  `Ads Bot פותח לך חשבון חדש`
  The steps now read in time order: opens account → builds campaigns → you pay → you mark leads → you can cancel.
- **#10 — DROP confirmed.** Make sure the tags deletion ships in the same commit. Otherwise step 01 still shows "Google Ads Audit", which contradicts fact 2.
- **#11 step 02 — DROP.** It only adds a repeat of "החשבון החדש שנפתח בבעלותך". The original "לחשבון Google Ads שלך" is correct, since the new account is his.
- **#12 step 03 — FIX (VAT only):**
  `אתה משלם ל-WAO ₪249 + מע״מ לחודש. את תקציב המודעות, לפחות ₪1,500 לחודש, אתה משלם ישירות לגוגל מחשבון Google Ads שלך.`
- **#13 step 04 desc — FIX.** The current version has these problems:
  - The title "אתה מקבל דוח שבועי" no longer matches the desc.
  - "אמיתית" breaks rule 19.
  - "מסמן כעבודה" is a calque.
  - It duplicates FAQ 4.
  - Fraud Blocker and the weekly report repeat card 4 (rule 31).

  This step now owns the selling-point mechanism:
  `ליד כל אחת אתה מציין אם היא רלוונטית ואם היא נסגרה. Ads Bot מכוון את הקמפיינים לפי זה ומעביר את המידע לגוגל, שלומד אילו חיפושים מביאים עבודה.`
  This needs the new step 04 title in added patch A.
- **#14 hero — FIX.** It is the right place for the selling point, and its "X, not Y" is the page's only one (rule 28).
  - 🟠 "מסמן כעבודה" is a calque.
  - The bare closing fragment "ב-₪249 + מע״מ לחודש." doesn't stand as a sentence.
  - "ומכוון לפי" is missing its object.

  `כבר שילמת על קליקים ולא ידעת מה יצא מזה? Ads Bot פותח חשבון Google Ads חדש על שמך, ומכוון את הקמפיינים לפי הפניות שהפכו אצלך לעבודה, לא רק לפי קליקים. וזה עולה ₪249 + מע״מ לחודש.`
  This is the hardest-landing spot and it is said once, proudly, with no competitor and no numbers. Tamar may polish "שהפכו אצלך לעבודה".
- **#15, #16 — KEEP.** Refunding ₪249 + מע״מ is consistent with the price.
- **#17 card "החשבון והנתונים שלך" — FIX (🤖 cut).** The weekly-report line repeats FAQ 4. The card is about ownership, and the deletion changes no fact:
  `חשבון Google Ads, הקמפיינים והנתונים שייכים אליך. WAO מנהלת אותם דרך חשבון ניהול, ויש הסכם בכתב.`
- **#18 CTA eyebrow — FIX.** Three problems:
  - "איפה ההזדמנות" is abstract (rule 13).
  - The body repeats it word for word.
  - "לפני שאתה מוסיף תקציב" still implies topping up his existing account.

  `לפני שאתה מוציא עוד שקל על מודעות`
  This is new wording, so Tamar may refine it.
- **#19 CTA h2 span — KEEP.** It matches the brief: the call looks at his current setup.
- **#20 CTA body — FIX.** The current body has these problems:
  - It repeats the h2 ("מסתכלים על מה שיש לך היום", "30 דקות") and the eyebrow (rule 1).
  - 🟠 "אם אתה ממשיך" is the wrong conditional tense and should be "אם תמשיך".
  - "בחשבון חדש על שמך" is the 3rd+ mention of the new account (rule 12).
  - "פרופיל" with no context is vague.

  `בשיחה חינם נעבור יחד על הפרסום, האתר והפרופיל שלך בגוגל, ונגיד לך מאיפה כדאי להתחיל. אם תמשיך, Ads Bot בונה הכול מאפס.`
  The call may look at his current setup, and the service is still a fresh build. Facts hold.
- **#21 — KEEP.**

## Added patches

- **A (needed with #13) — step 04 title.** It occurs once.
  `אתה מקבל דוח שבועי` → `אתה מסמן את הפניות`
- **B (🤖 cut, optional, rule 31 + jargon) — card "מה Ads Bot עושה".** Optimisation is now step 04's point.
  `הבוט מקים קמפיינים, מודעות ודפי נחיתה, מבצע אופטימיזציה ושולח דוח שבועי.` → `הבוט מקים קמפיינים, מודעות ודפי נחיתה ושולח דוח שבועי.`

## Facts check (after FIXes)

| Fact | Status |
|---|---|
| ₪249 + מע״מ wherever the fee appears | Yes: title, meta, OG, both schemas, FAQ 1, refund FAQ, step 03, card 1, refund card, reassurance line, hero |
| Service is a new account, never a fix of the current one | Yes: hero, step 01, CTA "מאפס" |
| Free call may look at his current setup | Yes: CTA |
| Starts with the main service | Yes: step 01 |
| Marked leads go back to Google | Yes: step 04 |
| Weekly report = leads + cost per lead | Yes: FAQ 4 |
| No promised lead counts, no results guarantee | Yes: FAQ 4 keeps the no-promise line, refund wording is service-fee only |

The new-account phrase now appears twice (hero, step 01), plus "מאפס" in the CTA. The lead-feedback sentence appears once (step 04).

## Flags (pre-existing, not part of this pass)

- **🟡 Tamar:**
  - Hero button "בדוק את מסלול ה-Ads Bot ←" uses the product name with a definite article (rule 33).
  - The CTA verbs are mixed: imperative בדוק/דבר vs future-imperative תראה (rule 18).
  - Step 05 uses a modal form ("אתה יכול") against the other steps.
  - Step 03 covers the same ground as FAQ 1 and cards 1 and 2 (rule 31).
- **STATS:** the array still has an ASCII geresh in "בנצ'מרק". It is being deleted, so this is moot if it ships deleted.

## Handoffs

- **Yonatan:** "לחודש" in the title (#0) and the meta length at about 158 chars.
- **Eitan-Dev:** apply the patch set; keep the tags deletion in the same commit; the Offer VAT/monthly `priceSpecification` (with Yonatan's OK).
- **Tamar (optional):** polish of #14 "שהפכו אצלך לעבודה" and #18.

## Writing upgrades (proposed, for Adam)

1. When a settled fact changes, state it in the one section that owns it. Elsewhere keep the existing neutral wording rather than restating the new fact.
2. When a step's description changes, its title must change with it so both describe the same action.
3. Conditionals the reader controls take the future tense, not the present.
4. Don't use the "whether X, Y or Z" construction. List the options plainly, or use a preposition per option.

Files: before /tmp/claude-1000/-home-eitanya-wao/1553f1ef-8011-4106-a89a-7298f7a4acec/scratchpad/rw/google-ads.final.page.tsx, after /tmp/claude-1000/-home-eitanya-wao/1553f1ef-8011-4106-a89a-7298f7a4acec/scratchpad/rw/google-ads.facts.page.tsx, patches /home/eitanya/wao/docs/copy/google-ads-facts-pass-2026-11-12.waocopy.json. Nothing was edited.
