# Contact bridge — `/contact` page + form success state (DRAFT)

- Date: 2026-10-06
- Author: waocopy (Contract v3, handoff 2026-10-06_005, kanban t_ccc58ba3; completes the journey
  started by Contract 2026-10-06_002 / blocked t_9fe6a3c8)
- Status: DRAFT ONLY — no production bytes changed by this document.
- Rev 2 (2026-10-06, Contract v3 handoff 2026-10-06_038, kanban t_f79d04dc; pre-rev SHA-256
  `d427665a91ab0b26c8bdacbd6cd7694a40a3e35581da26349458b9fc4b142815`): English source pins,
  form/route line citations and §7 intake semantics reconciled with the current acknowledged,
  fail-closed `/api/lead` route; every Hebrew candidate cell and every remaining gate preserved.
- Companion packet: `docs/copy/site-bot-offer-truth-2026-10-05.md` (Rev 4, post-completion
  SHA-256 `e8ffe348659ff53fd495c20703f9777afd656cccecc10c2951387e95fdd6df0f`; pre-completion
  partial `d48ec2d8f8b2f443f41df35d5a1922eb667a5d08a10d0d37fba032c692d09755`; Rev 3
  `75977ed6fba3dc1f14f5897eb068843110d05e54355ecaefd15d9709b3c0ebad`). The packet routes
  Site-Bot readers to `/contact#contact-form` (`siteBot.steps.2`, `faq1.a`, `faq2.a`,
  `price.para`, `compare.summary`, `cta.sub`); this bridge makes that destination congruent.
  **The two drafts must be applied together — neither alone.**
- Source pins verified at draft time (2026-10-06, SHA-256):
  - `src/app/(app)/contact/page.tsx` — `e8a4f6da596ce5b694657d42b21406a5207f98632e3b160307de1d878b41fbb7`
  - `src/components/ContactForm.tsx` — `0386844150e45b32287f5c8d204c53de256459ca3da49e63aff6dafdd551d670`
  - `src/app/api/lead/route.ts` — `139c5b954f87a76879666830987befb3efdc10fe6c0a7d39b64a1bbf9f5d1937` (read-only; acknowledged fail-closed intake, §7)
- Old Hebrew strings are referenced by `file:line` only (never duplicated here). Every
  replacement is original waocopy-authored Hebrew: singular male, native Sabra register,
  short sentences.
- Keys use `contact.<area>.<slot>` / `contactForm.<slot>`. Rows marked **SEO-GATED** propose
  title/H1/metadata changes and require SEO signoff before application.

## 1. Journey this bridge may promise (claim boundary)

Free name-only Google Business Profile audit at `/site-bot/audit` → conditional result with
partial DIY guidance (failed categories/hours/photos only) → **optional, low-pressure contact
form** → *possible* scoped, human-led next step, only by mutual agreement, terms discussed
directly. The contact page promises NOTHING beyond the form itself: no consultation offer or
duration, no response time or SLA, no pay-after-first-month/no-risk terms, no service-scope or
B2C-only declaration, no named-human availability, no booked call, no successful delivery, no
pricing, no timeline, no rank/lead/volume guarantee, no ownership or maintenance policy.
Entity anchors woven through the copy: small-business website, Google Business Profile audit,
local visibility (what nearby customers see), self-fix categories/hours/photos, optional
site-building support. Persona: skeptical, busy Israeli small-business owner who has been
burned by agencies promising the moon.

## 2. Keyed replacements — `src/app/(app)/contact/page.tsx`

### 2.1 Metadata (lines 7–19) — all four rows **SEO-GATED**

