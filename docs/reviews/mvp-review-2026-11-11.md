# Site-Bot MVP — end-to-end review (2026-11-11)

Reviewer: Fable 5.1 (read-only pass). Scope: `/site-bot` → `/site-bot/audit` → `/site-bot/start` → checkout → research → generation
→ generated sites (`scratch/m2b2r3/eval-r3a/*`, the last finished eval; the live `scratch/m2b2r3/eval/` run had not written
`EVAL_DONE` and was not read) → GBP / review / digest / dashboard. No code was changed; no paid calls were made. Line numbers
are from HEAD `fcaf05a`.

## Executive summary

**Not launch-ready for paying customers; ready for a hand-held pilot (WoZ-invoiced, human review before go-live).** The
pipeline is real, well-tested (104 test files in the Site-Bot surface) and already produces truthful, native-sounding hero and
trust-bar copy. What blocks a self-serve launch is not polish but four gaps: (1) the paid path still charges a one-time ₪9.90 on a
mock provider while the approved offer is ₪199/mo on Takbull, and two source-of-truth docs disagree; (2) the generated sites are
3–4 pages of 55–70 visible words each, with no photos, no hours, no Q&A and a price table that leaks the wrong service's price;
(3) the fact gates fight the depth blocks — every Q&A item in the eval was dropped, so the one mechanism meant to give pages
depth produces nothing; (4) the claims layer still lets the model invent tools/steps and extend scoped promises
(same-day → drain cleaning, "won't break tiles" → water-heater install) and publishes unverified licence numbers.

**Top 5 moves:** (1) One pricing truth: delete the ₪9.90 constants, route Site-Bot through `subscriptions.ts`, fix VISION.md and
the `/site-bot` FAQ to the 2026-11-07 terms. (2) Make Q&A and process blocks code-first (fact templates + owner voice note),
exempt them from the restatement/novelty drops, and ship the hours block + GBP photos; that alone lifts service pages past the
250-word floor truthfully. (3) Scope-aware claims: bind same-day / no-break / warranty promises to the service they name
(fix `startingPriceFor` leak at the same time) and add a tool/step allow-list gate. (4) Conversion basics on the generated
site: sticky call+WhatsApp bar on mobile, hours, rating with count and source, one real photo. (5) Owner notification + account:
collect the owner's own WhatsApp/email at intake, notify Eitan on every help request and paid intake, and give the owner a
status page so "we'll get back to you" is not the only promise.

## Launch blockers (self-serve launch; a hand-held pilot can proceed around them)

