# Site-Bot public offer — truthful payment-disabled replacement packet (DRAFT)

- Date: 2026-10-05
- Author: waocopy (Contract v3, handoff 2026-10-05_032, kanban t_e66857ba)
- Status: DRAFT ONLY — no production bytes changed. Source: `src/app/(app)/site-bot/page.tsx`
  (SHA-256 verified at draft time: `aadf462bc71ff57c9f7e2bcf5035a0fb2426b573b0f9fda64efdcf34baa2fdbb`).
- Revision 2 (Contract 035, kanban t_98bb01c9, 2026-10-05): corrected the audit lookup-input,
  DIY-coverage, report-availability and consultation claims that structural review t_adaa125f
  marked FAIL. Pre-correction packet SHA-256:
  `272665904ec32f943647c6d8eb2bce07af265e7b576728f88849beff13841fd2`. Draft lineage preserved;
  no second packet created.
- Revision 3 (Contract 036, kanban t_c1b28a02, 2026-10-05): sharpened the audit → optional
  contact → mutually-agreed next-step decision path in `siteBot.steps.1`–`.3`, `siteBot.faq1.a`
  and `siteBot.compare.summary` only; every Contract 035 claim correction and all other rows
  preserved byte-identically. Pre-Rev-3 packet SHA-256:
  `0e8715e5bd6e4b87aad8a5eff6338d720134b1b54fc56ba98b97f0b73e8eb7ac`.
- Revision 4 (started as Contract 2026-10-06_002 / kanban t_9fe6a3c8 — that run timed out
  after inserting this header but before replacing the keyed cells; completed under
  Contract 2026-10-06_005 / kanban t_ccc58ba3, 2026-10-06): removed the unsupported
  contact-response, operator-capacity, build/maintenance, asset-ownership and per-step-approval
  assertions that independent structural review t_fe9bc486 marked FAIL. CHANGED KEYS (10):
  `siteBot.steps.2`, `siteBot.steps.3`, `siteBot.faq1.a`, `siteBot.faq2.a`, `siteBot.faq3.a`,
  `siteBot.faq4.a`, `siteBot.faq5.a`, `siteBot.graduate.body`, `siteBot.price.para`,
  `siteBot.compare.summary`. `siteBot.faq2.a` and `siteBot.graduate.body` are included as rows
  necessarily affected by the same claim classes (implied conversation on contact; asserted
  per-change approval). All other rows preserved byte-identically; the 27-keyed-row table and
  all ENGINEER_REMOVE/ENGINEER_REDIRECT rows are intact. Pre-Rev-4 packet SHA-256:
  `75977ed6fba3dc1f14f5897eb068843110d05e54355ecaefd15d9709b3c0ebad`.
  Companion draft: `docs/copy/site-bot-contact-bridge-2026-10-06.md` corrects the linked
  contact destination and the form success state; the two drafts must be applied together.
- Offer scope this packet may promise (Rev 2): free ungated GBP audit at `/site-bot/audit`.
  The audit form requires the business name only — no account, no phone (the API explicitly
  rejects a `phone` field, `audit-lookup/route.ts:81-83`; the form sends `businessName` only,
  `audit/page.tsx:96-109`). Report generation is conditional on a configured Places key, a
  valid daily-budget ceiling + DB path, remaining quota, provider lookup success and persisted
  storage (`audit-lookup/route.ts:85-119`); the route can return 429/503/500 or zero
  candidates, and current runtime availability is unproven — no copy line may promise a
  guaranteed report. DIY fix steps render only for `fail` statuses on categories/hours/photos
  (`DIY_KEYS`, `audit/page.tsx:18,161-163,219-253`); other dimensions show a status line +
  explanation only, and `unknown` dimensions are explicitly unresolved. Follow-up is a
  voluntary operator contact form at `/contact#contact-form` (`audit/page.tsx:618-630`,
  `contact/page.tsx:163-170`) — not an instant consultation, not a booking, no response-time
  or human-availability guarantee. Rev 4 boundary (t_fe9bc486 FAIL): the linked contact page
  currently promises a free 20–30 minute consultation and a 24-business-hour response
  (`contact/page.tsx:81-98`), and `/api/lead` acknowledges every submission even when SMTP
  delivery is absent or fails (`api/lead/route.ts:35,96-99`) — those promises are unverified
  and the false-success route is an engineer gate, so this packet no longer asserts that a
  human response will arrive, nor that a build, maintenance, asset ownership or per-step
  approval policy exists. Operator-led help is framed strictly as a *possibility to explore*
  in the contact message. Any build, ownership, and consent terms are subject to a direct
  agreement with the owner — nothing is promised on-page. No price, no timeline, no rank/lead
  guarantee, no automatic GBP writes, no immediate deployment, no live checkout, no unlimited
  chat edits, no fixed subscription scope.
