# WAO execution reliability: decision and current release hold

## Decision

Repair the specification/dispatch contract before changing execution models or releasing the backlog. The strategist owns the faulty contracts; the orchestrator owns correct dependency wiring. Ordinary compile/test iteration must happen within a bounded task, not require a new strategy cycle after every red result. This report is not an executable handoff and authorizes no worker dispatch.

Current policy changes are implemented in AGENTS.md, CLAUDE.md, and CLAUDE_TO_HERMES_HANDOFF.md. They are instruction-level gates, NOT an installed scheduler enforcement mechanism. Existing sessions must reread the updated documents. No board state, profile configuration, production code, historical handoff, or daemon was changed.

## Sources and live observations

Read-only inspection on 2026-09-09:
- Official documentation: https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban
- Installed source: /home/eitanya/.hermes/hermes-agent/hermes_cli/kanban_db.py
- Live SQLite boards: /home/eitanya/.hermes/kanban.db and /home/eitanya/.hermes/kanban/boards/autonomous-hybrid-demand/kanban.db, opened mode=ro.
- Prior reports: docs/research/authorization-spec-reliability-audit-2026-09-07.md; docs/research/wao-pending-queue-triage-2026-09-09.md; /home/eitanya/al-batuah/handoff/2026-09-09_wao-recurring-task-failure-audit.md.
- Actual profile config fields, excluding credentials: strategist gpt-6-astra; orchestrator and waoengineer gpt-5.6-terra; waouxtester gpt-5.6-sol. All inspected context lengths are 1,000,000. This is configuration evidence, not a model-performance benchmark or complete tool-capability preflight.

At inspection the autonomous-hybrid-demand board had 53 blocked, two triage, 299 done, and no ready/running/todo cards. The default board had one done and one blocked card. Pending files are not equivalent to ready board cards. No active writer was indicated by those board states; unrelated processes were not certified absent.

## Verified causes

### 1. Missing board edges make dependency holds immediately runnable

The following live cards have zero parent links:

| Card | Non-success run history | dependency_wait events | promoted events |
|---|---|---:|---:|
| t_2fbc7544 | 92 blocked | 91 | 91 |
| t_e2663105 | 56 blocked, one crashed, one reclaimed | 55 | 55 |
| t_4a13d45f | 54 blocked | 53 | 53 |

Their events repeatedly alternate dependency_wait and promoted. Example event pairs: 1705/1706, 2775/2776, and 3507/3508. The missing prerequisites are described in event reasons but not represented in task_links.

Installed block_task at kanban_db.py:4541, specifically :4601-4641, maps kind=dependency to todo and returns before ordinary block recurrence handling. recompute_ready at :3281, specifically :3329-3364, promotes todo when all linked parents are done/archived; an empty parent set satisfies that check. _record_task_failure at :6543 handles crash/spawn/timeout failure accounting; simply lowering that threshold is not a cure for these dependency cycles.

Conclusion: malformed dependency graphs plus dependency-block routing explain these repeated launches. This is stronger evidence than blaming an orchestrator model or assuming an external retry cron. A prose-only missing dependency must remain a sticky needs_input hold until a real edge or accepted artifact resolves it. An archived card is not automatically accepted product evidence even though this installed scheduler treats it as dependency-ready.

### 2. Universal exact-once rules prohibit normal engineering convergence

All 89 current pending executable specs contain 'exactly once'. The old shared template combined that restriction with build, full tests, smoke, and screenshots and prohibited diagnostic alternatives. A safe compile failure consumed authorization just like a production write.

Fresh example: default-board t_fca7e224, run 2, blocked after OpenSEO task 039 reached canonical-tests and encountered SDK transport/client TypeScript mismatch. The run summary explicitly says the handoff forbids repair or rerun. openSeoMcp.ts and openSeoMcp.test.ts now exist and package.json includes @modelcontextprotocol/sdk 1.30.0. Thus the earlier triage's 'only runnable task 039; implementation absent' is stale. Do not re-run its consumed command or implement it again from scratch. The exact remaining type correction has NOT been scoped or executed in this audit.

The remedy is bounded correction inside the same dispatch for explicitly inert local checks, not unconditional retries and not lowering acceptance requirements. New v2 contracts default to two local correction cycles after the initial check; legacy contracts need explicit amendment.

### 3. Some scopes lack behavioral rules and necessary supporting edits

2026-09-06_009_waoengineer_fix-business-audit-rules.md:23-27 enumerates many audit dimensions without defining exact input schemas or deterministic dimension-specific decision rules. Its three acceptance bullets at :41-44 are not enough to distinguish correct implementations. :36-37 authorizes two new files only, while the current tsconfig.test.json:249-260 explicitly lists rank-rent source/tests and does not include the proposed test. Its npm test command therefore does not establish discovery of that new test. Merely replacing the global lint command would not make this spec ready.

The updated contract requires criterion-to-check mapping, behavior examples, exact schemas/seams, and necessary fixture/test-registration edits. Narrow scope must remain sufficient to achieve the outcome.

### 4. Stale immutable pins can fail before new work starts

