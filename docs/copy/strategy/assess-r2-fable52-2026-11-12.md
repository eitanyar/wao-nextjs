# Round 2 assessment: /site-bot and /google-ads (Fable 5.2, 2026-11-12)

**Both pages: SHIP-TO-NOA, after one short Tamar patch pass (`--patches`) on the fields listed in section 4. No round 3.** Both are clearly better than round 1. /google-ads now sells. /site-bot sells the right product for the first time, but three of its body sections are still the fact sheet in Hebrew.

This doc is not saved: the write to `docs/copy/strategy/assess-r2-fable52-2026-11-12.md` was denied, so the full text is below. I changed no files.

**Setup verified.**
- `writing-upgrades.md`: the loader's regex matches once and returns 35 bullets under both group headings (18 selling, 17 craft). All five round-1 rule edits are in.
- `waocopy.mjs`: all five preamble edits are present (English-brief line, omissions line, letter-first line, three-promises heroes line, exemplar header), plus the rule-count print and the `--page` abort.
- Round 2 is therefore a real test of the rulebook.

## 1. Scorecard

### /site-bot

| # | Rule | Score | Evidence |
|---|---|---|---|
| 1 | One big idea | PASS | Top `מדברים בקול אחד`, middle `שלושה חלקים. סיפור אחד.`, close `משדרים אותו דבר`. Reviews no longer drop out. |
| 2 | Desire first | PARTIAL | The h1 describes the product (`שמחובר… במערכת אחת`); the outcome waits for the subhead. `parts.profile.body` opens on ownership: `אנחנו מתחברים כמנהלים, ואתה נשאר הבעלים.` |
| 3 | Hero is a sale | PARTIAL | What he gets and what to do are clear. Why it differs is only implied, and nothing says "one-man business". |
| 4 | Scene | PARTIAL | A real moment, but `בעל מקצוע באזור` has no trade, place or time, and `הוא מתקשר. אליו.` points at nobody: no competitor was introduced. |
| 5 | Conviction | PASS | `זו הבחירה הכי טובה לעסק של אדם אחד`. No "we don't promise" anywhere. |
| 6 | Checkable line | PARTIAL | Three small inventions, listed below. |
| 7 | Name the enemy | PASS | `כנראה ראית אתר שעומד לבד`; `כל אחד נותן לך חלק אחד`. |
| 8 | Dramatise the mechanism | PARTIAL | Site: `פתיחת סתימה, החלפת דוד, איתור נזילה` is concrete. Profile and reviews are capability descriptions with no moment and no gain: `השירותים, האזורים, השעות והתיאור בפרופיל תואמים לאתר.` |
| 9 | Proof | PARTIAL | `תראה את זה על העסק שלך` is right. The Eitan card is a CV line: `הוא עוסק בשיווק דיגיטלי מאז 2006.` Google's own advice appears only in the FAQ. |
| 10 | Specific | PARTIAL | The plumbing jobs against `תמונה ברורה ומדויקת` and `הבחירה הבטוחה`. |
| 11 | Argue the price | PARTIAL | The heading argues (`שלוש עבודות, מחיר של עבודה קטנה`). The body's first sentence is broken Hebrew and the argument is three sentences long. |
| 12 | Objections | PARTIAL | "A site won't bring me work" gets the best answer on the page. "No time" and "not technical" appear only in the close. |
| 13 | Risk reversal | PARTIAL | One kept line, `אם זה לא מתאים, אתה לא תקוע.` No pride around it. |
| 14 | Caveats in FAQ | PASS | The body is clean. One volunteered negative: `אנחנו לא פונים ללקוחות שלך.` (my fact sheet put it there). |
| 15 | Inclusions as gains | PARTIAL | Grouping is fixed: three parts, upkeep in one line. They are still written as features. |
| 16 | Sections pull forward | PARTIAL | Headings are claims, except `פרופיל גוגל שלך מסונכרן עם האתר`. No section ends with a pull. |
| 17 | One action | PARTIAL | One action throughout, but the label changes person and verb: `בדוק את העסק שלי בחינם` at the top, `בדוק איך הלקוח רואה אותך` at the close. |
| 18 | Relief and pride | PASS | `אתה איש מקצוע טוב.`; `ואתה פנוי לעבודה`. |

**Hero 5-second test: narrow PASS.** He gets a site, his Google profile and his reviews run as one thing for ₪199 a month, and he can check his business free by typing its name. It no longer reads as a small site builder. Two weaknesses: the h1 is a feature description, and nothing tells him it is built for a one-man business.

