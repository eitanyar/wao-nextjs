# Outcome-Owned Delivery Model — 2026-09-09

## Decision

Keep `waostrategy` and `waoengineer` as separate profiles. Merge the work, not the identities:
one concise strategist outcome contract starts one goal-mode engineer session that owns codebase
inspection, implementation planning, coding, debugging, and safe local acceptance. Use Kanban only
as the durable status ledger. After local PASS, run one independent verifier card.

This replaces chains of strategist spec, engineer attempt, strategist recovery spec, acceptance-only
task, evidence-review spec, and verifier task for one implementation outcome.

## Last-ten audit

Board: `autonomous-hybrid-demand`; ordered by task creation time at 2026-09-09T17:27:06+07:00.

| Task | Seat | Formal outcome | First failing boundary |
|---|---|---|---|
| `t_eae53f13` | engineer | blocked | Red harness searched stderr although TypeScript diagnostic was on stdout. |
| `t_30d23c10` | engineer | blocked | Product harness passed; post-run Python evidence writer had a syntax error. |
| `t_4a99b600` | strategist | done | Authored another corrective spec; no product acceptance. |
| `t_e996a48d` | verifier | done | Correctly rejected a synthetic persistence test that bypassed the real final path. |
| `t_f3c43c7c` | strategist | done | Authored a verifier spec; no product acceptance. |
| `t_67c1190f` | engineer | blocked | Local acceptance passed but contract required another independent evidence step. |
| `t_f7581c3f` | engineer | blocked | Custom ledger emitted duplicate cleanup stages after implementation evidence passed. |
| `t_cf0de671` | engineer | blocked | Custom offline harness lacked a real network interception boundary. |
| `t_356ed76f` | copy | done | Requested edit landed, but scope forbade updating the fixture that made tests fail. |
| `t_9bcd5b0a` | engineer | blocked | Visual asset readiness failed before screenshots. |

Formal count: six blocked and four done. Excluding strategist-only planning cards, two of eight
non-strategy cards reached `done` (25%); one of those still reported a failing release test. The
dominant failure class is process-authored acceptance machinery and scope rigidity, not lack of
model context or inability to write the feature.

## Root cause

The workflow separated responsibility at the wrong seam. Sol attempted to precompute implementation,
test infrastructure, evidence persistence, retry policy, and lifecycle details. Terra was then
forbidden to repair ordinary task-owned defects after seeing real compiler/runtime output. Each
small defect paid for another full strategist and worker context. Custom evidence harnesses became
larger and less reliable than the product changes they were meant to verify.

The profiles have sufficient context (`1,000,000` each) and the current repository proves the code
is not generally broken: `npm run test` passed 533 compiled tests plus 28 API/source-contract tests,
and `npm run build` passed. Repository-wide lint currently fails with 965 errors and 197 warnings,
substantially inflated by generated `dist/` and `artifacts/` files. Global lint must not be coupled
to every feature until its baseline is separately repaired.

## Operating contract

1. Strategist chooses the highest-value observable outcome and writes one concise Contract v3.
2. Orchestrator creates one `waoengineer` card with `--goal --goal-max-turns 12`, `--max-runtime 45m`,
   `--max-retries 1`, and `--workspace dir:/home/eitanya/wao`.
3. Engineer inspects the actual code and owns all task-local design and correction. Safe checks may
   repeat. A red check keeps the card running.
4. The card blocks only for external dependency, approval, missing capability, unsafe side effect,
   or a real product/architecture decision.
5. Engineer completes only after focused acceptance, scoped lint/type checks, canonical tests, and
   build pass as applicable.
6. Orchestrator dispatches the handoff's named independent verifier contract once. Strategy is not
   called merely to restate verifier scope.
7. User reviews a clean, verified milestone and decides when to commit/push/deploy. No agent runs
   `deploy.sh` from this workflow.

## Cost and reliability target

The default path uses one Terra implementation session and one independent verifier, instead of
multiple Sol planning/recovery sessions plus repeated Terra starts. The five-card pilot target is
at least four first-card implementation acceptances, zero deterministic redispatches, and four
independent verifier passes. Against the observed 25% non-strategy formal-done rate, 80% is a 3.2x
target; it is a measured target, not a guarantee.

## Dirty-worktree priority

Current release health: tests PASS; build PASS with one NFT whole-project tracing warning; global
lint FAIL. Do not add another broad initiative before closing the in-progress Moz adapter and then
reconciling the dirty tree into initiative-scoped, independently verified commit candidates.

Priority order:
1. Complete the Moz adapter from the existing fixtures/tests without another red-evidence ceremony.
2. Independent verifier review of the Moz diff and offline behavior.
3. Reconcile current dirty files into coherent milestones; isolate generated evidence and establish
   a source-only lint baseline.
4. Finish the expired-domain vertical slice before rehabilitating any older pending backlog item.
5. Archive or explicitly retire stale pending specs; never execute the 89-file legacy queue as FIFO.

## Stop conditions

Pause the pilot and return to strategy only when two goal-mode implementation cards fail at the
same architectural seam, a task needs live/client/provider/deploy authorization, or an independent
verifier finds a product defect that the implementation contract cannot resolve safely.