Task 2026-09-07_005 pins package.json to 30b58d2f3d51b7cc062720b45209a76f2554037aa6a54d8db2c754790b9f1447. Its observed current SHA-256 is d59e98bbc3533db85238d3bf915f7c44abfa2212bc4f4f4cf3541076ced9fef5. Its three protected expired-domain core hashes still match. This is a specific stale package gate, not evidence those core contracts broke. Do not simply substitute the new hash without examining the dependency change.

### 5. Broad gates, capability assumptions, and terminalization add separate failures

The previous audits document unrelated global lint failure, unreadable long commands, missing server-start/viewport capabilities, and successful process exits without Kanban terminal calls. Live runs 596 and 600 confirm protocol violations; run 605 reached exact viewport and cleanup proof but failed the asset-readiness check before capture. These are different boundaries and should not be treated as repeated failure of all product code.

Live run 606 also records a copy-only change constrained to one file while its matching test fixture became stale. Necessary supporting edits need a planned owner; a narrow allowlist must not intentionally leave a required test impossible to satisfy. Board completion alone does not mean release health passed.

## Current queue disposition

The earlier triage classified 90 executable specs: one runnable, eight needing successors, 39 stale/superseded, and 42 dependency/approval-blocked. This report does not certify those old classifications as current. The one previously runnable item has since failed and is absent from pending.

Current inventory: docs/research/wao-dispatch-readiness-2026-09-09.csv has one hash-stamped row for every one of the 89 remaining executable pending specs, each marked REVIEW_REQUIRED under v2. Structural flags: 89 exact-once, 25 global-lint references, 28 immutable-pin references, 27 inline-interpreter references, and 32 files with physical lines over 1,000 characters. Flags overlap and are review hints, not semantic verdicts; inline interpreters are not intrinsically unsafe.

Review depth is explicit in every row: complete structural inventory, prior triage, selected deep checks; NOT a fresh behavioral audit of all 89. No task is newly dispatch-approved by this session. This is a policy hold/inventory, not a board-state mutation or scheduler pause.

Priority for task-specific rehabilitation:
1. OpenSEO 039 lineage: inspect exact SDK errors and existing implementation; one explicit v2 amendment for in-scope correction and bounded local verification, not another broad implementation spec.
2. Moz 005: reconcile changed package contract, validate actual SDK/provider contract as appropriate, separate normalization/transport/batch scope if needed, and provide focused discovered tests.
3. The prior eight flagged ready-with-defect candidates: 2026-09-06_009, _048, _058; 2026-09-07_005, _011, _014, _015, _038. Recheck both behavior and command shape; do not assume transport was the only defect.
4. Keep genuinely blocked descendants held until their actual prerequisite artifacts and board edges exist. Retire superseded dispatch candidates by explicit orchestrator reconciliation, preserving historical evidence.

## Changes made now

- Shared template retains every required section but replaces universal exact-once execution for NEW contracts with explicit execution classes, local correction budget, read-only diagnosis, and side-effect boundaries.
- Added dependency-edge checks, a dispatch approval gate, capability evidence, test-discovery requirements, stale-pin review, one-writer policy, staged evidence, and separate focused/release outcomes.
- Removed executor authority to author successor specs from the template; ownership remains with strategy.
- Synchronized strategist/orchestrator model descriptions with the inspected active configuration; no actual model settings changed.
- Added the current per-file review-required inventory.

These instructions do not mechanically enforce admission in the installed Hermes scheduler. That enforcement remains an engineer-owned follow-up requiring a separately scoped spec if desired; do not confuse policy publication with proof of reduced failure rates.

## Model recommendation and success measurement

Keep Terra for the orchestrator and engineer initially. There is no controlled evidence that switching the engineer to Sol will surely improve these failures; missing edges, contradictory instructions, stale hashes, and absent test registration remain defective for either model. Use Sol only for a bounded comparison/escalation when the contract is ready and failures demonstrably concern reasoning or implementation quality.

Release a small manually initiated pilot, one amended task at a time, after task-specific readiness approval. Proposed evaluation target, not a guarantee: at least four of the first five dispatches accepted without returning to strategy, zero deterministic redispatches, and every required release/verification gate reported independently. Count ordinary allowed local corrections as the same dispatch. Record elapsed time, attempts, first failing boundary, focused result, and release result. Do not inflate success with audit/planning completions or by relabeling a product failure as PASS.

## Verification and limits

Evidence was obtained through real board CLI/SQLite reads, source inspection, profile field inspection, file/hash checks, and official documentation. No worker/model benchmark, product test suite, build, live API call, visual acceptance, or deployment was run in this session. Governance changes and inventory are verifiable artifacts; backlog rehabilitation and improved first-pass completion are NOT yet proven.

## Proposed next prompt to waostrategy

Read the v2 handoff protocol and this reliability decision. Rehabilitate the existing OpenSEO 039 lineage only: inspect default-board t_fca7e224 and the exact current SDK type errors; preserve existing implementation; author one task-specific v2 amendment with sufficient file scope, focused discovered tests, bounded safe local corrections, separate release health, and fresh capability/dependency evidence. Do not dispatch. Do not create another audit-only task or reopen the entire domain-research pipeline. Report the remaining readiness checks honestly and provide the exact manual orchestrator prompt only when approved.