- Old strings are referenced by file:line only (not duplicated). Every replacement below is
  original waocopy-authored Hebrew, singular male, native register.
- Keys use `siteBot.<area>.<slot>`. `ENGINEER_REMOVE` / `ENGINEER_REDIRECT` entries are
  non-copy structural actions — waocopy does not edit code.

## 1. Keyed copy replacements — `src/app/(app)/site-bot/page.tsx`

### Metadata (lines 7–24) — proposed title/meta changes require SEO signoff before application

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `siteBot.metadata.title` | page.tsx:10-12 | absolute title with ₪/24h/message-update promises | `בניית אתר לעסק קטן — מתחילים בבדיקת גוגל חינם‏ \| WAO` |
| `siteBot.metadata.description` | page.tsx:13-14 | ₪9.90 trial + ₪1,490 package + 24h claims | `בניית אתר לעסק קטן מתחילה בבדיקה חינם של הפרופיל העסקי שלך בגוגל — לפי שם העסק בלבד. הבדיקה מראה מה רואים עליך לקוחות, ועל חלק מהסעיפים תקבל הוראות לתיקון עצמי. בלי מחיר ובלי התחייבות בשלב הזה.` |
| `siteBot.metadata.ogTitle` | page.tsx:18 | OG title with 24h/update promises | `בניית אתר לעסק קטן — בדיקת גוגל חינם לפני שמתחייבים` |
| `siteBot.metadata.ogDescription` | page.tsx:19-20 | OG description duplicating paid claims | `בניית אתר לעסק קטן מתחילה בבדיקה חינם של הפרופיל העסקי שלך בגוגל — לפי שם העסק בלבד. הבדיקה מראה מה רואים עליך לקוחות, ועל חלק מהסעיפים תקבל הוראות לתיקון עצמי. בלי מחיר ובלי התחייבות בשלב הזה.` |

SEO entity note: the anchor `בניית אתר לעסק קטן` opens the proposed title, OG title, H1, and
badge — preserved per contract. Engineer note: line 11 uses `title.absolute` with an
RLM-anchored `‏ | WAO` suffix and an explanatory comment at lines 8–9; the replacement keeps
the identical suffix and mechanics, and the comment stays valid.

### FAQS array (lines 26–51)

