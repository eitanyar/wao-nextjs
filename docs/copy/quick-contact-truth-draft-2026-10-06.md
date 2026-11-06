# Quick-contact truth — `/contact/quick` + `LeadFormLight` promise replacements (DRAFT)

- Date: 2026-10-06
- Author: waocopy (Contract v3, handoff 2026-10-06_013, kanban t_c6b39ed7; sole parent t_b0e748fa
  formal DONE / independent offline PASS, release_health=false)
- Status: DRAFT ONLY — no production bytes changed by this document.
- Source pins rechecked at draft time (2026-10-06 16:03 +07, SHA-256, match the contract exactly):
  - `src/app/(app)/contact/quick/page.tsx` — `54f1047fb1ce7fa67995f4f488055b2779a1cddec47a8e76c09ec6184085f627`
  - `src/components/LeadFormLight.tsx` — `83542d5aab058e9361c148c5a90783b5bbc672c81f4d4ccddecf37339fbb4dec`
- Accepted-intake evidence honored: t_b0e748fa proved synthetic mail-transport acknowledgement
  only (route returns `ok:true` strictly after SMTP recipient acceptance; success UI and the
  `lead_submit` event fire only after that). Transport acceptance is NOT human receipt, NOT a
  reply, NOT an audit deliverable — the replacements below claim nothing beyond it.
- Old Hebrew strings are referenced by `file:line` only (never duplicated here). Every
  replacement is original waocopy-authored Hebrew: singular male, native Sabra register,
  short sentences (~12–15 words).
- Keys use `quick.<slot>` / `light.<slot>`. The H1 row is marked **SEO-GATED**.
- Consistency companion (read-only): `docs/copy/site-bot-contact-bridge-2026-10-06.md` —
  same no-SLA / no-consultation / "נשלחה-not-התקבלה" posture; this draft is congruent with it
  and with `docs/copy/site-bot-offer-truth-2026-10-05.md` (Rev 4) on the free name-only audit.

## 1. Claim boundary this page may promise

`/contact/quick` is a noindex cold-traffic form page (`source="geo-audit-light"`). The seven
replacements promise exactly one thing: a free, optional inquiry about the business's website
visibility and its Google Business Profile presence, and — only if contact happens and only by
mutual agreement — a possible next step discussed directly. Explicitly promised NOWHERE:

- no "3 opportunities" / three findings / any deliverable count;
- no human receipt, no "we got it," no response time or SLA of any kind ("24 שעות" removed);
- no consultation offer, duration or booking ("ייעוץ חינם" removed);
- no price, capacity, performance, ranking, ownership or service-terms claim;
- no phone-availability promise (PhoneReveal stays a verify-or-urgent fallback only);
- the 30+-pages/Search Console checkbox stays a qualifying question, not a prerequisite and
  not a deliverable promise.

Entity anchors woven in: business website, Google Business Profile audit, local visibility
(what nearby customers see), optional contact. Offer anchors: free name-only GBP audit at
`/site-bot/audit` as a distinct no-contact starting path (verified ungated, name-only,
conditional result, partial DIY — per Rev 4 packet), contact as a separate optional inquiry.
No SERP-ranking claim anywhere (page is `robots.index=false`).

## 2. Keyed replacements — `src/app/(app)/contact/quick/page.tsx`

Mechanics: `title` (:7, plain string), `alternates.canonical` (:4, :9), `robots` (:10),
all styles/structural markup, and `<LeadFormLight source="geo-audit-light" />` (:42) stay
byte-identical. No new fields; no change to `LeadFormLight.handleSubmit`.

| Key | Source | Old (reference only) | Replacement |
|---|---|---|---|
| `quick.metadata.description` | page.tsx:8 | meta description promising callback within 24 hours, plural register | `פנייה חופשית ובלי התחייבות — על האתר של העסק או על הנראות שלך בגוגל. אין זמן מענה מובטח. רוצה להתחיל לבד? יש בדיקה חינם של הפרופיל העסקי שלך בגוגל, לפי שם העסק בלבד.` |
| `quick.hero.h1` **SEO-GATED** | page.tsx:28 | hero H1 promising three opportunities in exchange for details | `פנייה חופשית — בלי התחייבות ובלי לחץ` |
| `quick.hero.intro` | page.tsx:38 | intro paragraph promising callback within 24 business hours | `שם ודרך התקשרות — זהו. הפנייה חינם, בלי התחייבות ובלי לחץ. ספר על העסק שלך — האתר, הנראות בגוגל, או כל שאלה אחרת. אם נוצר קשר, נדבר על צעד אפשרי. כל המשך, אם יהיה, מסוכם איתך ישירות — בהסכמה.` |