| # | Blocker | Evidence |
|---|---|---|
| B1 | **Billing contradicts the approved offer.** Checkout charges a one-time ₪9.90 with the mock provider; the pay page shows a fake card form pre-filled with `4242…`; the recurring engine is bypassed; Takbull throws. | `src/app/api/site-bot/checkout/init/paid.ts:16`, `callback/paid.ts:13,57,75`; `src/app/(product)/site-bot/pay/[sessionId]/page.tsx:131-150`; `src/lib/payments/providers/takbull.ts` (7 `TODO(takbull-api)`, throws at 56–119); approved terms "₪199/mo, no trial" in `docs/missions/site-bot-paid-journey-v2-2026-11-07.md:13` vs "₪9.90 trial → ₪199" in `VISION.md:40,273`. |
| B2 | **Scoped promises leak across services.** Owner USP "מתקן נזילות באותו יום…" became H1 "פתיחת סתימות בחולון – אותו יום" and "התקנת דודים בחולון בלי לשבור אריחים"; the same-day gate is off whenever a response fact exists. | `scratch/m2b2r3/eval-r3a/plumber-3/copy.txt` (svc-drain-cleaning, svc-water-heater-installation); `src/lib/lp/claimScope.ts:118` (`if (hasResponseFact) return null`); fixture `scratch/m2b2r3/fixtures/plumber.json` usp/responseTime. |
| B3 | **Price of one service shown on every service page.** The solar-heater page shows "תיקון נזילות 350 ₪" as its price table. | `scratch/m2b2r3/eval-r3a/hebrew-plumber-1/html/services/solar-heater-installation.html`; `src/lib/lp/researchedSite.ts:448-465` (table rendered whenever `hasPriceNumbers`, rows not filtered to the page's service). |
| B4 | **Unverified credentials published as fact.** "רישיון מס׳ 4821" and "יש לי רישיון…" render verbatim from a free-text field with no attestation, no evidence file and no registry check; the licence step accepts any text (`maxLength={60}`). | `scratch/m2b2r3/eval-r3a/hebrew-plumber-1/copy.txt` trustBarItems[1], proofItems[1]; `StartPaidFlow.tsx:735-745`; `src/lib/lp/ownerFactCopy.ts:1197` (only Hebrew-ness and length are checked). |
| B5 | **Owner has no account and no personal contact channel.** Intake collects the business phone from GBP only; the pay page ends with "נחזור אליך לפרטים שמסרת" but no email/WhatsApp was asked; invoice gets `customerEmail: ''`. | `src/lib/site-bot/startIntake.ts:147-165`; `callback/paid.ts:72-77`; `pay/[sessionId]/page.tsx:207`. |
| B6 | **Processor disclosure is stale.** The Site-Bot legal annex names Gemini + Cloudflare only and says "no GitHub / no GSC"; the pipeline sends owner data to Qwen (Alibaba, Singapore), DataForSEO, NeuronWriter and Google Places; the `/site-bot` FAQ promises "GitHub רשומים על שמך" and GSC. | `docs/legal/site-bot-permissions-draft.md` (tables); `src/lib/site-bot/research/runResearch.ts:117-120`; `scratch/m2b2r3/eval-r3a/hebrew-plumber-1/usage.json` (`"model": "qwen3.8-max"`); `src/app/(app)/site-bot/page.tsx:45,49`. |

## 1. Customer experience and conversion

**1.1 `/site-bot` sells an offer that no longer exists — High.** FAQ and body copy describe the old one-time package: "חמישה
עמודים, דומיין פרטי ועריכה בצ׳אט לתמיד", "הדומיין, Cloudflare ו-GitHub רשומים על שמך" (`page.tsx:37,41,45,49,278`). The approved
product is a ₪199/mo retainer: growth pages, GBP upkeep, monthly digest, 30-day exit, domain stays with the client. The generated
site is 3–4 pages plus legal pages. A persona who buys on these FAQs will feel misled at the first invoice. *Recommendation:* copy
brief for waocopy: the page should state the retainer frame (what happens every month), the exit terms as a trust signal
(client keeps domain + GBP), and the real page count; drop GitHub/Cloudflare jargon entirely for this persona.

**1.2 No proof on the marketing page — High.** No sample site, no screenshot, no before/after, no number, no face. The hero H1 is a
two-clause sentence (`page.tsx:138`) — fine as voice, but the persona decides on "show me one". *Recommendation:* embed one real
generated site (the fictional rooftop demo in `docs/copy/site-bot-fictional-rooftop-demo-site.json` exists for this) as an
iframe/screenshot pair (mobile + desktop) above the first CTA, plus the audit-page screenshot.

**1.3 Two CTAs with equal weight; the free audit is the better first step but is visually secondary — Medium.** Hero
(`page.tsx:147-158`) puts "דבר עם איתן" as primary and the audit as outline. For a cold visitor the audit is zero-risk and
pre-fills intake. *Recommendation:* audit primary, "talk to Eitan" secondary until the paid flow is live. Also `/contact?ref=site-bot-build`
is not consumed anywhere (`src/app/(app)/contact/page.tsx` has no `ref` handling), so lead source is lost — add `ref` to the lead
payload.

**1.4 `/site-bot/audit` is strong (voice exemplar) but `noindex` — Low.** `audit/layout.tsx:5` sets `robots: index:false`. Intentional
for the shareable result URLs, but the entry form itself could be indexable on a separate static route. *Recommendation:* split
entry (`/site-bot/audit`, indexable) from result (`?auditId=…`, noindex via `X-Robots-Tag`).

**1.5 Intake (`/site-bot/start`) is the best-built surface — strong, with four frictions.**
- Expectation mismatch: `DONE_MESSAGE` promises "האתר שלך ייבנה בזמן אמת" (`StartPaidFlow.tsx:86`); the pay page then says "הצוות של WAO
  בונה את האתר… ונחזור אליך" (`pay/page.tsx:207`). Pick one truth (approved: automatic draft → human review).
- No price or terms anywhere before the pay screen; the footer says only "בסיום השיחה תועבר לדף תשלום מאובטח" (`StartPaidFlow.tsx:846`).
  The persona should see "₪199 לחודש, בלי התחייבות, מבטלים בלחיצה" before question 1.
- Hard-coded Hebrew outside the copy slots (`USP_PROBE:85`, `DONE_MESSAGE:86`, placeholder `:828`, "שלח" `:840`, footer `:846-848`,
  `H1 :416`) — bypasses the waocopy → Noa gate the project depends on.
- The licence question appears for licensed trades only (good), but `maxLength={2}` on years and free text on licence invite "15+" or
  "יש" answers that the fact parser then drops silently (`ownerFactCopy.ts:1197,1526`). Show the parsed result back to the owner
  ("נציג: 15 שנים במקצוע") before continuing.

Accessibility on intake is above average: progressbar semantics, `aria-live` log, focus management, 44px chips, `aria-pressed`
(`StartPaidFlow.tsx:511,531,629-656`). RTL handling of hours (`isolateTimeRanges`) is correct.

**1.6 Pay page — Blocker (B1) plus UX:** mock inputs with default test values would ship if the flag were ever flipped; error
copy "קרתה תקלה: {error}" exposes raw server messages (`pay/page.tsx:181`, `StartPaidFlow.tsx:577`).

**1.7 Help intake — Medium.** Works, rate-limited, file-stored, admin inbox exists (`admin/site-bot-help/page.tsx`). But nothing
notifies Eitan: no email/WhatsApp send in `helpRequest.ts`, `helpFollowUp.ts`, or `api/admin/site-bot/help-requests/*`. Lead
response time is the whole value of a "talk to Eitan" funnel. *Recommendation:* send via the existing
`src/lib/notifications/resend-transactional` on every stored request.

**1.8 Consent line breaks singular-male address — Low (confirmed).** `src/components/PrivacyConsent.tsx:38` "קראתי ומסכים/ת";
client sites repeat it: "אני מסכים/ה ל" (`renderSitePages.ts` form, seen in every generated `index.html`). Copy owner decision:
Eitan's sites address a male reader everywhere else; a gender-neutral verbless form ("מאשר" is still gendered) — route to waocopy/Noa.

## 2. Generated-site quality (eval r3a: hebrew-plumber-1, plumber-3; electrician-2 failed)

**2.1 Depth: 55–70 visible content words on every service page — High (confirmed, worse than stated).** `events.json` logs
`fact_gap … actual: 55/61/57/67/70` for all five service pages; whole-page Hebrew word counts including nav/footer are 107–129. Homepage
193–227. Causes, in order: (a) Q&A dropped to zero on 5/5 service pages (`restatement_drop_depth_block:qaItems:2->0`,
`budget_drop_depth_block:qaItems:2->0`); (b) process steps never fire (no voice note; `VOICE_NOTE_STEP_ENABLED=false`,
`voiceNote.ts:6-7`); (c) hours never rendered on the researched pages (plumber-3 has `businessHours` but `index.html` contains no
hours and no `openingHours` schema — only `contact.html` shows "🕒 א׳–ה׳ 08:00–18:00"); (d) card descriptions dropped
(`serviceDetails[0].description: ""`).

**2.2 The gates cannibalise the depth blocks — High (structural).** The restatement gate forbids any model field from restating years,
licence, warranty, response or price (`factRestatement.ts`); the novelty test drops any item whose words are already on the page
(`repetitionBudget.ts:33-37`); but Q&A answers must be written "only from owner facts" (`site-bot-content-depth-2026-11-10.md`), and
the owner's facts are exactly those five. The hebrew-plumber FAQ input "כמה זמן לוקח להגיע, יש אחריות?" is precisely
code-ownable (slice 6, `qaCodeOwned.ts`), yet zero code-built items appeared (`qaItems: null` while `proofItems` has 3).
*Recommendation:* (1) debug why `codeOwnedQa` produced 0 items on these fixtures (probably the fixture pool questions do not match
topic token lists, or `qaResponseQuestionTokens` is still pending); (2) make code-built Q&A exempt from novelty, not just from
restatement; (3) for the model-written Q&A, measure novelty against *other model fields only*, never against code-built strings,
or the answer to "how fast do you arrive" can never survive.

**2.3 Invented tools, steps and scenes — High (confirmed; prompt-only control).** "אני מכניס ספירלה לצינור" (drain snake),
"מחבר לצנרת ולחשמל" (water heater: electrical connection — a plumber claiming electrician work is also a licensing problem),
"הקולטים מכוסים אבנית… מנקה את הקולטים" (solar collectors), "בודק לחץ" — none in the owner inputs. The only control is a
reasoning-time FACT LEDGER rule (`researchPageCopy.ts:2234`); nothing in code checks tools. *Recommendation:* a per-vertical
allow-list of tool/step nouns derived from the owner's USP + a Noa-owned trade lexicon (`docs/copy/site-bot-licensed-trades-2026-11-10.json`
already seeds this); any other tool noun in a model field → drop sentence → repair → fail. Pair it with the voice-note step: the
owner's own "walk me through a job" is the only legitimate source of steps.

