# Noa: /google-ads Ads Bot rewrite

Files read: /home/eitanya/wao/docs/copy/google-ads-ads-bot-rewrite-2026-11-11.waocopy.json, /home/eitanya/wao/src/app/(app)/google-ads/page.tsx (it matches the brief's copy byte for byte), the brief, the decisions file, /home/eitanya/wao/docs/copy/writing-upgrades.md, and /home/eitanya/wao/src/app/(app)/google-ads/onboarding/page.tsx. I edited no files.

**Patch numbering.** I use 0-based array indexes (#0 to #62). That is the numbering your "6, 7, 8, 9, 25, 26" fits.

## 1. Verdict
**Not ready to ship. 7 required fixes, then it's ready.** The facts are almost all there and nothing is invented about price, refund, pages or ownership. Dror's banned words are absent, and there is no Google Partner mention anywhere on the page or in the shared components. Typography is clean except one ASCII geresh.

The blockers:
- One patch breaks code: #26 also matches a CSS value.
- The refund FAQ has a garbled idiom and a condition stated wrongly.
- The meta description describes the refund in a misleading way.
- "בלי מינימום" sits right next to "מינימום ₪1,500".
- The page's CTAs promise a signup that the live flow can't deliver.

**Human-sounding: about 70%.** That's up from 45%. The FAQ is now direct and in the reader's own voice. What drags it down is structure: the step list and the card grid cover the same points, and cancellation is said 5 times.

## 2. Patches that match 2 places
- **#6, #7, #8, #9:** confirmed. Each is FAQ 1 or FAQ 4, duplicated in the FAQPage JSON-LD, and both copies are meant to change.
- **#25** ("נתונים פנימיים WAO 2025"): NOT an FAQ. It matches the two STATS rows (lines 123–124). That's harmless, because the block is being deleted.
- **#26** ("60%"): **NOT an FAQ, and it breaks code.** The second match is the CSS on line 326: `width: "60%"` in the CTA glow div. Applying it gives `width: ""`.
  - Fix (preferred): drop patches #22 to #30 entirely. The engineer deletes the STATS const and the Stats `<section>` anyway.
  - If #26 must stay, use old `{ n: "60%"` → new `{ n: ""`.

## 3. Anchor checks
- **Title** (#0): "פרסום בגוגל — Google Ads עם Ads Bot ב-₪249 לחודש‏ | WAO". PASS.
  - 55 characters including the RLM (54 visible), so ≤60.
  - "פרסום בגוגל" comes first, then "Google Ads".
  - It ends in Hebrew + RLM, so it's bidi-safe.
  - [YELLOW, for Yonatan] "Google Ads עם Ads Bot" stutters on "Ads".
- **OG title** (#1): identical to the title. PASS. It now carries the RLM, which also closes my earlier OG bidi flag.
- **h1:** "פרסום בגוגל, בחשבון שנשאר שלך — בלי להיות כבול לסוכנות". PASS: the head term opens it and the calque is fixed. It's 54 characters, not the 48 the angle note claims.
- **Badge** (#16): 42 characters. PASS on length. FAIL on meaning (see #16 below).
- **Descriptions** (#2, #3): 143 characters. PASS on length. FAIL on meaning (see below). The angle note says 144.
- **Secondary anchor:** "ניהול קמפיינים בגוגל" survives in the INCLUDED h2 ("ניהול קמפיינים בגוגל — עם Ads Bot"). PASS.
- **JSON-LD:** MCC and "from" are gone, and ₪249 is in. PASS. Engineer reminders: set `price: "249"`. The new refund and cancel FAQs are not in the FAQPage schema. That's optional, but generating the schema from FAQS, as /site-bot does, removes this sync risk for good.

## 4. Fact checks
| Fact | Status |
|---|---|
| ₪249/month | Present. **[RED, fact] VAT missing.** The page never says "+ מע״מ", but the terms say "249 ₪ בתוספת מע״מ". The reader sees ₪249 and is charged ₪249 + VAT. Adam decides: add "+ מע״מ" to the price mentions, or confirm ₪249 includes VAT and fix the terms. |
| ₪1,500 minimum paid to Google | Present: FAQ 1, step 03, card 2, strip. It's called a minimum, not a recommendation. |
| Refund: fee only, 3 conditions next to the offer, clock from first live ad, automatic if WAO fails, on top of the 14-day right | Card 5 and the FAQ carry all of it, but card 5 garbles the conditions and the FAQ garbles the automatic-refund line. Fixes below. The terms add "בשל סיבה התלויה בנו" to the automatic refund; the page doesn't. Adam: keep the qualifier and add it to the page, or drop it from the terms. |
| Pages: 30 days, then offline; ₪900; free after 12 months | FAQ 2 and card 6 have it. "30 יום אחרי הביטול" doesn't match the terms ("after the paid month ends"). Fixed in #11. Card 6 omits "then they go offline". [YELLOW] |
| Fraud Blocker included | Card 4: "Fraud Blocker כלול". |
| Free 30-minute call includes an account look | CTA h2 and body. |
| Disclosures: fee separate, he owns the account, stats any time, written agreement | All present: FAQ 1, card 3, step 03. |
| Banned words / Google Partner | None. The only "להבטיח" is a negation ("אף אחד לא יכול להבטיח"). |

**Fact mismatches to route:**
- Card 4 says Eitan is available "בצ׳אט". The terms (§16) list email support only. Adam: align one of them.
- **Step 01** claims "אנחנו בודקים את החשבון ואת המדידה לפני כל החלטה" and "אתה מגדיר מה נחשב פנייה". Neither is in the brief's description of what the bot does. Adam: confirm both, or Tamar cuts them.
- **FAQ 4 (#9)** claims "אנחנו מודדים פניות לפני שמגדילים תקציב". There's no source for it, and it doesn't answer the question. Open fact for Adam: does the weekly report or the landing-page form count leads? If yes, Tamar adds one sentence saying so.

## 5. Required fixes (byte-exact `new`)

**#2 and #3 (meta and OG description).** [ORANGE]
- **Problem:** "ויש החזר דמי שירות תוך 30 יום" reads as "refund paid within 30 days". It has no trigger, so in the SERP it looks unconditional.
- **New (150 characters):**
  `שילמת על קליקים ולא ראית פניות? פרסום בגוגל עם Ads Bot ב-₪249 לחודש, ולפחות ₪1,500 למודעות ישירות לגוגל. החזר דמי שירות אם לא תהיה מרוצה בחודש הראשון.`

**#5 (Service schema).** [ORANGE]
- **Problem:** ₪1,500 has no "per month". It also says "אתה", while the sibling schema uses "הלקוח".
- **New:**
  `ניהול Google Ads עם Ads Bot ב-₪249 לחודש. הלקוח משלם לפחות ₪1,500 לחודש למודעות ישירות לגוגל.`

**#9 (FAQ 4 answer, both occurrences).** [ORANGE]
- **Problem:** the claim has no source.
- **Interim new, safe on facts:**
  `אתה רואה בחשבון שלך קליקים, חשיפות ועלות בכל רגע, ו-Ads Bot שולח לך דוח כל שבוע. אף אחד לא יכול להבטיח מספר פניות מראש.`

**#11 (cancellation FAQ answer).** [ORANGE]
- **Problems:**
  - "בלי מינימום" clashes with the ₪1,500 minimum.
  - The 30-day start point doesn't match the terms.
  - "הם חינם" overstates: he gets a copy, while the code stays WAO's.
  - "הכיבוי" is techy.
- **New:**
  `אתה יכול לבטל בכל חודש, בלי התחייבות ובלי הודעה מוקדמת. דפי הנחיתה נשארים באוויר עוד 30 יום אחרי סוף החודש ששילמת, ואז יורדים. אפשר לקנות אותם ב-₪900, ואחרי 12 חודשי תשלום תקבל אותם בחינם. הבוט מזהיר אותך ביום הביטול ושוב 7 ימים לפני שהדפים יורדים, ומציע להשהות את הקמפיינים או להפנות אותם לאתר שלך.`

**#12 (refund FAQ question).** [ORANGE]
- **Problem:** "איך אני מקבל…" asks *how*, but the request channel is unknown, so no answer can open with it.
- **New:**
  `אם לא אהיה מרוצה, אני מקבל את הכסף בחזרה?`

**#13 (refund FAQ answer).** [RED] and [ORANGE]
- **Problems:**
  - [RED] "אם המודעות לא עולות בידינו" is a garbled idiom ("עלה בידינו" means "we succeeded").
  - [ORANGE] "מדובר בעסק אחד" states the wrong condition: it should be one refund per business.
  - The satisfaction trigger is missing.
- **New:**
  `כן, את דמי השירות, ₪249. את תקציב המודעות שילמת לגוגל, ולכן הוא לא חוזר. התקופה היא 30 יום, והיא מתחילה כשהמודעה הראשונה שלך עולה לאוויר. התנאים: המודעות רצו בקצב של ₪1,500 לחודש, החזר אחד לכל עסק, ואתה מבקש עד 7 ימים אחרי סוף 30 הימים. אם לא הצלחנו להעלות את המודעות שלך, ההחזר אוטומטי. זה בנוסף לזכות שלך לבטל תוך 14 יום לפי החוק.`

**#15 (organic FAQ answer).** [ORANGE]
- **Problem:** a comma is missing at the clause boundary.
- **New:**
  `בפרסום בגוגל אתה משלם על כל קליק, וכשאתה מפסיק לשלם, המודעות יורדות. בקידום אורגני אתה לא משלם לגוגל על קליקים, אבל לוקח חודשים עד שמטפסים בתוצאות.`

**#16 (badge).** [ORANGE]. It's an anchor, so it needs Yonatan's sign-off.
- **Problem:** "בלי מינימום" next to "מינימום ₪1,500" (strip, FAQ, cards) reads as a contradiction. "מינימום" should belong to the ad spend only.
- **New (43 characters):**
  `חודש בחודש. בלי התחייבות ובלי הודעה מוקדמת.`

**#44 (INCLUDED eyebrow).** [ORANGE]
- **Problem:** "מה כלול במנוי" sits above the ad-budget card, which reads as if the ₪1,500 were included.
- **New:**
  `מה אתה מקבל ומה אתה משלם`

**#47 (card 1 body).** [ORANGE]
- **Problems:** "מחודש לחודש" vs the badge's "חודש בחודש" uses two terms for one idea. "בלי מינימום" has the same clash as #16. "החיוב מתבצע" is formal passive.
- **New:**
  `החיוב בתחילת כל חודש, ואין תקופת ניסיון. אפשר לעזוב בכל חודש, בלי התחייבות.`

**#53 (card 4 body).** [ORANGE]
- **Problem:** ASCII apostrophe in "בצ'אט".
- **New:**
  `הבוט מקים קמפיינים, מודעות ודפי נחיתה, מבצע אופטימיזציה ושולח דוח שבועי. Fraud Blocker כלול, ואיתן, מייסד WAO, זמין בצ׳אט.`

**#55 (card 5 refund body).** [ORANGE]
- **Problems:**
  - No satisfaction trigger.
  - "30 הימים" takes the definite article on its first mention.
  - "קצב ₪1,500, עסק אחד" is too telegraphic for conditions Dror requires to sit next to the offer.
- **New:**
  `לא מרוצה ב-30 הימים הראשונים? אנחנו מחזירים ₪249, דמי השירות בלבד. הספירה מתחילה כשהמודעה הראשונה עולה לאוויר. התנאים: המודעות רצו בקצב של ₪1,500 לחודש, החזר אחד לכל עסק, ובקשה עד 7 ימים אחרי סוף התקופה.`

**#21 and #61 (Ads Bot buttons).** [ORANGE], promise vs destination. See section 7. This one needs Adam's decision.
- **Recommendation:**
  - The engineer removes the hero button #21 ("בדוק את Ads Bot ←"). It leads to the same sandbox as the demo button next to it.
  - #61 points to the demo URL, with new label: `תראה איך Ads Bot עובד ←`
  - When Takbull checkout exists, it becomes `התחל עם Ads Bot ←`.

## 6. For Tamar: [YELLOW] notes and [AI] rewrites (not changed)
- **[AI] Steps and cards overlap** (rules 21, 22).
  - Steps 02 and 04 repeat card 4 (setup, report, Fraud Blocker). Step 03 repeats cards 1 and 2 (payment). Step 05 repeats card 6 and FAQ 2 (cancellation).
  - Steps 03 and 05 aren't actions in time order. The subjects also switch (אנחנו / Ads Bot / אתה).
  - Suggested skeleton:
    - Steps, in time order: free call or onboarding chat → the bot sets up campaigns, ads and pages → the first ad goes live (the refund clock starts) → weekly report and ongoing tuning.
    - Cards hold only the terms: fee, ad budget, ownership/visibility/agreement, Fraud Blocker + Eitan, refund, pages/cancellation.
- **[AI] Step bodies repeat their titles** (rule 1). Step 01 "אנחנו בודקים את החשבון" ×2. Step 04 "אתה מקבל דוח שבועי" ×2. Step 05 "אתה יכול לבטל בכל חודש" ×2.
- **[AI] Repetition counts** (rule 2). Cancel/no-commitment terms appear 5 times: badge, step 05, card 1, card 6, FAQ 2. The ₪1,500-to-Google fact appears 6 times in visible copy.
- **[AI] Hero body** (#18). "— ב-₪249 לחודש" is a dash used to set up a reveal (rule 5). "אתה רואה כל שקל" also comes back in card 3 and FAQ 4.
  - Suggested: "…מקים את הקמפיינים, מנהל אותם ושולח לך דוח כל שבוע. ₪249 לחודש לנו, ולפחות ₪1,500 למודעות שאתה משלם ישירות לגוגל."
  - Why: it removes the reveal dash and puts the ad-spend floor beside the first price he sees. [YELLOW] Right now the hero shows ₪249 with no floor nearby.
- **[AI] Step 04** "משפר את הקמפיינים לפי קליקים, חשיפות ועלות". That is optimising for vanity metrics, which undercuts the page's leads angle. Adam: what does the bot actually optimise for?
- **[AI] FAQ h2** "כל מה שאתה צריך לדעת על Google Ads" is unchanged. It's the stock calque. Suggested: "לפני שאתה מתחיל".
- **[AI] CTA section.**
  - "בודקים את החשבון" appears 3 times (eyebrow, h2, body) and "30 דקות" twice (h2, body).
  - "נבדוק… מה לבדוק" repeats the root.
  - "לפני ש…מוסיפים/מוסיף תקציב" appears in both eyebrow and body.
  - Suggested body: "בשיחה נעבור יחד על החשבון שלך, ותדע מה לתקן לפני שאתה מוסיף תקציב."
- **[YELLOW] CTA strip:** a check mark (✓) in front of "מינימום ₪1,500 לגוגל" presents a cost as a benefit.
- **[YELLOW] Brand person:** card 3 says "WAO מנהלת". Everywhere else it's "אנחנו".
- **[YELLOW] Card 2:** Dror asked to say "not to WAO". Add: "הכסף הזה לא עובר דרכנו."
- **[YELLOW] Card 6:** add "ואז יורדים".
- **[YELLOW] FAQ 1 question:** "ומי מקבל את תקציב המודעות?" → "ולמי הולך הכסף של המודעות?"
- **[YELLOW] Hero button verb forms:** דבר / תראה / בדוק / התחל mix two forms (rule 8). "בדוק" is also the short-imperative homograph.
- **[YELLOW] Terms vs page:** the page says "דפי נחיתה", the terms say "עמודי נחיתה". Pick one for the site.
- **[YELLOW] INCLUDED h2:** "ניהול קמפיינים בגוגל — עם Ads Bot" uses a dash to set up a reveal. Removing it needs a new text-node patch, and Yonatan has to sign off.

## 7. Does /google-ads/onboarding sell or sign up the ₪249 bot today?
**No. It can only run a demo.** Checking the route:
- `resolveOnboardingDemoEntry` (src/lib/google-ads/onboarding-demo.ts) returns `mode: "test"` in every branch. The Live button is hard-disabled ("Live (locked)").
- The page itself says: "נכון לעכשיו, ההרשמה והתשלום המקוונים אינם זמינים. שום חיוב לא מתבצע."
- There is no Ads Bot plan in src/lib/payments/plans.ts. Takbull is wired only for Site Bot (SiteBotPayClient).
- **To sell it:** a ₪249 recurring Takbull plan, the live-mode unlock, and a terms-acceptance step.

The onboarding copy also contradicts the new page. Gate it before any paid traffic:
- The persona is "אדם, מנהל הקמפיינים שלך" / "אדם - יועץ Google Ads", not Ads Bot. The second also uses a hyphen where a dash belongs.
- "תקציב חודשי מומלץ": Dror says to call it a minimum, not a recommendation.
- "כ־X פניות בחודש" is a lead forecast. That conflicts with the no-results stance on the page and in the terms.
- "הדף ייבנה אוטומטית לאחר התשלום", while payment is unavailable.
- "Sandbox" jargon.

Until checkout exists, "התחל עם Ads Bot" breaks rule 4 (a button promises only what its destination delivers).

## 8. Wrappers that would render empty
1. **Stats `<section>`** (page.tsx lines 226–239): if patches #22 to #30 are applied without deleting the block, you get an empty eyebrow div plus 3 empty glass cards, each with 3 empty divs. `key={s.n}` would then be `""` three times, which triggers a duplicate React key warning. Delete the section and the STATS const.
2. **Step tag container** (lines 264–270): once the pills are deleted, an empty flex `<div>` remains, plus the leftover `marginBottom: "16px"` on the step `<p>`. Delete the div and the `tags` field.

No other patch produces an empty string.

## 9. Routing
- **nextjs-engineer:**
  - Drop #22 to #30, or fix #26.
  - Delete the stats section and the tag container.
  - Set `price: "249"`.
  - Decide on the #21 / #61 buttons with Adam.
- **Yonatan:** badge #16, and the title stutter.
- **Adam:**
  - VAT.
  - Chat vs email support.
  - Step 01 facts.
  - Whether leads are measured (FAQ 4).
  - What the bot optimises for.
  - The automatic-refund qualifier.
  - The onboarding/Takbull gap and the onboarding copy.
- **Tamar:** section 6.

## 10. Writing upgrades (for waocopy)
- A word that names one term of the offer (minimum, trial, free) must not appear on the same page in a different sense.
- When a section covers a refund or other conditional term, name the trigger before the conditions. The headline amount alone never stands in for the offer.
- A price is never shown without the other mandatory cost or tax the reader will pay, at least on its first appearance.
- Don't put a check mark or other benefit marker in front of a cost or obligation.

---
