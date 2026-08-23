# Mission: GEO Bot — Live Real-User QA of the Self-Serve Funnel
*Owner: Lior (Strategist) → `waouxtester` (Opus 4.8 + computer-use) | Filed: 19.8.2026 | Independent second take (Opus)*

> This is an independently-authored spec. A separate spec for the same mission exists
> (`geo-bot-live-qa-2026-08.md`). Read this one on its own terms; where the two disagree,
> that disagreement is itself signal worth surfacing to Eitan.

---

## 0. Read this first — what this run can and cannot prove

The founder asked for "an honest read on this flow's actual chance to convert and impact a real
prospect," found by acting like a real human with real inputs. Honesty starts here: **one live run
against `wao.co.il` can fully validate the acquisition funnel, and cannot validate recommendation
quality.** Two independent reasons, not one:

1. **Persona mismatch (flagged in the brief).** The connected site is `wao.co.il` — a marketing
   agency, not the "AI-resilient hands-on/in-person micro-business" (dental clinic, contractor,
   gym, local retail) that is WAO's actual GEO target persona. Recommendations grounded in agency
   content can't tell us whether the engine serves the real target buyer.
2. **The engine is asynchronous, not in-flow (discovered by source trace — see §4).** A brand-new
   paid signup does **not** trigger recommendation generation. The GSC-connect callback stores a
   token and stops. GEO actions are produced by a separate, staff-run batch
   (`scripts/geo-generate-content.mjs` + the GSC pareto/title pipeline) and gated behind
   entitlements the fresh client does not have. **So the deepest a fresh self-serve client reaches
   is an empty dashboard reading "no tasks yet, WAO will update you soon."** There are no
   recommendations for the executor to inspect at the end of this flow, regardless of persona.

**Therefore this mission is scoped to Track A and explicitly defers Track B:**

- **Track A — the self-serve acquisition funnel (this run validates fully):** the path from landing
  → paid signup → payment → Google-account OAuth grant → the post-payment payoff. Friction, trust,
  clarity, Hebrew/RTL quality, and — the highest-value question here — **whether what the prospect
  is promised matches what they actually receive the moment they finish paying.** This is where the
  real conversion read lives, and it is 100% testable live.
- **Track B — recommendation quality & real-time impact (deferred, named follow-up):** requires
  generated actions for a genuine local-service persona. It needs either (a) triggering the
  generation batch for a real local-service site, or (b) inspecting an existing pilot client's real
  generated actions on a staging copy. Neither is reachable from this run's tools/scope. Do not
  fake it, do not infer it from the empty dashboard — hand it forward (§10).

- **One real GEO output IS testable here, for free and safely:** the public `/geo/scan` readiness
  scanner (§5, Stage 0). It runs synchronously, needs no login, writes nothing, and is a genuine
  piece of the GEO product's output. Judge it. It is the only recommendation-flavored output this
  run can honestly evaluate.

Keep this framing in the final report. A "the funnel works" verdict that quietly implies the
product's core promise was tested would be the single most misleading thing this mission could produce.

---

## 1. Executor profile & hard boundaries

You are `waouxtester`: Opus 4.8 driving a real Chrome window via `cua-driver` (real mouse, keyboard,
screen capture). You can observe, click, type, scroll, and screenshot. You have **no terminal, no
shell, no file access, no code execution.** You cannot fix anything and must never try. Every
code-level defect you find is a *report line*, not a task — it becomes a separate spec for
`waoengineer` (Grok 4.6) later. Your deliverable is judgment and evidence, not repairs and not
step-completion counts.

- The browser starts already authenticated to Google as `eitan@wao.co.il`. You will never see or
  type that password. If any Google screen ever asks for a password, **stop and report** — you are
  not in the expected already-logged-in state.
- Capture a screenshot at every stage transition and at every red flag. Screenshots are your
  evidence; a claim without one is weaker.
- Base URL for the run: use the environment the operator opened you into (local dev
  `http://localhost:3000` or the live host). Do not navigate to a different host.

---

## 2. Non-negotiable guardrails

Read all five before touching anything. Any one of them tripping means **stop and report**, not
"work around it."