**2.4 Fear gate matches surface forms only — Medium (confirmed, and it missed a textbook case).** `claimScope.ts:33-41` strips
up to two prefix letters; "ישבור" (future) vs "לשבור" (infinitive), "ייעלם" vs "נעלם", "בלגן" vs "מבולגן" never match. In
plumber-3 the homepage H1 "…בלי לשבור אריחים" negates the fear "ישבור את האריחים" and no `gate_fear_promise` appears in
`events.json` even though the run post-dates commit `480e3f3` — add that exact pair as a unit test before trusting the gate.
A cheap upgrade: compare 3-letter root skeletons (strip prefixes + the י/ת/נ/מ binyan prefixes + plural suffixes) rather than
exact forms.

**2.5 Same-day check ignores service scope — Blocker (B2).** `buildSameDayScopeSpec` returns null when any response fact
exists, so a response time of "אותו יום בחולון ובבת ים" licenses same-day on *every* page. The USP's scope ("מתקן נזילות")
is parsed into `fixTimeScope`/`sameDayFinishScope` (`copyGates.ts:763`) but only feeds a prompt line (`researchPageCopy.ts:2226`),
not the gate. *Recommendation:* when scope is a `Set`, gate same-day tokens on pages whose service is outside the set.

**2.6 About/story echo — Medium (confirmed, with a design smell).** The v2 rule tells the model to title the about section with
"one town from his area… prefer a neighbouring town over the hero's city" (`researchPageCopy.ts:2262`). Result: homepage about
headings "מתקין דודי שמש בגבעתיים", "מאתר נזילות עם מצלמה בבת ים" — a doorway-flavoured H2 on the homepage that confuses the page's
topic (hero: leaks in Tel Aviv; about: solar heaters in Givatayim). The budget drops fix the echo but leave a stray second pitch.
*Recommendation:* the about block should introduce the person (name, years, how he works), not a second service×city.