Note on `quick.metadata.description`: the page is `robots.index=false`, so the row is NOT
marked SEO-GATED per the contract (only the H1 is); the strategist may extend the SEO gate to
it if preferred — the string is metadata.

## 3. Keyed replacements — `src/components/LeadFormLight.tsx`

Mechanics: success block keeps its structure — ✅ icon (:93), `<h3>` (:94–103), the `<p>`
(:104–119) with its `<br />` (:113), the `{" "}` spacer (:114) and the whole `PhoneReveal`
element (:115–118) untouched; only the two named text nodes change. Submit button keeps the
ternary (:200): the loading-branch string stays byte-identical; only the idle-branch string
changes. All disabled/validation logic (:190), fields (:126–158), qualifying checkbox (:160–171),
PrivacyConsent (:174), the error message (:176–186 — truthful retry-or-call fallback, KEEP) and
`handleSubmit` (:45–80) stay untouched.

| Key | Source | Old (reference only) | Replacement |
|---|---|---|---|
| `light.success.h3` | LeadFormLight.tsx:102 | success heading claiming the inquiry was received | `תודה — הפנייה נשלחה` |
| `light.success.p1` | LeadFormLight.tsx:112 | first success text node promising callback within 24 business hours | `אין לנו זמן מענה מובטח — ולא נבטיח לך מה שלא בשליטתנו.` |
| `light.success.p2` | LeadFormLight.tsx:114 | second success text node inviting a call now (before the spacer + PhoneReveal) | `רוצה לוודא שהפנייה נשלחה, או שזה דחוף? אפשר להתקשר ישירות:` |
| `light.button.submit` | LeadFormLight.tsx:200 | idle submit label repeating the three-opportunity promise (loading branch preserved) | `לשליחת הפנייה — חינם` |
| `light.micro.footer` | LeadFormLight.tsx:212 | ✓-list microcopy: no-contract / free-first-consultation / response-within-24h | `✓ הפנייה חינם ✓ בלי התחייבות ✓ בלי לחץ` |