**Sabra voice: 3.5/5, narrow PASS.** Headings, alternatives and FAQ are hers. The three "parts" bodies and the stamp are not.
- **Most native:**
  - `אם אמרת שאתר לא מביא עבודה, כנראה ראית אתר שעומד לבד.`
  - the "nothing" row: `כלום` → `שקט.`
  - `הדומיין ופרופיל גוגל נשארים שלך גם אם נפרדים.`
- **Least native:**
  - `אתר, ניהול פרופיל גוגל ואיסוף ביקורות עולים בדרך כלל שלושה ספקים.` (broken: "cost three suppliers")
  - `הבנייה הסופית בשלבים אחרונים` (tautology, and it sounds like a building-site notice, not a launch)
  - `על כל עבודה שאתה עושה יש עמוד משלו` (wrong preposition and gender)
- **Calques and wrong terms:**
  - `אירוח כלול`: "hosting" translated as hospitality. Round 1 had the right word.
  - `ביקשו הכוונה`: not the term Google shows him for directions.
  - `נוגע באתר` ("taps the site").
  - `מתחברים כמנהלים, ואתה נשאר הבעלים`: the same fact-sheet calque I flagged in round 1, unchanged.
  - `טיוטת תשובה לאישור לפני שהיא מתפרסמת` (office memo).

**Fact-sheet violations**
- **`faq[2]`:** `הספירה מתחילה אחרי שהתשלום עבר והפרטים התקבלו`. "And the details were received" is invented. I asked for "when the clock starts" and gave no fact beyond "of payment".
- **`faq[5]`:** `חלקם נעזרים בבינה מלאכותית`. "Some of them" is invented; the fact sheet has no AI line at all (my gap).
- **`proof.items[1].title`:** `איתן, מייסד המערכת`. The fact is founder of WAO.
- **`parts.reviews.h2`:** `הביקורות מגיעות אחרי העבודה` implies reviews will arrive. What we do is send him the request.
- **`parts.site.body`:** `כל עמוד… כולל שעות פתיחה, כפתור שיחה, קישור… וביקורות`. The fact says the site shows these, not every page.
- **Hero 2 button:** `תראה לי את החלקים החסרים` promises more than the check delivers (it shows the profile only). Not in the recommended hero.

**"Never mention" leaks: none.** No rankings, page counts, competitor prices, "forever", WhatsApp, "website builder", migration or clients.

**Yonatan's rules**
- **h1 (`fields.hero.h1`, 59 chars):**
  - Passes: head term byte-exact and first, all three parts named, the system idea present, no Latin, no price, no shrinking.
  - **Fails one rule as written:** the verb must agree with `בנייה`, and `שמחובר` is masculine. Worse, the clause can attach to `עסק קטן` ("a small business that is connected"). Tamar must fix; Yonatan signs.
- **Hero 2 h1:** names "Google", not the profile, and says the site connects the site.
- **Hero 3 h1:** names none of the three parts. Fails.
- **Title (44 chars):** passes every rule: head term first, `גוגל` in Hebrew, ends on a Hebrew word, no price.

**Duplication:** no sentence repeats verbatim. Two soft repeats:
- The report's four items are listed in `monthly.body` and again in `faq[7].a`.
- `האתר, הפרופיל והביקורות` appears twice inside `close.body`.

**Best hero: option 1, as in the fields.** Take nothing from options 2 and 3 except this: option 2's badge idea (less than one small job) is the price argument the hero lacks. It can replace `בלי התחייבות` in the badge if Eitan prefers argument over reassurance.

### /google-ads

