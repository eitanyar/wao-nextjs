# Autonomous Hybrid Demand Engine — Milestone Plan

Date: 2026-09-03
Owner: waostrategy
Status: queued for implementation

## Decision

The Site Bot milestone creates enough organic infrastructure to begin the next milestone. The next build is not an unsolicited free-lead campaign or a calendar-based Ads-to-organic budget switch. It is an autonomous operating layer that can evaluate, execute, audit, retry, and stop routine Google Ads actions without per-task human approval, plus an autonomous lead-response seam and a shadow hybrid evidence planner.

The client gives one-time scoped authorization. Thereafter deterministic policy gates, not a human approval queue, govern routine actions. Billing, payment methods, ownership, MCC linking, account creation terms, large unbounded budget changes, destructive deletes, and unsupported copy publication remain outside routine autonomy.

## Existing foundations reused

- Site research and deployment: `src/lib/site-bot/research/**`, `src/lib/lp/researchedSite.ts`.
- GBP execution and drift: `src/lib/gbp/executePatch.ts`, `src/lib/site-bot/driftMonitor.ts`.
- Ads task generation and mutations: `src/lib/google-ads/operator.ts`, `executor.ts`, `mutations.ts`.
- Search-term evidence: `src/lib/google-ads/search-term-fetch.ts`, `search-term-scoring.ts`.
- Lead/revenue feedback: `src/app/api/leads/route.ts`, `src/lib/crm/intelligence.ts`, `src/lib/google-ads/conversion-upload.ts`.
- Organic/paid overlap evidence: `scripts/ads-overlap.mjs`, `data/clients/{clientId}/ads-overlap.json`.

## Milestone A — Autonomous Ads Operator

1. Remove review-content steering that conflicts with Google Maps rating-manipulation policy.
2. Add a versioned per-client autonomy policy envelope, kill switch, limits, and immutable outcome ledger.
3. Wire campaign maturity into production task eligibility; missing age becomes unknown, never assumed growth.
4. Add rigorous pre-launch Keyword Planner volume evidence and a live fail-closed readiness gate.
5. Wire search-term harvesting to real positive-keyword creation under client economics and maturity gates.
6. Add a scheduled autonomous cycle that executes only policy-allowed reversible actions, without writing approval records or waiting for humans.
7. Add one-time autonomous-management consent copy and QA.
8. Wire the one-time authorization record; sandbox can run autonomously, live stays shadow until the approved legal version is configured.
9. Add the Fraud Blocker API adapter, idempotent domain provisioning, and direct tracker renderer.
10. Inject Fraud Blocker tracking into every WAO-controlled Site-Bot and Ads-LP HTML page.
11. Synchronize vendor-observed Google Ads protection health into the autonomy gate and hybrid evidence.

## Milestone B — Autonomous Demand Capture

12. Persist contact consent and response lifecycle fields for form leads; click stubs never enter automated outreach.
13. Add an idempotent WhatsApp Cloud template outbox/worker for immediate first response. This removes WAO human forwarding; provider credentials and approved template names are external activation requirements.

## Milestone C — Hybrid Evidence Layer

14. Persist time-series organic/paid/CRM snapshots and produce deterministic hybrid decisions. Initial mode is shadow because current evidence cannot prove paid incrementality or safely mutate query-level paid coverage from campaign-level budget controls.

## Click protection decision

WAO will not build a duplicate click-fraud detector. Fraud Blocker is the external protection engine. Its documented API at `https://backend.fraudblocker.com/api` supports API-key authentication, domain list/add/archive, reporting, and read/write IP block/allow lists. The queue therefore adds automatic domain provisioning, direct tracker injection into WAO-controlled pages, and protection-health synchronization. The documented API does not expose Google Ads child-account linking; MCC authorization and whether new child accounts can auto-enroll require one vendor-side confirmation. Meta protection remains later scope because the documented IP-sync contract is Google Ads-only.

## Human-resource rule

No recurring person approves routine operations. Humans remain only at:

- one-time account connection and authorization;
- legally required terms/copy sign-off;
- exceptional unsupported actions outside the policy envelope;
- selected Hebrew copy publication decisions.

Routine decisions, execution, verification, retries, rollback, logging, and client reporting are machine-owned.

## Context-budget check

`waoengineer`, `waocopy`, and `waohebrewqa` each have a real 1,000,000-token context length in `AGENTS.md`. Every queued specification is one narrow task and is far below that payload.

## Activation gates

- Sandbox first; live mutation remains independently gated.
- Live autonomy requires a valid one-time authorization record and matching legal-version environment value.
- Every action must be idempotent and written to an immutable autonomous-action ledger.
- No action may silently become “successful” when it performed no mutation.
- No autonomous budget change may exceed the client’s stored hard ceiling or per-run percentage cap.
- Fraud Blocker coverage must be current when the policy requires it.
- Missing conversion, age, demand, ownership, or attribution evidence fails closed.
- Hybrid allocation remains shadow-only until repeated snapshots and business-outcome evidence can support a safe query/campaign-level mutation.
