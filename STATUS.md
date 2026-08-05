# WAO — Status Handoff
*Last updated: 2026-08-02, end of session*

For Lior (mission-planner) to open with tomorrow: what shipped, the real leverage point,
and the one open loop that needs Eitan's action first thing.

## Today in one line
Started as a priorities/vision check-in, turned into a full pre-pilot audit of the lead
pipeline — and it's a good thing it did. Testing the Ads Bot's "brain" against a real
account surfaced a chain of silent failures (broken conversion tracking, an intake data
bug, an unauthenticated cross-client data leak, a dead Google Ads API pathway) that would
otherwise have hit pilot client #1 invisibly. All of it got root-caused and fixed today,
live-verified, not just unit-tested. The bottleneck is unchanged from yesterday — it's
acquisition and the payment decision — but the foundation under acquisition is now
materially more trustworthy than it was this morning.

## Shipped today (commits `635944b`..`5702c08`)
- **VISION.md**: added the "Client-Facing Orchestrator" concept — client experiences one
  conversational agent across owned bots, proactive by default, cross-bot recommendations
  are the upsell path. Documented as vision only; build explicitly deferred until a client
  owns 2+ bots.
- **Priority 2 — weekly proactive digest cron**: shipped and Roni-verified live (auth
  enforced, real client data, WhatsApp send button working). This is VISION's own named
  subscription-revenue gate ("clients onboard and go dark" — closed).
- **Found and fixed a chain of pre-pilot defects**, prompted by Eitan's push to validate
  suggestion quality against real accounts before selling to strangers:
  - **Onboarding intake bug**: the fallback bot's turn-index drifted out of sync with the
    live question sequence, corrupting `collectedData` on two real generated LPs (city
    names in the wrong field, upload-status text landing in `phone`). Root-caused to a
    missing turn case + a second bug where upload-acknowledgment messages were consumed
    as real answers. Fixed, 60/60 tests.
  - **Generated LPs had zero conversion tracking** — no gclid/wbraid/gbraid capture, an
    inert lead form, no click tracking on phone/WhatsApp CTAs. Ported the working
    reference implementation from the static-site pipeline into the actual React
    component serving `/lp/[slug]`. Roni verified gclid round-tripping into real lead
    records for form, phone, and WhatsApp lead types.
  - **Security**: `GET /api/leads` was fully unauthenticated — any client's leads
    (name, phone, gclid, revenue, deal status) readable by anyone. Gated behind the
    existing admin-cookie convention.
  - **Priority 3 gate-minimum**: extended the existing Mini-CRM (`/leads`) into a new
    session-gated, ownership-scoped `/client/leads` view so a client can grade only their
    own leads. Fixed a pre-existing bug as a byproduct: the CRM's offline-conversion
    trigger silently 401'd every time because it self-fetched a session-gated route
    without forwarding the cookie — now called in-process. Idempotent lead capture by
    `orderId` added.
  - **Notification polish**: WAO's internal "new lead" email said "name: not entered,
    phone: not entered" for a bare WhatsApp/phone click — read like an abandoned form,
    not a successful click event. Now branches by lead type. Fixed a related dead status
    check while there.
- **Confirmed live, empirically**: WAO's Google Ads developer token is **not
  grandfathered** — a real test call to the classic API's offline-conversion-upload
  returned Google's "use the Data Manager API" rejection. This wasn't theoretical; it was
  silently broken in production already (grepped 39MB of production logs — the pathway
  had simply never fired, consistent with 0 paying clients, so nothing was lost, but
  nothing was working either).
- **Priority 4 — migrated to the Data Manager API**: new Testing-status OAuth client
  set up (separate from the production `adwords` client, so nothing already-working got
  touched), live `datamanager`-scoped refresh token minted, `uploadLeadConversion()`'s
  internals swapped with the function signature preserved. **Two real successful uploads
  against Google's live API today**, both conversion types, real `requestId`s returned.
  Roni independently reproduced both and confirmed the critical guarantee still holds on
  the new path: a client's CRM lead-grading write never fails or rolls back because the
  Google upload failed (tested with a deliberately invalid token).
- Pilot shortlist produced (Dror): 8 named, scored Tier-1 trades candidates, ready to
  call — see `docs/specs/pilot-client-gating.md` for the scorecard used.