**2.7 Meta descriptions 46–77 chars — Medium (confirmed).** `researchedSite.ts:282,634` uses `heroSubheadline` as the
description. *Recommendation:* code-built template: `{service} ב{city} — {promise line} · {trust item 1} · {phone}`, clamped to
120–155 chars; Yonatan signs the formula.

**2.8 Proof heading — Low (resolved in code, verify).** `researchedSiteLabels.ts:40-41` now has "לקוחות מספרים" / "עובדות על העסק"
and `RESEARCHED_SITE_LABELS_PENDING_COPY = false`. The r3a pages render "לקוחות מספרים". Note the heading reads oddly above three
first-person sentences ("אני במקצוע כבר 15 שנים") followed by one quote — the facts-only heading fits better when ≤1 quote.

**2.9 Rating rendered bare — Medium.** `reviewContext` renders as "4.9", "5", "5 ★" or even "דברים שכתבו עליי" across pages of the
same site (plumber-3 copy.txt). The template `trustRating: "{rating} ★ · {count} ביקורות"` exists but the review count is absent
(Places content is correctly not republished, `placePrefill.ts:8`). Until M4 GBP manager access, show the rating only with a source
("בגוגל") and count, or not at all.

**2.10 No images at all — High for conversion.** `index.html` has zero `<img>`; the Unsplash URL appears only in `og:image` and schema
(`verticalAssets.ts:39`), so the social card and schema `image` point to a stock photo of a stranger that is identical for every
plumber WAO ships (cross-client duplicate signal). The persona's customers decide on a face and a van. *Recommendation:* owner
photo step (phone upload, private storage — the same storage gap that blocks voice notes, `voiceNote.ts:6`), or GBP photos in M4;
until then no image beats a shared stock image.

**2.11 Mobile conversion elements missing — High.** Hero has a phone CTA; WhatsApp appears only on `contact.html`; no sticky
call/WhatsApp bar (the sticky bar is explicitly never rendered, `researchPageCopy.ts:2195`); hours absent. For an emergency plumber at
02:00 the page must show "פתוח עכשיו / 24 שעות" and two thumbs-reach buttons. The USP's "24 שעות ביממה" never reaches the page
(HOURS rule forbids availability figures unless written exactly — it was written exactly).

**2.12 Local SEO / GEO / AEO fundamentals.** Good: `<html lang="he" dir="rtl">`, titles follow Yonatan's formula with RLM before
a Latin brand, canonical, `og:locale`, `Plumber` type, `areaServed` cities, `Service` per page, sitemap, legal pages `noindex`,
hub→service→sibling links. Missing: `openingHoursSpecification`, `sameAs` (GBP/Maps URL — the single strongest entity signal),
`priceRange`, `address` for mixed/location businesses (`startIntake.ts:154` keeps it; verify render), `FAQPage` (never emitted
because Q&A is dropped), `hasOfferCatalog` from the price table, `image` of the real business. NAP consistency with GBP is not
checked anywhere. AEO: the cost FAQ "כמה עולה תיקון נזילות בתל אביב? … מתחיל מ־350 ₪" is exactly the AIO-quotable pattern — good — but
it exists on one page only.

