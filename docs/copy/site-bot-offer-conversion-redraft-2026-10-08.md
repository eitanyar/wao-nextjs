# Site-Bot + contact bridge — conversion voice redraft (DRAFT)

- Date: 2026-10-08
- Author: waocopy (Contract v3, handoff 2026-10-08_004, kanban t_0825ef70; owner-selected GPT-6.1 Sol / OpenAI Codex OAuth for this task only)
- Status: DRAFT ONLY — no production bytes, no preview, no existing draft changed by this document.
- Supersedes (claim cells only): `docs/copy/site-bot-offer-conversion-redraft-2026-10-07.md`,
  SHA-256 `0396e94cf4ccca9d24ba353293150382c6e170a1c26daf443f613892dc88b733`, preserved unchanged.
  Independent review t_487f723c found customer/local visibility and photo-authenticity overclaims.
  This complete paired successor corrects those claim classes only; unaffected cells stay byte-identical.
  Historical voice-packet provenance follows; those packets also stay untouched:
- Supersedes (voice only, for future application): `docs/copy/site-bot-offer-truth-2026-10-05.md`
  (Rev 4, SHA-256 `e8ffe348659ff53fd495c20703f9777afd656cccecc10c2951387e95fdd6df0f`) and
  `docs/copy/site-bot-contact-bridge-2026-10-06.md` (Rev 2, SHA-256
  `c4772ed012c0d4d588ef2138dda0bf98d3287b26a30911d8c6730caab685843a`) — both verified byte-identical
  before and after the original October 7 run. Those files stay pinned and untouched; this redraft replaces their
  Hebrew cells key-for-key. **One journey — the Site-Bot half and the contact half must be applied
  together, never one alone.**
- Source pins verified at draft time (2026-10-07, SHA-256; historical provenance, not new signoff):
  - `src/app/(app)/site-bot/page.tsx` — `3d278c141c77f9f16ac2232eaf47c58cd376ee66bb3bfddbffd897c2da9e7e80`
  - `src/app/(app)/contact/page.tsx` — `e8a4f6da596ce5b694657d42b21406a5207f98632e3b160307de1d878b41fbb7`
  - `src/components/ContactForm.tsx` — `0386844150e45b32287f5c8d204c53de256459ca3da49e63aff6dafdd551d670`
  - `src/app/(app)/site-bot/audit/page.tsx` — `c28e3aab175cdde8dfac1f278f89b31a3b56eb39546a6d14546f292c4f18f788` (read-only truth: `DIY_KEYS` :18, fail-gated DIY render :161-163, :219-254)
  - `src/app/api/site-bot/audit-lookup/route.ts` — `d95f6faf6b90c919f5add5d976576125595956ffa73fa9518608bad57554073b` (read-only truth: name-only body + `phone` rejected :76-83; conditional lookup 429/503/500 :85-122)
  - `src/lib/site-bot/scorecardCopy.ts` — read-only truth for the six dimensions and the audit-page
    voice (DIM_* :10-33, DIY_* :34-37). Auto-generated file; nothing here proposes editing it.
- Register: singular male, native Sabra Hebrew, sentences kept to ~12-15 words. Old strings are
  referenced by file:line and English description only (never retyped). Every replacement is
  original waocopy-authored Hebrew.

## Voice shift (why this draft exists)

The founder rejected the previous founder-preview copy as robotic, defensive and negative-dominant:
it led with what the reader cannot get. This redraft keeps the exact same truth boundary but moves
the negatives out of the lead. Structure of the pitch everywhere on the page:

1. **Free value first** — check the available information in your Google Business Profile. Name
   only, no signup, no phone, nothing gated.
2. **One small win** — if categories / opening hours / photos are missing, you get step-by-step
   self-fix instructions and can do the first fix yourself today.
3. **Optional help, made desirable** — the contact form is an open door after real free value, not
   a sales funnel apology. Continuation is mutual agreement, terms directly, nothing promised on-page.

Constraints appear as single quiet accuracy touches where they belong (one "no cart" line in the
price block, one honesty line about not-everything-visible, one candor line about response time on
the contact page) — never as recurring hero/FAQ/CTA disclaimers and never as an exclusions list.

## Journey map (one sentence per stop)

Free name-only audit at `/site-bot/audit` → conditional result across six dimensions with
step-by-step self-fix on failed categories/hours/photos only → first small fix done by the owner →
optional low-pressure contact form at `/contact#contact-form` → *possible* scoped next step, terms
agreed directly, by mutual consent. Nothing beyond the form itself is promised on the contact page.

---

## Part A — Keyed replacements: `src/app/(app)/site-bot/page.tsx` (all 27 `siteBot.*` keys)

### A.1 Metadata (lines 7-24) — all four rows **SEO-GATED** (title/OG changes need separate signoff)

