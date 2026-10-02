# Audit Visual Failure Classification — 2026-09-18

## Decision

The formal visual gate `t_9f0fdd27` is `done` with QA result `FAIL`. Its report and four screenshots are independent runtime evidence; its prose remains a worker report, corroborated here against `/tmp/wao-site-bot-visual-qa-824/report.json`, the mobile screenshot, and current source.

| Finding | Classification | Evidence | Decision |
|---|---|---|---|
| The fixed privacy banner covers the audit submit button at 390×844. | Product defect; release-blocking for the audit-only candidate. | On first load, the submit button occupies y=688.56–744.27 while the fixed banner begins near y=679. The screenshot shows the button under the banner. `src/components/CookieBanner.tsx:8-15,27,39-43` explicitly recognizes this overlap class and already suppresses the banner on conversion routes, but `/site-bot/audit` is absent from `SUPPRESS_ON`. The audit form itself already renders its approved disclosure and privacy link at `src/app/(app)/site-bot/audit/page.tsx:418-423`. | Extend the existing conversion-route suppression policy to `/site-bot/audit`; do not redesign the page or banner. Verify an empty-consent-storage first load at exactly 390×844 leaves the complete submit control visible and interactable. |
| Every rendering attempts `https://www.googletagmanager.com/gtm.js?id=GTM-PQP3PVB`. | Test-contract/policy mismatch, not an evidenced product defect in this run. | `src/app/(app)/layout.tsx:140-147` intentionally loads this existing GTM container on all `(app)` routes. The reviewer contract prohibited every external request, intercepted GTM before any external response, and thereby created the only console error. The report records four attempts, four deliberate `ERR_BLOCKED_BY_CLIENT.Inspector` failures, zero page errors, and zero local HTTP errors. | Do not alter GTM in this correction. Future local visual review must block the known GTM URL before response, record the attempt, and exclude the interception-generated console message from product-error criteria; any unexpected external URL remains FAIL. Whether GTM should be consent-gated is a separate legal/product-policy decision and is not inferred from this blocked-request evidence. |

## Corrective outcome

The highest-value safe next outcome is the single ASCII-only `CookieBanner` route-suppression correction. It directly restores the audit conversion control without touching the staged audit implementation, approved Hebrew, protected data, providers, tracking architecture, or production. The matching Contract v3 handoff is `handoff/pending/2026-09-18_005_waoengineer_fix-audit-mobile-overlay.md`.

## Preserved boundaries

- Keep all eleven existing staged candidate paths staged and preserve their product behavior and approved copy; only the focused source guard may be extended without weakening existing assertions.
- Do not change GTM, consent wording, audit disclosure, privacy content, retention, APIs, score logic, protected data, credentials, providers, remotes, or deployment.
- No commit, push, dispatch, SSH, deployment, or `deploy.sh`.