**G1 — The `wao` client-collision kill-switch (most important).**
The client record ID is `slugify(businessName)` — derived from the **business name you type**, not
from the site URL (source-verified in `/api/geo/signup/init`). A real, live production record for
WAO itself lives at `data/clients/wao/` (real business data, live PIN, real WhatsApp approval
contact, active entitlements). **You must never create a record that slugifies to `wao`.** Use the
exact persona business name in §3 (`Northlight Digital QA Labs` → slug `northlight-digital-qa-labs`)
and no other. **Live checkpoint:** the payment screen and the success screen both print
`מזהה לקוח: <clientId>`. Before you click past the success screen, *read that clientId aloud in
your reasoning and confirm it is neither `wao` nor `retter`* (retter is the live pilot client). If
it reads `wao`, `retter`, or anything unexpected — stop, screenshot, report. Do not proceed.

**G2 — Payment kill-switch.**
Only the payment step is mocked (`MockPaymentProvider`, test card `4242 4242 4242 4242`). The mock
checkout screen at `/geo/signup/pay/[sessionId]` should appear **with the card field pre-filled to
`4242 4242 4242 4242`, expiry `12/30`, CVC `123`.** That pre-fill is your test-mode tell — the page
carries no explicit "TEST MODE" banner (note that as a finding, see G2-note). **Proceed only if the
4242 pre-fill is present.** If you instead see: an empty card field expecting real entry, a
real processor's hosted page (e.g. Takbull), a 3-D Secure / bank challenge, a real card number, or
any screen that looks like it would move real money — **stop immediately, screenshot, report.** Do
not type any card number yourself.
- *G2-note (report as a finding, not a stop):* a real prospect landing on a checkout with a
  pre-filled full card number and no test-mode label is jarring and can read as a scam. Evaluate it
  as a trust finding under the rubric.

**G3 — No secrets, ever.**
You do not have and will not enter the WAO admin secret. The routes `/geo/dashboard`,
`/geo/action/[id]`, and `/geo/login` are **staff/admin surfaces** (see §4) and will bounce you to
`/admin/login`. When that happens, that is the **expected boundary working correctly** — screenshot
it as confirmation and retreat. Never attempt to guess, brute-force, or enter any admin/password
field.

**G4 — Real writes past payment. Use test-safe contact details.**
Everything past the mock checkout writes to real production data structures on shared infra (the
same store the live `retter` pilot uses). Two live-contact hazards the brief did not call out:
- **WhatsApp:** `approvalWhatsapp` becomes a *live approval contact* on a real client record that
  staff automation may later message. Do **not** enter a real person's number. Use the fake-but-
  valid placeholder in §3 (`972500000000`).
- **Email:** `email` becomes the contact + invoice address and may trigger a real transactional
  email. Use the test-tagged address in §3 (`eitan+geoqa@wao.co.il`) so anything sent is
  capturable and obviously a test.

