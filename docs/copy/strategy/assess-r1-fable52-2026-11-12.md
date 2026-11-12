# Round 1 assessment: /site-bot and /google-ads (Fable 5.2, 2026-11-12)

**Both pages go to ROUND-2, and round 1 did not test the new rulebook.** `docs/copy/writing-upgrades.md` is broken, so Tamar received the old 27 prohibit-only rules and none of the 18 selling rules.

- **What broke:** the new block was pasted into the intro sentence (lines 4–48), which quotes the heading mid-line. The real `## Approved rules` heading (line 50) still holds the old 27 bullets.
- **Check:** I ran the loader's regex on the file as it stood at 09:11, before both runs (09:22, 09:31). It matches at line 50 and sends 27 bullets, with no `### Selling rules` group.
- **What was live:** the brief, the charter, the priority line, the Sabra line and `--page` mode. The priority line pointed at "the selling rules", which were not in the prompt.
- **What this means for the scorecard:** it shows where the output stands against the 18 rules, but no failure below proves a selling rule misfired. Round 2 is their first real test, so expect a round 3.

I changed no files; the edits in section 3 wait for approval.

## 1. Scorecard

### /site-bot (judged against the new positioning)

| # | Rule | Score | Evidence |
|---|---|---|---|
| 1 | One big idea | FAIL | The triad decays to `האתר, פרופיל גוגל והעדכונים` (close, alternatives row 4, hero subhead). Reviews drop out and "updates" takes their seat. |
| 2 | Desire first | PARTIAL | The h1 leads with an outcome; the subhead lands on `בונה לך אתר, מטפל בפרופיל גוגל ובעדכונים`. |
| 3 | Hero is a sale | FAIL | One 30-word subhead carries scene, features and price. Nothing says why this differs from what he has tried. |
| 4 | Scene | PARTIAL | `רואה כרטיס חסר או אתר מת` has no place or time. The letter's `הוא מתקשר. אליו. לא אליך.` was lost in the cut. |
| 5 | Conviction | PARTIAL | `זו הבחירה הכי טובה לעסק של אדם אחד.` is flat and good. Against it: `אצל רוב בעלי המקצוע הוא גם נמוך…` and `לא מבטיחים קסמים`. |
| 6 | Checkable line | FAIL | See the violations list below. |
| 7 | Name the enemy | PARTIAL | `מתכנת, משרד פרסום או האחיין` works. The real enemy under the new positioning, a website on its own, is absent. |
| 8 | Dramatise the mechanism | FAIL | `פרטים, שעות ושירותים נשארים מסודרים` and `האתר מאוחסן ומתוחזק אצלנו` name capabilities; no moment. |
| 9 | Proof | PARTIAL | `הבדיקה עצמה היא ההדגמה` is right. The section heading `לא מבטיחים קסמים. מראים עבודה.` undercuts it. |
| 10 | Specific | FAIL | `נוכחות` six times; `הלקוח רואה אמון`; `מסדרת איך לקוחות מוצאים אותך`. |
| 11 | Argue the price | PARTIAL | `המחיר הזה מחליף הצעת מחיר גדולה, ערבים מול בונה אתרים…` argues. Half of the block is then cancellation mechanics. |
| 12 | Objections | PARTIAL | Nephew and builder are covered. "A site won't bring me work" is never answered, and it is the main one. |
| 13 | Risk reversal | PARTIAL | `אם זה לא מתאים, אתה לא תקוע.` is good, but it follows `הביטול נכנס לתוקף בסוף החודש ששולם`. |
| 14 | Caveats in FAQ | FAIL | The letter spends two of eight paragraphs on exit terms and `אנחנו לא מבטיחים לך מקום ראשון בגוגל`. |
| 15 | Inclusions as gains | FAIL | Eight equal cards. `אחסון ותחזוקה` and `שינויים בהודעה` weigh the same as reviews. |
| 16 | Sections pull forward | FAIL | Label headings (`פרופיל גוגל מעודכן`); no section ends with a pull. |
| 17 | One action | PARTIAL | The button is consistent and names what he gets. The close dilutes: `יש שתי דרכים להתחיל, והבחירה בידיים שלך`. |
| 18 | Relief and pride | PARTIAL | `אתה איש מקצוע טוב.` passes. `העבודה שלך בסדר` is faint praise, translated from my brief's "his craft is fine". |