Questions (`.q`) stay untouched — they are neutral and feed the FAQPage schema via `FAQS.map`
(lines 85–92), so schema and rendered answers stay consistent automatically. Only answers change.

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `siteBot.faq1.a` | page.tsx:29 | ₪9.90/₪1,490 pricing answer | `נכון להיום אין רכישה ישירה באתר, וזה מכוון. התהליך פשוט: קודם בדיקה חינם של הפרופיל העסקי שלך בגוגל — לפי שם העסק בלבד. הבדיקה היא לא מבחן קבלה ולא התחייבות, רק תמונת מצב בשבילך. אחר כך, אם תרצה, אפשר לפנות דרך טופס יצירת הקשר — בלי תיאום שיחה ובלי התחייבות. אין כאן הבטחת מענה; כל המשך אפשרי רק בהסכמה משותפת. ואם נחליט יחד לבנות, מסכמים מולך ישירות התאמה, היקף ותנאים — לפני כל עבודה.` |
| `siteBot.faq2.a` | page.tsx:33 | 24h go-live promise | `אין כאן הבטחת לו״ז גורפת, וזה בכוונה. קודם בודקים את הפרופיל שלך בגוגל — חינם. אחר כך, אם תרצה, אפשר לפנות דרך טופס יצירת הקשר; אין הבטחת מענה בעמוד. כל המשך וכל תיאום זמנים — רק אם נוצר קשר, רק ישירות מולך ורק בהסכמה.` |
| `siteBot.faq3.a` | page.tsx:37 | chat-build + 24h package claim | `לא. הבדיקה פשוטה לגמרי — מזינים רק את שם העסק, בלי קוד ובלי ידע טכני. רוצה בהמשך עזרה בבניית אתר? אפשר לפנות דרך הטופס ולבדוק התאמה. חשוב לדייק: אין כאן חבילת בנייה מובטחת בעמוד. כל עזרה כזאת, אם תהיה, מסוכמת ישירות מולך — בהיקף, בתנאים ובהסכמה מלאה.` |
| `siteBot.faq4.a` | page.tsx:41 | WhatsApp auto-update + edits-forever claim | `אין כאן עורך אוטומטי, ואין חבילת עריכות בלתי מוגבלת. אם האתר נבנה בליווי שלנו, כל עדכון עובר בתיאום ישיר מולך. את היקף העדכונים ואת התנאים מסכמים מראש — לפני שמתחילים, ולא בהבטחה גורפת בעמוד.` |
| `siteBot.faq5.a` | page.tsx:45 | owned-assets + WhatsApp-edit package claim | `ב-Wix או ב-WordPress הכול עליך, כולל התחזוקה השוטפת. אצלנו, אם נבנה יחד, השאיפה היא שהנכסים — כמו הדומיין — יהיו שלך. אבל שום דבר לא מובטח בעמוד: כל דבר כזה מסוכם ישירות מולך, בהסכמה. רוצה בכל זאת להתחיל לבד? הבדיקה החינמית נותנת, בחלק מהסעיפים, הוראות לתיקון עצמי.` |
| `siteBot.faq6.a` | page.tsx:49 | ₪1,490 five-pages/forever-edits bundle claim | `אתה בהחלט יכול לבנות לבד, והזמן שלך שווה כסף. אם תרצה, נבנה איתך במסלול מלווה — בתיאום ובהסכמה. הבדיקה החינמית נשארת שלך בכל מקרה, כולל הוראות התיקון העצמי שהיא נותנת בחלק מהסעיפים. אין חבילה קבועה מראש; מה מקבלים ובאיזה היקף, מסכמים ישירות מולך.` |

### Service schema (lines 53–94)

| Key | Source | Old (reference) | Replacement / action |
|---|---|---|---|
| `siteBot.schema.serviceName` | page.tsx:58 | Service `name` with fixed-price wording | `Site Bot — בניית אתר לעסק קטן בליווי אישי` |
| — | page.tsx:66-79 | `offers` array: two Offer objects with `price` `9.90` / `1490` | `ENGINEER_REMOVE` — delete the entire `offers` array. There is no payable public offer while both checkout POSTs return fixed 503. Do not substitute an Offer with price 0 or "free" for the site build; the free artifact is the audit, which lives on `/site-bot/audit` and is not represented in this page's schema. After removal, verify no orphaned references to the removed Offers remain in either schema object. |
| — | page.tsx:81-93 | FAQPage schema | No action — derives from `FAQS`; consistency is automatic once the answers above replace lines 29/33/37/41/45/49. |