Mechanics: `title.absolute` (:10-12) bypasses the root `"%s | WAO"` template and keeps its
RLM-anchored `‏ | WAO` suffix (comment :8-9 stays valid); the replacement below carries the
identical suffix mechanics. Canonical (:15), robots (:16), `openGraph.url/type` (:21-22) unchanged.

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `siteBot.metadata.title` **SEO-GATED** | page.tsx:10-12 | absolute title with ₪/24h/message-update promises | `בניית אתר לעסק קטן — בדיקת הפרופיל העסקי בגוגל, חינם‏ \| WAO` |
| `siteBot.metadata.description` **SEO-GATED** | page.tsx:13-14 | ₪9.90 trial + ₪1,490 package + 24h claims | `לפני שמשקיעים באתר — כדאי לבדוק אילו פרטים זמינים בפרופיל העסקי שלך בגוגל. בדיקה חינם של הפרופיל העסקי, לפי שם העסק בלבד. על מה שחסר תקבל הוראות לתיקון עצמי. בלי הרשמה ובלי התחייבות.` |
| `siteBot.metadata.ogTitle` **SEO-GATED** | page.tsx:18 | OG title with 24h/update promises | `בניית אתר לעסק קטן — בדיקת הפרופיל העסקי בגוגל, חינם` |
| `siteBot.metadata.ogDescription` **SEO-GATED** | page.tsx:19-20 | OG description duplicating paid claims | `לפני שמשקיעים באתר — כדאי לבדוק אילו פרטים זמינים בפרופיל העסקי שלך בגוגל. בדיקה חינם של הפרופיל העסקי, לפי שם העסק בלבד. על מה שחסר תקבל הוראות לתיקון עצמי. בלי הרשמה ובלי התחייבות.` |

SEO entity note: the established head term `בניית אתר לעסק קטן` leads the proposed title, OG title,
H1 and the unchanged badge (:139) — preserved per contract. Keyword targets woven through the page:
בדיקת הפרופיל העסקי בגוגל / חינם, פרטי הפרופיל, קטגוריות, שעות פתיחה, תמונות.
These are brief targets only, not measured keyword research or SERP/AIO acceptance.

### A.2 FAQS array (lines 26-51) — answers only; questions `.q` stay untouched

Questions feed the FAQPage schema via `FAQS.map` (:85-92), so schema and rendered answers stay
consistent automatically. Answers carry the pivot: each one answers the asked question honestly and
routes momentum back to the free check or the direct-agreement posture — no cell leads with a denial.

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `siteBot.faq1.a` | page.tsx:29 | ₪9.90/₪1,490 pricing answer | `הצעד הראשון לא עולה שקל. בדיקה חינם של הפרופיל העסקי שלך בגוגל — לפי שם העסק בלבד. את מה שחסר בקטגוריות, בשעות הפתיחה או בתמונות תוכל לתקן לבד, עם הוראות ברורות. ואם תרצה אתר בליווי שלנו, המחיר וההיקף מסוכמים ישירות מולך — בהסכמה, לפני כל עבודה.` |
| `siteBot.faq2.a` | page.tsx:33 | 24h go-live promise | `מתחילים ברגע שאתה מוכן: קודם בדיקה חינם של הפרופיל העסקי שלך בגוגל. ואם תרצה לבנות איתנו אתר, לו״ז העבודה הוא חלק מהסיכום הישיר מולך. מסכמים אותו יחד, לפני שמתחילים.` |
| `siteBot.faq3.a` | page.tsx:37 | chat-build + 24h package claim | `ממש לא. הבדיקה פשוטה: מזינים את שם העסק, בלי קוד ובלי ידע טכני. גם את התיקונים תעשה בעצמך בלי קוד — עם הוראות ברורות צעד-צעד. ורוצה בכל זאת ליווי מקצועי לאתר? אפשר לפנות דרך הטופס.` |
| `siteBot.faq4.a` | page.tsx:41 | WhatsApp auto-update + edits-forever claim | `אם האתר נבנה בליווי שלנו, כל עדכון עובר בתיאום ישיר מולך. אתה לא לבד מול העורך. את היקף העדכונים ואת התנאים מסכמים מראש, ביחד, לפני שמתחילים.` |
| `siteBot.faq5.a` | page.tsx:45 | owned-assets + WhatsApp-edit package claim | `קודם כל — אפשר בהחלט לבנות לבד, והבדיקה החינמית תעזור לך גם שם. היא מראה מה חסר בפרופיל העסקי שלך בגוגל, ונותנת הוראות לתיקון עצמי. ואם נבנה יחד — אתה לא צריך לחזור לעורך האתרים בכל פעם שהעסק משתנה. הכול, כולל הבעלות על נכסים כמו הדומיין, מסוכם ישירות מולך ובהסכמה.` |
| `siteBot.faq6.a` | page.tsx:49 | ₪1,490 five-pages/forever-edits bundle claim | `אתה בהחלט יכול לבנות לבד — והזמן שלך שווה כסף. הבדיקה החינמית נשארת שלך בכל מקרה: תמונת מצב של הפרופיל בגוגל, עם הוראות לתיקון עצמי. ואם תרצה בכל זאת ליווי מקצועי לאתר, מסכמים הכול ישירות מולך — היקף, תנאים ומחיר, בהסכמה. אין חבילה קבועה מראש בעמוד.` |

### A.3 Service schema (lines 53-94)

