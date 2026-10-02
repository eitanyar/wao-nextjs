# WAO Pending Queue Triage — 2026-09-09

## Decision

Recommend exactly one first safe next handoff: `handoff/pending/2026-09-07_039_waoengineer_recover-openseo-command.md`.

It is the only currently pending executable spec that is both dependency-ready and transport-safe. Completed handoffs `2026-09-06_004` and `2026-09-06_051` satisfy its declared dependencies; the OpenSEO implementation paths and direct SDK dependency are still absent, so this is not duplicate acceptance work. Its fenced command passes `bash -n`, is gate-labelled, contains no direct interpreter-eval clause or repository-wide lint, and uses offline injected fixtures with zero live MCP/provider calls. Run it only after this audit task releases the shared `/home/eitanya/wao` workspace, with no concurrent writer.

No successor spec was authored because this valid runnable handoff already exists.

## Scope and evidence

- Queue: 92 pending files = 90 executable specs, one explicitly non-executable queue report, and `.gitkeep`; zero executable files in progress; 172 completed executable specs; 48 failed executable specs.
- Execution mode: `hermes`.
- Current default board contains only this audit task. The archived/project boards were reconciled against run outcomes, not task status alone.
- Accepted lineage used here: `2026-09-06_051` release tests; `2026-09-07_001` eligibility; `2026-09-07_003` domain status; `2026-09-07_023` Wayback; `2026-09-07_028` authorization; `2026-09-07_037` proof; `2026-09-08_003` Leads acceptance (board task `t_ae9f3bed`); and `2026-09-08_004` sandbox credential separation.
- Failed/consumed lineage used here: board task `t_4da55713` consumed task 038's one-shot command through a mistyped invocation; `t_f14a5ab3` consumed original Wayback task 032 and stopped at unrelated global lint.
- Both executor profiles involved in the live candidates have 1,000,000-token context windows; payload size is not the blocker.

## Classification of all 90 pending executable specs

### Runnable now (1)

- `2026-09-07_039_waoengineer_recover-openseo-command.md` — first safe next handoff for the reasons above.

### Requires a narrower successor before dispatch (8)

These have no remaining substantive upstream dependency, but their literal exact-once acceptance path is unsafe or already consumed.

- `2026-09-06_009_waoengineer_fix-business-audit-rules.md` — dependency is satisfied by accepted eligibility successor 001, but its monolithic command includes known-red repository-wide lint.
- `2026-09-06_048_waocopy_draft-persona-website-shell.md` — draft scope is ready, but the only exact-once gate is a long direct `python3 -c` command; use a short checked script/file-based JSON validator.
- `2026-09-06_058_waocopy_author-owner-operations-manual.md` — content inputs are ready, but the long direct `python3 -c` exact-once gate repeats the known executor-policy/transport hazard.
- `2026-09-07_005_waoengineer_correct-moz-test-gate.md` — correct current Moz scope, but its 1,340-character single-line `bash -lc` command contains `node -e`; replace it with a readable gate-labelled block before execution.
- `2026-09-07_011_waoengineer_correct-portfolio-research-gate.md` — current research-source successor, but its 2,785-character one-line `bash -lc`/`node -e` command is non-dispatchable on the proven executor surface.
- `2026-09-07_014_waoengineer_correct-static-template-gate.md` — current template successor, but its 2,114-character eval-bearing command also couples broad project lint into one exact-once gate.
- `2026-09-07_015_waoengineer_correct-repository-factory-gate.md` — current factory successor after authorization/template closure, but its 3,679-character one-line eval-bearing command exceeds the proven reliable read surface.
- `2026-09-07_038_waoengineer_recover-lead-ingestion-command.md` — implementation exists locally, but board task `t_4da55713` already consumed and mistyped its sole command; author an acceptance-only successor that pins the five-path output and stages focused acceptance before broader regression/build evidence.

### Superseded, stale, or non-dispatchable lineage (39)

Do not run these commands. Later accepted or explicit unique successors own their work.

