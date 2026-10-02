# Authorization Spec Reliability Audit — 2026-09-07

## Scope and method

This is a read-only audit of the recent authorization acceptance chain, with detailed review of the last five waostrategy-authored authorization specs: tasks 024 through 028. Evidence was taken from the immutable handoff files, the live Kanban task/run/event records in `/home/eitanya/.hermes/kanban/boards/autonomous-hybrid-demand/kanban.db`, and the current authorization source and regression fixture. Historical handoffs were not edited, moved, renamed, or reclassified.

The five audited handoff files and their observed SHA-256 values are:

| Spec | Current immutable evidence path | SHA-256 |
|---|---|---|
| 024 | `handoff/failed/2026-09-07_024_waoengineer_accept-authorization-compile-gate.md` | `242443e8314c0fc2678a31b6bfd961cfabbb1b1f297f0daea8db2604b612bee1` |
| 025 | `handoff/pending/2026-09-07_025_waoengineer_accept-authorization-counts.md` | `64fab7be0ee3f9f7d5291ee4f554ad922a0a054ad3d9c34439de51388f287ced` |
| 026 | `handoff/failed/2026-09-07_026_waoengineer_recover-authorization-command.md` | `150fa77a349b7b80e4d703cfa9b02aeccdce368db3c69478dd36f37adb8fd2a2` |
| 027 | `handoff/failed/2026-09-07_027_waoengineer_observe-authorization-gate.md` | `52126878f529b9041adf90cfd824b7a866c377ea72f2837684e8276e3bd60d3a` |
| 028 | `handoff/pending/2026-09-07_028_waoengineer_fix-asset-duplicate-test.md` | `a35cc631a353a190591d0d18fed9a6230809a3c2ebd985a9aced348677b733f6` |

## Executive finding

The chain’s repeated return-to-strategy loop was caused mainly by acceptance-protocol fragility, not repeated production defects. Of the four executed specs among the last five, task 024 failed on an incorrect Node test-runner count expectation, task 025 never started because its single-line command was unreadable through the executor’s file surface, task 026 ran but produced an unattributable failure because the command lacked gate-level observability and cleanup output dominated the surfaced result, and task 027 finally exposed one genuine canonical regression-fixture defect. Task 028 is a pending, narrowly scoped fixture correction and has no executor outcome yet. The production authorization correction in task 020 appears stable at `src/lib/rank-rent/authorization.ts:76`; task 027’s focused four authorization tests passed before the canonical suite reached the separate malformed duplicate-asset fixture at `src/lib/rank-rent/authorization.test.ts:28-38`.

## Last five specs and Kanban outcomes

### 024 — Accept Authorization Fix Through Canonical Test Compiler

- Handoff evidence: `handoff/failed/2026-09-07_024_waoengineer_accept-authorization-compile-gate.md:20-37`, especially the expected 11 total / 7 skipped contract at lines 32 and 56-57.
- Executor task: `t_5658eb6e`, run 432.
- Kanban outcome: `blocked` (`block_kind=transient`). The command started once. The selected run emitted 4 total, 4 passed, 0 failed, 0 skipped, then the count assertion stopped the gate.
- Category: **test-expectation failure**.
- Cause: the spec assumed unmatched top-level tests would appear as skipped under `node --test --test-name-pattern`; Node.js v22.22.1 reported only the four selected tests.
- Production defect evidence: none. The four selected authorization regressions passed.
- Confidence: **High**, based on run 432’s exact observed counts and strategist diagnosis task `t_c472cbdf`, run 434.

### 025 — Accept Authorization Gate With Runtime-Observed Counts

- Handoff evidence: `handoff/pending/2026-09-07_025_waoengineer_accept-authorization-counts.md:20-36` and the single physical-line Test Command at line 72.
- Executor task: `t_601cb113`, run 436.
- Kanban outcome: `blocked` (`block_kind=capability`) before the command started.
- Category: **protocol/transport failure**.
- Cause: the 3,679-character command occupied one Markdown line and was truncated by the executor’s read surface. The same spec prohibited shell extraction, reconstruction, substitution, or any additional retrieval command, leaving no compliant execution path.
- Production defect evidence: none; no test command ran.
- Confidence: **High**, based on run 436’s block reason and recovery task `t_439b18d2`, run 437.