**2.13 Would it win calls for a plumber in Holon?** Against a Wix/Durable site: the hero promise, trust bar and price promise are
better than 80% of local plumber sites. Against the Local Pack it is irrelevant until GBP is linked (`sameAs`, GBP website field,
consistent phone). The call-killers are: no photo, no hours, no WhatsApp above the fold, and a 60-word page Google will treat as
thin alongside 20 sibling clients using the same templates. Fix 2.1/2.10/2.11 and the answer becomes "yes".

**2.14 Accessibility of the generated site (IS 5568 / WCAG 2.0 AA) — Medium.** Positives: semantic sections with
`aria-labelledby`, `role="list"`, 44px targets, consent checkbox 24px, `lang`/`dir`. Gaps: form inputs have `aria-label` but no visible
`<label>` (placeholder-as-label fails 3.3.2 in practice and disappears on input); emoji glyphs (📞, 💬, 🕒, 🚀) inside link text are
read aloud; no skip link; contrast of `textMuted` on `surface` per theme is unverified; the accessibility statement claims IS 5568
"ככל הניתן" — publish only after an axe run per theme. `isAccessibilityExempt` depends on `vatStatus` which the new intake never
asks (`legalPages.ts:21`), so every site gets the statement — correct default.

## 3. Generation architecture

**3.1 Robustness — a 2-character overrun killed a whole site — High.** electrician-2 (r3a) failed at `serviceDetails[2].name
max_length 25, actual 27` (`eval-r3a/electrician-2/outcome.json`): the owner's own service name "התקנת עמדת טעינה לרכב חשמלי" is 27
chars and is a system-filled field. `runResearchToSite` returns `copy_validation_failed` for the whole site
(`researchToSite.ts:557-560`). *Recommendation:* clamp or wrap card names at render time and validate owner labels at intake;
never fail a site on a system field.

**3.2 Cost and latency per site (r3a, Qwen 3.8 Max):** US$0.115–0.164 LLM per 3–4-page site, 8–12 calls, 3 roles (tamar 40–80 s,
repair 15–25 s, noa 4–10 s per page) → roughly 3–5 min generation. Research adds DataForSEO (~$0.002/SERP) and NeuronWriter quota
(90 s budget, `runResearch.ts:55`). Fine economically (≈₪0.6 of a ₪199 month). The real cost is the human review step and the
30 % fail/repair rate.

**3.3 Which gates check form vs truth.** Truth-checked by code: digits/phrases of five fact kinds (restatement), negated fear
words, same-day tokens, place names, service labels, business name in Q&A, review quote verbatim, prohibited claims
(`gate_unsupported_claim`), card-name set. Form-only: clause repeat, signature repeat, novelty, length bands, geresh, em-dash.
**Not checked at all:** tools, process steps, scene details, "before X" order claims, electrical/gas work by a non-electrician,
availability figures, invented customer outcomes ("אתה חוזר לישון על רצפה יבשה" is fine; "המים לא חוזרים" is a guarantee). The
warn-only Qwen judge (slice 7, `researchPageCopy.ts:1756`) is the right place to start measuring precision for these.

**3.4 Code-owned facts hold up.** Trust bar, proof, price line, cost FAQ are byte-stable, Noa-approved, and never repaired —
the m2b1i credential downgrade is gone. Two weaknesses: English/unparseable owner text is silently dropped (no owner feedback,
3.1.5 above), and templates are per-slot gendered Hebrew that assume a male solo operator (`soloOperator ?? true`,
`researchPageCopy.ts:2503`) — a two-person business or a female owner will read wrong.

**3.5 What would most reduce invented claims:** (a) owner-sourced steps (voice note → transcript → `jobWalkthrough`) so the
model has something true to say; (b) a tool/step allow-list gate; (c) move the "about" to code-built facts (name, years, area,
how he works from the USP) and let the model write only the story scene; (d) make the judge blocking for `promise` and
`contradictingSentences` once precision ≥ 90 %.

**3.6 Testability.** Excellent unit coverage of pure modules (zero-Hebrew-bytes modules, fixture providers, byte-identical
re-render). Gap: no golden test on *rendered* service pages asserting word count, FAQ schema presence and no cross-page price leak.
Add one per fixture.

## 4. Business model and ops