### STEPS array (lines 96–100)

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `siteBot.steps.1` | page.tsx:97 | start-in-chat step | `מתחילים בבדיקה חינם של הפרופיל העסקי שלך בגוגל — מזינים רק את שם העסק. אם יש תוצאה, תקבל תמונת מצב, ועל חלק מהסעיפים גם הוראות לתיקון עצמי. בלי הרשמה ובלי התחייבות.` |
| `siteBot.steps.2` | page.tsx:98 | tell-us-about-business step | `אם תרצה להמשיך — אפשר לפנות דרך טופס יצירת הקשר ולספר על העסק. הפנייה חופשית: לא תיאום שיחה, לא התחייבות, ואין הבטחת מענה.` |
| `siteBot.steps.3` | page.tsx:99 | 24h go-live/private-domain step | `רק אם נחליט יחד — לפני כל עבודה מסכמים מולך ישירות התאמה, היקף ותנאים. שום דבר לא נבנה ולא נכתב בפרופיל שלך בלי ההסכמה שלך.` |

COMPARE array (lines 102–115): reviewed, contains no paid/unavailable claim — leave unchanged.

### Hero (lines 132–171)

| Key | Source | Old (reference) | Replacement / action |
|---|---|---|---|
| — | page.tsx:139 | badge text | KEEP UNCHANGED — already carries the entity anchor `בניית אתר לעסק קטן` with no false claim. |
| `siteBot.hero.h1` | page.tsx:152 | H1 with ₪1,490 + 24h + message-update | `בניית אתר לעסק קטן, בליווי אישי — מתחילים בבדיקת גוגל חינם` |
| `siteBot.hero.sub` | page.tsx:157 | WhatsApp-edit + ₪9.90 + five-pages paragraph | `אין כאן עגלת קניות ואין הבטחות לו״ז. קודם בודקים את הפרופיל העסקי שלך בגוגל, חינם — לפי שם העסק בלבד. הבדיקה מראה מה רואים עליך לקוחות, ועל חלק מהסעיפים תקבל הוראות לתיקון עצמי. רוצה להמשיך? אפשר לפנות למפעיל דרך טופס יצירת הקשר, בלי התחייבות.` |
| `siteBot.hero.cta` | page.tsx:166 | primary CTA label with ₪9.90 | `בדיקת הפרופיל העסקי בגוגל — חינם` |
| — | page.tsx:162 | CTA `href="/site-bot/start"` | `ENGINEER_REDIRECT` → `href="/site-bot/audit"`. Never route to `/site-bot/start`: its `SiteBotStartContent.finish` (start/page.tsx:244-258) calls the disabled checkout, and lines 294-301 + 414-419 promise secure payment. |
| `siteBot.hero.micro` | page.tsx:170 | price microcopy line | `הבדיקה חינם, בלי הרשמה ובלי התחייבות — מזינים רק את שם העסק. ההמשך, רק אם תרצה, דרך טופס יצירת הקשר.` |

### Module-5 graduate objection block (lines 229–250)

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| — | page.tsx:242 | block heading | KEEP UNCHANGED — no false claim. |
| `siteBot.graduate.body` | page.tsx:246 | paragraph ending in full-package WhatsApp-edit claim | `למדת בקורס של WAO לבנות אתר בעצמך? מצוין, זאת עדיין אפשרות — וגם הוראות התיקון העצמי שהבדיקה החינמית נותנת בחלק מהסעיפים יעזרו לך שם. אבל כשלקוח מחכה לתשובה, לפעמים עדיף שמישהו אחר יטפל באתר. רוצה לבדוק את האפשרות הזאת? הפנייה דרך הטופס חופשית, וכל המשך — רק בהסכמה, בתיאום ישיר מולך.` |

### Price anchor block (lines 253–292)