**Hero 5-second test: FAIL.** He gets a website built for him, plus profile upkeep and updates, for ₪199. The first screen gives no reason to believe it, and it reads as the small site builder Eitan ruled out.

**Sabra voice: 3/5, FAIL.** The letter passes; the fields that would ship do not.
- **Most native:**
  - `הוא מתקשר. אליו. לא אליך.`
  - `לא פרויקט שמתחיל ולא נגמר`
  - `אם זה לא מתאים, אתה לא תקוע.`
- **Least native:**
  - `גם ביקורת קשה לא נתפסת כמו פאניקה` (not Hebrew)
  - `כל תקלה… שורפים עליך` (broken)
  - `זה לא קורה כי המקצוענות שלך חלשה. זה קורה כי הנראות שלך לא עובדת בשבילך.` (English "it's not X, it's Y" cadence on two abstract nouns)
- **Calques from the English brief:**
  - `במרחק הודעה אחת ממך` ("one message away")
  - `תוצאה גולמית` ("raw output")
  - `בלי ערבים` ("his own evenings")
  - `מתחברים… כמנהלים, ואתה נשאר הבעלים` (fact-sheet line, word for word)

**Fact-sheet violations**
- **`לוקח דקה`:** not in the fact sheet. It has two sources: my brief said "in a minute", and the voice exemplar contains `זה לוקח דקה`.
- **`בלי הרשמה`:** not in the fact sheet.
- **`נוכחות שמביאה אותו אליך כל חודש`** (hero option 1): a promised result.
- **`מבקשים מלקוח מרוצה להשאיר ביקורת… בלי שתצטרך להיזכר בזה`:** wrong about who asks. In `src/lib/crm/reviewFlywheelCopy.ts`, WAO hands the owner a ready message to forward and never messages his customer. That file is also marked placeholder, do not ship.
- **`דוח חודשי בשיחות ופניות`** and **reviews plus call button on the site:** both come from the brief's flow, not the fact sheet.
- **`אם משהו משתבש, אנחנו מטפלים`:** a maintenance commitment that is not listed.
- **Existing-site FAQ answer:** invented. Tamar flagged it herself.

**Best hero: none ships.** All three share one skeleton, one badge, one button and one note, and `fields.hero.h1` is a fourth variant that appears in none of them. The only material worth carrying forward is option 2's `שהגוגל שלך עובד בשבילך`: it is a real Sabra coinage and points at Google, not at a site.

**Against the previous draft:** better (outcome h1, a scene, an alternatives table), but it is still a list of inclusions with a price.

### /google-ads

