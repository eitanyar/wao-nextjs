# Next Production-Near Security Outcome — 2026-09-18

## Decision

Select one outcome: converge the existing local deployment-route security candidate so both privileged publication endpoints fail closed before request parsing or side effects, accept only bounded deployment slugs, never interpolate request data into a shell, and always clean owned temporary directories. This is the highest-value safe local outcome after the independently accepted audit-only Site Bot candidate was committed and pushed at `c78c9ce`; do not deploy that candidate or exercise either publication path.

## Evidence

Current `HEAD` and `origin/hermes-migration` are both `c78c9ce`. The audit series from `t_f32893ad` through `t_b44b9c88` is formally complete: engineer acceptance and independent structural checks passed, the first visual gate found one mobile overlay defect, the narrow correction passed, and the final independent 390×844 visual check passed. Those board summaries are worker reports; current Git independently confirms the accepted twelve-path candidate is committed and the index is empty.

The next unresolved production-near risk is already visible in current bytes. Committed `HEAD` exposes `POST /api/cloudflare-pages/deploy` and `POST /api/site-bot/deploy` before authentication, accepts unchecked `slug` values before filesystem use, invokes Wrangler through interpolated `execSync` shell strings, and uses timestamp-derived temporary paths. The dirty worktree contains an unaccepted partial correction plus focused tests; direct local observation on 2026-09-18 found `src/app/api/deployment-security.test.mjs` pass 3/3 and the compiled `deploy-access.test.ts` pass 3/3. Historical handoff 017 and verification-only handoff 042 describe earlier local evidence, but their exact-once machinery is stale and their bytes were never committed. They are evidence, not executable backlog.

## Product and safety decision

`/api/cloudflare-pages/deploy` remains callable only by an authenticated WAO admin or by the authenticated client who owns the loaded campaign; an optional supplied Google Ads customer ID must match that campaign. `/api/site-bot/deploy` is admin-only in this outcome. Current checkout code is research-only and no current source caller invokes `/api/site-bot/deploy`, so retaining a new `WAO_DEPLOY_SECRET` bearer bypass would create an unused privileged credential surface without an accepted caller.

Implementation is limited to the existing route/helper/test seams and canonical test registration. Verification uses focused tests, scoped lint, normal `npm run test`, normal `npm run build`, and unauthenticated loopback 401 probes that stop before body parsing. It must not read protected data, use credentials, call Cloudflare, Wrangler, Fraud Blocker, payment or other providers, publish, commit, push, deploy, or run `deploy.sh`.

## Selected handoff

`handoff/pending/2026-09-18_006_waoengineer_secure-deployment-boundaries.md`