| Key | Source | Old (reference) | Replacement / action |
|---|---|---|---|
| `siteBot.schema.serviceName` | page.tsx:58 | Service `name` with fixed-price wording | `Site Bot — בניית אתר לעסק קטן בליווי אישי` |
| — | page.tsx:66-79 | `offers` array: two priced Offer objects | `ENGINEER_REMOVE` — carried unchanged from the pinned packet: delete the entire `offers` array (no payable public offer while both checkout POSTs return fixed 503); no zero-price/"free" Offer substitute; verify no orphaned references. |
| — | page.tsx:81-93 | FAQPage schema | No action — derives from `FAQS`; consistency automatic once A.2 replaces :29/:33/:37/:41/:45/:49. |

### A.4 STEPS array (lines 96-100) — the momentum ladder: see → fix one → optional help

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `siteBot.steps.1` | page.tsx:97 | start-in-chat step | `מזינים רק את שם העסק. הבדיקה מחפשת את הפרופיל העסקי שלך בגוגל. אם הוא נמצא — היא בודקת את פרטי הפרופיל הזמינים ומציגה לך תוצאה והסבר. שישה סעיפים: קטגוריות, שעות פתיחה, תמונות, טלפון ואתר, ביקורות ותיאור.` |
| `siteBot.steps.2` | page.tsx:98 | tell-us-about-business step | `אם משהו חסר בקטגוריות, בשעות הפתיחה או בתמונות — תקבל הוראות צעד-צעד לתיקון עצמי. את התיקון הקטן הראשון תוכל לעשות עוד היום. בחינם, כמובן.` |
| `siteBot.steps.3` | page.tsx:99 | 24h go-live/private-domain step | `רוצה יותר? אפשר לפנות אלינו דרך טופס יצירת הקשר ולבדוק ליווי מקצועי. כל המשך מסוכם ישירות מולך — היקף, תנאים ומחיר — רק בהסכמה, לפני כל עבודה.` |

### A.5 Hero (lines 132-171)

| Key | Source | Old (reference) | Replacement / action |
|---|---|---|---|
| — | page.tsx:139 | badge text | KEEP UNCHANGED — carries the entity anchor `בניית אתר לעסק קטן` with no false claim. |
| `siteBot.hero.h1` **SEO-GATED** | page.tsx:152 | H1 with ₪1,490 + 24h + message-update | `בניית אתר לעסק קטן? קודם בדוק את פרטי הפרופיל העסקי שלך בגוגל — חינם` |
| `siteBot.hero.sub` | page.tsx:157 | WhatsApp-edit + ₪9.90 + five-pages paragraph | `לפני שאתה משקיע באתר, כדאי לבדוק אילו פרטים זמינים בפרופיל העסקי שלך בגוגל. הבדיקה שלנו חינם — מזינים רק את שם העסק, בלי הרשמה ובלי טלפון. תראה מה מסודר ומה חסר במידע הזמין. ומה שחסר בקטגוריות, בשעות הפתיחה או בתמונות — תקבל הוראות לתקן לבד, עוד היום.` |
| `siteBot.hero.cta` | page.tsx:166 | primary CTA label with ₪9.90 | `לבדוק את פרטי הפרופיל בגוגל — חינם` |
| — | page.tsx:162 | CTA `href="/site-bot/start"` | `ENGINEER_REDIRECT` → `href="/site-bot/audit"` — carried unchanged; `/site-bot/start` stays forbidden as a public destination (disabled checkout + payment promises, start/page.tsx:244-258, 294-301, 414-419). |
| `siteBot.hero.micro` | page.tsx:170 | price microcopy line | `הבדיקה חינם — רק שם העסק, בלי הרשמה ובלי התחייבות. ואם תרצה עזרה מקצועית בהמשך, טופס יצירת הקשר שלנו פתוח.` |

### A.6 Module-5 graduate objection block (lines 229-250)

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| — | page.tsx:242 | block heading | KEEP UNCHANGED — no false claim. |
| `siteBot.graduate.body` | page.tsx:246 | paragraph ending in full-package WhatsApp-edit claim | `למדת בקורס של WAO לבנות אתר בעצמך? כל הכבוד — ואתה מוזמן ללכת עם זה עד הסוף. גם בונה עצמאי מרוויח מהבדיקה החינמית: תמונת מצב של הפרופיל בגוגל, והוראות לתיקון עצמי. ויש ימים שבהם לקוח מחכה לתשובה, ודווקא אז עדיף שמישהו אחר יטפל באתר. רוצה לבדוק את האפשרות הזאת? הפנייה דרך הטופס חינם, וכל המשך — רק בהסכמה, בתיאום ישיר מולך.` |

### A.7 Price anchor block (lines 253-292) — repitched as "the first step is free"