| Key | Source | Old (reference) | Replacement / action |
|---|---|---|---|
| `siteBot.price.para` | page.tsx:257 | fixed-price/no-subscription paragraph | `נכון להיום אין רכישה ישירה באתר — וזה מכוון. קודם בדיקה חינם של הפרופיל העסקי שלך בגוגל — לפי שם העסק בלבד, עם הוראות לתיקון עצמי בחלק מהסעיפים. אחר כך, אם תרצה, אפשר לפנות דרך טופס יצירת הקשר — בלי התחייבות. אם נחליט יחד לבנות אתר, התנאים — כולל המחיר — יסוכמו ישירות מולך, בהסכמה.` |
| `siteBot.price.cta` | page.tsx:266 | CTA label with ₪9.90 | `לבדיקה החינמית של הפרופיל בגוגל` |
| — | page.tsx:262 | CTA `href="/site-bot/start"` | `ENGINEER_REDIRECT` → `href="/site-bot/audit"` |
| `siteBot.price.sub` | page.tsx:271 | ₪9.90 preview/no-subscription line | `הבדיקה מראה לך מה לקוחות רואים עליך בגוגל. אם משהו חסר בקטגוריות, בשעות הפתיחה או בתמונות — תקבל גם הוראות לתקן לבד, בחינם. שום דבר לא נעול מאחורי תשלום.` |
| `siteBot.price.box` | page.tsx:287 | what's-included trial/package box | `מה יש בבדיקה? מזינים רק את שם העסק, והיא בודקת את הפרופיל העסקי שלך בגוגל: קטגוריות, שעות פתיחה, תמונות, טלפון ואתר, ביקורות ותיאור. על כל סעיף תקבל תוצאה והסבר. אם משהו חסר בקטגוריות, בשעות הפתיחה או בתמונות — תקבל גם הוראות לתקן לבד, בחינם. חלק מהנתונים לא תמיד גלויים מבחוץ, והבדיקה מציגה גם את זה בכנות. אין כאן הבטחת דירוג או לידים — רק תמונת מצב אמיתית.` |

The six dimensions named in `siteBot.price.box` match the audit scorecard's six dimensions
(categories, hours, photos, phone/website, reviews, description) per
`docs/research/site-bot/010_audit-first-wedge-build-plan.md:65-70` — no invented features.
Coverage note (Rev 2): DIY step blocks render only for `fail` statuses on the three `DIY_KEYS`
dimensions — categories, hours, photos (`audit/page.tsx:18,161-163,219-253`). Phone/website,
reviews and description failures show a status line only; `unknown` dimensions are presented
as not visible from outside. The corrected Hebrew therefore promises self-fix instructions
only for categories/hours/photos failures, qualified as "בחלק מהסעיפים". The generated fail
messages in `scorecardCopy.ts:14,22,30` carry service/lead-generation assertions; this packet
does not amplify them as product promises. Report availability is conditional
(`audit-lookup/route.ts:85-119` may return 429/503/500 or zero candidates), so no copy line
promises a guaranteed report — the copy describes what the audit checks and shows.

### Three-way comparison summary (lines 333–353)

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `siteBot.compare.summary` | page.tsx:351 | ₪1,490/24h/edits-forever summary line | `Site Bot: מתחילים בבדיקה חינם של הפרופיל העסקי בגוגל — מזינים רק את שם העסק. מה יש בבדיקה? תמונת מצב, ועל חלק מהסעיפים הוראות לתיקון עצמי. מה אין בה? בניית אתר, כתיבה בפרופיל שלך או רכישה בתשלום. משם, אם תרצה, אפשר לפנות דרך טופס יצירת הקשר — בלי התחייבות. ורק אם נחליט יחד — ממשיכים לבנייה, בתיאום ישיר מולך. בלי מחירון ובלי הבטחות גורפות בשלב הזה.` |

COMPARE rows and the comparison heading (page.tsx:307): reviewed, no false claim — leave unchanged.

### Closing CTA banner (lines 439–466)