| # | Rule | Score | Evidence |
|---|---|---|---|
| 1 | One big idea | PASS | h1, mechanism and close all carry it. One drift: the promise is jobs, and two headings say enquiries (`שהופכים קליקים לפניות`). |
| 2 | Desire first | PASS | |
| 3 | Hero is a sale | PASS | The agency contrast landed: `במקום ריטיינר של משרד — ₪249 + מע״מ בחודש.` The price then repeats in the badge. |
| 4 | Scene | PASS | `בחודש שעבר…` then `ואז אמרו לך שצריך עוד תקציב או עוד זמן.` No "maybe". |
| 5 | Conviction | PASS | `זו לא עבודה. זו שיטה שסופרת קליקים ומקווה שמישהו יתקשר.` |
| 6 | Checkable line | PARTIAL | See below. |
| 7 | Name the enemy | PARTIAL | Said flat, but the word is wrong for us: `ניהול זול רודף אחרי קליקים` sits on a page that boasts of costing a sixth. See section 4. |
| 8 | Dramatise the mechanism | PASS | `יום שני, בין עבודה לעבודה — אתה מסמן`, ending `אתה לא צריך לשבת על הקמפיין בלילות.` |
| 9 | Proof | PARTIAL | `אתה לא צריך להאמין לנו. אתה יכול לבדוק.` is the right heading. The Partner card states its fact as a weakness: `הסטטוס הזה אינו קבוע`. |
| 10 | Specific | PASS | `לא מוקד, לא שלוחה, לא מישהו שמעביר הלאה.` |
| 11 | Argue the price | PASS | `בערך פי שישה מאיתנו, ושם זה רק מתחיל.` |
| 12 | Objections | PARTIAL | "₪1,500 is a lot" is not answered; the minimum is stated as bare information. |
| 13 | Risk reversal | PASS | `אנחנו צריכים להצדיק את החודש הבא — לא לנעול אותך לשנה.` |
| 14 | Caveats in FAQ | PARTIAL | `offer.refund_terms` is two legal sentences (45+ words) in the body, including Google's hold days. Everything else moved out. |
| 15 | Inclusions and bonuses | PARTIAL | The credit is now one sentence with one qualifier, but it reads as a notice, not a win. The line that sells it sits only in the FAQ. |
| 16 | Sections pull forward | PARTIAL | Claim headings throughout; no section ends with a pull. |
| 17 | One action | PARTIAL | Same action, four different labels: `שיחה של 30 דקות עם איתן — חינם` / `דבר עם איתן 30 דקות — חינם`, `לראות דמו חינם` / `לבדוק את הדמו חינם`. |
| 18 | Relief and pride | PASS | |

**Hero 5-second test: PASS.** Ads that learn from the jobs he closes, he sees every enquiry and every shekel, ₪249 a month where an agency takes a retainer, and a free 30-minute call with Eitan.

**Sabra voice: 4/5, PASS.**
- **Most native:**
  - `הבוט עושה את העבודה השחורה. אתה מסמן.`
  - `לא מוקד, לא שלוחה, לא מישהו שמעביר הלאה.`
  - `אתה לא צריך להאמין לנו. אתה יכול לבדוק.`
- **Least native:**
  - `offer.refund_terms` in full, and `faq[3].a` (`הוצאת לפחות ₪1,500… בכל חודש` inside 30 days contradicts itself; `בלי פנייה מצידך`)
  - `הסטטוס הזה אינו קבוע, וגוגל בודקת מדי יום שהשותפה עומדת בדרישות` (formal negation; "the partner" in the feminine)
  - `האישור, הסכום והתנאים נקבעים על ידי גוגל` (passive with agent, which a loaded craft rule forbids)
- **Calques and wrong terms:**
  - `העמלה`: a commission, which implies a percentage. Elsewhere the same fee is `דמי הניהול`. Two names for one thing.
  - `גוגל מפסיקה לקנות תנועה` ("buying traffic"), and Google is not the buyer.
  - `אתה זכאי לבקשה` ("eligible to apply").

**Fact-sheet violations**
- **`hero.cta_note`:** `בלי טופס ארוך`. Nothing in the fact sheet about a form.
- **`proof.items[0].desc`:** `אתה רואה איך נראים חשבון, מודעה ודוח פניות`. What the demo shows is not in the fact sheet. Adam confirms or it goes.
- **`mechanism.moments[0].desc`:** `אתה רואה הכול מיד`. A duration.
- **Moment 3 title:** `יום חמישי… — התקציב זז`. Sunday to Thursday reads as "the budget moves within your first week". Tamar herself flagged that no frequency exists. My brief asked for a day on each moment; that was the error.
- **`faq[6].a` (credit):** does not open the way Dror specified ("Google decides, not us"); it opens on eligibility.

**"Never mention" leaks (results promises)**
- **`faq[7].a`:** `כאן המודעות מביאות פניות`. A flat promise of results. Must go.
- **`mechanism.h2`:** `שלושה רגעים שהופכים קליקים לפניות`. Borderline; Dror rules.
- No credit amount, no "approve every ad", no "certified", no "unconditional", no clients.