### 026 — Recover Authorization Acceptance Command

- Handoff evidence: `handoff/failed/2026-09-07_026_waoengineer_recover-authorization-command.md:20-43` and its multiline command at lines 75-114.
- Executor task: `t_bdea0923`, run 438.
- Kanban outcome: `blocked` (`block_kind=transient`). The multiline command was invoked exactly once and exited 1, but no gate-identifying stdout was surfaced; the only visible terminal message was the recursive-delete cleanup warning.
- Category: **protocol/transport and observability failure**.
- Cause: converting the command to readable lines fixed task 025’s transport defect but retained a fail-fast sequence with no pre-gate labels or EXIT failure attribution. The prescribed `rm -rf` trap also interacted with terminal policy output and obscured the useful result.
- Production defect evidence: indeterminate from this run. The exact failing clause cannot be recovered without violating the exact-once rule; later task 027 showed the command could reach the canonical suite, but that does not prove run 438 failed at the same clause.
- Confidence: **High** that observability was defective; **Low** for any claim about the hidden failing gate.

### 027 — Observe Authorization Acceptance Gate

- Handoff evidence: `handoff/failed/2026-09-07_027_waoengineer_observe-authorization-gate.md:31-38`, gate instrumentation at lines 83-173, and acceptance result requirements at lines 176-188.
- Executor task: `t_ccb91f17`, run 441.
- Kanban outcome: `blocked` (`block_kind=needs_input`). The sole command reached `gate=canonical-test-suite`, where the suite reported 494 total, 493 passed, and 1 failed. The failure was test 413, `rejects every missing and duplicate controlled asset type and id`, with `expected false, got true`.
- Category: **genuine regression-fixture failure**, not a production-validator failure.
- Cause: in `src/lib/rank-rent/authorization.test.ts:30-37`, both duplicate loops use element zero as donor. At index zero, replacing the type or ID with element zero’s own value is a no-op, so the fixture passes a valid grant to `reject`. Production uniqueness validation remains explicit at `src/lib/rank-rent/authorization.ts:100-102`.
- Additional evidence: task 027’s focused four-test gate passed before the canonical failure; diagnosis tasks `t_3407db9a` run 443 and `t_628b134a` run 442 independently reached the same fixture diagnosis.
- Confidence: **High**.

### 028 — Fix Authorization Duplicate-Asset Regression Test

- Handoff evidence: `handoff/pending/2026-09-07_028_waoengineer_fix-asset-duplicate-test.md:20-38`, exact edit boundary at lines 48-54, and command at lines 81-172.
- Authoring tasks: `t_628b134a`, run 442 created the spec; `t_3407db9a`, run 443 independently verified and adopted it rather than creating a duplicate.
- Executor task: none observed at audit time.
- Kanban/handoff outcome: pending and unexecuted.
- Category: **corrective response to a genuine regression-fixture failure**; no result category can be assigned yet.
- Reliability properties: one test block is allowlisted; production authorization source is pinned unchanged; the command is multiline, syntax-checked, and gate-labeled.
- Residual risk: the command still combines focused compile/test, lint, the complete 494-test canonical suite, and a production build under one exact-once allowance. Any unrelated baseline drift will force another successor instead of allowing evidence-preserving continuation.
- Confidence: **High** for scope/structure; **not applicable** for execution success.

## Earlier chain evidence needed to classify recurring causes

The last five specs inherited failures from earlier authorization tasks. These are necessary to distinguish an isolated fixture defect from a recurring process pattern:

