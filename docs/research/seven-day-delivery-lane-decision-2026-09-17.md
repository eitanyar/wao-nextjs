# Seven-Day Delivery Lane Decision - 2026-09-17

## Decision

Select the existing three-path staged GEO signup token-boundary candidate for a narrow, read-only staged-index acceptance. Do not create another isolated build candidate and do not revive Site Bot card `t_47ae8e9c` or failed handoff `2026-09-17_010`.

This is the highest-value production-near lane because the customer-facing GEO callback correction already has a formally done implementation (`t_d798b137`) and independent behavioral PASS (`t_4e92f30e`), while the exact release scope is already staged and excludes rejected email-recovery work. The next useful result is independent proof that the staged bytes are exactly the accepted bytes and nothing else.

## Independent observations

- `HEAD` is `bfc2a0c970104ce0ba2532a28ad6e35c2ee76097` on `hermes-migration`.
- The index contains exactly `next.config.ts`, `src/app/(product)/client/client-auth.security.test.mjs`, and `src/app/api/geo/signup/callback/route.ts`.
- Cached numstat is exactly `7/0`, `34/0`, and `10/6`; `git diff --cached --check` passes.
- Index tree: `f85acc52e392cfe7818f337d7a000f358243eb12`.
- Stable patch ID: `279733c644e9dc58bcd9ae582fd309160692eb55`.
- Cached patch SHA-256: `1d3ee18bfd1e724fada251c8991ecaae26778fe03807f8ba2d755016638847cc`.
- The three staged blob SHA-256 values match handoff `2026-09-17_008`: `39a2e847...0148`, `d9c4ffe8...af34`, and `02365bbb...aea`.
- `data/clients` and `data/geo-signups-pending` have no Git status changes.
- Formal board evidence: `t_d798b137` is done; `t_4e92f30e` is done with independent PASS for the exact callback SHA-256 and required token semantics.

## Worker self-report kept separate

- Blocked card `t_535e0f5c` reports focused test, scoped lint, and canonical tests passed in its export; its build did not complete because its dependency symlink was rejected.
- Failed handoff `2026-09-17_009` later reached a real copied-dependency build and exposed an unrelated committed Site Bot one-argument token call. That means the staged GEO candidate cannot receive a clean `HEAD`-plus-index production-build PASS without crossing the abandoned Site Bot boundary.
- Blocked card `t_47ae8e9c` reports that its temporary Site Bot candidate then failed because its contract excluded the staged GEO callback correction. That circular isolated-candidate path is abandoned, not a basis for another recovery loop.

## Can / cannot

Can now:
- Independently accept or reject the exact staged scope, hashes, hunks, exclusions, and provenance without changing repository bytes.
- Preserve the staged candidate for owner commit consideration after verifier PASS.

Cannot now:
- Claim integrated production-build PASS or `release_health: true` for `HEAD` plus only the staged candidate.
- Commit, push, deploy, access providers/client data, or revive the abandoned Site Bot temporary candidate.

## Remaining outcomes (maximum three)

1. Now: independent read-only staged-index acceptance under handoff `2026-09-17_011`.
2. After PASS: owner-controlled commit decision for exactly the accepted three-path index; no scope broadening.
3. Separately authorized later: restore branch-wide build health through a conventional scoped change, without reviving `t_47ae8e9c`; only then perform integrated release verification and deployment consideration.

## Protected boundaries

The current index is immutable during verification. The dirty worktree, all untracked files, client/pending-signup data, credentials, providers, existing handoffs, commits, remotes, and deployment are outside scope. Verification is read-only and must compare index/worktree state before and after.