**Duplication:** no sentence repeats verbatim (round 1 had four). Three ideas still recur too often:
- Marking relevant/closed: moment 2, `start.steps[2]`, `faq[1]`.
- Fee versus budget: `offer.body`, `offer.policy_line`, `faq[0]`, `faq[8]`.
- The hero subhead, `scene.h2` and the first sentence of `scene.body` play the same beat (money out, clicks in, phone quiet) three times in two screens. Both lines were on my keep list.

**Best hero: option 1 with one graft.** Keep its h1, subhead and button. Replace the badge, which repeats the subhead's price, with option 2's badge (`חשבון על השם שלך`). The button note must hold only facts.

## 2. Verdict

| Page | Verdict | Against round 1 |
|---|---|---|
| /site-bot | SHIP-TO-NOA after a Tamar patch pass on 13 items | **Better.** Right product, the big idea holds from top to close, the enemy is named, no promised results, no caveats in the body, upkeep is one line. Still weak: profile and reviews sections are fact-sheet prose. |
| /google-ads | SHIP-TO-NOA after a Tamar patch pass on 12 items | **Better.** Caveats left the body, verbatim duplication is gone, the mechanism has real moments, the price is argued, the credit is out of proof. Still weak: the refund terms and the credit sentence. |

Why not round 3: every remaining fault is local to a field, and a full regeneration on Qwen would put the lines that now work at risk. A patch pass keeps them byte-exact.

## 3. Instruction tweaks

Two, both proven by round 2. The count stays 35.

**Craft rule: body versus FAQ**
- **Old:** `A fact, term or figure is stated once in the body, and precisely in the FAQ. A step list and a feature grid never cover the same items.`
- **New:** `A fact, term or figure is stated once in the body, briefly and as his gain. Its full list of items or conditions appears only in the FAQ. A step list and a feature grid never cover the same items.`
- **Evidence:** the report's four items in `monthly.body` and `faq[7]`; the refund's conditions in `offer.refund_terms` and `faq[3]`; fee versus budget four times. The old wording licenses the full list in both places and contradicts the neighbouring rule ("no list of items appears twice").

**Preamble: the `--page` letter line**
- **Old:** `This is a FULL REWRITE. First write the letter in full: it must contain every section the brief lists, at the length a page needs. Then cut fields out of it, keeping its strongest sentences word for word. A field never says less, or says it flatter, than its passage in the letter.`
- **New:** `This is a FULL REWRITE. First write the letter as one continuous spoken pitch to him: paragraphs only, with no headings, buttons, labels or lists, covering every section the brief lists, each paragraph ending on the thought that makes him read the next. Then cut fields out of it, keeping its strongest sentences word for word. A field never says less, or says it flatter, than its passage in the letter.`
- **Evidence:** in both outputs the letter is the fields stacked in order. Every field string appears in the letter verbatim, and the only letter text outside the fields is the FAQ heading. Tamar wrote the fields and called the stack a letter, so the letter did no work. No section on either page ends with a pull (rule 16 PARTIAL twice).
- **Priority:** not needed for the patch pass. Apply before the next `--page` run.

**No change needed, lessons for briefs only**
- **Dramatise the mechanism** fired where the brief asked for moments (/google-ads) and not where it did not (/site-bot profile and reviews). The rule is fine; the brief must ask per section.
- **The omissions line worked.** Zero "we don't promise" on either page. The one volunteered negative came from my "Facts you may state" list.
- **Keep lists** were pasted without their setup (`אליו` with no referent). Future keep lists should say "keep where its setup survives".
- **Heroes line worked.** Three different promises with their own badges and notes on both pages.

## 4. What goes to Noa

**Send Noa:** every key under `fields` in both files, after the Tamar patches below. Do not send `heroes[1]`, `heroes[2]` or `letter`. Noa's pass includes the SERP gate on `seo.title`; Yonatan then signs the /site-bot h1 and title.

**Fix one price format first (Adam, with Maya).** /site-bot writes `199 ₪`, /google-ads writes `₪249`. Pick one for the whole site.

### /site-bot: Tamar patches before Noa

