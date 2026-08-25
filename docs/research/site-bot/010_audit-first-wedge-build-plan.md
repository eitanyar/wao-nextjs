# 010 — Audit-First Wedge: Build Plan (Spec Decomposition)

- Date: 2026-08-25. Author: waostrategy (Strategist, Qwen 3.8 Max), kanban task t_a3359b43.
- Source decision: `docs/research/site-bot/009_ulku-local-ranking-fact-check.md` §8 (Eitan +
  orchestrator, 2026-08-25): GBP audit + optimization becomes the Site Bot entry point — both
  the acquisition funnel and delivery step zero. Pricing posture resolved per §8 (supersedes
  the drafting-era default): the audit scorecard is a FREE LEAD MAGNET — public, ungated,
  shareable; trial gating applies ONLY to the fix-it/delivery phase; the easy fixes
  (categories/hours/photos) are given away free on the scorecard itself. No new SKU; VISION
  pricing ladder not reopened.
- Specs live in `handoff/pending/` (2026-08-25_001 … _013). Execution: hermes mode (per
  `handoff/EXECUTION_MODE`), ascending filename order, dependency gates per the protocol.
  This plan was revised by task t_19f8580e (010-FIX) to align all 13 specs with the four §8
  lead-magnet decisions: free magnet, share loops, give-away-easy-fixes, WAO dogfood test #1,
  plus the dumb 30-day (ToS-confirmed) result cache on the lookup route.

## Phases and dependency order

```
PHASE 1 — AUDIT MVP (public Places path, no OAuth mid-funnel)
  001 waoengineer  Places API (New) lookup client + /api/site-bot/audit-lookup route
        └─→ 002 waoengineer  audit checklist v0 scoring engine (pure, offline, tested)
  003 waocopy      scorecard Hebrew bundle (52 tokens: form + scorecard + prefill hint
                   + CTA_SHARE + the 4 free DIY-fix how-to tokens)
        └─→ 004 waohebrewqa  QA pass on the bundle
              └─→ 005 waoengineer  bundle → scorecardCopy.ts (script, byte-exact, asserted)
                    └─→ 006 waoengineer  /site-bot/audit page + audit-result route
                          (deps: 001, 002, 005)
                          — FREE lead magnet: ungated scorecard, DIY how-to blocks under
                            FAIL categories/hours/photos, share affordance on the ready state,
                            WAO-profile end-to-end smoke in verification
                          └─→ 007 waoengineer  audit-seeded onboarding prefill
                                (site is generated FROM the audit via CollectedData;
                                 coreThirty.ts untouched — VISION-locked)

PHASE 2 — APPROVAL-GATED FIX-IT
  008 waoengineer  fix-plan derivation (fail-dimensions → fix items) + GBP write client seam
        (dep: 002)
  009 waocopy      fix-it copy addendum (12 tokens, appends to the same bundle)
        (dep: 004)
        └─→ 010 waohebrewqa  QA pass on the addendum
              └─→ 011 waoengineer  regenerate scorecardCopy.ts (52 → 64 tokens)
                    └─→ 012 waoengineer  approval page + fix-approve/fix-execute routes
                          (deps: 008, 011)

INDEPENDENT
  013 waoengineer  GBP read-mask +regularHours,+specialHours (client.ts:89, one line)
        — closes report 006 §4's OAuth-side gap; verified for real only once GBP
          credentials land (VISION Phase-1 critical-path blocker).
```

Ascending filename order respects every dependency edge (verified: 002←001, 004←003, 005←004,
006←{001,002,005}, 007←{005,006}, 009←004, 010←009, 011←010, 012←{008,011}). Parallel-safe
pairs (different target agents, no edge): 003 alongside 001/002; 013 anytime.

## Design decisions baked into the specs

1. **Public Places API (New) first, OAuth later.** `places:searchText` (name+phone, he/IL) +
   legacy Place Details for photos — works for unclaimed listings, zero OAuth mid-funnel.
   `NormalizedPlace` is the single canonical shape for all consumers. The lookup route carries
   a dumb server-side result cache (keyed on normalized name+phone, file per business under
   `data/audits/cache/`, TTL <= 30 days subject to the Google Maps Platform ToS check specced
   in 001) — re-audits of the same business within TTL cost zero API calls, and a cache hit
   restores the audit file if it is missing, so shared deep links keep rendering.
2. **`unknown` is a first-class status.** Never score what the public API can't show — the
   scorecard distinguishes fail from unobservable (six dimensions: categories, hours,
   phone_website, photos, reviews, description; raw pass/fail counts, no weights, no
   competitor benchmarks in v0). FAIL dimensions split into DIY-fixable (categories, hours,
   photos — the scorecard gives the how-to away free) and structural (phone/website, reviews,
   description — the paid-flow pitch).