| Key | Source | Old (reference) | Replacement / action |
|---|---|---|---|
| `siteBot.cta.heading` | page.tsx:445-447 | heading with gradient `₪1,490` span | `Site Bot — מתחילים בבדיקה חינם`. Structural note: the `text-gradient` span currently wraps the price; engineer should wrap `בדיקה חינם` in the span instead (same markup pattern, different wrapped words). |
| `siteBot.cta.sub` | page.tsx:449 | price microcopy | `בדיקת הפרופיל העסקי שלך בגוגל — חינם, בלי התחייבות. רוצה לדבר על התוצאות? אפשר לפנות למפעיל דרך טופס יצירת הקשר.` |
| `siteBot.cta.primary` | page.tsx:457 | primary CTA label with ₪9.90 | `לביצוע הבדיקה החינמית` |
| — | page.tsx:453 | CTA `href="/site-bot/start"` | `ENGINEER_REDIRECT` → `href="/site-bot/audit"` |
| — | page.tsx:459-460 | secondary contact link `href="/contact"`, label `יש לך שאלה? פנה אלינו` | `ENGINEER_REDIRECT` href → `/contact#contact-form` (the voluntary-consultation destination). Label KEEP UNCHANGED — not misleading. |

Cross-links block (lines 417–437): reviewed, no false claim — leave unchanged.

## 2. Consolidated ENGINEER actions (non-copy; waocopy does not edit code)

1. `ENGINEER_REMOVE` page.tsx:66-79 — the entire `offers` array (both priced Offers). Verify no
   orphaned schema/FAQ references remain; the FAQPage schema (81-93) needs no separate change.
2. `ENGINEER_REDIRECT` page.tsx:162, 262, 453 — all three `href="/site-bot/start"` →
   `href="/site-bot/audit"`. `/site-bot/start` is forbidden as a public destination while
   checkout is disabled and its copy promises payment (start/page.tsx:244-258, 294-301, 414-419).
3. `ENGINEER_REDIRECT` page.tsx:459 — `href="/contact"` → `href="/contact#contact-form"`.
4. Structural: page.tsx:446 gradient span re-wrap (see `siteBot.cta.heading` row).
5. Metadata replacements (title/OG) are gated on SEO signoff before application, per contract.

## 3. English implementation checklist (for waoengineer, application contract only)

- [ ] Apply the 27 keyed replacements above byte-exactly from this packet; zero Hebrew typed by the engineer.
- [ ] Remove the `offers` array (page.tsx:66-79); confirm no orphaned Offer/schema references.
- [ ] Redirect all three `/site-bot/start` CTAs to `/site-bot/audit`; redirect `/contact` to `/contact#contact-form`; re-wrap the gradient span in the closing heading.
- [ ] Keep `title.absolute` mechanics and the RLM-anchored `‏ | WAO` suffix intact (page.tsx:8-12).
- [ ] Metadata title/description/OG changes require SEO head-anchor signoff before application.
- [ ] Leave all KEEP UNCHANGED rows and unaffected sections (COMPARE rows, headings at 196/242/307, cross-links) untouched.
- [ ] Apply together with the companion draft `docs/copy/site-bot-contact-bridge-2026-10-06.md` (contact page + form success state): one audit-to-optional-contact journey; neither draft may be applied alone.
- [ ] Application happens only after independent structural review + Eitan founder spot-check + a separate engineer application contract, under the Contract 039 build hold, and only after the fail-closed `/api/lead` intake gate named in the companion bridge.

## 4. Material claim/SEO points for independent Hebrew QA (waohebrewqa)

