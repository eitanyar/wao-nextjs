# /google-ads credit + verification lines: Noa QA/rebase (2026-11-12)

Saved by Adam from Noa's hand-back.

Noa: QA and rebase of the 3 credit/verification additions on /google-ads (2026-11-12)

All three `old` strings below come byte-exact from facts2 (/tmp/claude-1000/-home-eitanya-wao/1553f1ef-8011-4106-a89a-7298f7a4acec/scratchpad/rw/google-ads.facts2.page.tsx). I checked each one with Grep and each occurs exactly once. None of them is in the JSON-LD, so there are no duplicates to patch. I edited nothing.

## Patch 0: Google ad credit, moved from step 01 to the card "תקציب מודעות לגוגל"

Why I moved it:
- Tamar's version would make step 01 about 55 words, roughly twice the length of the other steps.
- Rule 32: an optional third-party benefit with three caveats is not a step action.
- Rule 31: the credit is about ad money, and this card owns the ad-money point. It also sits next to card 1 (₪249), so "not part of the ₪249" reads clearly.

Fixes to her wording:
- She wrote "מגוגל" and then "זיכוי של גוגל". Saying it twice was redundant, so it's now said once.
- "זה זיכוי של גוגל. הוא לא…" was a split "X, not Y" reveal. The hero already uses the page's one allowed contrast (rule 28), so I merged it into one plain statement.

- old (occurs 1x, card 2 desc):
`אתה משלם מינימום של ₪1,500 לחודש ישירות לגוגל מחשבון Google Ads שלך.`
- new:
`אתה משלם מינימום של ₪1,500 לחודש ישירות לגוגל מחשבון Google Ads שלך. אם העסק שלך חדש ב-Google Ads, ייתכן שתהיה זכאי לזיכוי פרסום, כשהחשבון נפתח דרך Google Partner כמו WAO. הזיכוי הוא של גוגל ולפי התנאים שלה, והוא לא חלק מה-₪249 ולא הנחה של WAO.`

Facts check:
- "May be eligible", with no amount and no "you'll get / qualifies / guaranteed".
- It is Google's credit, under Google's terms.
- It comes through a Google Partner, and "כמו WAO" says WAO is one.
- It is not part of the ₪249 and not a WAO discount.
- Google is feminine throughout, matching the rest of the page.

## Patch 1: Google approval, in step 03

Changes to her wording:
- I changed "אתה רואה את המודעות באוויר" to "המודעות עולות לאוויר", the same phrase the refund card uses (rule 33).
- I changed "מאשרת את פרטי הזהות" (wrong collocation) to "מאמתת … את הזהות שלך".
- I changed "האישור הוא של גוגל" to "והזמן תלוי בגוגל". It says the part that is Google's in plain spoken Hebrew without naming Google a third time.

🤖 cut: I dropped the step's opening ₪249 sentence. It is off-title (the title is "you pay the budget to Google") and it repeats card 1 and FAQ 1 (rules 1, 31). The fee still appears in the hero, card 1, FAQ 1, the refund card and the CTA line, so no fact is lost. The cut also keeps the step about as long as the other steps.

- old (occurs 1x, step 03 desc):
`אתה משלם ל-WAO ₪249 + מע״מ לחודש. את תקציב המודעות, לפחות ₪1,500 לחודש, אתה משלם ישירות לגוגל מחשבון Google Ads שלך.`
- new:
`את תקציב המודעות, לפחות ₪1,500 לחודש, אתה משלם ישירות לגוגל מחשבון Google Ads שלך. המודעות עולות לאוויר אחרי שגוגל מאמתת את פרטי התשלום, ואם היא מבקשת, גם את הזהות שלך. בדרך כלל זה לוקח כמה ימי עסקים, והזמן תלוי בגוגל.`

Fallback if you want the ₪249 kept in step 03: put the original first sentence back in front of this `new`. That version is about 44 words, still acceptable.

Consistency: the refund countdown starts "כשהמודעה הראשונה עולה לאוויר", so the verification days don't eat into his 30 days. The two strings agree.

## Patch 2: ownership card "החשבון והנתונים שלך"

Fixes to Tamar's version:
- 🟠 Broken reference: she put the payment sentences before "מנהלים אותם", so "אותם" pointed at the card and ID. I restored the order: what he owns, then how WAO manages it, then payment.
- 🟠 Rule 24: she switched to "אנחנו". The card keeps "WAO" throughout. I also rejected "והיא", because it could refer to Google, which is feminine too.
- Naming: she wrote "אמצעי התשלום". I used "פרטי התשלום" to match step 03 (rule 33).
- "תעודה מזהה" rather than "תעודת זהות", because Google accepts IDs other than an Israeli ID card.
- I left out "אף פעם". The brief's fact is covered without an unlimited word (rule 34).

- old (occurs 1x, card 3 desc):
`חשבון Google Ads, הקמפיינים והנתונים שייכים אליך. WAO מנהלת אותם דרך חשבון ניהול, ויש הסכם בכתב.`
- new:
`חשבון Google Ads, הקמפיינים והנתונים שייכים אליך. WAO מנהלת אותם דרך חשבון ניהול, ויש הסכם בכתב. את פרטי התשלום אתה מזין בעצמך ישירות מול גוגל, על שמך. WAO לא נוגעת בכרטיס האשראי שלך ולא בתעודה המזהה.`

## Checks on all three
- Typography: gershayim (״) in מע״מ is unchanged, there are no ASCII quotes or double spaces, and no dashes were added.
- Bidi: the Latin-then-period endings ("כמו WAO.", "של WAO.") resolve RTL inside a Hebrew paragraph, the same pattern the page already uses.
- Keyword anchors: none touched (title, h1 and badge are unchanged).
- No two of the three repeat each other (rule 31): the credit is in card 2, Google verification in step 03, and his control of the card/ID in card 3.

## Flags
- 🟡 Tamar (carried over from earlier, now more visible): step 03's first sentence and card 2's first sentence still say nearly the same thing about ₪1,500 to Google (rule 31). One of them should be reworded later.
- Eitan-Dev: facts2 still has step 01's tags (`"Google Ads Audit"`, …). Per my facts-pass report, that deletion has to ship in the same commit.

## Writing upgrades (proposed, for Adam)
1. When adding a sentence to an existing string, check every pronoun after the insertion point still refers to the same noun.
2. A conditional benefit from a third party goes in the section that owns that money or asset, not in a numbered step.
3. When a settled fact needs several caveats, state them once in one plain sentence. Don't split them into a short claim followed by a separate negating sentence.

## Verdict
All three facts are kept and placed correctly. With these three patches the text is shippable and accurate.