3. **Hebrew pipeline is the established three-step**: waocopy bundle (token-keyed markdown) →
   waohebrewqa proof pass → waoengineer script substitution with set-equality + corruption
   assertions. Zero Hebrew bytes ever typed by waoengineer; the copy module is generated
   output, deterministic, committed.
4. **The funnel carries the audit into onboarding** (`/site-bot/start?auditId=…`): prefilled
   confirm-or-edit answers for the class-(a)/(b) fields of report 006 §3, via a keep-word
   confirm. Core-30 seeds from exactly those `CollectedData` fields (coreThirty.ts:88-94), so
   the generated site inherits the owner-confirmed audit data — Ulku's Step-0 GIGO argument
   realized without touching the locked engine.
5. **Fix-it is approval-gated and connection-gated**: owner approves per item (immutable log
   under `data/audit-logs/<auditId>/log.jsonl`, shared approvalLog adapter); execution is
   `isGbpLive()`-gated AND requires `gbpLocationId` on the audit record — both absent today,
   so approved items land as `approved_pending_connection`. The claim/connect step is the
   designed next seam (not specced — see Open items).
6. **Free magnet, no price anywhere on the free surface.** The scorecard stands alone as a
   free artifact — no payment gate, no trial requirement to see it, nothing gated. The CTA
   INVITES the trial (existing flow at `/site-bot/start?auditId=…`); the trial gates only the
   fix-it/delivery phase. No new SKU, no timeline claims (Gate-2), no invented stats.
7. **Give away the easy fixes.** The scorecard hands over the 2-3 DIY fixes the owner can do
   alone (categories, hours, photos) as plain ungated how-to blocks (DIY_* tokens, rendered
   under each FAIL card that has one). Structural work (services architecture, site mirroring,
   review engine, monitoring) stays the paid-flow pitch. §8 principle, binding: a scorecard
   whose only message is "you're broken, buy the fix" kills the word-of-mouth engine.
8. **Cheap leads / share loops.** The ready state carries a share affordance (CTA_SHARE token,
   clipboard copy + native `navigator.share`; no WhatsApp/FB SDKs in v0). The audit-result GET
   route serves the ready state purely from the stored audit file (verified: no re-lookup), so
   the per-business URL is a shareable deep link that renders identically anywhere, at zero
   API cost.
9. **WAO's own profile is LIVE TEST CASE #1.** Spec 006's verification includes a mandatory
   end-to-end smoke against WAO's own GBP (wao.co.il) once PLACES_API_KEY exists — audit →
   scorecard → CTA; findings on WAO's own profile are genuine findings, fixed the normal
   approval-gated way. Spec 001 additionally documents the verified ratings/reviews SKU tier
   (Essentials $5/10k vs Pro $17/5k) and the ToS-confirmed cache TTL in its evidence.

## External blockers & Eitan actions

- **PLACES_API_KEY** (Google Cloud: enable Places API (New) + legacy Places API) — required
  before 001's live path works; all specs degrade gracefully without it (503 paths). ALSO the
  gate for 006's mandatory WAO-profile end-to-end smoke (lead-magnet test case #1) — nothing
  prospect-facing rolls out before that smoke passes.
- **GBP credentials** (`GBP_CLIENT_ID/SECRET/REFRESH_TOKEN` + `GBP_INTEGRATION_ENABLED=true`)
  — VISION's critical-path blocker, unchanged; gates 012's execute route and 013's real
  verification.
- **Eitan human gates**: the two Hebrew bundles pass Eitan's Sabra spot-check (AGENTS.md §3)
  AFTER the Noa QA tasks (004, 010) and BEFORE consumption — specs 003/009 flag this.
- Waoverifier-app escalations are routed from 006/007/012 (RTL rendering of the new Hebrew
  surfaces) per the template's escalation section.

## Open items (deliberately NOT specced yet)

- The GBP **claim/connect step** that sets `gbpLocationId` on an audit record (owner-driven
  Google verification + WAO Manager access) — needs its own research pass (report 006 §4's
  account/location-resolution gap); 012's seam is ready for it.
- **Grid-visibility (rank maps)** dimension — checklist v0 item deferred to R1 (Israel
  grid-rank tooling coverage, 009 §6); not in the 6-dimension v0.
- Category **categoryId mapping** for write_categories — WoZ on first real execution.
- Marketing acquisition funnel to the audit page (LP/ads) — strategist work after the MVP
  surfaces are verified.
