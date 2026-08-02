# Technical Specification — Priority 3: Guaranteed Lead Capture + Client Feedback Loop

Author: Dror (PPC Strategist), on behalf of WAO strategy
Owner for implementation: Eitan-Dev (Next.js Engineer)
Verification owner: Roni (Verifier)
Status: Ready for implementation — **read §0.1 before sequencing this against pilot outreach**
Depends on: today's in-progress LP tracking fix (`/lp/[slug]`, `src/components/lp/LandingPage.tsx` —
gclid/wbraid/gbraid capture + POST to `/api/leads` on submit/click), and reuses `buildWeeklyDigest` /
`loadClientGoogleAdsIndex` / `loadCampaignConfigBySlug` from `src/lib/crm/intelligence.ts` (Priority 1),
and the `client-auth.ts` session-cookie pattern already used by `/client/dashboard` and
`/api/google-ads/import-conversion`.
Related: VISION.md Phase 1.5 pilot cohort; `docs/specs/pilot-client-gating.md` (admission scorecard —
this spec is a *readiness* prerequisite, not an admission criterion, see §0.1).

---

## 0. Problem Statement

Today's fix makes `LandingPage.tsx` call `/api/leads` on form submit and on phone/WhatsApp link
clicks, capturing `gclid`/`wbraid`/`gbraid`. That closes the *tracking* gap. It does not close two
adjacent gaps Eitan flagged, both real and both already partially — but incompletely and, in one
place, **currently broken** — addressed in the existing codebase:

**Part A.** The capture mechanism is a bare client-side `fetch()`. A failed request, a closed tab,
or a race against a `tel:`/`wa.me` navigation can silently drop a lead with zero record anywhere.

**Part B.** Even leads that *do* land in `src/data/leads.json` are worthless to Smart Bidding until
someone marks which ones were real (`quality: GOOD/JUNK`) and which closed (`closed` + `revenue`) —
that per-lead judgment is what should drive the offline-conversion import that gclid capture exists
to feed. Investigation below found:

- A **Mini-CRM mockup already exists and is real, not a stub** — `src/app/(app)/leads/page.tsx`
  ("ניהול לידים (Mini-CRM)"). Its `toggleQuality()`/`markClosed()`/`enrichStub()` handlers call
  `apiPost()` → `POST /api/leads` with `action: "updateQuality" | "markClosed" | "enrichStub"`,
  which **does** persist to `src/data/leads.json` (`src/app/api/leads/route.ts:49-97`). This is not
  a local-state mockup — the local `setLeads(...)` calls are optimistic UI, immediately followed by
  a real, persisted write. Confirmed by reading the file, not assumed.
- That same route **already** fires an offline-conversion upload attempt on `quality: "GOOD"` and on
  `markClosed` (`route.ts:54-60, 90-94`, `uploadConversion()`). **But this call is currently broken**:
  `uploadConversion()` does a server-to-server `fetch()` to `/api/google-ads/import-conversion`
  without forwarding the `wao-client` session cookie, and that route requires
  `verifySessionToken(jar.get(COOKIE_NAME))` (`import-conversion/route.ts:66-68`) — so every one of
  these attempts gets a self-inflicted 401 today, silently swallowed by a bare `.catch(console.error)`
  (`route.ts:58, 93`). This bug predates this spec and affects the *existing* Mini-CRM right now,
  independent of anything client-facing. §2 fixes it as a byproduct of the refactor Part B needs
  anyway.
- `/leads` (the Mini-CRM page) is **WAO-internal only today** — no session/auth gate at all, not
  linked from `/client/dashboard`, and its `GET /api/leads` returns **every lead for every client,
  unauthenticated** (`route.ts:34-41`). That's fine while it's an unlinked internal tool; it is a
  real cross-client data leak the moment anything client-facing reuses it as-is. Part B does not
  reuse `GET /api/leads` for the client-facing surface — it adds a scoped equivalent.
- `/client/dashboard` (`src/app/(app)/client/dashboard/page.tsx`) **is a real, session-gated,
  per-client surface today** — confirmed, not assumed. It already computes and renders a read-only
  Google Ads Weekly Digest for the logged-in client via the same `buildWeeklyDigest` used in
  Priority 2. It has no lead list and no grading controls yet. It is the correct extension point —
  no new top-level page architecture is needed, only a client-scoped variant of the existing
  Mini-CRM table wired into a route under the same session gate.