| Handoff / board task | Observed outcome | Category | Confidence |
|---|---|---|---|
| `handoff/pending/2026-09-07_019_waoengineer_recover-authorization-acceptance.md`; `t_e2f42c73`, run 415 | Exact-once command ran and four authorization tests failed. | Genuine implementation failure subsequently isolated to `sortedUnique`. | High |
| `handoff/failed/2026-09-07_020_waoengineer_fix-authorization-scope-validation.md`; `t_e8f2d568`, run 417 | Source correction was applied, but the required command did not start because direct interpreter/shell execution flags required approval. | Protocol/transport failure. | High |
| `handoff/failed/2026-09-07_022_waoengineer_accept-authorization-scope-fix.md`; `t_ddb339de`, run 424 | Focused TypeScript compile could not resolve `node:test`, `node:assert/strict`, core modules, or `Buffer` from the temporary standalone project. | Environment/test-harness resolution failure. | High |
| `handoff/failed/2026-09-07_024_waoengineer_accept-authorization-compile-gate.md`; `t_5658eb6e`, run 432 | Canonical compiler worked; selected tests passed; stale count assertions failed. | Test-expectation failure. | High |

The production callback repair is visible at `src/lib/rank-rent/authorization.ts:76`: `values.every(item => text(item))`. The original implementation issue was real, but after that correction the chain incurred four additional return-to-strategy cycles before the separate canonical fixture defect was isolated.

## Recurring reliability patterns

### 1. Exact-once commands are being treated as disposable monoliths

Each nonzero result consumes the only execution allowance, even when the failure is a command-shape, output-shape, transport, or unrelated baseline issue. Because the executor is also forbidden to perform diagnostic commands, every brittle assertion creates a new strategist task and successor handoff. This correctly preserves evidence but turns minor harness defects into expensive lineage expansion.

Confidence: **High**. Tasks 024, 025, and 026 each required a new successor without a new production correction.

### 2. Acceptance assumptions were not preflighted against the exact executor/runtime surface

Three different assumptions failed in sequence: temporary TypeScript resolution in task 022, Node test-runner reporting in task 024, and maximum readable physical-line shape in task 025. Each assumption could have been validated before authoring the exact-once executor command without executing the historical task itself.

Confidence: **High**.

### 3. Failure observability arrived too late

Task 026 had no stable gate labels or failure trap, so its one allowed run produced no attributable result. Task 027’s labels immediately isolated the canonical suite. Observable gate IDs should have been a baseline requirement rather than a corrective feature.

Confidence: **High**.

### 4. Focused acceptance and repository-wide health are coupled

Task 027 proved the intended four authorization regressions, then failed on a different test in the same authorization file. That canonical failure was valid and should not be ignored, but coupling focused acceptance, full suite, lint, build, hashes, and workspace invariants into one exact-once command makes classification and recovery unnecessarily coarse.

Confidence: **High** for coupling; **Medium** for its aggregate cost because timing/token data were not audited.

### 5. Board status and handoff location are not sufficient outcome fields

`t_ddb339de` currently has task status `done`, but its first three runs were blocked and its final run only documented that the task-022 command had already failed. The corresponding handoff is in `/failed/`. Conversely, task 025 remains in `/pending/` while executor task `t_601cb113` is blocked. Audit and dependency logic must read run outcomes and immutable handoff evidence, not infer success from `tasks.status` or directory alone.

Confidence: **High**.

### 6. Over-pinning increases unrelated drift sensitivity

The acceptance specs pin multiple source, configuration, package, and historical-handoff hashes plus a whole-worktree status hash. This is strong tamper evidence, but in a deliberately dirty shared workspace it also allows unrelated changes to invalidate a narrow acceptance task. The audited runs did not conclusively fail on status drift, so this is a prospective reliability risk rather than an observed root cause in tasks 024-027.

Confidence: **Medium**.

## Category totals for the last five

