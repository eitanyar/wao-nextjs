# Release-Candidate Audit — shared worktree (2026-09-30, READ-ONLY)

Task: t_477587c1 (waostrategy). Owner authorization: read-only inventory; no mutation until Eitan approves an exact path/hunk scope.
Sources: git (HEAD c78c9ce, branch hermes-migration, 0 ahead / 5 behind origin/hermes-migration), full `git status --porcelain` (160 entries), per-path diffs for candidate sets, board outcomes, subagent inventory at docs/research/release-inventory-2026-09-30.json (160 classified entries).

## 1. Repo state
- HEAD c78c9ce; origin/hermes-migration = 9bebcfe; local is 5 commits BEHIND, 0 ahead.
- Upstream commits: 1051ad9 feat(homepage): publish reviewed Astra homepage (v1); ec56bfc/c2a2494/9bebcfe deploy repairs (deploy.sh, deploy.atomic-release.test.mjs, next.config.ts); f8e38f9 fix(leads): keep review hook internal (src/app/api/leads/route.ts + test).
- Active writers at audit time: waoengineer (idle after t_0cf86a44), waouxtester (t_7c636a88 C4b review running). No other writers.
- Cached diff-check: unstaged `git diff --check` CLEAN; `git diff --cached --check` flags ONE cosmetic issue: src/lib/deployment/deploy-access.test.ts:33 new blank line at EOF (fix inside candidate before commit).
- Index: 7 staged paths (deployment-security candidate). Do NOT assume the whole index is approved — see §4.