**4.1 Onboarding → live is mostly manual today.** Built and flag-gated: audit, prefill, intake, mock checkout, research, generation,
Cloudflare Pages deploy to `${slug}.wao.co.il` (`deploy/route.ts:226`, admin cookie required), client record + magic-link auth.
Not built: preview-before-pay (M2b.2 plan only), Takbull, recurring billing, cancel-online, status page, custom domain + 301 map (M4),
GBP add-manager flow (M4), owner photo/voice upload, monthly digest for Site-Bot clients (the only digests are the Google Ads
weekly digest `src/lib/google-ads/weekly-digest-batch.ts` and the GEO `scripts/whatsapp-digest.mjs`), monthly page-growth
scheduler (core-30 renderer exists, nothing runs it monthly), review-reply posting (`reviewResponder.ts:4` — drafts only, "task 005").
Per client Eitan still: reviews copy, maps GBP categories ("categoryId mapping is WoZ", `fixPlan.ts:30`), approves review replies,
invoices, answers help requests, builds the digest by hand.

**4.2 Cancellation terms are not implemented or shown.** Terms live in the mission doc and `docs/legal/terms-of-service.md:68,104`
(14-day proportional refund, 4-month extended cancellation for protected groups, 30-day notice, data handover within 30 days).
No UI shows them before pay; no "export/buyout after 12 months" mechanism exists. Israeli consumer law requires the cancel path
to be as easy as the signup path (same channel) — the magic-link cancel in `subscriptions.ts:260` satisfies this once wired.

**4.3 Retention loop is the product, and it is the least built part.** The ₪199 justification is "page growth + GBP upkeep +
digest" (`VISION.md:35`). Today a client would pay for a static 4-page site and silence. *Recommendation:* ship the smallest
honest loop first: monthly WhatsApp digest = GBP Performance (calls, website clicks, top keywords — Business Profile Performance
API, verified live 2026-11-11: monthly `searchkeywords.impressions` and daily metrics; keep an archive because keyword history is ~6
months) + "one question for next month's page" + the new review count. That is also the M4 baseline Yonatan specified.

**4.4 Checkout endpoint hygiene — Medium.** `checkout/init/paid.ts` has no rate limit and writes a file per call to
`data/sites-pending/` with client-supplied `collectedData` — trivial disk/tokenization-session spam when the flag opens. Reuse
`checkRateLimit` like `help-request/route.ts:36`.

## 5. Compliance and risk

**5.1 Privacy (Privacy Protection Law + Amendment 13, in force 14.8.2025 — verified 2026-11-11, see sources).** WAO as controller:
the audit disclosure (`scorecardCopy.ts AUDIT_DISCLOSURE`) is good and specific. Gaps: (a) the intake sends the owner's name,
phone, address, USP and licence number to Qwen (Alibaba Cloud, Singapore endpoint), DataForSEO, NeuronWriter and Google Places,
but the consent line says "לא יועברו לצד שלישי" (`PrivacyConsent.tsx:40`) and the Site-Bot annex names Gemini only — **update the
annex and the WAO privacy page before any paid intake** (B6); (b) cross-border transfer to Singapore needs the Transfer
Regulations basis named; (c) `data/sites-pending/*.json` has no retention/purge; (d) Amendment 13's 30-day purge promise exists for
audits only. Client sites as controller: the lawyer-approved privacy paragraph says data "לא יועבר לצד שלישי" while the lead form is
processed by WAO's server — add WAO as processor in the lawyer text (re-approval needed, `legalPages.ts:116`).

**5.2 Claims on client sites.** Licence numbers (B4), warranties ("יש אחריות לשנה על כל עבודה" from a free-text field), and
same-day promises are published as the business's statements. Under the Consumer Protection Law a misleading claim is the
business's liability, but WAO authored and generated it. *Recommendation:* an attestation step ("אני מאשר שהפרטים נכונים ואני
אחראי להם") stored with timestamp; for electricians and gas technicians, a registry lookup or document upload before the licence
tile renders; warranty wording from fixed chips only (already the case for the step — keep "other" out of the trust bar).

**5.3 Accessibility law (IS 5568).** Exemption ladder is correctly defaulted to "build the statement" (`legalPages.ts:21`). The
statement names a contact (good). Risk: the statement asserts compliance the pages have not been audited for (2.14). Run axe on
each of the 8 vertical themes once; fix contrast tokens in `verticalThemes.ts`.

**5.4 Spam law (§30A).** Help requests and intake are inbound; fine. The digest and "one question a month" are service messages
to a paying client; fine. Any re-engagement of audit-only leads needs explicit marketing consent — none is collected today.

**5.5 Data handling.** Secrets and admin: preview plan notes `admin-auth.ts verifyAdminToken` compares with `===` (not
constant-time) — fix before more admin surfaces. Deploy requires admin cookie (good). Help store validates roots and symlinks (good).

