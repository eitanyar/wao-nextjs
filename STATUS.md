# WAO — Status Handoff
*Last updated: 2026-08-01, end of session*

For Lior (mission-planner) to open with tomorrow: what shipped, the real leverage point,
and the one open loop that needs Eitan's action first thing.

## Today in one line
The technical foundation across legal, payments, and Ads Bot got proven for real —
against a live Google Ads sandbox and a real Gemini pipeline, not simulation — and
several silent failures were caught and fixed in the process. The bottleneck is no
longer "does the tech work," it's acquisition and one provider decision.

## Shipped today (commits `e056aef`..`011ad1c`)
- **Legal foundation**: WAO's own ToS/Privacy/DPA + subscription billing terms +
  Site Bot/GEO Bot permission drafts, all lawyer-approved. Client-site privacy/
  accessibility disclosure pages too (also lawyer-approved wording).
- **Root-caused why LPs looked weak**: the copy-generation pipeline was silently
  falling back to template strings (dead Azure key never migrated to Gemini). Fixed —
  confirmed real Gemini copy is now materially better (verified live).
- **Ads Bot asset completeness**: call/callout/structured-snippet/sitelink/image
  assets built, then debugged for real against a live sandbox account — found and
  fixed a sitelink schema bug, a Gemini JSON-truncation bug (added robust extraction
  that helps every Gemini caller, not just these two), and discovered CALL assets are
  blocked by a genuine Google platform restriction on this test MCC (not a code bug —
  documented, not chased further).
- **Payments**: pro-rata refund logic shipped; two divergent debug scripts merged into
  one real reusable verification tool (21/21 sub-tests passing).
- Repo hygiene: dead scratch scripts cleared, PROGRESS.md reconciled against all of
  the above.

## Pareto read — what actually moves the needle next
20% of remaining work carrying 80% of the value, in order:
1. **A named pilot client.** Every technical thread converges now — Site Bot, Ads Bot
   asset completeness, legal pages, payments — and none of it produces revenue without
   a real business going through real onboarding. This is the single highest-leverage
   open item and has been open for weeks. Lior: worth a harder push tomorrow on turning
   the gating scorecard (`docs/specs/pilot-client-gating.md`) into an actual candidate
   name, not just a framework.
2. **Payment provider decision** (see reminder below) — blocks the ₪249/mo funnel
   regardless of how ready everything else is.
3. Everything else shipped today (asset completeness, legal, LP quality) was
   necessary but is now sufficient — further polish there is not the bottleneck.

## Reminder for tomorrow — payment provider
Outreach is out to both **Payme.io** and **Grow (Meshulam)** (same 4 questions each:
token-charge API, pricing, invoice-per-charge API, sandbox availability). Grow's
developer docs were already assessed — charging API looks better than Takbull's
(synchronous, no stall), but invoicing is not callable per-charge, same disqualifier
that ruled out iFreelance. **First thing tomorrow: check for replies from both and
make the call** — this has been open long enough that it's now the second-biggest
blocker after pilot acquisition. See `docs/specs/subscription-billing-provider-decision.md`
for full state (marked REOPENED, Takbull ruled out — CCode=3, never issued a token).

## Steering question for Lior
Is WAO still pointed at the right target? The technical bet (Site Bot → Ads Bot →
GEO Bot pipeline) has now been proven to actually work end-to-end today, for the
first time with real evidence rather than assumption. That changes the calculus:
the risk this month is no longer "will the tech work" but "can we get even one real
client through it." Worth Lior explicitly re-checking tomorrow whether effort should
shift harder toward acquisition/outreach rather than further engineering polish, now
that the polish has real proof behind it.