**G5 — Scope boundary.**
You are validating the *client-facing self-serve path only*. Do not attempt to view other clients'
data, do not open admin consoles, do not trigger regeneration or batch jobs (you can't anyway), and
do not click destructive-looking controls on any surface you reach. If a page exposes another
client's data to you without a login, that is a **security finding — screenshot and report, do not
explore further.**

---

## 3. The persona — exact inputs

A fictional Israeli **digital-marketing agency**, chosen so its self-reported facts cohere with what
the real scan of `wao.co.il` will surface (agency; SEO / Google Ads / content / consulting; serves
all of Israel; long-tenured; no-contract). Cohere, not copy — a real user paraphrases. Type these
verbatim into the signup form:

| Field (Hebrew label) | Value to type | Notes |
|---|---|---|
| שם העסק (business name) | `Northlight Digital QA Labs` | **Exact. Latin, unique, obviously a test → safe slug `northlight-digital-qa-labs`, never `wao`.** |
| כתובת האתר (site URL) | `https://www.wao.co.il` | Must match the GSC-verified property for the connected Google account. |
| אימייל (email) | `eitan+geoqa@wao.co.il` | Test-tagged, capturable (G4). |
| תחום העיסוק (niche) | `סוכנות שיווק דיגיטלי` | Coheres with the scanned site. |
| השירות המרכזי (top service, optional) | `קידום אורגני וקמפיינים בגוגל` | |
| אזור שירות (location, optional) | `כל הארץ, אונליין` | |
| מה מייחד אתכם (USP, optional) | `20 שנות ניסיון, בלי התחייבות, לפי תוצאות` | Mirrors WAO's real positioning. |
| איש הקשר לאישור (contact) | `Northlight QA` | |
| וואטסאפ לאישור (WhatsApp) | `972500000000` | **Fake-but-valid (G4). Not a real number.** |

You are a busy, ROI-minded, mildly skeptical Israeli business owner who has never seen this product
before and is deciding, in real time, whether it is worth ₪199/month and worth handing over a credit
card and Google-account access. Stay in that head the whole way — react, hesitate, and judge as that
person would, not as a QA robot ticking fields.

---

## 4. Product map — the *real* funnel (corrects the brief)

Source-traced. The brief's funnel string conflates client and staff surfaces; the reality matters
for where you go and what "done" means.

**Free / top-of-funnel (public, no login, no writes):**
- `/geo/scan` — instant public AI-readiness scanner. Anonymous fetch of ≤10 public pages. Real GEO
  output, synchronous, safe. **Your one honest window into output quality (§5 Stage 0).**
- `/geo/audit` — *not self-serve*: "leave details, our team runs it within 24h." Human-mediated.
- `/geo/onboarding` — a free chat lead-collector ("אדם"), separate from the paid funnel. Optional
  probe (§5 Stage 0b).

**Paid self-serve funnel (the spine of this test):**
`/geo/signup` → `/geo/signup/pay/[sessionId]` (mock ₪199) → *account created + auto-login (client
cookie set server-side)* → `/geo/signup/connect-gsc` → **`/client/dashboard`** ("המשימות שלי").

**Staff/admin surfaces — OUT OF SCOPE, will bounce you to `/admin/login`:**
- `/geo/login` is **admin login** ("כניסת מנהל"), not client login.
- `/geo/dashboard` is the **internal review console listing all clients** — where staff approve and
  WhatsApp-send recommendations. Admin-gated.
- `/geo/action/[id]` is viewable by admin *or* by the owning client's session. A fresh client has
  zero actions, so there is nothing here to reach on this run.

**Two structural facts that shape the whole evaluation:**
- **Auto-login works:** the payment callback sets the client session cookie, so the post-payment
  handoff to `/client/dashboard` should not demand a re-login. Verify this actually happens
  (§5 Stage 5) — it is the difference between a smooth payoff and a dead-end at `/client/login`.
- **The payoff is empty:** fresh client entitlements are `['geo']` only, with zero generated action
  files, so `/client/dashboard` renders the empty state
  (`אין משימות עדיין. WAO יעדכן אותך בקרוב`). The GSC-connect callback does **not** kick off
  generation. **This gap — pay now, receive nothing visible now — is the mission's central
  conversion question.** Do not treat the empty dashboard as a bug to route; treat it as the
  product's actual delivered experience and judge it as such (expectation-setting).

*Also worth confirming for the brief's sake:* the brief assumed an in-flow "confirm your scanned
facts" step. I did not find one in the self-serve path — fact extraction/confirmation appears to be
part of the staff batch, not a client screen. Watch for such a screen; if it never appears, record
that the brief's mental model diverges from the shipped funnel.

---

## 5. The walk — stage by stage

For every stage: **DO** the action, **OBSERVE** with a screenshot, **EVALUATE** against the rubric
(§6), note **RED FLAGS**, and — **mandatory, not optional** — **OPEN-FLAG**: before moving to the
next stage, ask yourself "is there anything on this screen that struck me as off, surprising,
clever, or worth mentioning that none of the bullets above told me to look for?" and write it down
even if it doesn't fit a named category. The EVALUATE/RED FLAGS bullets are a floor, not a ceiling —
this checklist cannot anticipate everything, and the open-flag slot is where you catch what it
missed. An empty open-flag note is a valid outcome; a *skipped* one is not. Narrate your in-character
reaction. Quote the actual Hebrew you see when it matters — do not paraphrase Hebrew in the report.

### Stage 0 (recommended) — Free scan quality probe · `/geo/scan`
The only real GEO output you can honestly judge. Safe, synchronous, no writes.
- **DO:** Open `/geo/scan`. Read the promise copy and the "what we check" cards. Run the scan on
  `https://www.wao.co.il`.
- **EVALUATE:** Is the readiness score/output credible, specific, and honest about being a
  *structural* signal (not a ranking prediction)? Would a real owner trust it and feel pulled toward
  the paid product, or does it feel thin/generic? Does it over-claim? Is the Hebrew native? Time it.
- **RED FLAGS:** a score with no reasoning; contradictory or obviously wrong findings about the
  site; a hang/timeout; any claim to predict AI Overview ranking.

### Stage 0b (optional) — Free onboarding chat · `/geo/onboarding`
- **DO:** Send 2–3 real messages as the persona. Judge the "אדם" bot's Hebrew register (native
  Sabra vs translated), intelligence, and whether the lead-capture UX feels human.