### 0.1 This is a gate, not a parallel-track improvement — flag for Adam/Eitan to sequence

Eitan's framing: *"no pilot client should be onboarded before this basic lead tracking + grading
loop is real and working, even in Wizard-of-Oz form... That's our edge! I wouldn't ship without
it."* Per `docs/specs/pilot-client-gating.md`, pilot admission (the ≥12/16 scorecard) is currently
Phase 1.5's top blocker. This spec's minimum bar therefore may need to land **ahead of or alongside**
pilot outreach, not after it. Eitan also explicitly said a **mockup-quality** version — not the full
spec below — is acceptable for now ("designed as a mockup, not a complete working solution").

To make that trade-off decidable rather than implicit, §6.6 below splits the Definition of Done into
a **Gate-minimum** tier (small, fast, must exist before pilot #1 is onboarded) and the **Full spec**
tier (everything else here, can trail). Adam/Eitan should pick the cutline; this spec does not
decide it unilaterally.

### 0.2 Every contact channel on the LP must produce a gradeable Mini-CRM entry — audit, not assumption

Eitan's hard rule: every contact/conversion mechanism the LP exposes must land a trace in the
Mini-CRM, full stop. A **garbage lead** (e.g. a WhatsApp click that goes nowhere) is fine and
expected — that's exactly what `quality: JUNK` is for. A **silent, untracked channel** is not fine
under any circumstance. If a mechanism is a genuine technical dead end that cannot be tracked (none
found below), it must be flagged and **not offered on the LP at all** rather than shipped untracked.

Full enumeration of every contact mechanism in `src/components/lp/LandingPage.tsx` (read in full for
this spec, not sampled):

| # | Mechanism | Location(s) in `LandingPage.tsx` | Handler | Tracked today? |
|---|---|---|---|---|
| 1 | Phone CTA (header) | line 116 | `onClick={() => pingClick('phone-click')}` | Yes |
| 2 | Phone CTA (hero) | line 144 | `onClick={() => pingClick('phone-click')}` | Yes |
| 3 | Phone CTA (sticky bottom bar) | line 295 | `onClick={() => pingClick('phone-click')}` | Yes |
| 4 | WhatsApp CTA (hero) | line 149 | `onClick={() => pingClick('whatsapp-click')}` | Yes |
| 5 | WhatsApp CTA (sticky bottom bar) | line 300 | `onClick={() => pingClick('whatsapp-click')}` | Yes |
| 6 | Lead form (name+phone+consent) | lines 264-281 | `onSubmit={handleSubmit}` | Yes |
| — | Privacy / accessibility footer links | lines 284-285 | plain nav links | N/A — not conversion mechanisms, correctly excluded |

**Finding: zero gaps today.** Every phone (`tel:`) and WhatsApp (`wa.me`) CTA on the page — all
three placements of the phone link and both placements of the WhatsApp link — already routes
through the same `pingClick()` handler that POSTs to `/api/leads` before the browser navigates away,
and the form already routes through `handleSubmit()` → the same endpoint. There is no rendered
contact surface on this component that bypasses lead creation. No mechanism needs to be pulled from
the LP under the "can't track it, so don't offer it" rule — none qualify.

**What's still at risk is not *whether* a channel is tracked, but whether the tracked call reliably
lands** — i.e., exactly Part A's problem (§1.1): the `onClick`/`onSubmit` wiring is complete and
correct today, but it fires a fragile bare `fetch()` that can be lost to a network blip or an
unloading tab. Part A's `sendBeacon`/`keepalive` fix is therefore not a "nice to have" layered on
top of tracking — per Eitan's framing, it's what turns "instrumented" into "guaranteed to land," and
should be read as in-scope for the same hard rule this section states, not a separate concern.
`enrichStub` (Mini-CRM) exists precisely because a click-stub lead is real but attribute-thin (no
name/phone yet) — it is graded and enriched after the fact, never dropped.

If a future LP iteration adds a new contact surface (e.g. an embedded chat widget, a callback-request
button, a booking calendar), the same rule applies prospectively: it does not ship without a
`pingClick()`-equivalent wired to `/api/leads` before it ships, per this section — call this out
explicitly in any future LP-copy or LP-component brief so it isn't reintroduced by omission.

---

## 1. Architecture Decisions

### 1.1 Part A — "zero silent drops" scoped correctly, not over-built

Per Eitan's own framing: no queue, no retry-with-backoff service, no second datastore. This is a
single-VPS Next.js app with file-based `leads.json` — the fix has to be proportionate to that.

Three concrete, narrow interventions, mapped one-to-one to the three named failure modes:

- **Failed network request / lost race on `tel:`/`wa.me` navigation** (the click-ping case,
  `pingClick()` in `LandingPage.tsx:63-76`): replace the bare `fetch(...).catch(() => {})` with
  [`navigator.sendBeacon()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon) —
  purpose-built for exactly this: a `POST` that the browser guarantees gets queued and sent even as
  the page unloads (unlike a normal `fetch`, which can be cancelled mid-flight by navigation).
  `sendBeacon` accepts a `Blob` (needed here, since `sendBeacon` can't set a `Content-Type` header
  except via the Blob's own `type`) and returns a boolean synchronously (whether the browser
  *accepted* the request into its queue — not whether it landed). Fallback for the rare case
  `navigator.sendBeacon` is unavailable or returns `false` (e.g. the browser's per-page beacon quota
  is exhausted): `fetch(url, { ...opts, keepalive: true })` — the direct fetch-API equivalent for
  "outlive an unloading page," widely supported alongside `sendBeacon` today. Do not build a custom
  retry queue on top of either — both primitives already exist specifically to solve this, and
  neither this codebase nor a single-VPS file-store benefits from re-implementing what the browser
  already guarantees.
- **User closes the tab before an async form-submit `fetch()` resolves** (`handleSubmit`,
  `LandingPage.tsx:82-105`): switch that `fetch()` call to `{ keepalive: true }` too. Unlike the
  click-ping case, the form submit *does* need to read the JSON response (to drive
  `formStatus`/success UI) — so `sendBeacon` (fire-and-forget, no response) isn't the right primitive
  here; `fetch` with `keepalive: true` is, because it lets the request survive an unload while still
  resolving normally if the tab stays open. Also add exactly **one** automatic retry (short delay,
  e.g. 1.5s) on a network-level failure before surfacing the existing error UI — flaky mobile
  networks, not server bugs, are the dominant real-world failure mode for a lead-gen LP. Do not add a
  second, third, or exponential-backoff retry tier — one retry catches the common transient blip
  without turning this into a queue.
- **Idempotency**, so the retry above (and any accidental double-submit) can never create a
  duplicate lead: `LandingPage.tsx` already generates a per-submission `orderId` via `uid()`
  (`LandingPage.tsx:37-39`) — the only change needed is generating it **once per form-fill attempt**
  (a `useRef`, not a fresh call inside `handleSubmit`) so a retry reuses the same `orderId`, and
  making `/api/leads`'s `POST` **upsert by `orderId`** instead of unconditionally pushing
  (`route.ts:99-124`): if a lead with the same `orderId` already exists, return it unchanged rather
  than creating a second record. `orderId` is already the field `import-conversion/route.ts:171`
  sends to Google Ads as `order_id` on the click-conversion payload — reusing it as the idempotency
  key is free, no new field needed.

**Explicitly not built:** a separate "raw click log" layer for server-side fallback capture. Every
phone/WhatsApp click already creates a *complete* lead record the moment the request lands
(`type: "phone-click" | "whatsapp-click"`, `status: "לחיצה"` — `route.ts:100-121`, already shipped in
today's fix). The only remaining risk is the request never reaching the server at all — which is
exactly what `sendBeacon`/`fetch(keepalive)` solve. A second logging layer would duplicate what the
lead record already is, for the same failure mode already covered. **Accepted residual risk** (stated
explicitly, not hidden): a browser process killed by the OS before flushing its internal beacon
queue, or a device that goes fully offline mid-tap, can still lose a lead. No client-side JS
primitive fully closes that; closing it would require infrastructure this project doesn't have and
Eitan explicitly said not to build. Document, don't chase to zero.

### 1.2 Part B — extend the existing Mini-CRM, don't build a parallel surface

Per Eitan's correction: `src/app/(app)/leads/page.tsx` already *is* the client-feedback UI in
prototype form — a table with grade/close controls, real persistence, real (if currently broken)
offline-conversion trigger. The job is (a) fix what's broken underneath it, (b) make its
grading interaction reusable by an authenticated client for *their own* leads only, and (c) mount
that scoped view on `/client/dashboard`'s existing session-gated surface — not invent a second
design.

**Extraction, not rewrite.** Pull the table markup + `toggleQuality`/`markClosed`/`enrichStub`
handlers out of `leads/page.tsx` into a shared component (`src/components/crm/LeadsTable.tsx`) that
takes `leads` + a target API base path as props. `leads/page.tsx` becomes a thin wrapper unchanged in
behavior (still fetches all leads, still posts to `/api/leads`, still WAO-internal). A new client
route mounts the same component against a scoped, authenticated endpoint. One interaction design,
two authorization contexts — not two UIs to maintain.

**Ownership check is a new, separate, strict helper — not a reuse of `buildWeeklyDigest`'s existing
filter.** `buildWeeklyDigest`'s scoping predicate (`intelligence.ts:238`) treats a lead with no
`slug`/`customerId` as belonging to *every* client (`!lead.slug ||...`) — correct and harmless for a
read-only aggregate digest (worst case: an old unattributed lead's count shows up in more than one
digest), but **not acceptable for a mutation endpoint**, where the same leniency would let any
authenticated client edit any unscoped legacy lead. Add a new, deliberately stricter, exported
`isLeadOwnedByClient(lead, clientId)` to `intelligence.ts` that returns `false` for a lead with
neither `slug` nor `customerId` set, and checks membership against **all** of a client's bound
campaigns (`GoogleAdsClientIndex.campaigns[]`, not just `primarySlug`) so a client with more than one
campaign isn't wrongly locked out of leads from their non-primary one. Do not touch
`buildWeeklyDigest`'s own filter — different security semantics, already shipped and tested, no
reason to risk it.

**Extract the Google Ads upload call out of `import-conversion/route.ts` into a plain function** —
`uploadLeadConversion()` in a new `src/lib/google-ads/conversion-upload.ts`, taking the same
`{ leadId, type }` shape but with **no** `cookies()`/session dependency. `import-conversion/route.ts`
becomes a thin wrapper: session check (unchanged) → ownership check (unchanged) → call the extracted
function → shape the `NextResponse`. Both `/api/leads` (Mini-CRM's existing trigger) and the new
client-scoped feedback route call `uploadLeadConversion()` **in-process**, not via a self-HTTP
`fetch()` — this is the one change that fixes the pre-existing cookie-forwarding bug (§0) for every
caller at once, instead of patching it locally in one place and leaving the other broken.

**The CRM write is truth; the Ads push is best-effort.** A client's "mark this GOOD" or "mark this
closed, ₪X" action must never fail or roll back because the Google Ads upload attempt failed — that
would make the client-facing feature fragile for a reason entirely outside their (or WAO's) control.
The scoped route always returns success for the CRM write and separately reports
`conversionUpload: 'ok' | 'failed'`; a failure is logged loudly (`console.error`, tagged) so it's
discoverable in PM2 logs, not swallowed.

### 1.3 Deep-link-to-grade in new-lead notifications — reuse the GEO WhatsApp pattern, don't build push infra

Two notification surfaces exist today; neither currently deep-links to the specific lead:

- **WAO-internal email** — `sendLeadNotificationEmail()` (`src/lib/mail.ts:26`) fires on every new
  lead already (`api/leads/route.ts:129`). Add a link to `{SITE_URL}/leads?highlight={id}` in the
  email body — cheap, immediate, no new infra, fixes the "WAO has to hunt for the lead in the table"
  friction today.
- **Client-facing** — no automated *per-lead, instant* client notification channel exists anywhere
  in this codebase yet. Priority 2 built a **weekly aggregate** digest only
  (`docs/specs/priority-2-weekly-proactive-loop.md`), sent Wizard-of-Oz style (a human clicks
  `SendButton` → `wa.me` deep link). Building real-time push is out of scope here (no infra, and
  it's really a Priority-2-shaped feature, not a "capture the rating reliably" one). What *is*
  in scope and cheap: extend the existing GEO WhatsApp precedent
  (`buildWaLink`/`SendButton`, `src/lib/geo/whatsapp.ts`) with a **per-lead** composer,
  `composeNewLeadWhatsAppMessage()`, and surface a `SendButton` **on each ungraded row** of the
  WAO-internal `/leads` Mini-CRM table (only when that lead's campaign has a bound client with a
  phone). The message body links to `{SITE_URL}/client/leads?highlight={id}` — the client clicks
  it, lands directly on their scoped Mini-CRM view with that lead highlighted, and can grade it
  immediately. Zero automation, same human-clicks-send model already proven for the weekly digest,
  and — per Eitan's explicit note — this applies uniformly to **every** lead type including weak
  signals like a bare WhatsApp/phone click-stub (they already become full rows per §0, so they
  already qualify — no special-casing needed).
- `/client/leads` needs to exist as a small standalone route (peer to `/client/dashboard`, same
  session gate) rather than being buried as a dashboard sub-section, specifically so this deep link
  has a stable, linkable URL independent of whatever else is on the dashboard that week.

---

## 2. Files to Create

### 2.1 `src/lib/crm/leadsStore.ts` (NEW)
Shared `readLeads()` / `writeLeads()` / `findLeadById()` over `src/data/leads.json`, extracted
verbatim from the duplicated logic in `api/leads/route.ts:19-32` and
`api/google-ads/import-conversion/route.ts:78-79`, so both existing routes and the two new ones
below read/write through one code path instead of three independent `fs` implementations.

### 2.2 `src/lib/google-ads/conversion-upload.ts` (NEW)
`uploadLeadConversion({ leadId, type }): Promise<UploadResult>` — the Google Ads upload logic
extracted from `import-conversion/route.ts` (client build, account resolution, date formatting, the
actual `uploadClickConversions` call, partial-failure handling) with the `cookies()`/session/
`NextResponse` wrapping stripped out. Pure, callable in-process. See §1.2 for why, and §5 for the
dated Google Ads API caveat this function must be written to make swap-out-able for later.

### 2.3 `src/app/api/client/leads/route.ts` (NEW)
- `GET` — session-gated (`wao-client` cookie, `verifySessionToken`, same as `/client/dashboard`),
  returns only leads where `isLeadOwnedByClient(lead, clientId)` is true. 401 if no valid session.
- `POST` — session-gated, restricted action vocabulary (`{ leadId, quality: 'GOOD'|'JUNK' }` or
  `{ leadId, closed: { revenue: number } }` — deliberately **not** a passthrough to `/api/leads`'s
  full admin `action` set, so a client can never reach `enrichStub` or any future admin-only action
  by shape-guessing the body). Ownership check via `isLeadOwnedByClient` → 403 if the lead isn't
  theirs (and the write path must not be reached in that case — see test #9 in §6). On success,
  calls `uploadLeadConversion()` in-process and reports `conversionUpload: 'ok'|'failed'` without
  ever failing the CRM write because of it (§1.2).

### 2.4 `src/components/crm/LeadsTable.tsx` (NEW)
Table + grade/close/enrich controls extracted from `src/app/(app)/leads/page.tsx`, parameterized by
an `apiBase` prop (`/api/leads` for the internal page, `/api/client/leads` for the client-facing
one) and an optional `highlightId` prop (scrolls to and visually highlights that row on mount — the
target of the `?highlight=` deep link from §1.3). Same interaction design in both contexts, per
§1.2 — do not fork the markup.

### 2.5 `src/app/(app)/client/leads/page.tsx` (NEW)
Thin page: session gate identical to `/client/dashboard` (`verifySessionToken`/`COOKIE_NAME`,
redirect to `/client/login` if absent) → `GET /api/client/leads` → render `<LeadsTable
apiBase="/api/client/leads" highlightId={searchParams.highlight} />`. Add a link to/from
`/client/dashboard` so it's discoverable, not orphaned the way `/leads` currently is.

---

## 3. Files to Modify

### 3.1 `src/components/lp/LandingPage.tsx`
- `pingClick()` → build a `Blob([JSON.stringify(...)], { type: 'application/json' })`, call
  `navigator.sendBeacon('/api/leads', blob)`; if unsupported or it returns `false`, fall back to
  `fetch('/api/leads', { ...opts, keepalive: true }).catch(() => {})`. See §1.1.
- `handleSubmit()` → generate `orderId` once via `useRef` (not per-call `uid()`), add
  `keepalive: true` to the `fetch`, add one retry on network failure before setting
  `formStatus: 'error'`. See §1.1.

### 3.2 `src/app/api/leads/route.ts`
- Lead-creation branch (`route.ts:99-124`): upsert by `orderId` — if an existing lead already has
  this `orderId`, return it unchanged instead of pushing a duplicate.
- `uploadConversion()` (`route.ts:6-17`): replace the self-`fetch()` to
  `/api/google-ads/import-conversion` with a direct, in-process call to the new
  `uploadLeadConversion()` (§2.2) — this is the fix for the cookie-forwarding bug in §0.
- `GET` (`route.ts:34-41`): gate behind the existing admin-secret convention
  (`src/lib/admin-auth.ts`'s `verifyAdminSecret` pattern, same posture as Priority 2's
  `CRON_SECRET` — plain equality, fail closed) so the full unscoped lead list is no longer
  publicly reachable. Flagged in §0 as a pre-existing, adjacent gap this spec is already touching
  the exact surface for — cheap to close alongside, not a separate effort.
- Switch `readLeads()`/`writeLeads()` to the shared `leadsStore.ts` (§2.1).

### 3.3 `src/app/api/google-ads/import-conversion/route.ts`
Delegate the upload mechanics to `uploadLeadConversion()` (§2.2); keep the session check and the
`config.clientId !== sessionClientId` ownership check exactly as-is (`route.ts:66-68, 119-121`) —
this route's own contract (browser-facing, cookie-authenticated) is unchanged, only its internals
are thinned.

### 3.4 `src/lib/crm/intelligence.ts`
Add `export function isLeadOwnedByClient(lead: LeadRecord, clientId: string): boolean` (§1.2). Does
**not** touch `buildWeeklyDigest`'s existing filter.

### 3.5 `src/app/(app)/leads/page.tsx`
Becomes a thin wrapper around `<LeadsTable apiBase="/api/leads" />` (§2.4) — same fetch, same
behavior, no functional change to the WAO-internal view. Add, per row, a "Send to client" `SendButton`
(only rendered when the lead's campaign resolves to a client with a bound phone and the lead is
still `quality: PENDING`) using a new `composeNewLeadWhatsAppMessage()` in
`src/lib/geo/whatsapp.ts` (or a small sibling file next to it, matching the
`whatsapp-digest.ts`-next-to-`whatsapp.ts` precedent from Priority 2) that links to
`/client/leads?highlight={id}` (§1.3).

### 3.6 `src/lib/mail.ts`
`sendLeadNotificationEmail()` — add a line linking to `{SITE_URL}/leads?highlight={id}` (§1.3).

### 3.7 `src/app/(app)/client/dashboard/page.tsx`
Add a link/CTA to the new `/client/leads` route (discoverability only — the leads UI itself lives
on its own page per §1.3, not embedded here).

---

## 4. A dated, urgent, out-of-scope finding — flag loudly, do not attempt to fix here

Web-verified 2026-08-02 against Google's own developer blog and corroborating PPC press: **as of
June 15, 2026, Google blocks *new* offline-conversion-import calls (`uploadClickConversions`, exactly
what `import-conversion/route.ts` calls today via the `google-ads-api` npm package) made through the
classic Google Ads API**, migrating that workflow to the new Data Manager API. Developer tokens that
sent at least one such request between January and June 2026 are grandfathered into continued legacy
access; tokens outside that window get `CUSTOMER_NOT_ALLOWLISTED_FOR_THIS_FEATURE` on any attempt
after the cutoff.

**Today's date is August 2, 2026 — after the cutoff.** That means the entire `uploadLeadConversion()`
pathway this spec extracts and fixes the plumbing for (§1.2, §2.2, §3.3) may **already be
non-functional in production right now**, independent of anything in this spec — WAO has no
confirmation either way, because the current implementation only logs failures to `console.error`
and nothing surfaces them anywhere visible.

This is explicitly **out of scope for this spec** — migrating to the Data Manager API is a real,
separate body of work (new client library, new auth flow, possible allowlist check, possible
backfill of anything that's failed since June 15). It needs its own spec. Given the finding above,
recommend that follow-up spec be treated as **urgent, possibly higher priority than this one** —
Smart Bidding has plausibly been getting zero offline-conversion signal for any live client for
seven weeks. This spec's contribution to making that fix easy later: `uploadLeadConversion()` is
extracted with a stable `{leadId, type} → UploadResult` signature specifically so the eventual
Data Manager API migration is a contained swap of what's *inside* that one function, not a hunt
through three call sites.

Sources: [Google Ads Developer Blog — Changes to Offline Click Conversion Import Support](https://ads-developers.googleblog.com/2026/05/changes-to-offline-click-conversion.html), [Google Ads Help — Guidelines for importing offline conversions](https://support.google.com/google-ads/answer/15081888?hl=en), [Search Engine Land — Google is moving offline conversion imports out of the Google Ads API](https://searchengineland.com/google-is-moving-offline-conversion-imports-out-of-the-google-ads-api-477669), [PPC Land — Google blocks new offline conversion imports via Ads API from June 15](https://ppc.land/google-blocks-new-offline-conversion-imports-via-ads-api-from-june-15/)

---

## 5. Type/Interface Changes Summary

| File | Change |
|---|---|
| `src/lib/crm/leadsStore.ts` | NEW — `readLeads()`, `writeLeads()`, `findLeadById()` |
| `src/lib/google-ads/conversion-upload.ts` | NEW — `uploadLeadConversion({leadId, type})` |
| `src/app/api/client/leads/route.ts` | NEW — `GET` (scoped list), `POST` (scoped feedback) |
| `src/components/crm/LeadsTable.tsx` | NEW — `{ leads, apiBase, highlightId? }` |
| `src/app/(app)/client/leads/page.tsx` | NEW — session-gated page |
| `src/components/lp/LandingPage.tsx` | `pingClick` → sendBeacon+fallback; `handleSubmit` → keepalive+retry+stable orderId |
| `src/app/api/leads/route.ts` | Upsert-by-orderId; `uploadConversion()` → in-process call; `GET` admin-gated; uses shared store |
| `src/app/api/google-ads/import-conversion/route.ts` | Thin wrapper over `uploadLeadConversion()`; auth/ownership unchanged |
| `src/lib/crm/intelligence.ts` | Add `isLeadOwnedByClient()` — does not touch `buildWeeklyDigest` |
| `src/app/(app)/leads/page.tsx` | Wraps `LeadsTable`; adds per-row "Send to client" `SendButton` |
| `src/lib/mail.ts` | `sendLeadNotificationEmail()` — add grade-this-lead deep link |
| `src/app/(app)/client/dashboard/page.tsx` | Add link to `/client/leads` |

No changes to `buildWeeklyDigest`'s pacing/alert math, Priority 1's mutation/executor code, or
Priority 2's cron/digest files.

---

## 6. Test Coverage

Same hard rule as Priority 1/2: assert against real behavior (mocked `fs`, mocked
`uploadLeadConversion`), not source-text regex.

### 6.1 `src/app/api/leads/route.test.mjs` (extend)
1. `POST` create with a new `orderId` → leads array length +1.
2. `POST` create again with the **same** `orderId` → array length unchanged, response returns the
   original record (same `id`) — named explicitly, e.g. `test('duplicate orderId does not create a second lead')`.
3. `POST` create with a *different* `orderId` but identical name/phone → creates a distinct second
   record (dedupe key is strictly `orderId`, not field-matching).
4. `GET` without the admin secret header → 401; with it → 200 with the full list (regression guard
   for the newly-added gate).

### 6.2 `src/lib/crm/intelligence.test.mjs` (extend)
5. `isLeadOwnedByClient()` — lead `slug` matches a client's `primarySlug` → true.
6. Lead `slug` matches a **non-primary** entry in `campaigns[]` → true (multi-campaign client not
   locked out).
7. Lead has neither `slug` nor `customerId` → **false** (no wildcard bypass — the property that
   deliberately differs from `buildWeeklyDigest`'s own filter; assert `buildWeeklyDigest`'s filter
   is untouched by re-running one of Priority 1's existing digest tests unmodified).
8. Lead `slug`/`customerId` belongs to a different client entirely → false.

### 6.3 `src/app/api/client/leads/route.test.mjs` (NEW)
9. `GET` with no/invalid `wao-client` cookie → 401.
10. `GET` with a valid cookie for client A; mocked leads.json has leads for A and B → response
    contains only A's leads.
11. `POST` feedback for a lead **not** owned by the authenticated client → 403, and the mocked
    write function is called **zero** times (assert call count, per Priority 2's convention —
    not just "no 200").
12. `POST` feedback `{ quality: 'GOOD' }` for an owned lead → 200, lead's `quality` updated in the
    written file, `uploadLeadConversion` (mocked) called exactly once with `type: 'verified-lead'`.
13. `POST` feedback `{ closed: { revenue: 1200 } }` for an owned lead → `closed`/`closedAt`/
    `revenue`/`quality: 'GOOD'` all set correctly, `uploadLeadConversion` called once with
    `type: 'closed-deal'`.
14. `uploadLeadConversion` mocked to reject → route still returns `200 { success: true,
    conversionUpload: 'failed' }`, never rolls back the CRM write — named regression guard,
    e.g. `test('a Google Ads upload failure never blocks or reverts the client's lead rating')`.

### 6.4 `src/lib/google-ads/conversion-upload.test.mjs` (NEW)
15. Lead with no `gclid`/`wbraid`/`gbraid` → `{ skipped: true, reason: 'no_click_id' }`, Google Ads
    client never constructed.
16. `type: 'closed-deal'` uses `lead.revenue` as `conversion_value` — **not** the estimated
    `avgJobValue * closeRateEstimate` (that estimate is `verified-lead`-only in the original code;
    this was never under test before — make it explicit now).

### 6.5 UI
No jsdom/RTL test framework introduced (matches Priority 2 §6.4's stated boundary). Roni verifies at
runtime: `sendBeacon` firing on a real tel/wa.me tap (network panel, throttled connection, "close tab
immediately after tap" manual repro), the client-scoped `/client/leads` view showing only that
client's leads with a real login, the `?highlight=` deep link scrolling to and visually marking the
right row, and the per-row "Send to client" WhatsApp link opening with the correct pre-filled message
and URL.

### 6.6 Definition of Done

**Gate-minimum (recommended floor before pilot client #1, per §0.1 — Adam/Eitan to confirm):**
- [ ] Contact-mechanism trackability audit (§0.2) re-run against the LP component as actually shipped
      (not this spec's read of it) — confirm all 6 mechanisms in the §0.2 table still route through
      `pingClick`/`handleSubmit` → `/api/leads`, and that no new untracked contact surface was added
      since. Any gap found is a blocker: either wire it or remove it from the LP, per §0.2's hard
      rule — do not ship a contact mechanism with no Mini-CRM trace.
- [ ] `isLeadOwnedByClient()` shipped and tested (#5-8) — no client-facing surface exists before this.
- [ ] `/api/client/leads` GET+POST shipped, session- and ownership-gated, tested (#9-14).
- [ ] `/client/leads` page exists, reachable from `/client/dashboard`, shows only that client's
      leads with working grade/close controls.
- [ ] The cookie-forwarding bug fix (`uploadLeadConversion()` called in-process, §1.2/§2.2/§3.2/§3.3)
      is shipped — even if the underlying Google Ads call itself is currently blocked per §4, the
      CRM-side grading loop must work end-to-end today.
- [ ] `GET /api/leads` admin-gated (closes the cross-client leak before any client login exists).

**Full spec (can trail the gate-minimum, should not block pilot outreach):**
- [ ] All Part A reliability changes (sendBeacon, keepalive, retry, idempotent upsert) shipped and
      tested (#1-4), verified per §6.5.
- [ ] Per-row "Send to client" WhatsApp deep link on the internal `/leads` page, and the internal
      email's grade-this-lead deep link, both shipped (§1.3, §3.5, §3.6).
- [ ] `npm run build` and `npm run lint` clean; all new/modified tests pass under
      `node --test --test-reporter=spec "src/**/*.test.mjs"` alongside the existing suite, 0 fail.
- [ ] Roni's runtime pass on §6.5.

**Explicitly deferred, needs its own spec (flagged urgent, see §4):**
- [ ] Migrating `uploadLeadConversion()`'s internals from the classic Google Ads API to the Data
      Manager API, required as of the already-passed June 15, 2026 cutoff. Not started here.