Mechanics note: line 8 is a plain-string `title` (the root `"%s | WAO"` template appends the
suffix — unlike the Site-Bot page's `title.absolute`); the replacement keeps plain-string
mechanics. `alternates.canonical` (:11), `robots` (:12), `openGraph.url/type` (:16–17) and the
whole `schemas` block (:21–58, incl. IDs `#webpage` :25, `#org` :33, WebSite ref :28,
BreadcrumbList :50–57) stay byte-identical — no schema or canonical change is proposed.

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `contact.metadata.title` **SEO-GATED** | page.tsx:8 | free-first-consultation title | `צור קשר — פנייה חופשית, בלי התחייבות` |
| `contact.metadata.description` **SEO-GATED** | page.tsx:9-10 | description with 24h-response SLA, phone number, B2C-only specialization | `רוצה לדבר איתנו? טופס הפנייה של WAO פתוח — בלי התחייבות ובלי לחץ. אפשר גם להתחיל לבד, עם בדיקה חינם של הפרופיל העסקי שלך בגוגל — לפי שם העסק בלבד.` |
| `contact.metadata.ogTitle` **SEO-GATED** | page.tsx:14 | OG title with free-consultation claim (keep the existing ` | WAO` suffix pattern of the current string) | `צור קשר — פנייה חופשית, בלי התחייבות | WAO` |
| `contact.metadata.ogDescription` **SEO-GATED** | page.tsx:15 | OG description with 24h-response SLA | `טופס הפנייה של WAO — בלי התחייבות ובלי לחץ. רוצה להתחיל לבד? בדיקה חינם של הפרופיל העסקי שלך בגוגל, לפי שם העסק בלבד.` |

### 2.2 STEPS array (lines 60–79) — three items, same array length

Mechanics note: each item keeps its `n` value (`01`/`02`/`03`) and its object shape. The
`tags` arrays are NOT rendered by the current JSX (:225–233 render `n`, `title`, `desc` only);
proposed tag replacements below are data hygiene, marked OPTIONAL.

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `contact.steps.1.title` | page.tsx:63 | 20-minute discovery-call step title | `פונים דרך הטופס — חינם` |
| `contact.steps.1.desc` | page.tsx:64 | discovery-call description (no-sale framing) | `מספרים על העסק ועל האתגר. בלי התחייבות, בלי תיאום שיחה ובלי לחץ.` |
| `contact.steps.1.tags` (OPTIONAL, not rendered) | page.tsx:65 | English tags: discovery/goals/no-pressure | `["Free", "No-commitment", "No-pressure"]` |
| `contact.steps.2.title` | page.tsx:69 | tailored-proposal-in-24–48h step title | `רוצה להתחיל לבד? יש בדיקה חינם` |
| `contact.steps.2.desc` | page.tsx:70 | proposal-with-channels/costs/KPI description | `בדיקה של הפרופיל העסקי שלך בגוגל — לפי שם העסק בלבד. היא מראה מה לקוחות באזור רואים עליך, ועל חלק מהסעיפים תקבל הוראות לתיקון עצמי.` |
| `contact.steps.2.tags` (OPTIONAL, not rendered) | page.tsx:71 | English tags: proposal/KPI/timeline | `["GBP audit", "Name only", "Self-fix"]` |
| `contact.steps.3.title` | page.tsx:75 | start-then-pay / pay-after-first-month step title | `והלאה? בלי הבטחות בעמוד` |
| `contact.steps.3.desc` | page.tsx:76 | pay-only-at-end-of-first-month / try-us-risk-free description | `אין זמן מענה מובטח ואין לו״ז מובטח. אם נוצר קשר, כל המשך — היקף, תנאים ומחיר — מסוכם ישירות מולך, בהסכמה.` |
| `contact.steps.3.tags` (OPTIONAL, not rendered) | page.tsx:77 | English tags: no-risk/pay-after/monthly | `["Honest", "Mutual agreement", "Direct"]` |

### 2.3 FAQS array (lines 81–98) — four items, same array length

Mechanics note: `<details key={faq.q}>` (:251) keys off the question text — replacing
`faqs.1.q` changes that key; no schema derives from this array (the page's three schemas are
ContactPage/LocalBusiness/BreadcrumbList), so no structured-data impact. Questions 2–4 are
neutral and KEEP UNCHANGED; only their answers change.

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `contact.faqs.1.q` | page.tsx:83 | question presupposing a priced first consultation | `האם הפנייה דרך הטופס עולה משהו או מחייבת?` |
| `contact.faqs.1.a` | page.tsx:84 | free 20–30-minute consultation answer | `לא ולא. הפנייה חינם, והיא לא תיאום שיחה ולא התחייבות. כל המשך, אם יהיה, מסוכם איתך ישירות — בהסכמה מלאה.` |
| — | page.tsx:87 | question about response time | KEEP UNCHANGED — neutral question; the honest answer below replaces the SLA. |
| `contact.faqs.2.a` | page.tsx:88 | respond-within-24-business-hours + urgent-call answer | `נכון להיום אנחנו לא מבטיחים זמן מענה — לא נבטיח לך מה שלא בשליטתנו. אם זה דחוף, אפשר להתקשר ישירות; המספר מופיע כאן בעמוד.` |
| — | page.tsx:91 | question about which businesses WAO works with | KEEP UNCHANGED — neutral question. |
| `contact.faqs.3.a` | page.tsx:92 | B2C-only specialization + won't-take-your-money answer | `אין כאן הצהרות גורפות. כל פנייה נבדקת לגופה — ואם נראה שזה לא מתאים, נגיד לך את זה ישר ובכנות.` |
| — | page.tsx:95 | question about long-term contracts | KEEP UNCHANGED — neutral question. |
| `contact.faqs.4.a` | page.tsx:96 | month-to-month / pay-at-end-of-month-after-results answer | `נכון להיום אין רכישה ישירה באתר ואין מחירון בעמוד. אם נחליט יחד לעבוד, התנאים והמחיר מסוכמים מולך ישירות — לפני כל עבודה, ובהסכמה.` |

### 2.4 Hero (lines 138–170)

| Key | Source | Old (reference) | Replacement / action |
|---|---|---|---|
| `contact.hero.badge` | page.tsx:140 | badge promising free-no-obligation first consultation | `פנייה חופשית — בלי התחייבות ובלי לחץ` |
| `contact.hero.h1` **SEO-GATED** | page.tsx:152-155 | H1 inviting a short call that can change the business direction | Three text nodes, same markup pattern: node 1 (:152, before the `{" "}`) `רוצה לדבר איתנו?`; gradient-span node (:153) `הפנייה חינם`; node 3 (:155, after the `<br/>` + `{" "}`) `בלי התחייבות ובלי לחץ`. Structural note: the `text-gradient` span currently wraps different words — engineer re-wraps `הפנייה חינם` in the same span markup; the `{" "}` spacers and `br.hidden md:block` stay as-is. |
| `contact.hero.sub` | page.tsx:158 | sub-paragraph promising forms that don't disappear + a real conversation with a named human | `בלי מכירה בלחץ ובלי התחייבות. ספר על העסק בטופס — גם אם רק רצית לבדוק אפשרות של אתר לעסק קטן בליווי שלנו. ויש גם התחלה בלי פנייה: בדיקה חינם של הפרופיל העסקי שלך בגוגל, לפי שם העסק בלבד.` |
| — | page.tsx:169 | form-section H2 (send-inquiry) | KEEP UNCHANGED — neutral. |
| — | page.tsx:170 | `<ContactForm source="contact-page" />` | KEEP UNCHANGED — the `source` prop feeds lead attribution. |

Out of range, KEEP UNCHANGED: contact-info cards (:175–219) — PhoneReveal (:182–186), email,
address, displayed business hours (:192, factual listing, not a response promise), LinkedIn
(:210–218).

### 2.5 Relevant headings (lines 221–258)

| Key | Source | Old (reference) | Replacement / action |
|---|---|---|---|
| — | page.tsx:223 | process-mini eyebrow (what-happens-after-contacting) | KEEP UNCHANGED — neutral; the corrected STEPS above answer it honestly. |
| — | page.tsx:244 | FAQ eyebrow (common questions) | KEEP UNCHANGED — neutral. |
| `contact.headings.faqH2` | page.tsx:246-247 | FAQ H2 in plural register (you-plural wanted to know) | Singular-male register fix: `כל מה שרצית לדעת` before the gradient span; span text (:247, before-that-you-contact) stays byte-identical. Not a metadata/H1 SEO anchor — included under the contract's "relevant headings" seam; register-only change. |

## 3. Keyed replacements — `src/components/ContactForm.tsx` success state (lines 104–116)

Mechanics note: the success block (:84–127) keeps its structure — ✅ icon (:95), `<h3>` (:96–105),
`<p>` with `<br/>` (:115) and the `tel:` link (:117–123, `dir="ltr"` + styling) all untouched.
Only the three text nodes below change (:104, :114, :116). The success state must NOT claim
that a human received, read or answered the inquiry — the POST returns `{ok:true}` only when
the SMTP transport reports recipient acceptance (§7), a machine-level acknowledgement of the
send. "נשלחה" states exactly that acknowledged-send fact, never human receipt or reply; the
phone fallback gives the reader a way to verify.

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `contactForm.success.h3` | ContactForm.tsx:104 | success heading claiming the inquiry was received | `תודה — הפנייה נשלחה` |
| `contactForm.success.p1` | ContactForm.tsx:114 | we-will-call-you-back-within-24-business-hours line | `אין לנו זמן מענה מובטח — ולא נבטיח לך מה שלא בשליטתנו.` |
| `contactForm.success.p2` | ContactForm.tsx:116 | call-Eitan-now line (before the `{" "}` + tel link) | `רוצה לוודא שהפנייה הגיעה, או שזה דחוף? אפשר להתקשר ישירות:` |

### 3.1 Supplemental rows — same claim class, outside the named success-state seam (currently ContactForm.tsx:104–116; flagged for strategist acceptance)

These two strings carry the exact claim classes this bridge must remove (free-consultation
offer, 24h response SLA, no-contract commercial term) and live in the same form the success
state belongs to; leaving them would keep the page self-contradictory. Included per Contract
005 acceptance criterion "both drafts present the same … journey without false receipt,
operator or commercial promises". Explicitly flagged as an extension of the named seam —
strategist/reviewer may drop them if strict seam-only scope is preferred.

| Key | Source | Old (reference) | Replacement |
|---|---|---|---|
| `contactForm.button.submit` | ContactForm.tsx:258 | submit button label promising send-inquiry + free-first-consultation | `לשליחת הפנייה` — mechanics note: only the idle-state branch string changes; the loading-state string (:258, sending…) and all disabled logic (:248) stay byte-identical. |
| `contactForm.micro.footer` | ContactForm.tsx:270 | ✓-list microcopy: no-contract / free-first-consultation / response-within-24h | `✓ הפנייה חינם ✓ בלי התחייבות ✓ בלי לחץ` |

Out of range, KEEP UNCHANGED: required name/phone fields (:131–165, both `required` + submit
validation :55, :248), optional email (:167–182), service select (:184–212, `SERVICES` :6–13),
optional message (:214–229), mandatory privacy consent (:231–232, Israeli Privacy Protection
Law), error message (:242 — truthful: retry-or-call fallback, no false claim).

## 4. Row census

24 keyed replacement rows: 4 metadata (SEO-GATED) + 6 steps (title/desc ×3; +3 OPTIONAL
not-rendered tags rows listed separately) + 5 FAQ (1 q + 4 a) + 3 hero + 1 heading + 3
success-state + 2 supplemental (flagged). KEEP UNCHANGED: 3 FAQ questions, form H2, eyebrow
headings, contact-info cards, all form fields, consent, error message, canonical/robots, all
three schemas.

## 5. Congruence map — companion Site-Bot packet (Rev 4)

| Site-Bot packet key | Points reader to | This bridge guarantees at destination |
|---|---|---|
| `siteBot.steps.2` | optional contact form; not a call booking; no response promise | hero/badge/steps promise no consultation, no booking, no response time |
| `siteBot.faq1.a` / `siteBot.faq2.a` | voluntary contact message; no response guarantee | `contact.faqs.2.a` states no promised response time; success state promises none |
| `siteBot.price.para` / `siteBot.compare.summary` | terms (incl. price) agreed directly, by mutual consent | `contact.faqs.4.a` + `contact.steps.3.*`: no price list, no online purchase, terms agreed directly |
| `siteBot.cta.sub` (unchanged row) | contact form to discuss audit results | low-pressure invitation kept; no delivery claim added |
| audit journey (packet Offer-scope note) | free name-only audit, conditional result, partial DIY | `contact.steps.2.*` + `contact.hero.sub` mirror the same audit framing (name-only, "בחלק מהסעיפים" self-fix, local-visibility wording) |

## 6. Preserved-by-design list (application contract must not touch)

1. Required fields name + phone + privacy consent, and their validation
   (ContactForm.tsx:55, :131–165, :232, :248).
2. Canonical URL (contact/page.tsx:5, :11, :16) and `robots.index/follow` (:12).
3. Schema IDs and blocks: ContactPage `#webpage` (:25), LocalBusiness `#org` (:33), WebSite
   `#website` ref (:28), BreadcrumbList (:50–57). No schema text change proposed.
4. PhoneReveal component + `source` props (:182–186; ContactForm :170) and `tel:` link
   mechanics (ContactForm.tsx:117–123).
5. Title template mechanics: plain-string title under the root `"%s | WAO"` template (:8).

## 7. Intake semantics — `/api/lead` is fail-closed and acknowledged in current source (reconciled 2026-10-06)

The unawaited-send / missing-config-skip defect this draft was originally written against is
repaired in current source, and the earlier "make intake fail-closed" engineer gate is closed;
the header pins above are the reconciled ones. Current mechanics, verified line-by-line:

- `src/app/api/lead/route.ts:96-120` — `POST` validates privacy consent (rejects any body
  without `privacyAccepted === true`, :100-102) and every lead field (length/control-char
  limits, :103-117) before any send; invalid input returns `400 {ok:false}`.
- `src/app/api/lead/route.ts:122-128` — fails closed when SMTP host/user/pass or a valid
  `LEAD_NOTIFY_EMAIL` recipient is absent: `503 {ok:false}`, with no skip and no send attempt.
- `src/app/api/lead/route.ts:130-134` — `POST` awaits `sendLeadEmail` and returns
  `200 {ok:true}` only on reported recipient acceptance; any send failure returns
  `503 {ok:false}` (:133-134). Acceptance is checked inside `sendLeadEmail` at :86-93
  (`result.accepted` includes the notify recipient, `result.rejected` does not).
- `src/components/ContactForm.tsx:53-82` — `handleSubmit` requires HTTP OK **plus** a parsed
  `{ok:true}` acknowledgement (:71-73) before the success state renders (:78); anything else
  renders the truthful error state with its retry-or-call fallback (:234-244, message :242).

Claim boundary: SMTP recipient acceptance is a machine-level transport acknowledgement. It does
NOT prove a human read the email, replied, or that future sends will be delivered — so the
candidate success copy still claims only "נשלחה" (an acknowledged send, §3) and keeps the phone
fallback as a verify-or-urgent path. Remaining gates, separate and still open: production SMTP
operations/runtime verification (real credentials and an isolated runtime check under the
Contract 039 build hold) and the release/publication decision. The accepted synthetic-intake
evidence (t_b0e748fa) is prior local evidence only — it does not prove production SMTP
delivery or any human response.

## 8. English application checklist (for waoengineer, application contract only)

- [ ] Apply together with `docs/copy/site-bot-offer-truth-2026-10-05.md` (Rev 4) — one journey; never one draft alone.
- [ ] Apply all 24 keyed replacements byte-exactly from this document; zero Hebrew typed by the engineer (byte-exact patch discipline).
- [ ] SEO signoff before applying the four metadata rows and `contact.hero.h1`.
- [ ] Keep markup mechanics: h1 gradient-span re-wrap (span around `הפנייה חינם`), `{" "}` spacers, `<br/>`, faq-H2 span text, success-state icon/link/`<br/>`, button loading branch.
- [ ] Keep canonical, robots, all three schemas, all form fields, consent and validation untouched (§6).
- [ ] `contactForm.button.submit` / `contactForm.micro.footer` are supplemental flagged rows (§3.1) — confirm strategist acceptance before applying.
- [ ] SMTP operations/runtime gate (§7): production SMTP/recipient config verified in an isolated runtime check before any contact-funnel acceptance or publication; the code-level fail-closed repair is already in current source (no open engineer gate remains for it).
- [ ] Eitan founder spot-check of all Hebrew before ship (human gate, standing rule).
- [ ] Under the Contract 039 build hold: no build/server/deploy in the drafting phase.

## 9. Material claim/QA points (waocopy self-check done; independent reviewer targets)

1. **No response SLA anywhere**: no "24 שעות" / "24–48" / "תוך X" of any kind in any replacement; `contact.faqs.2.a` and `contactForm.success.p1` state the absence of a guaranteed response time explicitly and honestly.
2. **No consultation offer**: no consultation duration, no booked call, no "ייעוץ חינם" framing survives; the invitation is a free, low-pressure form message ("פנייה חופשית", "לא תיאום שיחה").
3. **No commercial terms invented**: no pay-after-first-month, no-risk, month-to-month, contract or pricing claim; `contact.faqs.4.a` mirrors the packet posture — no online purchase today, terms agreed directly.
4. **No service-scope or availability claim**: B2C-only declaration removed; named-human availability removed from the hero (the phone number itself remains visible via untouched PhoneReveal/tel-link mechanics, offered as a verify-or-urgent fallback, never as "someone will answer").
5. **No false delivery**: success state says "נשלחה" (sent), not "התקבלה" (received); even under the now-acknowledged fail-closed intake (§7), the copy claims an acknowledged send only — never human receipt, reading, or reply.
6. **No fabricated proof**: zero testimonials, volume, ranking, lead or timeline claims added.
7. **Singular male throughout**: "תרצה", "תקבל", "רצית", "שלך" — the page's current plural forms ("בואו נדבר", "רציתם", plural imperatives) are all corrected in the replaced cells; untouched cells were checked to carry no plural-address copy in the named seams.
8. **Register**: native Sabra phrasing, short sentences (~12–15 words each where feasible), direct-response clarity without legalese; the honest no-promise lines are phrased as candor ("לא נבטיח לך מה שלא בשליטתנו"), not as apology.
9. **Entity/keyword anchors present**: small-business website ("אתר לעסק קטן"), Google Business Profile audit ("בדיקה חינם של הפרופיל העסקי שלך בגוגל"), local visibility ("מה לקוחות באזור רואים עליך"), self-fix categories/hours/photos ("בחלק מהסעיפים… לתיקון עצמי"), optional site-building support ("אתר לעסק קטן בליווי שלנו" + "אם נחליט יחד לעבוד").
10. **Structural safety**: array lengths unchanged (STEPS 3, FAQS 4), `key={faq.q}` impact noted (:2.3), no schema/canonical/ID change, `source` attribution untouched.

---
Draft-only artifact. focused_acceptance is reported separately from release_health=false; no
production byte has changed. Gates before any application: independent structural review,
SEO signoff (gated rows), Eitan founder spot-check, isolated SMTP operations/runtime verification of the
acknowledged `/api/lead` intake (§7), separate application contract under the build hold. Disposition of this handoff is reconciled
by the executor only.
