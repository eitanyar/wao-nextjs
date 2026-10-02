# Continuous waostrategy Planning Loop

Date: 2026-09-06
Status: strategy-only operating method; no executor dispatch, production change, external write, commit, push, or deployment is authorized.

## Decision

Run waostrategy as a bounded, evidence-driven planner over one active macro milestone, with a separate P0 closure lane for release and security gates. Each invocation reconciles actual state, selects one next outcome boundary, authors only the immediately useful missing spec when no valid spec already exists, and reports exactly one next eligible handoff to Adam/orchestrator. The loop continues across invocations until Eitan explicitly pauses or stops it; when no autonomous work is permitted, it reports `WAITING_HUMAN` rather than inventing work.

## Current state and immediate routing

- Vision priority remains a demonstrable agentic product and trustworthy commercial proof. The current macro milestone is the rank-and-rent portfolio foundation as a bounded proof path for Site Bot/Fix My Business, not a license to launch ten speculative sites.
- Queue snapshot: 57 Markdown files in `handoff/pending/`, of which 56 match executable handoff naming and one is the non-executable queue audit; 0 in progress; 160 completed; 36 failed.
- Current-board snapshot: 102 done, 24 blocked, 1 triage, and this planning task running. Most blocked/triage cards are stale predecessor evidence already classified by `handoff/pending/QUEUE_AUDIT_UNATTENDED_LOOP_CLOSURE_2026-09-06.md`; they must not be retried.
- `t_c3eba113` records PASS for handoff 045: 414/414 tests, scoped lint, build, diff check, and unchanged status. The file still sits in `handoff/pending/`, so this is a reconciliation exception. Never dispatch 045 again. Adam/orchestrator must record its existing PASS as satisfying failed task 006 before releasing rank-and-rent dependents.
- No `docs/research/rank-and-rent/approvals/` artifacts exist. Therefore approval-gated Fix My Business, Hogegim, gadgates, niche-research, copy, repository, publication, and launch tasks are not eligible.
- Freeze new handoff authoring now: the repository already has a finite implementation DAG through independent verification and founder gates. Additional specs would be premature.
- Next globally eligible dispatch: `handoff/pending/2026-09-05_042_waoengineer_verify-deployment-route-gates.md`. Continue the P0 closure lane serially with 002, 003, 004, then 005, as defined by the queue audit. Do not dispatch invalid predecessor 020.
- Next rank-and-rent macro spec after 045 reconciliation and the P0 closure lane: `handoff/pending/2026-09-06_007_waoengineer_certification-eligibility-engine.md`.

## The loop

### 1. Reconcile before planning

Read `AGENTS.md`, `CLAUDE.md`, `CLAUDE_TO_HERMES_HANDOFF.md`, `VISION.md`, the active milestone note, all four handoff queues, current Kanban state, and `git status --porcelain`. Build one ledger keyed by observable capability/outcome rather than task ID.

For each outcome, record: latest accepted evidence; current first failing boundary; pending successor; dependencies; human/external gates; changed-file ownership; and one state from `accepted`, `ready`, `running`, `failed_current`, `waiting_human`, or `superseded`. A later verified successor may satisfy a failed predecessor without rewriting history. A board/filesystem mismatch is a reconciliation exception, not permission to rerun work.

### 2. Protect the P0 closure lane

Before feature progression, close any bounded security, authorization, data-integrity, or canonical-release gate that protects the shared product. Run only one shared-workspace writer at a time. P0 work may interrupt the macro milestone only when it is dependency-ready and has stronger release/safety impact; stale evidence cards and external-only blockers do not qualify.

### 3. Select or retain one macro milestone

Retain the current macro while it has an eligible autonomous frontier. Select a new macro only when the current one reaches an accepted finish line or every remaining edge is human-gated. Rank candidates in this order:

1. Directly advances the current Vision product and a user-visible/revenue proof.
2. Unlocks multiple blocked downstream outcomes or closes a safety/release gate.
3. Has current evidence, named owners, and a deterministic acceptance boundary.
4. Fits existing architecture and current approvals without external mutation.
5. Can finish as a bounded milestone rather than generate an indefinite backlog.

Do not select work merely because a document, route, or idea exists. Retired products, trigger-gated roadmap items, unsupported niches, and speculative integrations remain out until their documented trigger occurs.

### 4. Define the finish line and frontier

For the selected macro, write one observable finish line and a dependency DAG. Partition every node into:

- autonomous: local ASCII-safe edits, synthetic fixtures, bounded tests/builds, deterministic runtime checks, and approved read-only research;
- approval-gated: SEO anchors, Hebrew founder copy, provider acceptance, pricing/contracts, publication, live account changes, remote repositories, Cloudflare/domain actions, or spending;
- external-blocked: credentials, legal/trademark decisions, billing, ownership, purchase, or provider access.