- Keep it brief; this is a side surface. One screenshot of a representative exchange.

### Stage 1 — Signup form · `/geo/signup`
- **DO:** Fill every field from §3. Before submitting, deliberately probe validation like a real
  user: leave one required field blank, type a malformed URL (`wao.co.il` without `https://`), then
  correct them. Then submit.
- **EVALUATE:** Are labels/placeholders clear to a non-technical owner? Do the RTL fields render
  correctly, with LTR fields (URL, email, WhatsApp) correctly left-aligned? Are error messages
  human and in good Hebrew? Does the ₪199 price and its recurring nature register clearly *before*
  commitment? Is anything asked that a first-time buyer would resent or not understand (e.g. "content
  approval WhatsApp" before they even know what they bought)?
- **RED FLAGS:** validation that blocks valid input or accepts invalid; broken bidi/typography;
  price/recurring terms unclear; jargon ("GEO", "AIO") unexplained.

### Stage 2 — Payment · `/geo/signup/pay/[sessionId]`  ⚠ **G2 kill-switch here**
- **DO:** Confirm the `4242…` pre-fill is present (G2). Read the clientId if shown and start the
  G1 check. Read the recurring-charge disclosure. Click "שלם ₪199".
- **EVALUATE:** Does this feel safe enough to hand over a card? Is the recurring commitment and
  cancel-anytime clearly stated? Is the missing test-mode indicator / pre-filled real-looking card
  number a trust problem (G2-note)?
- **RED FLAGS:** anything in G2. Stop, don't proceed.

### Stage 3 — Account created (success state)
- **DO:** On the "החשבון שלך פעיל!" state, **capture the `clientId` and `PIN` exactly** (screenshot
  + transcribe) — you may need them at Stage 6, and the clientId is your G1 confirmation and your
  cleanup key. Complete the G1 check now: state the clientId and confirm it is safe. Then click
  "המשך לחיבור Search Console".
- **EVALUATE:** Is the "save these details" instruction prominent enough that a real user wouldn't
  lose their only PIN? Is it reasonable to hand a paying customer a raw clientId + 4-digit PIN as
  their credentials?

### Stage 4 — Google Search Console connect · `/geo/signup/connect-gsc`  (the trust crux)
The scariest moment for a real buyer: granting a third party access to their Google account.
- **DO:** Read the "why we need this" copy. Click "חבר את Search Console שלי". Proceed through
  Google's real consent screen (already authenticated as `eitan@wao.co.il`; **if a password is
  asked, stop — G1/§1**). Grant the `webmasters.readonly` scope. Return to the success state and
  confirm it lists the connected site(s).
- **EVALUATE (highest-stakes UX judgment of the run):**
  - Does the page *earn* the grant — does it explain, in plain owner-Hebrew, that access is
    **read-only** and what it's used for, before sending the user to Google?
  - The Google consent screen itself: what app name, verification status, and scopes does a real
    user see? Does it look trustworthy or scary (unverified-app warning)? Screenshot it.
  - **Onboarding-transparency gap (brief flagged):** nothing tells the user they must *already have
    their own site verified in their own GSC* for this to work. Evaluate what happens for a user who
    doesn't — is there any guidance, or would they hit a confusing empty site list / silent failure?
  - The "skip for now, connect later" escape — is it discoverable and non-punitive?