`light.success.p1` + `light.success.p2` are one contract locus (:112–114, "success explanatory
text, preserve PhoneReveal") split into its two text nodes for byte-exact application — total
keyed loci remain seven (3 page + 4 form).

Why "נשלחה" and not "התקבלה": the success state renders only after the route confirms SMTP
recipient acceptance (`route.ts:131-132`, t_b0e748fa-verified), so "sent" is the exact
transport fact — but acceptance by the mail server is not proof a human read anything. The
phone fallback lets the reader verify; it promises no answer.

## 4. Row census

7 keyed loci: 3 page rows (description, H1 **SEO-GATED**, intro) + 4 form rows (success h3,
success text ×2 nodes under one locus, idle button, footer). KEEP UNCHANGED: page title (:7),
canonical/robots (:4, :9–10), source prop (:42), all styles and markup; form loading-branch
string (:200), checkbox label (:169 — qualifier question), field labels/placeholders, consent,
error message (:184), PhoneReveal mechanics, `handleSubmit`.

## 5. Source/claim matrix

| # | Locus | Removed claim class | New claim (boundary) | Grounding |
|---|---|---|---|---|
| 1 | quick.metadata.description | 24h callback SLA; plural register | free optional inquiry; no response time promised; distinct free name-only audit path | route waits for transport ack only; `/site-bot/audit` ungated name-only (Rev 4 packet) |
| 2 | quick.hero.h1 | three-opportunity deliverable promise | free inquiry, no commitment, no pressure | no deliverable count exists anywhere in the accepted flow |
| 3 | quick.hero.intro | 24-business-hours callback | inquiry topic (website / Google visibility); possible next step only if contact happens, terms by direct mutual agreement | t_b0e748fa: no reply/audit behavior exists or is tested |
| 4 | light.success.h3 | "received" (human-receipt claim) | "sent" (transport fact) | success fires only after SMTP recipient acceptance — send fact, not receipt |
| 5 | light.success.p1 | 24-business-hours callback | explicit no-SLA candor | no response-time mechanism exists |
| 6 | light.success.p2 | call-now framing attached to a receipt claim | verify-or-urgent phone fallback, no availability promise | PhoneReveal renders number/reveal button only |
| 7a | light.button.submit | three-opportunity promise on the CTA | plain honest send label + free | button submits the form; nothing else |
| 7b | light.micro.footer | no-contract commercial term + free consultation + 24h response | free / no commitment / no pressure | no contract, consultation or SLA mechanism exists |

(#7a/#7b are census rows 6–7 of the seven keyed loci; the matrix splits them for claim
granularity only.)

## 6. Preserved-by-design list (application contract must not touch)

1. `handleSubmit` behavior, consent gate, disabled logic, `dataLayer` events, ref/UTM capture
   (LeadFormLight.tsx:45–80, :190) — accepted by t_b0e748fa; any change voids that PASS.
2. Page title (:7), canonical (:4, :9), robots (:10), `source="geo-audit-light"` (:42).
3. Qualifying checkbox label (:169) and its message payload (:61).
4. Error message (:184) — already truthful (retry or call, no claim).
5. PhoneReveal component, its `source` prop (:116) and reveal/tel mechanics.
6. Loading-branch button string (:200).

## 7. waocopy self-check

1. **Sabra register**: native Israeli phrasing, direct, no translated-English cadence; the
   no-promise lines read as candor ("לא נבטיח לך מה שלא בשליטתנו"), not apology or legalese.
2. **Singular male throughout**: "שלך", "רוצה", "ספר", "איתך" — the page's current plural
   forms (description :8, title-register) are corrected in every replaced cell; the untouched
   title (:7) keeps its plural form per the contract's explicit preserve instruction.
3. **Clarity / direct response**: each string does one job; H1 and button are scannable;
   sentences stay ~12–15 words.
4. **Claim safety**: zero SLA, receipt, consultation, deliverable-count, price, capacity,
   ranking or ownership claims survive; "נשלחה" is the strongest verb used and is exactly the
   proven transport fact; phone fallback promises no answer.
5. **Persona fit**: busy, skeptical Israeli small-business owner — low friction ("שם ודרך
   התקשרות — זהו"), zero pressure language, honest no-guarantee stance as the differentiator,
   plus a no-contact DIY on-ramp (free name-only audit).
6. **Consistency**: `light.success.*` / footer / button mirror the contact-bridge draft's
   approved vocabulary ("נשלחה", "בלי התחייבות ובלי לחץ", no-SLA line) — one journey voice
   across `/contact` and `/contact/quick`.
7. **Entity anchors present**: business website ("האתר של העסק"), Google Business Profile
   ("הפרופיל העסקי שלך בגוגל"), local visibility ("הנראות שלך בגוגל"), optional contact
   ("פנייה חופשית… בלי התחייבות").

## 8. Application gates (none executed by this draft)

- [ ] Independent read-only draft truth review (waoverifier, strategist-dispatched): source
  pins, seven-locus completeness, no false commercial/SLA/receipt promises, stated gates.
- [ ] SEO signoff for `quick.hero.h1` (SEO-GATED) before application.
- [ ] Eitan founder spot-check of all Hebrew (standing human gate; separate Hebrew-QA card
  waived by the owner for this mission — the founder gate is NOT waived).
- [ ] Separate waoengineer byte-exact application contract (zero Hebrew retyped; apply from
  this document only), under the Contract 039 build hold until lifted.
- [ ] After application: isolated runtime/mobile-RTL acceptance (waouxtester) — success state,
  loading branch, PhoneReveal, no layout regression.
- [ ] Congruence: apply alongside `docs/copy/site-bot-contact-bridge-2026-10-06.md` +
  `docs/copy/site-bot-offer-truth-2026-10-05.md` (Rev 4) per their joint-application rule;
  this draft must never ship contradicting them.

---
Draft-only artifact. focused_acceptance applies to this draft only and is reported separately
from release_health=false; no production byte has changed and no live delivery, SEO, founder,
runtime or publication acceptance is inferred. Disposition of handoff 2026-10-06_013 is
reconciled by the executor only.