- Expired-domain/release originals: `2026-09-05_020`, `_032`, `_034`, `_035`, `_036`, `_037`, `_038`, `_039`, `_040`; `2026-09-06_005`.
- Portfolio originals already replaced by accepted/current successors: `2026-09-06_007`, `_008`, `_010`, `_011`, `_012`, `_013`, `_014`, `_015`, `_016`.
- Candidate verifier predecessor: `2026-09-06_047`; research predecessor: `2026-09-06_054`.
- OpenSEO predecessor: `2026-09-07_004` (superseded through 030 by runnable 039).
- Accepted authorization/proof/lead/reporting lineage: `2026-09-07_012`, `_013`, `_016`, `_018`, `_019`, `_021`, `_025`, `_029`, `_030`, `_031`, `_032`, both `_033` files, `_034`, `_035`, and `_036`.
- `2026-09-08_003_waoengineer_accept-leads-error-contract.md` — board task `t_ae9f3bed` already passed 8/8 plus scoped lint/diff; the file remaining in pending is reconciliation drift, not executable work.

Exact filenames in the two duplicate-ID cases are:

- `2026-09-07_033_waoengineer_fix-proof-result-narrowing.md`
- `2026-09-07_033_waoengineer_release-lead-routing-successor.md`

### Blocked by a real unmet dependency or approval (42)

- Portfolio control-plane chain: `2026-09-06_017`, `_018`, `_019`, `_020`, `_021` — waits for accepted reporting, monitoring, API, workspace, and runtime predecessors in order.
- Fix My Business chain: `2026-09-06_022`, `_023`, `_024`, `_025`, `_026` — waits first for a corrected task 009 acceptance, then copy/QA/founder SEO and Hebrew gates.
- Hogegim chain: `2026-09-06_027`, `_028`, `_029`, `_030`, `_031`, `_032`, `_033` — waits for accepted research/routing plus named founder approvals before copy, repository, runtime, or visual work.
- Domain/candidate research: `2026-09-06_034`, `_035`, `_036`, `_037`, `_038`, `_039`, `_040`, `_041`, `_042` — source runner and signed per-niche inputs/dossiers are absent; gadgates also waits for the full expired-domain chain.
- Certified sales kit: `2026-09-06_043`, `_044` — `docs/research/rank-and-rent/proof/approved-public-cohort.json` and founder publication approval are absent.
- Persona QA: `2026-09-06_049` — waits for 048 output.
- Candidate gate successors: `2026-09-06_056`, `_057` — wait for all eight dossiers and a successful compiler successor.
- Owner manual continuation: `2026-09-06_059`, `_060`, `_061`, `_062` — waits for 058 output, Hebrew QA, Eitan approval hash, implementation, and runtime PASS in order.
- Expired-domain back half: `2026-09-07_006`, `_007`, `_008`, `_009`, `_010` — waits for accepted Moz and OpenSEO successors before orchestrator/API/workspace/runtime/visual progression.
- `2026-09-07_040_waoengineer_recover-routing-command.md` — waits for an accepted successor to consumed task 038.
- `2026-09-07_041_waoengineer_recover-reporting-command.md` — waits for accepted lead-ingestion 038 lineage and routing task 040.

## Why every earlier-numbered item is not runnable

Every pending filename sorting before `2026-09-07_039` appears in one of the three lists above: 39 are immutable stale/superseded lineage, 42 have a concrete missing predecessor or approval (40/41 are later, so 40 earlier blocked entries), and eight need a safer successor (task 038 included). In particular, apparently independent copy tasks 048 and 058 are not selected because their direct `python3 -c` exact-once gates repeat the same policy/transport fragility that created the authorization recovery chain. Task 005 (Moz), task 011 (research), and tasks 014-015 (template/factory) likewise require readable, gate-labelled successors rather than another fragile one-shot run.

## Staged acceptance rule for later successors

For task 038 and the seven other transport-fragile specs, each successor should preserve exact-once safety while separating observable stages: prerequisite/hash/allowlist preflight; focused contract test; scoped lint; canonical regression; build; final unchanged-protected-path check. Each stage must print its own result, and a later-stage failure must preserve an earlier focused PASS rather than forcing another implementation retry. Do not use whole-worktree equality as a substitute for a task allowlist in this intentionally dirty shared workspace.