## 6. Strategic upgrades (highest leverage, including unasked)

1. **Preview before pay with the owner's own content is the conversion unlock** (M2b.2 plan is sound). Add one thing: let the owner
   tap "לא נכון" on any sentence in the preview — that is both a truth gate and the attestation step.
2. **Owner-as-source, not model-as-source.** Voice note ("walk me through a job") + 3 phone photos + GBP photos/reviews replace
   most of what the model invents and most of the depth problem. This is the cheapest path to 250 honest words.
3. **The monthly loop before the 30-page site.** VISION promises core-30; a plumber needs 4 good pages, a live GBP, and a monthly
   WhatsApp that says "12 שיחות הגיעו דרך גוגל החודש". Benchmarks (local-marketing vendors reviewed 2026-11-11: GoHighLevel/Podium-class
   tools at $97–199/mo) sell exactly three recurring features — missed-call text-back, review requests after a job, and a weekly
   stat message. WAO's ₪199 should visibly contain the review request (WhatsApp template after a job) and the digest.
4. **Review request flywheel.** `reviewPoll.ts` + `reviewResponder.ts` exist; the missing half is the ask. One WhatsApp link
   (`g.page/r/<placeid>/review`) in the owner's digest and on the site's thank-you state turns the GBP rating into the trust bar.
5. **Entity consistency as a product feature.** One stored NAP (name, phone, hours, area) pushed to the site, schema `sameAs`, and
   GBP; drift monitoring (`driftMonitor.ts` exists) reported in the digest.
6. **Per-trade lexicons and a licensed-trades registry check** make Site-Bot the only builder that *won't* let a plumber claim
   electrical work — a defensible promise for the "AI as ally" message.
7. **Kill the Unsplash dependency**; generate a typographic hero per vertical theme until a real photo exists.

## Ranked upgrade backlog