| Key | Source | Old (reference) | Replacement / action |
|---|---|---|---|
| `siteBot.price.para` | page.tsx:257 | fixed-price/no-subscription paragraph | `כאן אין עגלת קניות — וזה דווקא לטובתך. הצעד הראשון חינם לגמרי: בדיקת הפרופיל העסקי שלך בגוגל, לפי שם העסק בלבד. תקבל תמונת מצב, ועל מה שחסר בקטגוריות, בשעות או בתמונות — הוראות לתקן לבד. רוצה אתר בליווי שלנו? אפשר לפנות דרך הטופס. התנאים — כולל המחיר — מסוכמים ישירות מולך, בהסכמה, לפני כל עבודה.` |
| `siteBot.price.cta` | page.tsx:266 | CTA label with ₪9.90 | `לבדיקה החינמית של הפרופיל העסקי בגוגל` |
| — | page.tsx:262 | CTA `href="/site-bot/start"` | `ENGINEER_REDIRECT` → `href="/site-bot/audit"` (carried unchanged). |
| `siteBot.price.sub` | page.tsx:271 | ₪9.90 preview/no-subscription line | `הבדיקה בודקת את פרטי הפרופיל העסקי שלך בגוגל לפי המידע הזמין. אם משהו חסר בקטגוריות, בשעות הפתיחה או בתמונות — ההוראות לתיקון עצמי מחכות לך שם, חינם. כל תיקון כזה יכול להסיר מכשול בדרך ללקוחות שמחפשים אותך.` |
| `siteBot.price.box` | page.tsx:287 | what's-included trial/package box | `מה יש בבדיקה? מזינים את שם העסק, והבדיקה עוברת על פרטי הפרופיל העסקי שלך בגוגל. היא בודקת שישה סעיפים לפי המידע הזמין: קטגוריות, שעות פתיחה, תמונות, טלפון ואתר, ביקורות ותיאור. כשנמצא הפרופיל, תקבל תוצאה והסבר לכל סעיף לפי המידע הזמין לבדיקה. אם משהו חסר בקטגוריות, בשעות או בתמונות — תקבל גם הוראות צעד-צעד לתיקון עצמי, בחינם. חלק מהנתונים לא תמיד גלויים מבחוץ, והבדיקה מציגה גם את זה בכנות. הבדיקה לא כותבת כלום בפרופיל שלך. היא גם לא מבטיחה דירוג. היא נותנת תמונת מצב של המידע הזמין — וצעד ראשון שאפשר לעשות היום.` |

Six dimensions match the audit scorecard (scorecardCopy.ts DIM_* :10-33; build plan §65-70). DIY
coverage names exactly the three `DIY_KEYS` dimensions (audit/page.tsx:18,161-163,219-254) and is
fail-gated in every cell ("אם משהו חסר…"). "יכול להסיר מכשול" is the approved obstacle framing —
no measurable-exposure promise anywhere.

### A.8 Three-way comparison summary (lines 333-353)

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `siteBot.compare.summary` | page.tsx:351 | ₪1,490/24h/edits-forever summary line | `Site Bot: מתחילים בבדיקה חינם של הפרופיל העסקי בגוגל — מזינים רק את שם העסק. אם הפרופיל נמצא, תקבל תמונת מצב של המידע הזמין לבדיקה, ועל קטגוריות, שעות או תמונות שחסרות — גם הוראות לתקן לבד. רוצה ליווי מקצועי לאתר? אפשר לפנות דרך הטופס, וכל המשך — היקף, תנאים ומחיר — מסוכם ישירות מולך, בהסכמה.` |

COMPARE rows (:102-115) and the comparison heading (:307): reviewed against current source, no
false claim — leave unchanged. Cross-links block (:417-437): leave unchanged.

### A.9 Closing CTA banner (lines 439-466)

