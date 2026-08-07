# Technical Specification — Self-Serve GBP Comparison Magnet

Author: Dror (PPC Strategist), on behalf of WAO strategy
Owner for implementation: Eitan-Dev (Next.js Engineer)
Client-facing copy owner: Tamar (Copywriter) → Noa (Language QA) — placeholders only below, see §7
Verification owner: Roni (Verifier)
Status: Ready for implementation — spec-only, code not started
Origin: `STATUS.md` "Queued follow-on mission — self-serve GBP magnet (Lior, 2026-08-07) — HIGH
PRIORITY." Eitan wants to drive cheap paid traffic to this page to test it (the concrete trigger
that raised this from "someday" to "queued right behind Readiness Gate shipping").
Depends on: `scripts/lib/places-client.mjs` (shared Places API (New) client — reused, not
reimplemented, see §3), `docs/specs/readiness-gate.md` (the extraction that made this module
reusable; this spec is the client-facing counterpart §9 there explicitly excluded from that build),
`src/app/api/leads/route.ts` + `src/lib/crm/leadsStore.ts` + `src/lib/crm/intelligence.ts`
(`LeadRecord` shape — reused unchanged, see §5), `src/lib/payments/rate-limit.ts` (in-memory
fixed-window limiter — reused unchanged, see §6), `docs/specs/priority-3-lead-capture-reliability-
and-client-feedback.md` (gclid/wbraid/gbraid capture pattern this spec's form must replicate, since
Eitan's paid-traffic test depends on it — see §5.3).
Related: `docs/specs/grade-a-outreach-playbook.md` §2 (the manually-run magnet this spec makes
self-serve — same approved field set, same "no response-rate" rule, inherited not reopened).

---

## 0. Problem statement

`scripts/gbp-comparison-report.mjs` works, but every use of it costs Eitan a manual step: run the
script, copy the output, paste it into a personal WhatsApp send. That's fine at outreach volume
(Eitan hand-picking Grade-A prospects) and wrong at ad-traffic volume — a cold click from a paid
campaign has no Eitan on the other end to notice it, run the script, and follow up. STATUS.md names
the exact failure mode this spec exists to prevent: **testing "magnet + Eitan's personal touch"
instead of testing the magnet itself**, which would tell Eitan nothing about how the asset performs
at real volume.

This spec turns the existing CLI script into a public, unauthenticated web page: a form that runs
the same Places lookup server-side, shows an ungated instant preview, and gates the fuller report
behind a real value-exchange (name/phone/email) that produces a gradeable CRM lead — not a bare
"give us your email to see more" wall.

**Two hard constraints already decided (Lior, 2026-08-07 — do not re-litigate):**
1. **Plain form, not Google OAuth.** No client credential exists or is needed pre-sale; this is a
   WAO-keyed public Places lookup exactly like the CLI script. OAuth belongs to VISION's
   post-payment onboarding pattern (`VISION.md` "Infrastructure Model"), not a cold top-of-funnel
   touch.
2. **Split, not a paywall on the opener.** Ungated instant preview (rating + review count) → full
   report (adds recent-pace comparison + a routing/next-step line) unlocked by contact-info
   submission. The ungated slice must stand on its own as a real Touch-1 opener even for a visitor
   who never unlocks anything.

---

## 1. Funnel shape

```
Landing page (public, unauthenticated)
  ↓ visitor fills form: business name + city + category
  ↓ POST /api/gbp-magnet/preview  (rate-limited, §6)
  ↓
UNGATED INSTANT PREVIEW (rendered immediately, no contact info required)
  — target business: rating + total review count only
  — one competitor's rating + review count, for a same-glance comparison
  — no recent-pace data, no routing/next-step line
  ↓ visitor fills unlock form: name + phone + email
  ↓ POST /api/gbp-magnet/unlock  (rate-limited, §6; creates the CRM lead, §5)
  ↓
FULL REPORT (rendered inline, same page — no separate URL/redirect required)
  — everything in the preview, plus:
  — up to 3 competitors (matching the CLI script's existing output, not just 1)
  — recent-review-pace proxy for target + all competitors, labeled as a small-sample estimate
  — one Hebrew "what's next" line (placeholder-templated, Tamar/Noa own the copy — §7)
```

The preview and the unlock form are **two separate server calls**, not one call with client-side
truncation of the response. This is a deliberate anti-pattern guard: if a single API response
carried the full report and the UI merely hid the gated fields in the DOM, a visitor could read the
full data out of the network tab without ever submitting contact info, silently defeating the whole
value exchange. The server must not return recent-pace data or the third/fourth Places lookups
until the unlock call succeeds.

---

## 2. Form fields and validation

### 2.1 Preview form (ungated)

| Field | Required | Validation |
|---|---|---|
| `businessName` | Yes | Non-empty, trimmed, max 120 chars |
| `city` | Yes | Non-empty, trimmed, max 60 chars — free text, not a dropdown (Places Text Search handles fuzzy city names fine, matching the CLI script's own input shape) |
| `category` | Yes | Non-empty, trimmed, max 60 chars — free text for v1 (a constrained dropdown against the vertical taxonomy in `readiness-gate.md` §2.4 is a reasonable v2 tightening, not required for v1: Places Text Search's `"{category} ב{city}"` query already tolerates free-text Hebrew category terms, same as the CLI script does today) |

No `placeId` field on the public form — that CLI flag exists for Eitan's own manual disambiguation
use; a cold visitor has no Place ID to supply. If Text Search resolves zero or ambiguous candidates,
see §2.3.

### 2.2 Unlock form (gates the full report)

| Field | Required | Validation |
|---|---|---|
| `name` | Yes | Non-empty, trimmed, max 120 chars |
| `phone` | Yes | Israeli phone shape — reuse whatever pattern `LandingPage.tsx`'s existing lead form already validates against (do not invent a second regex; if none exists yet, a permissive `^0\d{8,9}$`-class check after stripping spaces/dashes is enough for v1) |
| `email` | Yes | Standard `@`-shape check, same permissiveness as the magic-link route's `email.includes('@')` gate (`src/app/api/subscriptions/magic-link/request/route.ts`) — do not over-engineer RFC-5322 validation for a lead form |
| consent checkbox | Yes | Unchecked = form does not submit. Copy is Tamar/Noa's (§7) — flagging here because Israel's Privacy Protection Law Amendment 13 (in force since Aug 14, 2025) requires explicit consent to be contacted for marketing, and this form's entire purpose is capturing a prospect for outbound WAO follow-up. This is a **narrower** consent ask than Gate 1 (ECL) in VISION.md §"Gate 1" — no hashed PII goes to Google here, just "WAO may contact me" — but it still needs its own explicit, unbundled checkbox, not folded into a generic ToS link. |

`name`/`city`/`category` from the preview step are carried forward (hidden fields or client state)
so the unlock call doesn't re-ask for them — the visitor only supplies what's new (contact info).

### 2.3 No-match / ambiguous-match handling

If Places Text Search returns zero candidates for `businessName` + `city`: show a plain "we
couldn't find your business on Google — check the spelling or try without the city" message, no
preview rendered, not counted as a rate-limited attempt against the visitor's quota beyond the one
call already spent (§6 still applies — a retry is a new request). Do not silently fall back to a
fuzzy first-result guess; a wrong business shown as "yours" undermines the entire credibility premise
of the magnet.

If multiple plausible candidates exist, take the same approach the CLI script takes today: highest-
ranked Text Search result, no disambiguation UI in v1 (matches the existing script's behavior —
`textSearch(..., { maxResults: 1 })` already just takes result 0). Flagged as a known v1 limitation,
not a blocker — a visitor who gets the wrong business back can just retry with a more specific name.

---

## 3. Server route: reuse of `places-client.mjs`

**Hard requirement: the Next.js route imports the same `scripts/lib/places-client.mjs` module the
CLI script uses — no third copy of `textSearch()`/`placeDetails()`/`recentPace()`.** This is exactly
the antipattern `readiness-gate.md` §4 already named and rejected for its own build ("do not write a
third copy of that regex" / "a second copy of the same API client"). Concretely:

- `places-client.mjs` is plain ESM with no CLI/Node-script-specific coupling (no `process.argv`, no
  `fs` env-file reading baked into its exports — env/API-key handling stays in each caller, exactly
  as it already does for `gbp-comparison-report.mjs` today). It is already import-safe from a Next.js
  API route.
- The route reads `GOOGLE_MAPS_API_KEY` the normal Next.js way (`process.env.GOOGLE_MAPS_API_KEY`
  via `.env.local`, already loaded by the framework) — it does not need the CLI script's manual
  `.env.local` line-parser (`scripts/gbp-comparison-report.mjs` lines 53–61), since that parser
  exists only because plain Node scripts run outside Next.js's env loading.
- `buildEntrySignals()` already returns the exact numeric shape both the preview and the full report
  need (`{ rating, reviewCount, recentPace, sampleSize }`) — the route slices which fields it sends
  to the client per §4, it does not need a different data-shaping function for gated vs. ungated.

### 3.1 Two routes, matching the two-call funnel shape (§1)

```
POST /api/gbp-magnet/preview
  body: { businessName, city, category }
  → resolves target via textSearch + placeDetails (1 target + 1 top competitor only — 2 Places calls)
  → returns: { targetName, targetRating, targetReviewCount,
               competitorName, competitorRating, competitorReviewCount,
               previewToken }   // see §3.2

POST /api/gbp-magnet/unlock
  body: { previewToken, name, phone, email, consentGiven: true }
  → re-resolves the same target + up to 3 competitors (up to 4 more Places calls — see §3.2 for why
    "re-resolves" rather than "re-uses cached IDs" is the deliberate v1 choice)
  → writes a lead to the CRM (§5)
  → returns: { fullReportText: string, ...structured fields for a nicer inline render than raw text }
```

### 3.2 `previewToken` — anti-abuse binding, not a security boundary

`previewToken` is an opaque, short-lived, server-signed token (HMAC over `{businessName, city,
category, issuedAt}`, or a signed JWT — Eitan-Dev's implementation choice) returned by `/preview` and
required by `/unlock`. Its job is narrow: **prevent a visitor from calling `/unlock` directly without
ever calling `/preview`**, which would let the rate limit on `/preview` (the cheaper of the two
calls) be bypassed entirely by hitting the expensive endpoint straight. It is *not* meant to be a
strong anti-tampering boundary — a determined abuser can still automate both calls in sequence, which
is exactly why §6's rate limiting (not the token) is the real cost control. Token TTL: 15 minutes,
generous enough for a real visitor to fill the unlock form, short enough that a leaked/shared token
isn't a standing liability.

**Why `/unlock` re-runs the Places lookups instead of caching the `/preview` result server-side and
replaying it:** a cache adds a new stateful component (what store, what TTL, what happens on a
cold restart) to save 2 Places calls per unlock — at the traffic volumes this magnet will see during
a "cheap paid traffic" test, that's not worth the added moving part. Revisit only if Places API cost
at scale becomes a real line item (see §6.4 for the cost-control framing that actually matters).

---

## 4. Exact field split — preview vs. full report

Restates §1's funnel shape as a field-by-field table, because "be precise about which Places API
fields go where" was the explicit ask:

| Field | Ungated preview | Full report (post-unlock) |
|---|---|---|
| Target rating | Yes | Yes |
| Target review count | Yes | Yes |
| Target recent-pace proxy (d30/d60/d90) | **No** | Yes, labeled as small-sample estimate (same disclaimer line as the CLI script) |
| Competitor count shown | 1 | Up to 3 (matches the CLI script's existing `slice(0, 3)`) |
| Competitor rating + review count | Yes, for the 1 shown | Yes, for all shown |
| Competitor recent-pace proxy | **No** | Yes, for all shown |
| Routing / "what's next" line | **No** | Yes — placeholder-templated (§7) |
| `websiteUri` / any Enterprise-SKU field | **Never** — inherited constraint from `places-client.mjs`'s header comment and `readiness-gate.md` §2.1, not reopened here | **Never** |
| Review-response-rate | **Never** — inherited from `grade-a-outreach-playbook.md` §2 / `gbp-comparison-report.mjs` header, requires GBP OAuth WAO doesn't have | **Never** |

The field set itself (rating, review count, recent-pace proxy) is unchanged from the already-approved
list (Eitan sign-off 2026-08-03, reconfirmed 2026-08-07 for the Readiness Gate) — this spec only adds
a **gate boundary** across that existing set, it does not add or remove a single field from what's
approved.

---

## 5. Lead capture — "no silent losses," made concrete

### 5.1 Reuse `/api/leads`, do not invent a parallel lead store

A successful `/unlock` call must write a real, gradeable `LeadRecord` (`src/lib/crm/intelligence.ts`)
through the **existing** `readLeads()`/`writeLeads()` pair in `src/lib/crm/leadsStore.ts` — either by
calling `/api/leads` POST in-process (same pattern `uploadConversion()` in `src/app/api/leads/
route.ts` already uses for calling `uploadLeadConversion()` in-process instead of self-`fetch`), or
by importing `leadsStore.ts` directly from the new `/unlock` route handler. **Do not create a second
JSON file or a second store for magnet leads** — that would immediately reproduce exactly the "one
contact channel, two different tracking systems" defect class `priority-3-lead-capture-reliability-
and-client-feedback.md` was built to close, applied to a channel that didn't exist when that spec was
written.

### 5.2 What gets written, mapped to `LeadRecord`'s existing fields — no new schema

| `LeadRecord` field | Value for a GBP-magnet lead |
|---|---|
| `type` | `"gbp-magnet-unlock"` — new value, additive; existing values (`"form"`, `"phone-click"`, `"whatsapp-click"`) are untouched |
| `source` | `"gbp-magnet"` |
| `name`, `phone` | From the unlock form |
| `businessNiche` | The `category` value the visitor typed at the preview step |
| `slug` | The visitor's *own* business, not a WAO client slug — store as the slugified `businessName` + `city` (same scheme `readiness-gate.md` §7 already specifies for `prospectSlug`, reused here rather than inventing a second slugging convention) |
| `customerId` | Empty — this lead has no Google Ads sub-account yet, it *is* the sub-account's future owner |
| `gclid` / `wbraid` / `gbraid` | Captured from the URL the same way `LandingPage.tsx` already does it (`src/components/lp/LandingPage.tsx` lines ~32–60) — **this is the field that makes Eitan's paid-traffic test gradeable at all.** If the magnet page is reached via a Google Ads click and this capture is skipped, the traffic test produces spend data with zero attribution back to which ad/keyword produced which lead — the exact "money moved without a provable trace" failure class `readiness-gate.md`'s Q1 escalation-trigger resolution names as Class A. This field is not optional polish; wire it identically to the existing LP pattern before any paid traffic is sent. |
| `email` | **Not a field on `LeadRecord` today.** Add it (Eitan-Dev's call on exact typing — likely `email?: string \| null`, mirroring the existing optional-string convention every other field on the interface already uses) rather than discarding it or stuffing it into an unrelated field. Losing the email a visitor explicitly typed into a form is itself a silent loss. |
| `status` | `"חדש"` (matches the existing convention for a fresh, non-click-stub lead) |
| `quality` | `"PENDING"` (unchanged default — a human still grades it GOOD/JUNK later, same as every other lead) |

### 5.3 Gradeability — what "gradeable trace" concretely means here

Per STATUS.md's standing rule, a captured lead is only real if it can be graded and traced, not
merely stored. Concretely, for this magnet:

1. The lead appears in `/leads` (the existing internal Mini-CRM view) with `source: "gbp-magnet"`
   immediately after a successful unlock — visible to Eitan without a separate query or export.
2. It carries `gclid`/`wbraid`/`gbraid` when present (§5.2) so a future offline-conversion upload
   (the same `uploadLeadConversion()` path every other lead already uses) can fire once Eitan grades
   it GOOD — **no new conversion-upload code path needed, the existing one in `src/app/api/leads/
   route.ts`'s `updateQuality` handler already fires on any lead with a click ID, regardless of
   `type`.**
3. It is gradeable through the *existing* GOOD/JUNK UI — no new admin surface required for v1 grading
   (this spec does not need its own `/admin/gbp-magnet` screen; `/leads` already does the job).

### 5.4 Notification

Reuse `sendLeadNotificationEmail(newLead)` (already called unconditionally on every new lead in
`src/app/api/leads/route.ts`) — no new notification channel needed. Eitan gets the same email alert
for a magnet unlock as for any LP lead.

---

## 6. Rate limiting and cost control

### 6.1 Why this matters here specifically, more than on other public routes

This route calls the Places API with **WAO's own key**, not a client's. Every visitor hit costs WAO
real money regardless of whether the visitor converts, and — unlike `LandingPage.tsx`'s lead form,
which only ever writes to the free `leads.json` store — a bot or scraper hammering this specific
route burns billed external API calls on every single request, including ones that never reach the
unlock step. This is a materially different risk profile from every other public form in the
codebase and needs its own explicit limit, not an assumption that "the existing lead-form posture is
enough."

### 6.2 Reuse `src/lib/payments/rate-limit.ts`, do not build a second limiter

The in-memory fixed-window limiter already exists and is already used for exactly this class of
problem (`src/app/api/subscriptions/magic-link/request/route.ts`). Reuse `checkRateLimit()`
unchanged. Its documented scope caveat (per-process only, fine under the current single pm2-fork
deployment, must move to a shared store if that ever changes) applies here identically — inherited,
not re-litigated.

### 6.3 Limits — two layers, matching the two-route shape (§3.1)

| Route | Key | Limit | Rationale |
|---|---|---|---|
| `/api/gbp-magnet/preview` | IP address (`x-forwarded-for`, same extraction as the magic-link route) | 5 requests / 10 minutes | A real visitor tries at most a handful of name/city spelling variants; 5 gives headroom without leaving the door open to a scripted loop |
| `/api/gbp-magnet/unlock` | IP address | 3 requests / 10 minutes | Unlock is the more expensive call (up to 4 Places calls vs. 2) and the one an abuser would target directly if `previewToken` binding (§3.2) were ever bypassed — tighter limit as defense in depth |

Both return HTTP 429 with a `Retry-After` header on rejection, matching the magic-link route's
existing pattern exactly (`src/app/api/subscriptions/magic-link/request/route.ts` lines 29–34) — copy
that response shape, don't reinvent it.

### 6.4 What this does and does not protect against

Being explicit, so this isn't oversold: an IP-keyed, per-process, fixed-window limiter stops casual
abuse and simple scripted loops. It does **not** stop a distributed botnet (different IPs each
request) or a determined attacker rotating through a residential proxy pool. That level of defense
(CAPTCHA, a managed bot-protection service, Cloudflare-level rate limiting if/when the site sits
behind Cloudflare's proxy rather than just Pages hosting) is **explicitly out of scope for v1** — see
§8. The proportionality call: at "cheap paid traffic test" volume, IP-based limiting plus the
`previewToken` binding is enough runway to ship and observe real abuse patterns (if any) before
building anything heavier. If Google Ads billing shows an anomalous spend spike traceable to this
route, that is the concrete trigger to revisit, not a guess made now.

### 6.5 A hard ceiling as a second, independent safety net

In addition to per-visitor rate limiting, add one global daily cap on Places API calls made *through
this route specifically* (a simple in-memory counter, resettable at UTC midnight, same "just enough,
not overbuilt" posture as the rest of this section) — e.g. 200 calls/day, tuned once real traffic
volume is known. This is a blunt, independent backstop for the case the per-IP limiter is
circumvented (distributed abuse, §6.4) — it fails safe (visitors see a friendly "try again later"
message, not a stack trace) rather than failing open into an unbounded bill. Flagged as a cheap
addition, not a load-bearing security control — the per-IP limiter is still the primary defense.

---

## 7. Client-facing copy — placeholders only, Tamar/Noa own the words

Mirrors `readiness-gate.md` §8's pattern exactly — this spec supplies trigger logic and placeholder
markers only. Do not draft final Hebrew here.

- `{{GBP_MAGNET_HEADLINE}}` — page hero headline (visible pre-form)
- `{{GBP_MAGNET_FORM_INTRO}}` — short line above the preview form (business name/city/category)
- `{{GBP_MAGNET_PREVIEW_TEASE}}` — one line shown alongside the ungated preview, framing what's
  locked ("see how you compare on review pace + what to do next")
- `{{GBP_MAGNET_UNLOCK_CTA}}` — button/label text on the unlock form's submit action
- `{{GBP_MAGNET_CONSENT_LINE}}` — the granular, unbundled marketing-consent checkbox copy (§2.2) —
  **needs the same care as VISION.md Gate 1's ECL consent line**; hand to Tamar with that precedent
  named explicitly, not drafted fresh from nothing
- `{{GBP_MAGNET_NO_MATCH}}` — the "couldn't find your business" message (§2.3)
- `{{GBP_MAGNET_NEXT_STEP_*}}` — reuses the five routing-outcome templates already specified in
  `readiness-gate.md` §8 (`{{ROUTING_LINE_SITE_BOT}}` etc.) **if and only if** the routing tree from
  that spec has shipped and is available to call from this route by the time this ships (§9 notes
  this as a soft dependency, not a hard blocker — v1 can ship with a single generic "what's next: talk
  to us" line if the routing tree isn't ready yet, upgraded to the specific routing line later without
  a re-ship of this spec's core mechanism)

---

## 8. Explicitly out of scope for v1

- **CAPTCHA / managed bot-protection service** — deferred per §6.4's proportionality call. Revisit
  trigger: an observed anomalous spend spike on the WAO Places API key traceable to this route.
- **Distributed/botnet-resistant rate limiting** (shared store, Cloudflare-level limiting) — the
  current in-memory per-process limiter's known scope caveat (`rate-limit.ts` header comment)
  applies unchanged; revisit only if/when the deployment model changes from single pm2-fork.
- **A place-disambiguation UI** for multiple plausible Text Search matches (§2.3) — v1 takes the
  top result, same as the CLI script does today.
- **A category dropdown constrained to the vertical taxonomy** — v1 ships free-text `category`,
  matching what the CLI script already accepts. A constrained dropdown against `readiness-gate.md`
  §2.4's archetype table is a reasonable v2 tightening, not required to ship.
- **Server-side caching/replay of the `/preview` Places results at `/unlock` time** (§3.2) — v1
  re-runs the lookups; revisit only if Places API cost at real scale makes the extra calls a line
  item worth optimizing.
- **Wiring the Readiness Gate's routing-tree "what's next" line into the full report** as a hard
  dependency — soft dependency only (§7); v1 can ship with a generic next-step line if that spec's
  routing logic isn't callable yet.
- **A dedicated admin surface for grading magnet leads** — the existing `/leads` Mini-CRM view
  already covers this (§5.3 point 3); no new `/admin/gbp-magnet` screen in v1.
- **Any Places field beyond the already-approved set** (rating, review count, recent-pace proxy) —
  `websiteUri` and review-response-rate stay excluded, inherited unchanged from
  `grade-a-outreach-playbook.md` §2 and `places-client.mjs`'s own header comment.
- **Google OAuth / GBP sign-in as an alternative or additional unlock mechanism** — explicitly
  rejected by Lior's 2026-08-07 decision (§0); not a v1-vs-v2 sequencing question, a closed one.
- **International / non-Hebrew localization of the form or report** — out of scope, matches every
  other current WAO client-facing surface (Hebrew/RTL only, per `CLAUDE.md`).

---

## 9. Test coverage (Eitan-Dev)

Same hard rule as every prior spec in this repo: assert against real behavior (mocked `fetch` for
Places calls, mocked rate-limit state reset between tests via `resetRateLimitState()`), not
source-text regex.

### 9.1 `src/app/api/gbp-magnet/preview/route.test.mjs` (NEW)
1. Valid `{businessName, city, category}` → resolves target + 1 competitor via `places-client.mjs`
   (mocked `fetch`), returns `{targetRating, targetReviewCount, competitorRating,
   competitorReviewCount, previewToken}` — **no `recentPace` field present in the response body at
   all** (not just hidden client-side — assert the key is absent from the JSON, the concrete
   regression guard for §1's "two separate calls" anti-pattern rule).
2. Zero Text Search results → `{success: false}`-shaped response, no preview rendered downstream,
   no competitor lookup attempted (cost control — don't spend a second Places call chasing a
   business that doesn't exist).
3. 6th request from the same IP within 10 minutes → HTTP 429 with `Retry-After` header (mirrors the
   magic-link route's test pattern exactly).
4. Missing/empty `businessName`, `city`, or `category` → 400, no Places call attempted at all
   (validation happens before any billed API call — assert the mocked `fetch` was never invoked).

### 9.2 `src/app/api/gbp-magnet/unlock/route.test.mjs` (NEW)
5. Valid `previewToken` + valid `{name, phone, email, consentGiven: true}` → full report returned
   including `recentPace` for target + up to 3 competitors; a `LeadRecord` with
   `type: "gbp-magnet-unlock"`, `source: "gbp-magnet"` is appended to `leads.json` via
   `writeLeads()`.
6. Missing/expired/tampered `previewToken` → rejected, no Places calls made, no lead written
   (assert both the API-call count and the leads-file write count are zero).
7. `consentGiven: false` or missing → rejected before any Places call or lead write.
8. A request that includes `gclid` (simulating a paid-traffic click-through) → the resulting
   `LeadRecord` carries that `gclid` unchanged — the concrete regression guard for §5.2's "this is
   what makes the paid-traffic test gradeable" requirement.
9. 4th request from the same IP within 10 minutes → HTTP 429 with `Retry-After` header.
10. A duplicate unlock attempt with the same already-consumed `previewToken` → rejected (token is
    single-use — prevents a captured token from being replayed to re-run the expensive lookups for
    free after the rate-limit window resets).

### 9.3 `src/lib/crm/intelligence.test.ts` (extend)
11. `LeadRecord`'s new optional `email` field round-trips through `readLeads()`/`writeLeads()`
    unchanged (regression guard for §5.2's schema addition).

### 9.4 Roni's runtime pass
- Real (not mocked) end-to-end: fill the preview form on the live page → see the ungated preview
  render with no recent-pace data visible anywhere in the rendered DOM or network response → fill
  the unlock form → see the full report render inline → confirm the lead appears in `/leads` within
  a few seconds, correct fields, `source: "gbp-magnet"`.
- Confirm a URL carrying `?gclid=test123` produces a lead with that `gclid` populated — the concrete
  runtime check for the paid-traffic-test gradeability requirement (§5.3), not just a unit-test
  assertion.
- Confirm the 429 response actually appears in-browser (not just in a unit test) after exceeding the
  preview and unlock limits in quick succession.
- Confirm `npm run build` / `npm run lint` clean.

### 9.5 Definition of Done
- [ ] `src/app/api/gbp-magnet/preview/route.ts` and `.../unlock/route.ts` shipped, both importing
      `scripts/lib/places-client.mjs` — no third copy of the Places client (test coverage: this file
      itself imports from the shared module, verified by code review, not a runtime test).
- [ ] Ungated preview never includes `recentPace` or a third-Places-lookup result in its response
      body (test #1).
- [ ] Full report includes up to 3 competitors + recent-pace proxy, gated correctly behind a valid,
      single-use `previewToken` (tests #5, #6, #10).
- [ ] `previewToken` binds `/unlock` to a prior `/preview` call and cannot be bypassed (test #6).
- [ ] Rate limiting live on both routes, reusing `src/lib/payments/rate-limit.ts` unchanged (tests
      #3, #9).
- [ ] Global daily Places-call ceiling implemented per §6.5 (manual code review — no dedicated test
      required for a blunt backstop, but confirm the counter resets at UTC midnight).
- [ ] A successful unlock writes a real `LeadRecord` via the existing `leadsStore.ts` — no second
      lead store created (test #5).
- [ ] `gclid`/`wbraid`/`gbraid` captured and persisted on the lead exactly like `LandingPage.tsx`
      already does (test #8, Roni's runtime gclid check).
- [ ] `LeadRecord.email` added, round-trips correctly (test #11).
- [ ] The lead is visible and gradeable through the existing `/leads` Mini-CRM view — no new admin
      surface required (Roni's runtime pass).
- [ ] `sendLeadNotificationEmail` fires on a magnet unlock exactly as it does for any other lead.
- [ ] Consent checkbox required and unbundled, blocks submission when unchecked (test #7).
- [ ] `npm run build` / `npm run lint` clean.
- [ ] Roni's runtime pass (§9.4) complete against the live/staging page.
- [ ] Tamar has written and Noa has QA'd every placeholder in §7 before this is used in live
      outreach or paid-traffic testing — **hard precondition for the traffic test Eitan wants to
      run**, independent of the code being merged. The traffic test cannot start on code alone.

---

## 10. Open questions for Adam to resolve before this routes to Tamar/Noa → Eitan-Dev

1. **Which URL/route hosts the public page itself** (e.g. `/gbp-magnet`, `/checkup`, something
   under an existing marketing-site route namespace)? Not specified here — this spec covers the API
   routes and funnel logic; the page's URL/slug and its placement in site navigation (if any — it may
   be a paid-traffic-only landing page with no nav link, matching the existing `/lp/[slug]` pattern)
   is a UX/routing call, not a strategy call, and affects whether Maya (ux) or Eitan-Dev alone should
   own the page shell.
2. **Does the full-report render need Maya's RTL/bidi review** before shipping, given the existing
   codebase's standing bidi-risk pattern (`CLAUDE.md`'s RTL/Hebrew rendering section, and the
   Readiness Gate build's own note that Maya "confirmed no bidi risk in WhatsApp or the future
   RTL-rooted admin page")? This spec's report mixes Hebrew text with Latin ratings/numbers
   (`4.7`, `132`) — likely low bidi risk given the numeric-only Latin content, but flagged for an
   explicit sign-off rather than assumed.
3. **Sequencing confirmation**: this spec assumes Readiness Gate has already shipped (per STATUS.md's
   explicit sequencing — "queued behind Readiness Gate shipping + Roni-verified"). STATUS.md shows
   Readiness Gate shipped 2026-08-07 and Roni-verified PASS. Confirm no other in-flight work (e.g.
   the reconciliation-pass freeze on priority-3/4) blocks this from starting now.
4. **`LeadRecord.email` typing/placement** — flagged as Eitan-Dev's call in §5.2, but if there's a
   reason this field was deliberately never added before now (e.g. a PII-minimization policy this
   spec isn't aware of), that should surface before the field ships, not after.