## 2. Upstream-conflict analysis per candidate (read-only)
- deployment-security staged set (7 paths): ZERO file overlap with the 5 upstream commits → applies cleanly on top of origin.
- client-recovery-security (24 paths): ZERO overlap with upstream (upstream leads change is src/app/api/leads/*, different files) → clean.
- qwen-bot-integration (src/app/api/bot/route.ts + test, src/lib/ai/qwen-fast.*): ZERO overlap with upstream → clean.
- geo-access, podcast-title: ZERO overlap → clean.
- HOMEPAGE v3 candidate: DIRECT COLLISION with upstream 1051ad9 — upstream ADDS the same 19 homepage paths as tracked files (v1 content); local worktree has them as untracked/modified with v3 content. A plain merge/rebase of local onto origin would conflict on every shared path. REQUIRED TREATMENT: build the homepage release commit in an ISOLATED worktree based on origin/hermes-migration, taking the local v3 files as authoritative content (v3 ⊃ v1: QA-passed copy, retired sections removed, site nav, popup suppression, RTL/a11y fixes). Never merge local HEAD into origin for the homepage.
- f8e38f9 (leads route) touches src/app/api/leads/route.ts; local has src/app/api/leads/route.test.mjs dirty? (inventory: leads route test listed under onboarding-demo/unverified) — verify hunk-level before any leads-adjacent commit; not in any proposed candidate.

## 3. Classification summary (160 entries)
homepage-astra-v3: 36 | client-recovery-security: 24 | site-bot-pilot: 20 | docs-reports: 18 | expired-domain-research: 18 | deployment-security-staged: 9 | onboarding-demo: 6 | tooling-scripts: 5 | geo-access: 5 | qwen-bot-integration: 5 | rank-rent-experimental: 4 | personal-temp: 3 | rtl-a11y-fix: 3 | podcast-title: 2 | data-client: 1 | generated-build: 1.
Never-commit: tmp/ (build scratch), home/, audits/, .hermes/audits/, data/lps/northstar-plumbing.json (client data), fixtures/**, docs/copy/*.pre-*-backup snapshots (keep locally, exclude from release commit), src/content/*.pre-*-backups.

## 4. Mixed staged/unstaged files — exact safe treatment (no staging performed)
- package.json: STAGED hunk = deployment-security only (test script + deployment suites) → commit staged version as-is. UNSTAGED working version = superset mixing rank-rent/podcast/astra/resend/bot/leads/onboarding + @modelcontextprotocol/sdk dep, and it REMOVES the deployment suites from the test script → do NOT commit working version with any candidate; when each feature commits, add its own hunk; final merged test script must be the UNION (deployment + astra + others).
- tsconfig.test.json: STAGED hunk = deploy-access includes (deployment-security) → commit as-is. UNSTAGED hunks = astra-copy-review includes (homepage candidate) + onboarding-demo includes (unapproved) → hunk-stage only the astra hunk with the homepage commit; leave onboarding-demo hunk unstaged.
- src/app/api/site-bot/deploy/route.ts: STAGED hunks = deployment-security hardening → commit as-is. UNSTAGED single hunk = dead-code const removal (site-bot-pilot) → leave for site-bot candidate.

## 5. Homepage v3 release-readiness (independent gates)
- Hebrew QA v1 t_58f90585 PASS-with-minor-notes; surgical v3 t_46358f55 (4-field diff, independently re-verified by strategist + QA); QA v3 t_7510647d PASS-with-minor-notes.
- Visual: t_5b9522d9 FAIL → fixed t_df680b95 → re-verified t_7d65b2b3 PASS (arrows 8/8 left, launcher 0 overlaps).
- Conversion: C4 t_4651a687 FAIL (FAQ cost item, exit popup, mobile launcher) → fixed t_0cf86a44 (FAQ 5 items, popup null on '/', launcher sweep 0/0 at 390+320, tests 12/12 + 631+70 + build green) → C4b t_7c636a88: items 1-5 PASS, item 6 FAIL (launcher vs FAQ <summary> glyphs at 320 cookie-present; vs footer a11y link at 390 post-consent) → F3b t_f125fc1d done (CSS-only safe gutter on all text containers ≤480px; ~180k geometry samples, 0 intersections) → C4c t_9f885ee7 PASS on ALL SIX checks (390/320 both cookie states, 246-280 sweep positions each, 0 intersections; no exit dialog on '/'; no pricing strings; nav/images/copy confirmed).
- Runtime: tailnet preview http://100.102.160.114:3000/ serving v3 (strategist-verified: 0 forbidden strings, site nav live, SEO anchors intact, no PIN; exit popup absent on '/' verified by C4b/C4c engagement simulation).
- VERDICT: homepage v3 is INDEPENDENTLY RELEASE-READY (UX/conversion/visual/copy gates all PASS). Commit still requires Eitan's approval of the exact path scope and the isolated origin-based worktree treatment (§2); deploy remains Eitan-only.

## 6. Proposed FIRST production commit (awaiting Eitan approval; nothing committed)
Candidate A — deployment-security hardening (board-done, tests green, zero upstream overlap):
  src/app/api/cloudflare-pages/deploy/route.ts (staged M)
  src/app/api/site-bot/deploy/route.ts (staged M hunks only)
  src/app/api/deployment-security.test.mjs (staged A)
  src/lib/deployment/deploy-access.ts (staged A)
  src/lib/deployment/deploy-access.test.ts (staged A; first fix the EOF blank line flagged by --cached --check)
  package.json (staged hunk only) + tsconfig.test.json (staged hunk only)
Evidence: focused + canonical suites green in current tree; security tests assert auth-before-side-effect, argv exec, tmpdir cleanup.
Gate before commit/push: separate isolated staged-candidate card + independent index review (owner-mandated).

## 7. Ranked follow-on queue (safe production candidates)
1. Candidate A above (deployment-security).
2. client-recovery-security (24 paths, board-done, tests green; includes resend-transactional, PIN-recovery rework; zero upstream overlap).
3. qwen-bot-integration (5 paths, board-done; live effect additionally requires Eitan's .env.local QWEN key decision — currently simulation fallback).
4. geo-access (5 paths, board-done).
5. podcast-title (2 paths, board-done).
6. Homepage v3 (36-path allowlist minus backups/docs-reports) — AFTER C4b PASS + isolated-worktree plan; highest value, highest coordination cost.
Not production-ready (stay local): onboarding-demo, site-bot-pilot, expired-domain-research, rank-rent-experimental, tooling/docs.

## 8. Open owner decisions
(1) Approve Candidate A exact scope → dispatch isolated staged-candidate + independent index review. (2) .env.local QWEN key (401 both endpoints). (3) Production deploy remains Eitan-only. (4) Parked design task t_30bcdc81 (exit-prompt opt-in) stays behind release work.