1. **No price anywhere**: verify no ₪ figure, "מחיר קבוע", subscription, or package-scope promise survives in any replacement; the only commercial posture is "terms agreed directly with you".
2. **No timeline claim**: no "24 שעות", no delivery/go-live deadline, no "תוך X" of any kind (Gate-2 rule: unmeasured timeline claims stay out of marketing copy).
3. **No performance guarantee**: no rank/leads/visibility promise. `siteBot.price.box` explicitly disclaims ("אין כאן הבטחת דירוג או לידים") — confirm it reads natural, not legalese.
4. **No automation overclaim (Rev 4)**: no automatic GBP writes implied — the audit gives DIY steps only on failed categories/hours/photos, and the corrected copy says exactly that ("בחלק מהסעיפים"). Edit/update paths (`faq4.a`) are framed as direct coordination and terms agreed upfront, not as a promised operator service; per-change approval-policy wording ("ממתין לאישור שלך", "באישור שלך על כל שינוי", "כל צעד מחכה לאישור שלך") no longer appears in any of the ten changed cells, because no such policy is established. The surviving consent promise is the negative, keepable one: nothing is built or written to the profile without the owner's agreement (`steps.3`).
5. **No unlimited-edits, always-on-human or response promise (Rev 4)**: follow-up stays a voluntary contact-form message; the changed cells now explicitly promise no response ("אין כאן הבטחת מענה" / "אין הבטחת מענה בעמוד" / "ואין הבטחת מענה") and make any continuation conditional on mutual agreement — the Rev 3 availability framing ("וכל מענה בכפוף לזמינות") is gone. No consultation guarantee, no response time and no "זמין לשיחה" wording survives in the changed cells. Untouched rows keep their contact-form invitation wording byte-identically per contract: "אפשר לפנות למפעיל דרך טופס יצירת הקשר" (hero.sub, cta.sub), "דרך טופס יצירת הקשר" (hero.micro), "פנה אלינו" (closing contact link label) — "למפעיל" names the form destination there, not a response promise.
6. **No fabricated proof**: zero reviews/testimonials/client names invented; the graduate-objection FAQ leans on the real WAO course, not fake receipts.
7. **SEO anchor**: `בניית אתר לעסק קטן` must remain the leading phrase of title, OG title, and H1, and present in the unchanged badge — check the proposed title/description lengths for SERP sanity (signoff gate).
8. **Persona/register**: singular male throughout, native Sabra phrasing, short sentences; confirm no translated-sounding constructions in the FAQ answers (they carry the schema text too).
9. **CTA truthfulness (Rev 2)**: "חינם" / "בלי התחייבות" / "בלי הרשמה" on the audit — consistent with the ungated free-magnet decision (010 build plan §6-7). Fact-check: the form collects the business name ONLY ("מזינים רק את שם העסק"); a `phone` field is rejected by the API (`audit-lookup/route.ts:81-83`). Flag any wording implying the audit needs no input at all, or more than the business name.
10. **No guaranteed-report claim (Rev 2)**: copy describes what the audit checks and shows without promising a report in every case — the lookup can return 429/503/500 or zero candidates (`audit-lookup/route.ts:85-124`), and report generation is conditional on Places key/quota/storage. Confirm no flat "מקבלים דוח" promise survives; the corrected lines say "הבדיקה מראה…" / "תקבל תוצאה והסבר" instead.
11. **Decision-path integrity (Rev 4)**: in `siteBot.steps.1`–`.3`, `siteBot.faq1.a`, `siteBot.faq2.a` and `siteBot.compare.summary`, verify the sequence reads audit → optional contact → possible mutually-agreed next step, with zero response/capacity/service promises: the audit is framed as a free name-only lookup with a conditional result ("אם יש תוצאה"), never a fit verdict or booking ("לא מבחן קבלה", "לא תיאום שיחה"); contact-form follow-up stays voluntary and explicitly carries no response promise ("אין הבטחת מענה"); operator-led build, maintenance, asset ownership and per-step approvals are never asserted — build appears only as a possibility to explore, with fit/scope/terms/price agreed directly if both sides decide ("אם נחליט יחד"), and nothing built or written to the profile without owner consent; the included/not-included distinction stays explicit in `compare.summary` (audit includes status picture + partial DIY guidance; excludes site build, GBP writes, paid purchase). No ad-spend/fee-separation wording may appear on this GBP-audit page (reserved for a future verified Ads offer).

---
Draft-only artifact. focused_acceptance is reported separately from release_health=false; the
public page has NOT changed. Disposition of this handoff is reconciled by the executor only.