1. **`hero.h1`:** make the relative clause agree with `בנייה` per Yonatan, so it can no longer attach to "small business". Offer Yonatan two forms.
2. **`hero.subhead`:** say who this is for (the one-man business). Keep the "one voice" clause as is.
3. **`launch_stamp`:** one confident line with the date. Remove the "final build in final stages" tautology; it should sound like an opening, not a delay.
4. **`scene.body`:** name a trade and a moment in place of "a tradesman in the area". Introduce the competitor before the kept three-beat line so `אליו` has someone to point at. Replace the "taps the site" calque.
5. **`parts.site.body`:** fix the first sentence's preposition and gender. Say the site shows hours, call button, profile link and reviews (not "every page"). End on his gain.
6. **`parts.profile.h2` and `.body`:** rewrite as a moment: what a customer sees when profile and site show the same services, areas and hours. Lead with the gain. Ownership becomes one short closing clause, in her words. Lose the "synchronised" jargon in the heading.
7. **`parts.reviews.h2` and `.body`:** the heading must not imply reviews arrive by themselves. Write the moment (job done, he forwards the ready message), ending on his gain. Move "we never message your customers" to `faq[6]`.
8. **`monthly.body`:** state the report as one gain; the four items stay in `faq[7]` only. Use the correct Hebrew word for hosting.
9. **`price.body`:** rewrite the broken first sentence and carry the "one small job" comparison into the body.
10. **`proof.items[1]`:** Eitan is WAO's founder. The description should say what his being reachable means for the reader, not his start year alone.
11. **`alternatives.rows[3].what_is_missing`:** the last clause is unclear; say plainly what is absent.
12. **FAQ fixes:**
    - `faq[2].a`: delete the invented clock condition (or Adam supplies the fact).
    - `faq[5]`: ask the question the way he would type it; drop "some of them" unless Adam confirms it.
    - `faq[7].a` and `monthly.body`: use the term Google's own app shows for directions.
13. **Close:** `close.body` names the triad once. `close.cta_primary` and `close.cta_secondary` are identical to the hero's labels.

### /google-ads: Tamar patches before Noa

1. **`hero.badge`:** replace the repeated price with option 2's badge. **`hero.cta_note`:** facts from the sheet only; no claim about a form.
2. **`scene.body`:** do not replay the subhead's beat. Open on a new detail of that month and go straight to the "more budget or more time" line.
3. **Mechanism:**
   - `mechanism.h2` and `.intro`: return to jobs; no "clicks into enquiries" result and no "Google buys".
   - `moments[2].title`: no weekday that implies the budget moves in the first week.
   - `moments[0].desc`: drop "immediately".
4. **Proof:**
   - `proof.items[1].desc`: turn the Partner fact into pride (Google re-checks us every day), in spoken negation, with all three requirements.
   - `proof.items[0].desc`: only what Adam confirms the demo shows.
5. **`offer.h2`, `offer.body`:** one name for our fee across the page, and not the word for a commission. Answer "₪1,500 is a lot": it is his money buying his ads, and none of it is ours.
6. **`offer.bonus`:** present it as a win we bring him. Move the "most owners never hear of it" idea up from the FAQ and keep the single qualifier.
7. **`offer.refund_terms`:** one short line with the three conditions. The clock, Google's hold days and "fee only" live in `faq[3]`.
8. **`offer.policy_line`:** drop the clause that repeats `offer.body`.
9. **`start.steps[2]`:** replace marking (already moment 2) with the real third start action: the account opens in his name and the ads go live after he has seen the plan.
10. **FAQ fixes:**
    - `faq[3].a`: rewrite so a tradesman can parse it; fix the "every month within 30 days" contradiction.
    - `faq[5].a`: open with what he gets, then the no in one clause.
    - `faq[6].a`: open the way Dror specified, in active voice.
    - `faq[7].a`: delete the results claim.
    - `faq[1]`: spoken question form; do not relist the marking steps.
11. **`close.cta_primary` / `close.cta_secondary`:** identical to the hero's labels.
12. **`close.body`:** see the decision below.

### Decisions and checks outside Tamar

- **Eitan or Adam: the word "cheap".** I briefed Eitan's point as "cheap management chases clicks", and Tamar wrote it faithfully. On a page whose price argument is "a sixth of an agency", it invites "so you are the cheap one". My recommendation: the enemy becomes management that reports clicks, with no price word. That was my brief error.
- **Dror:**
  - `mechanism.h2` (results framing);
  - the refund sentence that ties it to "not wanting to continue";
  - the credit FAQ: his shape wants "not a discount, not part of the fee" stated, while my "Never mention" list silenced both. He decides which holds.
- **Adam:**
  - what the demo shows;
  - when the /site-bot clock starts;
  - whether any AI line is a fact;
  - the visible profile link on generated sites is still NO in the truth check and is sold in `parts.site.body`.