## Pareto read — what actually moves the needle next
20% of remaining work carrying 80% of the value, in order:
1. **A named pilot client.** Unchanged from yesterday, still the single highest-leverage
   open item, and now genuinely lower-risk to pursue than it was this morning — the lead
   pipeline that would have silently failed a real client's first week is fixed and
   live-verified. The shortlist exists (`docs/specs/pilot-client-gating.md`); nobody has
   been called yet.
2. **Payment provider decision** — see reminder below, still open, still the second
   blocker on the ₪249/mo funnel.
3. **Priority 3 Full-spec tier** (`docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md`)
   — sendBeacon/keepalive reliability on the click-tracking calls, and the per-row
   "send lead to client via WhatsApp" deep link. Deliberately scoped to trail pilot
   outreach, not block it — flag if it's been sitting untouched more than a week or two.

## Reprioritization — 2026-08-03 (mission-planning session, "lior-mission-doubts")

**Retter's GEO cycle is on hold ~1 month** — external, client-side: Retter is migrating to a
different CMS on their own timeline, not a WAO execution gap. This freezes the 3-Month Foresight
doc's own priority-#1 item (close Retter's send→implement→verify cycle) for that window. **Re-check
Retter status around 2026-09-03.**

**Google Ads pilot outreach is the active top founder-hours lane for this window** — not a
permanent reprioritization of GEO Bot, just the one lane not externally blocked right now. GEO Bot
resumes its prior priority once Retter unblocks. Full plan: `docs/specs/grade-a-outreach-playbook.md`
(Grade-A archetypes, Tier 1/2 channel map, cadence, the free GBP review-comparison magnet as opener,
GMB Bot pricing deferred until a real prospect asks for it).

**Tier-1 Week 1 is cleared to start now** — no remaining gate. The pre-pilot pipeline defects fixed
yesterday were the real blocker; that's done and Roni-verified.

## Reminder for tomorrow — payment provider
Still open. Outreach was out to both **Payme.io** and **Grow (Meshulam)** as of
yesterday; unclear if either replied since — check first thing.  See
`docs/specs/subscription-billing-provider-decision.md` for full state.

## Payment/pricing decision — open loop

Eitan raised today whether the ₪9.90→₪249 trial-jump model (VISION.md Monetization table)
leaves the real revenue exposed to chargebacks, triggered by Takbull confirming 3D Secure
never covers recurring/token charges — only the initial authorization.

**Verdict: DROP pursuing 3DS as a mitigation, DEFER the flat-₪99 alternative.**
- 3DS was never a lever here — it doesn't cover recurring charges regardless of price
  structure, so the trigger doesn't actually change the risk calculus.
- Flat ₪99 from charge #1 looks safer but isn't the better move: cuts ARPU ~60% vs the
  vision's ₪249 anchor (₪249K MRR at 1,000 subs vs ₪99K flat), raises entry friction 10x
  (₪9.9→₪99, against the low-friction trial-funnel purpose) — and since per-user variable
  LLM/API cost is still unmeasured, flat ₪99 could be the economically riskier option, not
  the safer one, if it doesn't even cover a heavy user.
- Real chargeback defense is expectation-consistency, not price structure: the month-2
  reminder email (already shipped), "WAO" as the statement descriptor (needs live
  confirmation with Takbull — not yet verified), and the immutable consent log — all
  already required anyway for Google Ads ToS §11 indemnification (see Phase 3 gates).

**Recommended path:** ship the vision-consistent ₪9.90→₪249 model to the pilot cohort only.
Instrument two things before it scales: (a) per-user variable cost P95 — extractable from
existing pilot logs, route to Eitan-Dev; (b) month-2 dispute/decline rate. Pre-commit a
dispute-rate switch threshold *now*, before the pilot runs, not after seeing the data.

**Discrepancy flagged:** VISION.md's Monetization table says ₪249/month; Eitan's original
framing today used ₪299. Need to confirm which is the deliberate current number and update
VISION.md if ₪299 is intentional.

**Open question for Eitan:** what dispute/decline rate at month 2 actually triggers
switching to flat pricing? That number needs to be pre-registered now — not decided
retroactively once pilot data is in.

## Steering question for Lior
Eitan pushed hard today on a principle worth keeping as a standing check, not a one-off:
*"no client should be onboarded before basic lead tracking + grading works, even in
Wizard-of-Oz form — every contact channel must produce a gradeable trace, no silent
losses."* That instinct caught four real, otherwise-invisible defects today. Worth
Lior explicitly re-running that same audit lens (not just this specific checklist) against
whatever ships next before it goes near a real client — it found more in one afternoon
than the existing test suite had caught on its own.