| # | Rule | Score | Evidence |
|---|---|---|---|
| 1 | One big idea | PARTIAL | `שלומד מהעבודות שאתה סוגר, לא מקליקים` holds at the top and middle. The close drops it for `יש שתי דרכים פשוטות`. |
| 2 | Desire first | PASS | Outcome, then mechanism, then price. |
| 3 | Hero is a sale | PASS | Weakness: the price appears in both subhead and badge, and nothing says "a fraction of an agency". |
| 4 | Scene | PARTIAL | `הקליקים הגיעו. העבודה לא.` is strong. The body hedges three times with `אולי` and has no moment. |
| 5 | Conviction | PARTIAL | `החשבון שלך. נקודה.` against `יכול להרגיש כמו מכונת קליקים` and `אנחנו לא מבטיחים תוצאות. יש כאן שקיפות.` |
| 6 | Checkable line | PARTIAL | See below. |
| 7 | Name the enemy | PARTIAL | The letter's `ואז אמרו לך שצריך עוד תקציב או עוד זמן` is an insider detail, softened to `אולי שמעת` in the field. Eitan's point about cheap agencies and clicks is never said flat. |
| 8 | Dramatise the mechanism | PARTIAL | The moments are two-word labels (`פנייה נכנסת`, `אתה מסמן`) over bare description. No day, no gain. |
| 9 | Proof | PARTIAL | The demo works. The Partner card is four sentences of credit disclaimer. |
| 10 | Specific | PARTIAL | `כמה פניות הגיעו, כמה סימנת כרלוונטיות, ומה כל אחת עלתה` is good; `פניות, סימונים ועלות` is not. |
| 11 | Argue the price | PARTIAL | The anchor is stated and then merely repeated: `כאן התשלום לנו הוא 249 ₪… והתקציב שלך הולך לגוגל`. Nobody says "six times". |
| 12 | Objections | PARTIAL | "A bot instead of a person" is answered only in the FAQ. |
| 13 | Risk reversal | PARTIAL | `אנחנו לא כובלים אותך. אנחנו צריכים להצדיק את החודש הבא.` is the best line of the round. The refund reads as procedure. |
| 14 | Caveats in FAQ | FAIL | `אין סכום קבוע, ואנחנו לא מבטיחים שגוגל תאשר אותו` twice in the body; `בכפוף לבדיקות של גוגל` in a step; `גובים אותו מרגע ההרשמה`; buyout terms in the ownership block. |
| 15 | Inclusions and bonuses | FAIL | The credit carries four qualifying clauses and is filed under proof. |
| 16 | Sections pull forward | PARTIAL | Two claim headings; `מה הבוט עושה בשבילך` and `ככה אנחנו מתחילים` are labels. |
| 17 | One action | PASS | |
| 18 | Relief and pride | PASS | |

**Hero 5-second test: PASS.** He gets Google ads that learn from the jobs he closes for ₪249 a month, and he believes it because he marks the enquiries himself and sees every one and every shekel.

**Sabra voice: 3.5/5, narrow PASS.** Headings and letter are hers; the offer block and FAQ are the fact sheet in Hebrew letters.
- **Most native:**
  - `אנחנו צריכים להצדיק את החודש הבא.`
  - `החשבון שלך. נקודה.`
  - `איתן, לא מספר חסוי`
- **Least native:**
  - `התנאים הם קצב מודעות של 1,500 ₪ לחודש, החזר אחד לעסק, ובקשה תוך 7 ימים` (unintelligible; "ran at the ₪1,500 pace" translated)
  - `מהשירות שמשלם לך הכי טוב` ("pays him best")
  - `הבוט מבצע את הפעולות החוזרות` (office memo)
- **Also:** `יכול להרגיש כמו` ("can feel like") and `לבדוק לפני כסף`.

**Fact-sheet violations**
- **Launch approval:** `רק אחרי האישור שלך הקמפיין עולה לאוויר` is a process commitment not in the fact sheet.
- **Credit FAQ:** `האם אני זכאי לזיכוי מגוגל?` is answered `כן, אם…`. That opens as a promise of the credit, which is a hard line. Dror should see it.
- **Anchor:** all three uses drop "a month" (`סביב 1,500 ₪ לפני מע״מ`).
- **Hero option 3:** `בלי תשלום קבוע לסוכנות` sits oddly beside our own fixed monthly fee.

**Duplication** (a rule against it was loaded and lost to my field map)
- The budget-guard sentence appears verbatim in the mechanism list and the "does" list.
- The weekly-report sentence appears three times and the credit paragraph twice.
- `איתן יכול להסתכל` appears five times.
- `אתה רואה קליקים ועלויות בכל רגע` appears four times.