- Protocol/transport failures: **2 executed specs** — 025 and 026.
- Test-expectation failures: **1 executed spec** — 024.
- Environment failures: **0 among 024-028**, but **1 directly inherited recent-chain failure** — 022.
- Genuine implementation or regression-fixture failures: **1 executed spec** — 027, specifically a regression-fixture defect; the earlier genuine production implementation defect was task 019/020.
- Pending without outcome: **1 spec** — 028.

Therefore, three of the four executed last-five specs returned to strategy for harness/protocol reasons, while one returned for a genuine fixture defect. No last-five execution demonstrated a new production authorization defect.

## Process recommendations for future specs

1. **Preflight the exact harness before freezing an exact-once command.** In the strategist task, validate shell syntax, maximum physical line length, terminal-policy compatibility, compiler module resolution, and actual Node test-report shape using a disposable probe or already-authorized read-only command. Record the runtime version and observed reporter contract in the spec.

2. **Use multiline fenced commands by default.** Keep every physical line below the executor’s reliable read limit. Never make successful execution depend on recovering a truncated line, dynamic extraction, or shell reconstruction.

3. **Make gate observability mandatory from the first successor.** Every exact-once command should print `gate=<stable-id> START`, preserve the original nonzero status in an EXIT trap, and use cleanup that does not trigger terminal approval noise. Task 027 is the minimum acceptable pattern.

4. **Separate focused acceptance from broad regression health in the result model.** One command may still execute both, but it should emit independently classifiable outcomes such as `focused_acceptance=PASS` and `canonical_regression=FAIL`. A focused implementation acceptance must not be described as unproven when it passed; a canonical regression must still block release and route to a distinct corrective task.

5. **Do not hard-code test counts unless count shape is the requirement.** Prefer assertions on selected test names, zero failures, and explicit pass markers. If totals are required, derive them from a preflighted runtime contract and pin the Node version that produced it.

6. **Avoid temporary standalone compiler projects when the repository compiler already includes the target.** Use the canonical `tsconfig.test.json` with only an output-directory override, as task 024 did, so installed declarations resolve relative to the project.

7. **Minimize immutable pins to the actual safety boundary.** Pin the allowlisted source/test files and critical lineage handoff. Replace whole-worktree status equality with an allowlist diff check that reports unrelated pre-existing dirt without failing unless a protected path changes.

8. **Permit evidence-preserving diagnosis after a failed gate.** The exact command remains single-run, but the spec should authorize read-only inspection of logs already created by that run. Do not require a new successor merely to read the failing clause’s captured output.

9. **Represent successor lineage explicitly on the board.** Record `handoff_id`, `supersedes`, and `accepted_by` in structured task metadata, and require dependency consumers to check the latest run outcome plus handoff disposition. Do not treat `tasks.status=done` as equivalent to acceptance.

10. **Dispatch only after executor-surface validation.** Before a pending spec is converted into a `waoengineer` card, verify: full file is readable, one command is present, the command is syntax-valid, no forbidden policy flags are used, every failure gate is named, and the spec’s expected counts match the active runtime.

## Recommended reliability gate for task 028 and later successors

Task 028 should remain the sole next authorization corrective spec. Before dispatch, validate only its transport and harness shape without altering it: confirm the current SHA-256 above, one complete fenced command, successful `bash -n`, readable physical lines, and availability of the pinned canonical compiler/declarations. After execution, classify focused duplicate-test outcome separately from canonical-suite/build outcome. If the focused fixture passes but an unrelated canonical test fails, preserve task 028’s focused evidence and create a separately scoped regression successor rather than rewriting authorization production logic.

## Conclusion

The authorization chain’s reliability problem is primarily specification-execution protocol design: unpreflighted runtime assumptions, overlong command transport, silent fail-fast gates, and exact-once monoliths repeatedly forced strategy recovery. The actual production scope-validation defect was narrow and corrected at task 020; the next real defect exposed by task 027 is a test fixture at `src/lib/rank-rent/authorization.test.ts:28-38`. Future specs should preserve exact-once safety while making commands readable, preflighted, gate-observable, and capable of distinguishing focused acceptance from broader repository regressions.