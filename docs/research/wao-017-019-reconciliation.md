# WAO handoffs 017-019 reconciliation

Audit date: 2026-09-08

## Repository state

- `HEAD` and `origin/hermes-migration` are identical at `e800f363eee576e36fd265ce626ada05b47bd7f4` (`git rev-list --left-right --count HEAD...origin/hermes-migration` returned `0 0`).
- Therefore every tracked diff and untracked file named below is local-only and not pushed.
- `npm run test` passes: 504 compiled tests plus 26 source tests, including the deployment, leads, and onboarding source suites.
- `npm run lint` fails repository-wide with 1,061 findings: 879 errors and 182 warnings. The output includes generated `dist/` files and many unrelated source files. Scoped lint is clean for 019; 017 reports two unchanged `no-explicit-any` errors in `src/app/api/cloudflare-pages/deploy/route.ts`; 018 reports one unchanged `no-explicit-any` error in the GET catch at `src/app/api/leads/route.ts`.
- `npm run build` compiles but fails type checking in unrelated untracked work at `src/app/api/rank-rent/leads/route.ts:21`: `PortfolioSiteSummary | null` is not assignable to `PortfolioSite | null`.

## 017 — Secure privileged deployment routes

Status: implementation complete locally; not pushed; no corrective successor required.

Local implementation evidence:

- `src/app/api/cloudflare-pages/deploy/route.ts`: admin/client authentication precedes `req.json()`; `isSafeDeploymentSlug()` precedes campaign lookup and filesystem/provider/process use; client ownership and optional customer-ID binding fail with 403; Wrangler uses `execFileSync`; temporary output uses `mkdtempSync(..., 'wao-lp-')` and `finally` cleanup.
- `src/app/api/site-bot/deploy/route.ts`: admin or fail-closed internal bearer authorization precedes `req.json()`; slug validation precedes filesystem/provider/process use; Wrangler uses argv execution; temporary output uses `mkdtempSync(..., 'wao-site-')` and `finally` cleanup.
- `src/app/api/site-bot/checkout/callback/route.ts`: the existing deploy fetch forwards `WAO_DEPLOY_SECRET` only through the Authorization header.
- `src/lib/deployment/deploy-access.ts` and `src/lib/deployment/deploy-access.test.ts` are untracked local files implementing the bounded DNS-safe slug predicate and constant-time bearer comparison.
- `src/app/api/deployment-security.test.mjs` is an untracked local source-invariant suite; `tsconfig.test.json` includes the helper and its TypeScript test.
- Relevant source tests pass, and the helper tests pass within the canonical suite.

Gate limitation: the original failed handoff has no appended execution report, and the full lint/build gate remains red for the repository-level reasons above. This is verification/dependency bookkeeping, not missing 017 implementation.

## 018 — Protect CRM mutations

Status: security behavior is implemented locally, but corrective work is still required; not pushed.

Local implementation evidence:

- `src/app/api/leads/route.ts`: parses JSON before CRM reads, distinguishes exactly `updateQuality`, `updateRevenue`, `enrichStub`, and `markClosed`, rejects unknown actions, authenticates supported mutations before storage/downstream work, validates IDs/quality/revenue/bounded strings, and preserves the no-action capture branch.
- `src/app/api/leads/route.test.mjs`: source assertions cover public capture, malformed JSON, authorization ordering, unknown-action rejection, and payload validation.
- The failed handoff records that its one permitted command stopped on an accidental line-prefix corruption; the prefix was restored from HEAD but the command could not be rerun.
- Current evidence supersedes that initial source failure: the leads source suite passes, and `npm run test` passes.

Corrective gap:

- The pre-change POST handler wrapped all capture/mutation processing in a catch that returned the stable 500 body `{ success: false, error: "Failed to route lead" }`. The local rewrite removed that outer error boundary. Failures from `readLeads`, `writeLeads`, or `captureLead` now escape to Next.js, violating 018 requirement 4 to preserve the public capture response status/body.
- Successor spec: `handoff/pending/2026-09-08_001_waoengineer_restore-leads-error-contract.md`.

## 019 — Restore sandbox readiness

Status: the readiness branch is implemented locally, but corrective work is still required; not pushed.

Local implementation evidence:

- `src/lib/google-ads/demand-readiness.ts` exports `shouldBlockCampaignCreationForReadiness()` and leaves `executePaidSearchMutationIfReady()` unchanged.
- `src/lib/google-ads/demand-readiness.test.ts` covers simulation-only test mode, blocked live mode, and ready live mode.
- `src/app/api/google-ads/create-campaign/route.ts` uses the route-specific helper before `buildClient()` and skips keyword demand in test mode.
- `src/app/api/google-ads/onboarding-smoke.test.mjs` asserts helper ordering before client construction.
- The failed handoff stopped at the then-existing repository-wide lint backlog; current `npm run test` passes and scoped 019 lint passes.

Corrective gap:

- `resolveAdsAccount('test')` still falls back from `GOOGLE_ADS_TEST_REFRESH_TOKEN` to `GOOGLE_ADS_REFRESH_TOKEN` and from `GOOGLE_ADS_TEST_MCC_CUSTOMER_ID` to `GOOGLE_ADS_MCC_CUSTOMER_ID` at `src/app/api/google-ads/create-campaign/route.ts:103-104`. This directly violates 019 requirement 3 that test mode never fall back to live credentials.
- Successor spec: `handoff/pending/2026-09-08_002_waoengineer_remove-sandbox-live-fallback.md`.

## Pending 020 dependency reconciliation

`handoff/pending/2026-09-05_020_waoengineer_canonicalize-release-tests.md` is formally blocked because it names 017, 018, and 019 as dependencies that must be in `handoff/completed/`, while all three remain in `handoff/failed/`.

Its requested package configuration is already present locally: `package.json` includes compiled podcast tests and the named podcast/deployment/leads/onboarding source suites, and `tsconfig.test.json` includes the podcast and deployment helper sources. The canonical command currently proves those tests run and pass. Do not dispatch 020 while its declared dependencies remain unsatisfied; after successor work and strategist/orchestrator reconciliation, verify the existing local package diff rather than reimplementing it.

## Recommended recovery order

1. Execute `2026-09-08_001_waoengineer_restore-leads-error-contract.md`.
2. Execute `2026-09-08_002_waoengineer_remove-sandbox-live-fallback.md`; it is independent and may run in parallel with step 1 if orchestration policy permits.
3. Independently review the completed local 017 implementation and formally reconcile 017 without a duplicate successor.
4. Resolve or explicitly waive the unrelated repository-wide lint/build blockers; neither should be attributed to 017-019.
5. Reconcile 018 and 019 after their successors pass, then unblock 020. Confirm its already-present `package.json`/`tsconfig.test.json` changes and rerun the canonical release gate before any commit or deploy.