**Best hero: option 1, with one graft.**
- Keep its h1 and the first two subhead sentences.
- Replace the bare price tail with hero 3's agency contrast in one clause, adding "a month".
- Keep the badge as the price. Hero 3's refund badge would put the refund in the hero without its conditions beside it.
- Hero 2 is the ownership lead the plan already rejected.

## 2. Verdict

- **/site-bot: ROUND-2, new brief.** This is not a polish: the big idea is the wrong product.
- **/google-ads: ROUND-2, tightening pass.** The spine and hero are right. The caveats, duplication and translated offer block are fixable in one round.

## 3. Instruction tweaks

**Step 0 — repair `writing-upgrades.md` (blocker)**
- Restore the three intro lines from HEAD (the loader sentence, "rules must stay abstract", "add a rule only after approval").
- Put the 35 new rules under the real `## Approved rules` heading and delete the old 27.
- Keep one `## Log`.
- Engineer: make `waocopy.mjs` print the rule count to stderr, and abort in `--page` mode when no `### Selling rules` heading was loaded.

**Rule edits** (the count stays at 35)

| Rule | Change | Evidence |
|---|---|---|
| Craft: "Replace abstract nouns (direction, presence, place online)…" | Delete the parenthesis. | This rule was loaded, and `נוכחות` appears six times. The example was absorbed as vocabulary. |
| Selling: "The checkable line" | Add to the list of checkable things: "what a step or a free tool requires of him or commits us to". | `בלי הרשמה`; `רק אחרי האישור שלך`. |
| Craft: FAQ rule | Add: "When the honest answer is no, open with what he does get and give the no in one clause." | `אני אהיה ראשון בגוגל?` → `לא.` on a page that sells exposure; `אתם מבטיחים לי פניות?` → `לא. אנחנו לא מבטיחים…`. |
| Selling: "Inclusions and bonuses are gains" | Add: "Group what he gets into a few gains ordered by what brings him work; upkeep items share one line." | Eight equal cards, hosting level with reviews. |
| Craft: "Don't repeat the same wording" | Add: "No sentence and no list of items appears twice on a page." | The four duplications above. |

The parentheses in "Desire first" and "Conviction" carry the same leak risk. Round 1 cannot prove it because they were never sent; I would strip them anyway.

**Preamble edits (`systemPrompt`)**
1. **Add, after the Sabra line:** "The brief is written in English as information only. Never carry its sentence shape, idiom or word order into Hebrew. Take the fact and say it the way he would."
   Evidence: every least-native line above traces to a brief sentence.
2. **Add:** "Lines in the brief that say what not to state or claim are omissions. Leave the subject out; never announce the limit in the copy."
   Evidence: `אנחנו לא מבטיחים תוצאות`, `לא מבטיחים קסמים`, and the credit disclaimers.
3. **Replace the `--page` line "First write the whole pitch…" with:** "First write the letter in full: it must contain every section the brief lists, at the length a page needs. Then cut fields out of it, keeping its strongest sentences word for word. A field never says less, or says it flatter, than its passage in the letter."
   Evidence: the /site-bot letter is 1,219 characters against roughly 9,000 of fields. The fields were written separately from the fact sheet, and the letter's best lines never reached them.
4. **Replace "heroes holds exactly three options with genuinely different angles" with:** "heroes holds exactly three options that make different promises, not one promise reworded; each has its own badge and button note. `fields.hero.*` repeats the one you recommend; say which and why in `angle`."
   Evidence: three /site-bot heroes with identical badge, button and note, plus a fourth h1 in the fields.
5. **Exemplar header, add:** "Facts, durations and disclaimers in these examples belong to that tool. None transfers."
   Evidence: `זה לוקח דקה` is in the exemplar, and `לוקח דקה` is in all three heroes.

## 4. Round-2 brief deltas