| # | Item | Area | Impact | Effort | Dependency | Owner |
|---|---|---|---|---|---|---|
| 1 | One pricing truth: remove ₪9.90 constants, wire Site-Bot checkout to `subscriptions.ts`, align VISION.md + `/site-bot` FAQ to 2026-11-07 terms | 4 | 5 | M | Eitan decision on trial vs no-trial | Eitan decision → engineer, copy |
| 2 | Scope-aware same-day / fear / warranty gates (gate on service set; morphological matching; unit test for the plumber-3 H1 pair) | 3 | 5 | M | — | engineer |
| 3 | Price table filtered to the page's service; cross-page price-leak golden test | 2 | 4 | S | — | engineer |
| 4 | Fix code-built Q&A producing 0 items; exempt code-built blocks from novelty; novelty measured against model fields only | 3 | 5 | M | fact-template token lists (Noa) | engineer, copy |
| 5 | Hours block + `openingHoursSpecification` + "פתוח עכשיו/24 שעות" on researched pages | 2 | 4 | S | — | engineer, UX/RTL |
| 6 | Sticky mobile call + WhatsApp bar on generated sites | 2 | 4 | S | copy for bar label | engineer, UX/RTL, copy |
| 7 | Owner contact + attestation at intake (WhatsApp/email, "הפרטים נכונים" checkbox, licence evidence) | 1,5 | 5 | M | copy | engineer, copy, Eitan decision (registry check scope) |
| 8 | Processor disclosure update (Qwen/Alibaba, DataForSEO, NeuronWriter, Places) in annex + privacy page + consent line | 5 | 5 | S | lawyer re-approval | Eitan decision, copy |
| 9 | Voice note step: private session-bound upload + Hebrew transcription → `jobWalkthrough` → process steps | 2,3 | 5 | L | storage design | engineer, copy |
| 10 | Tool/step allow-list gate per vertical (trade lexicon) + judge promoted to blocking at ≥90 % precision | 3 | 4 | M | lexicon (copy/SEO) | engineer, copy |
| 11 | Monthly WhatsApp digest for Site-Bot clients from GBP Performance API + review count + one owner question | 4 | 5 | L | M4 GBP manager access | engineer, copy, SEO |
| 12 | Review-request WhatsApp template + thank-you state link | 4 | 4 | S | GBP place id | copy, engineer |
| 13 | Code-built meta description template (120–155 chars) | 2 | 3 | S | SEO sign-off | SEO, engineer |
| 14 | Schema: `sameAs` (GBP), `priceRange`, `hasOfferCatalog`, FAQPage when Q&A exists | 2 | 3 | S | — | engineer, SEO |
| 15 | Replace about-section rule (neighbouring town) with code-built "who comes to the door" block | 2 | 3 | M | copy templates | copy, engineer |
| 16 | Owner photo step + drop Unsplash from schema/og | 2 | 4 | M | private storage (shares #9) | engineer, UX |
| 17 | Preview before pay (M2b.2) with per-sentence "לא נכון" flag | 1,3 | 5 | L | #7 | engineer, UX, copy |
| 18 | Marketing page refresh: retainer frame, exit terms as trust, embedded sample site | 1 | 4 | M | #1 | copy, UX, SEO |
| 19 | Eitan notification on help request and paid intake (Resend) | 1,4 | 4 | S | — | engineer |
| 20 | Rate limit + purge for `checkout/init`, `data/sites-pending` | 4,5 | 3 | S | — | engineer |
| 21 | Card-name overflow: wrap/clamp instead of failing the site; validate labels at intake | 3 | 3 | S | — | engineer |
| 22 | axe pass per vertical theme; visible labels on lead form; aria-hidden emoji; skip link | 5 | 3 | S | — | UX/RTL, engineer |
| 23 | Constant-time compare in `admin-auth.ts` | 5 | 2 | S | — | engineer |
| 24 | Lead-source `ref` captured on `/contact` | 1 | 2 | S | — | engineer |
| 25 | Monthly page-growth scheduler (2–4 pages/month through duplicateCheck) | 4 | 3 | L | #11 data | engineer, SEO |

## Quick wins (< 1 day each)

- #3 price-table filter; #5 hours block (data already in `collectedData.businessHours`, renderer already shows it on contact);
  #13 meta template; #14 `sameAs`/`priceRange`; #19 notifications; #20 rate limit; #21 clamp; #23 constant-time; #24 `ref`.
- Delete the two `SITE_BOT_PRICE = 9.9` constants and read the amount from one config so #1 cannot regress.
- Rating tile: render only when count exists (`trustRating` template needs `{count}`); otherwise drop the tile.
- Move the six hard-coded Hebrew strings in `StartPaidFlow.tsx` into `intakeCopy.ts` slots (no copy change, just slots).
- Add the plumber-3 H1 / fear pair and the drain-cleaning same-day pair as failing unit tests to pin the gate fixes.

## What's already strong (do not break)

- Intake design: GBP pre-fill card + 3 questions + USP anti-generic probe + served-area cap with owner swap; a11y and bidi done right.
- Code-owned facts: trust bar, proof, price promise, cost FAQ are byte-stable and Noa-approved; the credential downgrade bug is gone.
- Title/H1 formula and RLM brand anchoring; `lang="he" dir="rtl"`; legal pages noindex; sitemap; hub↔service linking.
- Audit page voice and candour copy (`SB_CHECKLIST_CANDOR`, `AUDIT_DISCLOSURE`): the model for every other disclosure.
- Safety rails: flag-gated paid routes with guard tests, zero-Hebrew-bytes modules, fixture providers, byte-identical re-render
  checks, atomic persistence, no Places content republished, Noa stage hidden from system fields.
- Eval harness with per-run `usage.json`/`events.json` — keep it; add rendered-page golden assertions to it.

## Sources (time-sensitive claims, checked 2026-11-11)

- Amendment 13 effective 14.8.2025 and enforcement posture: [Shibolet client update](https://www.shibolet.com/?p=23026),
  [Goldfarb — implications for businesses](https://www.goldfarb.com/he/%d7%94%d7%a9%d7%9c%d7%9b%d7%95%d7%aa-%d7%aa%d7%99%d7%a7%d7%95%d7%9f-13-%d7%9c%d7%97%d7%95%d7%a7-%d7%94%d7%92%d7%a0%d7%aa-%d7%94%d7%a4%d7%a8%d7%98%d7%99%d7%95%d7%aa-%d7%a2%d7%9c-%d7%9e%d7%a2%d7%a1/),
  [gov.il — database notice obligation](https://www.gov.il/he/service/notice-obligation).
- GBP Performance API (monthly search keywords, daily metrics): [Google reference](https://developers.google.com/my-business/reference/performance/rest?authuser=0),
  [searchkeywords.impressions.monthly](https://developers.google.com/my-business/reference/performance/rest/v1/locations.searchkeywords.impressions.monthly?hl=pt-br),
  [Yext overview](https://www.yext.com/blog/google-business-profile-releases-new-business-performance-api).
- Local-marketing retainer benchmarks ($97–199/mo; missed-call text-back, review requests, weekly stats):
  [JustCall — local business AI](https://justcall.io/blog/local-business-ai-bookings-texts-reviews.html),
  [EZtransition — missed-call text-back](https://blog.eztransition.com/post/missed-call-text-back-software-local-service-businesses)
  (vendor sources; treat prices as indicative).