Only the first autonomous cut belongs in the dispatch window. Keep at most one eligible task per shared workspace/target and at most the next two already-specified dependent tasks visible as lookahead. Existing farther-future specs may remain parked, but they do not authorize work.

### 5. Author only missing immediate specs

If a valid pending spec already covers the next boundary, reuse it. Otherwise create one handoff in `handoff/pending/` using every required protocol section, exact paths/functions, an inert literal test command, changed-file allowlist, expected payload, real target-profile context length, dependencies, stop conditions, and successor relationship where applicable.

Preserve these gates:

- Hebrew draft: `waocopy` -> `waohebrewqa` -> Eitan spot-check -> engineer wiring -> runtime verification -> RTL/real-user verification.
- SEO title/H1/keyword anchors: explicit strategist/SEO/founder approval before copy or wiring.
- Code/runtime: `waoengineer` self-verification followed by independent `waoverifier` and `waouxtester` where applicable.
- Media: `waoverifier-media`.
- No `deploy.sh`, commit, push, purchase, publication, outreach, credential entry, payment, GBP/Ads mutation, or remote creation from this loop.

### 6. Hand exactly one task to Adam/orchestrator

waostrategy never dispatches. It returns a dispatch packet containing:

- `LOOP_STATUS`: `NEXT_READY`, `WAITING_HUMAN`, `MILESTONE_COMPLETE`, `RECOVERY_REQUIRED`, or `PAUSED`.
- `ACTIVE_MILESTONE` and one-sentence finish line.
- `ACCEPTED_BOUNDARY` and evidence handle.
- `FIRST_OPEN_BOUNDARY`.
- `NEXT_SPEC`: one exact pending path, or `none`.
- `DEPENDENCIES`: accepted successor aliases included.
- `HUMAN_GATES`: unresolved approvals that must not be inferred.
- `STOP_AFTER`: the exact acceptance or gate after which Adam returns control to waostrategy.

Adam checks eligibility and dispatches only the named target. It does not rewrite scope, choose a different task, or fan out writers against the shared dirty workspace.

Before creating a board card, Adam must verify that `NEXT_SPEC` names the newest executable successor,
that the filename sequence and in-file `Task ID` match, and that the ID is unique across pending
handoffs. The board title/body must quote that exact path and ID. Superseded, duplicate-ID, consumed
exact-once, and immutable-lineage files must never be dispatched or retried; a mismatch returns
`RECOVERY_REQUIRED` to waostrategy before any executor is started.

### 7. Reconcile every result

On PASS, verify the completion evidence, changed-file scope, test/build/runtime outputs, and `data/clients/` diff boundary before advancing the ledger. Release only direct children whose complete dependency set is accepted.

On FAIL, preserve every proven boundary and identify the latest first failure. Never rerun an exact-once spec. Author at most one narrow corrective successor after reading the actual artifact and failure evidence. Do not reopen earlier proven seams without contradictory evidence.

Failure escalation:

- First failure at a seam: one diagnosis and, if justified, one surgical successor.
- Second failure at the same seam: publish `RECOVERY_REQUIRED`, add a boundary ledger, and require explicit repair-versus-redesign review before another successor.
- Third failure at the same core seam: stop that branch and report `WAITING_HUMAN`; no fourth fix until Eitan approves repair, rebuild, defer, or cancel.
- Transient provider failures use only the bounded retries already authorized by the spec, then persist `unavailable`/`unknown` evidence or block according to the state machine.

## Stop behavior

Each invocation stops after producing one verified strategy artifact and one dispatch packet; continuity comes from the next invocation after Adam reports the result, not from recursive self-dispatch.

The mission-level loop continues until Eitan explicitly says pause or stop. It may temporarily return `WAITING_HUMAN` when every vision-supported frontier is blocked by a named human/external gate, when the same core seam fails three times, when current Vision and queued work conflict, or when queue/board state cannot be reconciled safely. It must not fill idle time with speculative tasks. When one macro is human-gated, it may select another already-supported macro only after emitting the milestone-selection signal below.

## New milestone status signal

Emit this once when a macro changes:

`MILESTONE_SELECTED | name=<macro> | vision_link=<section/outcome> | finish_line=<observable result> | accepted_baseline=<evidence> | first_frontier=<boundary> | next_spec=<exact path or none> | human_gates=<list> | stop_gate=<acceptance boundary>`

For the current state, no new macro is selected: retain rank-and-rent portfolio foundation, close the P0 safety lane first, reconcile handoff 045's existing PASS, then expose task 007 as the next macro task. No new executable handoff is warranted by this planning task.