### Both briefs
- **Split the fact sheet in two:** "Facts you may state" and "Never mention (silent)".
- **Write facts as bare data, no idioms.** Replace "one message away", "pays him best" and "at the ₪1,500 pace". Dror should restate the last one in plain terms.
- **Add a keep list** of Tamar's own round-1 lines to carry over verbatim (the most-native lines above). This is the cheapest way to protect her voice.
- **Fix one price format** (round 1 has `₪199` and `249 ₪`).

### /site-bot — new brief

**Big idea.** A website alone does not get you called. A customer judges you on three things in the same ten seconds: a site that lays out every service you do, your Google profile, and what your customers wrote. Site Bot builds and runs all three as one system that tells one story, every month, for the one-man business that lives on Google.

**Enemy.** The website on its own, which is what everyone else sells him.

**Hero direction.**
- **h1:** the head term `בניית אתר לעסק קטן`, then a turn saying the site is one part of three. Yonatan signs. He should also say whether the head term can sit inside a sentence that subordinates it.
- **Starting point:** option 2's "your Google works for you".
- **Subhead:** names the three parts in one breath. The words "updates" and "hosting" do not appear in the hero.
- **Button:** the free check. It fits the idea exactly, since it shows him the three things as customers see them today.
- **Button note:** only facts Adam confirms.

**Flow.**
1. **Scene.** The customer's ten seconds: the map with stars, the review text, the site. He is chosen or skipped before any call.
2. **The claim, biggest type.** Three parts, one story.
3. **The site as his tree of services.** A page for each thing he does, the way customers search for it. No page count.
4. **The Google profile matched to the site.** Same services, areas and hours. We manage; he stays the owner.
5. **Reviews.** After a job he gets a ready message to forward, and we draft replies. The copy must say he forwards it.
6. **Every month.** It keeps running, with the report. Hosting and changes-by-message share one line here and are never cards.
7. **Alternatives.** Each one gives him a single piece. Add a row for "just a Google profile".
8. **Price.** Three jobs that are normally bought separately, for one small job's worth.
9. **Proof.** The free check, Eitan, the human check.
10. **FAQ.**
11. **Close.** Returns to the three-part idea.

**FAQ.**
- Replace "Will I be first on Google?" with "What do you actually do so I show up?"
- Drop the existing-site answer until there is a fact for it.

**Fact sheet [CONFIRM before the run].**
- How long the free check takes and whether it needs signup.
- Whether the review-request flow is live for Site Bot (the code says placeholder).
- What the monthly report contains.
- Whether reviews and a call button render on the site.
- One dated line from Yonatan on why a page per service plus a matching profile matters. This is a checkable claim about Google.

**Product-truth risk (Adam and Eitan decide).** The 2026-11-11 core-30 review found service pages with almost no body, no link from site to profile, and hours missing from output (G2, G5, G6). The copy may describe the method. If the page ships before those close, the first prospect who opens a client site sees the contradiction.

### /google-ads — tightening
- **Anchor:** move it into the fact sheet with "a month", and allow "about six times" (Dror's own arithmetic).
- **Hero:** develop option 1 with the agency-contrast graft.
- **Field map:** the mechanism is three moments of the learning loop only, each with a day and a gain. Budget guard, report and Eitan live only in the "does" list.
- **Credit:** one body sentence with one qualifier (Google decides). Eligibility goes to the FAQ, and the FAQ answer must not open with yes.
- **Proof:** take the credit out. The Partner card needs one confirmed fact about what the status means.
- **Scene:** one dated moment with no "maybe". Restore the "more budget or more time" line.
- **Eitan's point:** state it flat as an opinion about the category: cheap management chases clicks.
- **Offer block:** "charged from signup" and the buyout terms move to the FAQ. The refund is written as pride, with its conditions in one plain line that a tradesman can parse.
- **Steps:** confirm whether he approves ads before launch. Google's verification is FAQ only.
- **FAQ:** replace "Do you promise enquiries?" with "How do I know it will bring me work?"
- **Close:** returns to jobs-not-clicks.