| Key | Source | Old (reference) | Replacement / action |
|---|---|---|---|
| `siteBot.cta.heading` | page.tsx:445-447 | heading with gradient `₪1,490` span | `Site Bot — מתחילים בבדיקה חינם`. Structural note carried unchanged: the `text-gradient` span currently wraps the price; engineer re-wraps `מתחילים בבדיקה חינם` in the same span markup (`Site Bot` node stays outside the span). |
| `siteBot.cta.sub` | page.tsx:449 | price microcopy | `בדיקת הפרופיל העסקי שלך בגוגל — חינם, בלי הרשמה ובלי התחייבות. רוצה עזרה עם מה שמצאת? טופס יצירת הקשר שלנו פתוח.` |
| `siteBot.cta.primary` | page.tsx:457 | primary CTA label with ₪9.90 | `לבדיקת פרטי הפרופיל שלך בגוגל — חינם` |
| — | page.tsx:453 | CTA `href="/site-bot/start"` | `ENGINEER_REDIRECT` → `href="/site-bot/audit"` (carried unchanged). |
| — | page.tsx:459-460 | secondary contact link | NO ACTION — verified against current source SHA: href is already `/contact?ref=site-bot-offer#contact-form` (the pinned packet's redirect note predates this source state). Label `יש לך שאלה? פנה אלינו` KEEP UNCHANGED — names the form, promises no response. |

### A.10 Flagged addition beyond the 27 keys — steps-section heading (strategist acceptance required)

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `siteBot.stepsHeading` (NEW, FLAGGED) | page.tsx:196 | heading promising "you tell us, we launch the site" | `שלושה צעדים — והראשון חינם` |

Rationale: the pinned packet marked this heading KEEP UNCHANGED, but it asserts an operator
site-launch service and directly contradicts the audit-first STEPS in A.4 (acceptance criterion:
"no contradictory journey"). It is a heading, not metadata/H1/badge — no SEO-anchor impact. The
strategist/reviewer may drop this row and keep the old heading if strict 27-key scope is preferred;
in that case the A.4 steps and the heading above them will read inconsistently.

## Part B — Consolidated ENGINEER actions (non-copy; carried from the pinned packet, one update)

1. `ENGINEER_REMOVE` page.tsx:66-79 — the entire `offers` array (both priced Offers); verify no
   orphaned schema/FAQ references remain.
2. `ENGINEER_REDIRECT` page.tsx:162, 262, 453 — all three `href="/site-bot/start"` →
   `href="/site-bot/audit"`.
3. Secondary contact href page.tsx:459 — NO ACTION needed (already `?ref=site-bot-offer#contact-form`
   in current source; the old packet's item 3 is superseded by this verification).
4. Structural: page.tsx:446 gradient span re-wrap (A.9 row).
5. Metadata replacements (A.1) plus `siteBot.hero.h1` are gated on SEO signoff before application.

---

## Part C — Companion keyed replacements: contact page + form success state

Journey alignment: the Site-Bot cells above route readers to `/contact#contact-form`
(`siteBot.steps.3`, `faq1.a`, `faq3.a`, `price.para`, `compare.summary`, `cta.sub`, `hero.micro`);
the cells below make that destination congruent — warm, open door, zero pressure, zero promises
beyond the form, and the audit offered as the do-it-yourself starting point.

### C.1 `src/app/(app)/contact/page.tsx` metadata (lines 7-19) — all four rows **SEO-GATED**

Mechanics carried unchanged: line 8 is a plain-string `title` under the root `"%s | WAO"` template;
`alternates.canonical` (:11), `robots` (:12), `openGraph.url/type` (:16-17) and all three schemas
(:21-58) stay byte-identical.

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `contact.metadata.title` **SEO-GATED** | page.tsx:8 | free-first-consultation title | `צור קשר — הטופס פתוח, בלי התחייבות` |
| `contact.metadata.description` **SEO-GATED** | page.tsx:9-10 | description with 24h-response SLA, phone number, B2C-only claim | `רוצה עזרה מקצועית לעסק? ספר לנו על העסק בטופס — בלי לחץ ובלי התחייבות. מעדיף להתחיל לבד? בדיקה חינם של הפרופיל העסקי שלך בגוגל, לפי שם העסק בלבד.` |
| `contact.metadata.ogTitle` **SEO-GATED** | page.tsx:14 | OG title with free-consultation claim (keep the existing ` \| WAO` suffix pattern of the current string) | `צור קשר — הטופס פתוח, בלי התחייבות \| WAO` |
| `contact.metadata.ogDescription` **SEO-GATED** | page.tsx:15 | OG description with 24h-response SLA | `ספר לנו על העסק בטופס — בלי לחץ ובלי התחייבות. או התחל לבד: בדיקה חינם של הפרופיל העסקי שלך בגוגל, לפי שם העסק בלבד.` |

### C.2 STEPS array (lines 60-79) — three items, same array length, `n` values kept

The unrendered `tags` arrays (:65, :71, :77) KEEP UNCHANGED per this contract — the pinned
bridge's OPTIONAL data-hygiene tag replacements are deliberately dropped.

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `contact.steps.1.title` | page.tsx:63 | 20-minute discovery-call step title | `פונים דרך הטופס — חינם` |
| `contact.steps.1.desc` | page.tsx:64 | discovery-call description | `כותבים לנו על העסק ועל מה שמעכב אותו. בלי לחץ ובלי התחייבות — ואפשר לצרף גם את מה שיצא לך בבדיקה החינמית.` |
| `contact.steps.2.title` | page.tsx:69 | tailored-proposal-in-24-48h step title | `מעדיף להתחיל לבד? יש בדיקה חינם` |
| `contact.steps.2.desc` | page.tsx:70 | proposal-with-channels/costs/KPI description | `בדיקה של הפרופיל העסקי שלך בגוגל, לפי שם העסק בלבד. אם הפרופיל נמצא, היא בודקת את הפרטים הזמינים ומציגה לך תוצאה והסבר. ועל קטגוריות, שעות או תמונות שחסרות — תקבל הוראות לתיקון עצמי, בחינם.` |
| `contact.steps.3.title` | page.tsx:75 | start-then-pay step title | `ואם נוצר חיבור? מסכמים ישירות` |
| `contact.steps.3.desc` | page.tsx:76 | pay-after-first-month description | `אם הפנייה מתאימה לשני הצדדים, כל המשך — היקף, תנאים ומחיר — מסוכם מולך ישירות ובהסכמה. אנחנו מעדיפים לתאם ציפיות מולך אישית, ולא בהבטחות גורפות בעמוד.` |

### C.3 FAQS array (lines 81-98) — four items, same array length

Mechanics carried: `<details key={faq.q}>` (:251) keys off the question text — replacing
`contact.faqs.1.q` changes that key; no schema derives from this array. Questions 2-4 (:87, :91,
:95) are neutral and KEEP UNCHANGED.

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `contact.faqs.1.q` | page.tsx:83 | question presupposing a priced first consultation | `האם הפנייה דרך הטופס עולה משהו או מחייבת?` |
| `contact.faqs.1.a` | page.tsx:84 | free 20-30-minute consultation answer | `הפנייה חינם, והיא לא מחייבת כלום — לא שיחה מתואמת ולא חוזה. אם ייצא מזה המשך, הכול יסוכם איתך ישירות ובהסכמה מלאה.` |
| `contact.faqs.2.a` | page.tsx:88 | respond-within-24-business-hours + urgent-call answer | `אנחנו לא מבטיחים זמן מענה בעמוד — עדיף להיות כנים איתך. אם זה דחוף, הטלפון שלנו מופיע כאן בעמוד. אפשר להתקשר ישירות.` |
| `contact.faqs.3.a` | page.tsx:92 | B2C-only specialization answer | `כל פנייה נבדקת לגופה. ואם נראה שמה שיש לנו לא מתאים לעסק שלך — נגיד לך את זה ישר ובכנות.` |
| `contact.faqs.4.a` | page.tsx:96 | month-to-month / pay-after-results answer | `אין מחירון בעמוד ולא חוזה ארוך טווח שמחכה לך. אם נחליט לעבוד יחד, התנאים והמחיר מסוכמים מולך ישירות — לפני כל עבודה.` |

### C.4 Hero (lines 138-170)

| Key | Source | Old (reference) | Replacement / action |
|---|---|---|---|
| `contact.hero.badge` | page.tsx:140 | badge promising free-no-obligation first consultation | `פנייה חופשית — בלי התחייבות ובלי לחץ` |
| `contact.hero.h1` **SEO-GATED** | page.tsx:152-155 | H1 inviting a short call that can change the business direction | Three text nodes, same markup pattern: node 1 (:152, before the `{" "}`) `רוצה עזרה לעסק שלך?`; gradient-span node (:153) `הפנייה חינם`; node 3 (:155, after the `<br/>` + `{" "}`) `ואת הצעד הראשון אתה עושה כבר היום`. Structural note carried: engineer re-wraps the new gradient text in the same span markup; `{" "}` spacers and `br.hidden md:block` stay as-is. |
| `contact.hero.sub` | page.tsx:158 | sub-paragraph promising forms that don't disappear + a real conversation with a named human | `ספר לנו על העסק בטופס — מה אתה מוכר ומה מאתגר אותך עכשיו. מעדיף להתחיל לבד? יש בדיקה חינם של הפרופיל העסקי שלך בגוגל, לפי שם העסק בלבד. אם הפרופיל נמצא, היא נותנת תמונת מצב של המידע הזמין לבדיקה. ואם חסר משהו בקטגוריות, בשעות או בתמונות — תקבל הוראות לתיקון עצמי.` |
| — | page.tsx:169 | form-section H2 (send-inquiry) | KEEP UNCHANGED — neutral. |
| — | page.tsx:170 | `<ContactForm source="contact-page" />` | KEEP UNCHANGED — the `source` prop feeds lead attribution. |

Out of range, KEEP UNCHANGED: contact-info cards (:175-219) — PhoneReveal (:182-186), email,
address, displayed business hours (:192, factual listing), LinkedIn (:210-218); process-mini
eyebrow (:223) and FAQ eyebrow (:244).

### C.5 Relevant heading (lines 245-248)

| Key | Source | Old (reference) | Replacement / action |
|---|---|---|---|
| `contact.headings.faqH2` | page.tsx:246 | FAQ H2 in plural register | Singular-male register fix: `כל מה שרצית לדעת` — the gradient span text (:247) stays byte-identical. Register-only change, not an SEO anchor. |

### C.6 `src/components/ContactForm.tsx` success state (lines 104-116)

Mechanics carried unchanged: success block structure (:84-127), ✅ icon (:95), `<h3>` (:96-105),
`<p>` with `<br/>` (:115) and the `tel:` link (:117-123) all untouched; only the three text nodes
below change. Truth class: the success state renders only after HTTP OK **plus** parsed `{ok:true}`
(ContactForm.tsx:71-78), which `api/lead/route.ts` returns only on SMTP recipient acceptance
(:130-134, acceptance checked :86-93) — a machine-level acknowledgement of the send. The headline
states the acknowledged send; the absence of a response promise is one honest subordinate clause,
never the headline; the phone fallback stays as the verify-or-urgent path.

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `contactForm.success.h3` | ContactForm.tsx:104 | success heading claiming the inquiry was received | `תודה — הפנייה נשלחה` |
| `contactForm.success.p1` | ContactForm.tsx:114 | we-will-call-you-back-within-24-business-hours line | `הפנייה נשלחה, וקיבלנו אישור מסירה מהמערכת. אנחנו לא מבטיחים זמן מענה בעמוד — עדיף להיות כנים.` |
| `contactForm.success.p2` | ContactForm.tsx:116 | call-Eitan-now line (before the `{" "}` + tel link) | `רוצה לוודא שהפנייה הגיעה, או שזה דחוף? אפשר להתקשר ישירות:` |

### C.7 Supplemental rows — same claim class, flagged for strategist acceptance (carried status)

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `contactForm.button.submit` (FLAGGED) | ContactForm.tsx:258 | submit label promising send-inquiry + free-first-consultation | `לשליחת הפנייה` — only the idle-state branch string changes; the loading-state string and disabled logic (:248) stay byte-identical. |
| `contactForm.micro.footer` (FLAGGED) | ContactForm.tsx:270 | ✓-list with no-contract / free-consultation / 24h-response claims | `✓ הפנייה חינם ✓ בלי התחייבות ✓ בלי לחץ` |

Out of range, KEEP UNCHANGED: required name/phone fields (:131-165), optional email (:167-182),
service select (:184-212, `SERVICES` :6-13), optional message (:214-229), mandatory privacy
consent (:231-232), error message (:242 — truthful retry-or-call fallback).

---

## Part D — English key inventory and claim-check

### D.1 Key inventory (51 keyed replacement rows + 1 flagged addition)

Site-Bot — all 27 keys of the pinned packet, one-to-one, same path/line mapping:
`siteBot.metadata.title`, `.description`, `.ogTitle`, `.ogDescription` (4, SEO-GATED) ·
`siteBot.faq1.a`-`faq6.a` (6) · `siteBot.schema.serviceName` (1) · `siteBot.steps.1`-`.3` (3) ·
`siteBot.hero.h1` (SEO-GATED), `.sub`, `.cta`, `.micro` (4) · `siteBot.graduate.body` (1) ·
`siteBot.price.para`, `.cta`, `.sub`, `.box` (4) · `siteBot.compare.summary` (1) ·
`siteBot.cta.heading`, `.sub`, `.primary` (3). Plus FLAGGED addition `siteBot.stepsHeading`
(page.tsx:196, journey-congruence fix — strategist may drop; see A.10).

Contact bridge — all 24 rendered keyed rows of the pinned bridge: `contact.metadata.title`,
`.description`, `.ogTitle`, `.ogDescription` (4, SEO-GATED) · `contact.steps.1.title/.desc`-
`3.title/.desc` (6) · `contact.faqs.1.q`, `contact.faqs.1.a`-`4.a` (5) · `contact.hero.badge`,
`.h1` (SEO-GATED), `.sub` (3) · `contact.headings.faqH2` (1) · `contactForm.success.h3`, `.p1`,
`.p2` (3) · `contactForm.button.submit`, `.micro.footer` (2, FLAGGED supplemental).

Exclusions (intentional, per this contract): the three unrendered `tags` arrays
(contact/page.tsx:65, :71, :77) are left unchanged — the pinned bridge's OPTIONAL tag replacements
are dropped. No other optional unrendered key exists in either pinned draft. KEEP UNCHANGED rows:
site-bot badge (:139), headings (:242, :307), COMPARE rows (:102-115), FAQ questions (.q, all six),
cross-links (:417-437), secondary contact link (:459-460, already correct in current source);
contact FAQ questions :87/:91/:95, form H2 (:169), eyebrows (:223, :244), contact-info cards, all
form fields, consent, error message, canonical/robots/all schemas.

### D.2 Where the pitch mechanics live (contract requirement 5)

- **Free value** (available profile-information check): hero.h1 + hero.sub (A.5), steps.1 (A.4),
  price.box + price.sub (A.7), compare.summary (A.8), metadata description, contact steps.2 +
  hero.sub (C.1-C.4).
- **First small win** (one feasible fix, done independently today): steps.2 (A.4), price.sub
  "יכול להסיר מכשול" (A.7), price.box closing line (A.7), faq1.a/faq3.a/faq5.a/faq6.a (A.2),
  graduate.body (A.6), contact steps.2.desc + hero.sub (C.2/C.4).
- **Optional offer, made desirable not defensive**: steps.3 (A.4), hero.micro (A.5), faq1.a-faq4.a
  (A.2), price.para (A.7), cta.sub (A.9); entire contact page tone (C.1-C.7).

### D.3 Claim-check (draft boundary descriptions — not independent acceptance)

1. **Name-only, ungated**: form sends `businessName` only (audit/page.tsx:104); API rejects a
   `phone` field (audit-lookup/route.ts:81-83) → "מזינים רק את שם העסק" / "בלי טלפון" (hero.sub).
2. **Conditional result, no guaranteed report**: lookup can return 429/503/500 or zero candidates
   (route.ts:85-122); a not-found state exists (audit/page.tsx:634-675) → conditionality lives in
   steps.1 ("אם הוא נמצא"), price.box, compare.summary and contact steps.2.desc/hero.sub;
   results describe available profile information, not local/customer-specific Search/Maps visibility.
3. **Three-dimension DIY only, fail-gated**: `DIY_KEYS = categories/hours/photos`
   (audit/page.tsx:18), DIY block renders only when `dim.status === 'fail'` (:161-163, :219-254) →
   every self-fix cell says "אם משהו חסר בקטגוריות, בשעות (הפתיחה) או בתמונות" and names exactly
   those three; the six-dimension list never implies DIY on all six.
4. **Six dimensions real; no authenticity validation**: categories, hours, photos, phone/website,
   reviews, description (scoreAudit:45-114) → steps.1 and price.box lists match exactly.
   Photos are fetched/count data only (audit-lookup/route.ts:minimizeCandidate:64-65;
   auditScore.ts:80-87), not evidence of authenticity; historical scorecard wording is not validation.
5. **Unknown-status honesty**: unknown dimensions are presented as not visible from outside
   (scorecardCopy DIM_*_UNKNOWN) → price.box keeps one candor line ("לא תמיד גלויים מבחוץ… בכנות").
6. **No ranking/traffic/lead/timing promise**: zero "תוך X", zero exposure guarantee; the only
   effect claim is the approved obstacle framing "יכול להסיר מכשול" (price.sub) and the explicit
   quiet disclaimer "לא מבטיחה דירוג" (price.box, once).
7. **No automatic GBP writes**: price.box states the audit writes nothing to the profile; no cell
   implies edits on the user's behalf. The scorecard's FIX_APPROVE_* strings are out of this
   draft's scope and are not amplified as promises.
8. **No price/package/checkout claim**: zero ₪ figures in any replacement; checkout stays
   inaccessible — all `/site-bot/start` CTAs redirect to `/site-bot/audit` (Part B); the only
   commercial posture is "terms incl. price agreed directly, by mutual consent, before any work".
9. **No response SLA / no consultation / no human-availability claim**: contact faqs.2.a and
   success.p1 state the absence of a promised response time once each, as candor, never as
   headline; success.h3 says "נשלחה" (acknowledged send — ContactForm.tsx:71-78 +
   api/lead/route.ts:130-134 SMTP recipient acceptance), never "התקבלה" by a human; the phone
   fallback (untouched tel: link, PhoneReveal) is offered for verify-or-urgent only. The named-human
   conversation promise of the current hero (:158) is removed.
10. **No ownership/maintenance policy assertion**: faq5.a frames domain/asset ownership as a matter
    agreed directly ("מסוכם ישירות מולך ובהסכמה"), not an established policy; faq4.a frames updates
    as conditional on an accompanied build ("אם האתר נבנה בליווי שלנו").
11. **Register**: singular male throughout ("תרצה", "תקבל", "תוכל", "שלך", "אתה"); the two plural-
    register survivors in current source (contact H2 :246, hero :152) are corrected in their cells;
    impersonal plurals ("מזינים", "מסכמים", "אפשר לפנות") are standard Hebrew instruction voice.
    Sentences kept to ~12-15 words (longest cells are the enumerating box/steps rows, where the
    six-item list carries the length).
12. **SEO anchors**: `בניית אתר לעסק קטן` leads title.absolute, ogTitle, hero.h1 and the unchanged
    badge; GBP-audit / profile-information / categories / hours / photos entities woven through A.2,
    A.4-A.9 and C.2/C.4. All metadata rows + both H1 rows marked SEO-GATED for separate signoff.
13. **Structure**: FAQS/STEPS array lengths unchanged on both pages; `key={faq.q}` impact of
    `contact.faqs.1.q` noted (C.3); canonical, robots, schemas, markup mechanics, `source`
    attribution and all functional URLs untouched.

---

Draft-only artifact. focused_acceptance means draft completeness self-check only, not independent
language/claim PASS or founder approval; release_health=false. The public pages and the pinned
preview have NOT changed. Open gates before any application: Eitan founder rendered-voice
spot-check, independent Hebrew/claim QA (waohebrewqa) on the exact new bytes, SEO signoff on the
gated rows, structural review, and a separate byte-exact engineer application contract (this draft
plus its contact half applied together, never alone). Contract 2026-10-08_004 permits no application,
preview generation/activation, build, publication or deployment.

## October 8 claim-only correction handoff

- Changed replacement keys (12): `siteBot.metadata.description`, `siteBot.metadata.ogDescription`,
  `siteBot.steps.1`, `siteBot.hero.h1`, `siteBot.hero.sub`, `siteBot.hero.cta`, `siteBot.price.sub`,
  `siteBot.price.box`, `siteBot.compare.summary`, `siteBot.cta.primary`, `contact.steps.2.desc`,
  `contact.hero.sub`. All other 40 replacement cells, all source/old-reference/key/flag cells,
  three contact H1 nodes, KEEP/NO ACTION rows and Part B structural ENGINEER actions are retained.
- Correction intent: replace implied customer/local Search/Maps views with available profile-data
  checking; extend that correction to metadata and CTA labels carrying the same implication.
  Retain the free check, failed-category/hour/photo DIY and optional agreed-help journey.
  Photo dimension language refers to photos only, never authenticity validation.
- Current read-only source evidence: `src/app/api/site-bot/audit-lookup/route.ts:minimizeCandidate:54-69`
  and `POST:76-122` search by name and retain presence/count fields with config/rate/budget/error
  branches; `src/app/api/site-bot/audit-result/route.ts:readyResponse:11-17` and `GET:33-52` return
  scored snapshots or conditional no-match/pick outcomes; `src/lib/gbp/auditScore.ts:scoreAudit:45-114`
  evaluates six dimensions, with photos fetched/count only at :80-87. No customer location,
  customer-specific ranking or photo authenticity is measured by these functions.
- Current contact evidence retained: `ContactForm.tsx:handleSubmit:71-78` requires parsed `ok:true`;
  `src/app/api/lead/route.ts:sendLeadEmail:86-93` / `POST:130-134` establish SMTP recipient acceptance
  only, not mailbox/human receipt. Success cells remain unchanged.
- Exact key coverage, unchanged-cell comparison and old/new SHA are reported on the board handoff
  after tool checks. The final whole-file SHA is external to this file to avoid self-referential hashing.
- independent_language_claim_acceptance=pending; founder_voice_approval=open; SEO_approval=open;
  preview_activation=false; release_health=false. No new guarantees or measured keyword claims.