- **RED FLAGS:** requesting more than read-only; no explanation of why; consent screen showing an
  alarming unverified-app warning with no reassurance; a failure with no recovery guidance.

### Stage 5 — The payoff · `/client/dashboard`
- **DO:** Follow the post-connect "continue to personal area" link. Confirm you land on
  `/client/dashboard` **without being forced to re-login** (auto-login should carry you; if you're
  bounced to `/client/login`, that is a real handoff-friction finding — record it). Read exactly
  what the dashboard shows a brand-new paying client.
- **EVALUATE (the mission's core conversion question):** You just paid ₪199 and granted Google
  access. What do you *get, right now?* Expect the empty state
  (`אין משימות עדיין. WAO יעדכן אותך בקרוב`). Put yourself fully in the buyer's chair:
  - Does the flow ever tell you *when* recommendations arrive, *how* (WhatsApp? email? here?), and
    *what* they'll look like? Or does it just go quiet after taking money?
  - Is "WAO will update you soon" acceptable reassurance, or does it feel like a product that
    charged you and then stalled? Would *you* trust it, or feel buyer's remorse / reach for a refund?
  - This is the make-or-break of the real conversion. Give it your sharpest, most honest read.
- **RED FLAGS:** empty state with zero next-step or timeline; any error; any other client's data
  visible (security — G5); broken RTL/layout on the dashboard.

### Stage 6 — Login round-trip (light) · `/client/login`
- **DO:** In a fresh tab/window (or after the session would realistically be lost), go to
  `/client/login` and sign in with the clientId + PIN captured at Stage 3. Confirm they work and
  return you to the dashboard.
- **EVALUATE:** Is re-entry smooth? Is a clientId + 4-digit PIN an appropriate, memorable, secure
  credential for a paying client, or a friction/security concern?
- Keep this light; do not rabbit-hole. One screenshot of success or failure.

### Boundary check (confirm, don't breach) — admin surfaces
- **DO:** Navigate once to `/geo/dashboard`. Confirm it redirects to `/admin/login`. Screenshot as
  proof the boundary holds. **Do not enter anything.** Retreat. (This doubles as a security
  confirmation that the client path can't reach staff tooling.)

---

## 6. Evaluation rubric

Not pass/fail. For each dimension give: **Verdict** (Strong / Adequate / Weak / Broken), **the
evidence** (what you saw, with screenshot ref + quoted Hebrew where relevant), and any **findings**
with a **severity** and a **fix-owner hint**.

**Severity:** `BLOCKER` (a real prospect would abandon or be harmed) · `MAJOR` (materially hurts
conversion/trust) · `MINOR` (noticeable friction) · `POLISH` (nice-to-have).
**Fix-owner hint** (for the follow-up spec, keep it light): `nextjs-engineer` (behavior/bug/config),
`copywriter` (Hebrew copy/expectation-setting), `seo-strategist` (GEO substance/claims),
`ux` (RTL/bidi/a11y/mobile).

Dimensions:
1. **Trust & credibility** — would a skeptical owner hand over a card and Google access? (payment
   screen, consent moment, overall legitimacy)
2. **Friction & clarity** — form, validation, labels, price/recurring transparency, login round-trip.
3. **The consent moment** — does the product earn the `webmasters.readonly` grant? scope honesty,
   the "why," the skip path, the unstated GSC prerequisite.
4. **Promise vs. delivery** — *the headline dimension.* What is the prospect led to expect vs. what
   the empty post-payment dashboard actually delivers, and how well the gap is bridged
   (timeline/channel/next-step). Weight this heaviest.
5. **Free-scanner output quality** — is `/geo/scan` credible, specific, honest, native Hebrew?
6. **Hebrew & RTL quality** — native Sabra register vs translated feel; bidi correctness on mixed
   Hebrew/Latin; typography (em-dash, gershayim ״/geresh ׳ not ASCII quotes, no double spaces);
   mobile/RTL layout integrity. Flag corrupted strings.
7. **Honest conversion & impact read** — a short narrative (not a score): given everything, what is
   this funnel's realistic chance to convert *and retain* a real prospect, and what is the single
   highest-leverage change that would most improve it?

---

## 7. Final report format

```
# GEO Bot Live QA — Run Report (waouxtester)
Date · base URL · persona clientId created (from Stage 3)

## 0. Scope honesty
- Confirmed: Track A (funnel) tested live. Track B (recommendation quality) NOT tested — why (§0).
- The one real output judged: /geo/scan (Stage 0).

## 1. Verdict at a glance
- Funnel completes end-to-end? YES / NO / PARTIAL (where it broke)
- Would this convert a real skeptical owner? one-line honest call.
- Top 3 findings by severity.

## 2. Stage-by-stage
For each stage 0–6 + boundary: what happened, screenshot ref(s), verdict, findings, and the
mandatory open-flag note (even if "nothing beyond the checklist").

## 3. Rubric scorecard
Dimensions 1–7: verdict + evidence + findings (severity + fix-owner hint).

## 4. Findings log (routable)
Table: # | stage | what | severity | fix-owner hint | screenshot ref.
(These become follow-up specs. Be precise; you are not fixing them.)

## 5. Honest conversion & impact read
The narrative (rubric dim 7). Include the single highest-leverage improvement.

## 6. Brief-vs-reality notes
Where the shipped funnel diverged from the brief's/this spec's assumptions (e.g. no in-flow
fact-confirmation screen; auto-login behavior; empty payoff).

## 7. Cleanup manifest  → see §8. List the exact artifacts this run created.
```

---

## 8. Cleanup manifest (executor lists it, Eitan removes it)

You cannot delete anything (no terminal) — so **enumerate precisely** what this run created so Eitan
can clean up. Expected artifacts, keyed off the `clientId` from Stage 3
(`northlight-digital-qa-labs`, unless a suffix like `-2` was appended for uniqueness — report the
exact value):
- `data/clients/<clientId>/client.json` — the second, harmless wao.co.il-URL client record.
- `data/clients/<clientId>/gsc-token.json` — **a real (encrypted) GSC refresh token** for
  `wao.co.il`'s own Search Console under this test record. Harmless (WAO's own site + own account)
  but a live credential on disk — flag it explicitly for removal.
- Any invoice/transactional email that reached `eitan+geoqa@wao.co.il` (note if one arrived).
- The pending-session file is auto-removed on success; note if you saw any error suggesting it wasn't.
Confirm the record's clientId is **not** `wao` and not `retter` one final time in this section.

---

## 9. Gaps in the brief I flagged (for Eitan)

1. **Funnel string was staff/client-conflated.** `/geo/login` = admin, `/geo/dashboard` &
   `/geo/action` = admin-gated; the real client home is `/client/dashboard`. Corrected in §4.
2. **The engine is async — the empty payoff is the real story.** The brief implied a walk into
   per-recommendation approval; a fresh self-serve client reaches an empty dashboard. Reframed the
   mission around promise-vs-delivery (§0, §4, Stage 5) rather than recommendation inspection.
3. **No in-flow fact-confirmation screen found** in self-serve; it appears to be a staff batch. The
   brief treated it as a user step. Executor to confirm/deny live.
4. **Live-contact hazards the brief missed:** the WhatsApp number and email entered become real
   contact points on a real record. Added test-safe values + rationale (G4).
5. **Payment screen has no test-mode banner and pre-fills a real-looking card** — reconciled the G2
   kill-switch (the `4242` pre-fill is the tell) and turned the missing banner into a trust finding.
6. **GSC prerequisite is undisclosed** — the connect step silently assumes the user already has
   their site verified in their own GSC. Elevated to a Stage-4 evaluation point.

---

## 10. Reusability note (future Google Ads bot mission)

This spec's skeleton is deliberately reusable for the coming Ads-bot live-QA: the §0 two-track
honesty box (funnel vs. output quality), the §2 guardrail block (adjusted for the Ads bot's real
write surface — actual account mutations are far more dangerous than a GEO token, so the kill-switch
discipline must be *stricter*), the stage-walk pattern, and the §6 rubric all transfer. **Do not
dilute this mission to make it generic.** The GEO-specific crux — pay-now/receive-later expectation
management and the readonly-GSC consent moment — is unique and is the point here. When the Ads
mission is written, its crux (real budget/bid changes with real money at stake, human-in-the-loop
approval) will need its own equally specific treatment, not a copy of this one.
