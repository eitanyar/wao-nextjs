# Next Production-Near Release Outcome — 2026-09-18

## Decision

Select one outcome: prepare an exact staged deployment-security release candidate from the independently accepted local implementation, without changing shared worktree bytes. The candidate must contain only the two privileged-route security corrections, the deployment slug helper and focused tests, and minimal canonical test registration reconstructed against `HEAD`; unrelated dirty route, package, test-config, email-recovery, GEO, rank-rent, podcast, provider, data, and documentation changes remain unstaged.

## Evidence

Engineer card `t_f2911ff1` is formally `done` and reports focused PASS. Independent verifier card `t_bfe19b9b` is formally `done` with criterion-level PASS for C1–C10: helper tests 2/2, route/source tests 12/12, canonical tests 600/600, scoped ESLint, production build, and two inert unauthenticated loopback 401 probes all passed. Those reports are board evidence; current source hashes independently match the accepted worktree bytes, the branch remains `hermes-migration`, `HEAD` is `c78c9ce8107c21e38477da2702338cfa5f488cbc`, and the Git index is empty.

The accepted behavior is still only in a shared dirty worktree. Whole-file staging would be unsafe: `src/app/api/site-bot/deploy/route.ts` contains a pre-existing unrelated Fraud Blocker hunk, while `package.json` and `tsconfig.test.json` contain broad unrelated registrations and a dependency change. Staging those current files wholesale would silently absorb unaccepted work. Legacy pending handoffs are `REVIEW_REQUIRED`, not FIFO.

## Outcome and safety boundary

The next production-near step is therefore candidate isolation, not another implementation feature. `waoengineer` must build the index from `HEAD` plus only the accepted deployment-security hunks, leaving every worktree file byte-identical. The staged Site Bot route must retain the `HEAD` Fraud Blocker policy line that is currently absent from the worktree; staged `package.json` and `tsconfig.test.json` must contain only the minimal deployment-test discovery additions over `HEAD`. Conventional focused checks, scoped lint, `npm run test`, and `npm run build` remain required; no protected-data access, credential access, provider call, valid authenticated deploy request, Wrangler execution, remote action, commit, push, deployment, or `deploy.sh` is allowed.

## Selected handoff

`handoff/pending/2026-09-18_008_waoengineer_prepare-deployment-security-candidate.md`
