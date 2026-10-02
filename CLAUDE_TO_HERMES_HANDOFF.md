# Claude to Hermes Handoff Protocol

## Purpose
This document defines how the Strategist seat structures its output
so that the Hermes execution profiles can pick up work seamlessly.
The Strategist seat is the Hermes profile `waostrategy` (`gpt-5.6-sol` via OpenAI Codex).
The protocol below still applies —
"the Strategist" writes specs; the execution profiles write code and copy.

## The Golden Rule
The Strategist THINKS and PLANS. The execution profiles EXECUTE.
The Strategist never writes production code directly.
The Strategist writes SPECIFICATIONS. `waoengineer` writes CODE, `waocopy` writes Hebrew copy.

---

## Directory Structure

All handoff files live in this structure:

    /handoff/
      /pending/          <- The Strategist (waostrategy) writes here
      /in-progress/      <- Execution profiles move files here when they start
      /completed/        <- Execution profiles move files here when done
      /failed/           <- Execution profiles move files here if blocked
      /archive/          <- Old completed tasks (cleanup weekly)

---

## File Naming Convention

Every handoff file MUST follow this pattern:

    [YYYY-MM-DD]_[SEQUENCE]_[AGENT-TARGET]_[TASK-SLUG].md

Examples:

    2026-08-10_001_waoengineer_fix-bot-route-rtl.md
    2026-08-10_002_waocopy_rewrite-onboarding-hebrew.md
    2026-08-10_003_waohebrewqa_review-onboarding-copy.md

Rules:
- Date: today's date (YYYY-MM-DD)
- Sequence: 3-digit counter, reset daily (001, 002, 003...)
- Agent Target: one of waoengineer, waocopy, waohebrewqa, waoverifier, waoverifier-media, waouxtester
- Task Slug: kebab-case, max 5 words

---

## Execution Mode Switch

`/handoff/EXECUTION_MODE` is a one-line file: either `hermes` or `claude-subagents`. It is the
on/off switch for which engine actually runs pending tasks, and it is binding — check it before
dispatching, don't guess or default from memory.

Before dispatching any pending file that does NOT already declare its own execution mode in an
explicit banner at the top (see next paragraph), read `/handoff/EXECUTION_MODE` and dispatch
accordingly:
- **`hermes`** → Bash-dispatch `hermes -z ...` against the Hermes profile named in the file's
  `Target Agent` field (`waoengineer`, `waocopy`, `waohebrewqa`, `waoverifier`, `waoverifier-media`,
  `waouxtester`), per
  AGENTS.md's model configs.
- **`claude-subagents`** → call the matching Claude subagent via the Agent tool (`nextjs-engineer`,
  `copywriter`, `language-qa`, `seo-strategist`, `ppc-strategist`, `ux`, `verifier`,
  `instructional-designer`, etc.), using any model override the task file specifies, else the
  subagent's own charter default.

A task file may override the global switch for itself with an explicit `⚠️ EXECUTION MODE:` banner
at the top (see `2026-08-20_001_copywriter_blue-ocean-sabra-pass.md` for the pattern) — an explicit
per-task banner always wins over the global file. Use this when a task must run a specific way
regardless of whatever the switch is set to when it's eventually picked up.

In `claude-subagents` mode, there is no autonomous watcher process — the picking-up session itself
must read the pending file, invoke the subagent, append the completion report, and move the file to
`/completed/` or `/failed/`. In `hermes` mode, the orchestrating session performs the dispatch
itself: either `hermes kanban create` against the named profile's board (current pattern,
2026-08-24 onward) or a direct one-shot `hermes -z` Bash dispatch — the orchestrator executes the
dispatch directly, it is never handed off as a script for the user to run.

---

## Execution Order

Choose only dispatch-approved tasks; filename order applies within that eligible set.
Use one writer at a time in the shared repository. Different profiles do not make shared
files, compiler output, browser ports, or framework build directories independent.
- `waostrategy` may create, link, assign, and dispatch dependency-ready implementation, content,
  QA, and verification cards directly. Adam/orchestrator is optional for durable relay and does
  not own strategy. Eitan is not a manual prompt courier for reversible work.
- Before dispatch, `waostrategy` inspects the dirty worktree, relevant task history, existing tests,
  and current runtime evidence. Preserve solid unfinished work and continue from the first current
  failing boundary instead of rebuilding or restating completed seams.
- Resolve dependencies to accepted evidence and explicit same-board parent task IDs before
  creating a runnable card. A planning card marked done is not implementation acceptance.
- Missing dependencies leave work on hold, not failed. Never dispatch merely to discover
  a prerequisite already known to be absent.
- Use `kanban_block(kind="dependency")` only when an actual unfinished parent edge exists.
  Otherwise use a sticky `needs_input` block and report the missing edge or acceptance evidence.
  An empty parent list can cause dependency-wait tasks to promote immediately.
- Do not unblock deterministic failures automatically. A changed prerequisite, corrected
  contract, or explicit retry authorization must be recorded first.

## Outcome-Owned Delivery Contract — v3 (2026-09-09)

This section governs new specs and supersedes v2 for new work. Historical tasks and their evidence
remain unchanged. Existing pending specs are `REVIEW_REQUIRED`, not an executable FIFO backlog.

The single operating change is outcome ownership: strategist and engineer identities remain
separate, while implementation planning, coding, debugging, and safe local acceptance are merged
into one engineer run. Kanban records the run; it must not manufacture a new card per red check.

Before approval, the strategist verifies only what the engineer cannot decide locally:
1. One observable outcome, exact existing seam, product decision rules, safety boundaries, and
   non-goals. Include necessary source/test/fixture/config paths without dictating incidental code.
2. Accepted dependencies and parent IDs. Recheck these and sole-writer ownership at dispatch.
3. A short executable acceptance ladder: focused check, scoped lint/type check, canonical tests,
   build, and runtime/visual evidence only when applicable.
4. Live/client/provider/deploy side effects are separately explicit and fail closed.

Default execution:
- `waoengineer`, `--goal`, one shared-directory writer, 45-minute runtime, 12 goal turns.
- Safe local commands are rerunnable. Red compiler/test/harness output remains `running` feedback.
- The engineer may repair task-owned tests, fixtures, configuration, and harnesses needed for the
  stated outcome. It may not weaken acceptance or repair unrelated baseline debt.
- `blocked` is reserved for an external dependency, missing approval/capability, unsafe side
  effect, or a genuine product/architecture decision. Ordinary implementation defects do not
  return to strategy.
- Do not require test-first red evidence, exact-once local checks, custom evidence ledgers,
  immutable dirty-worktree snapshots, or bespoke meta-harnesses by default.
- After local PASS, one independent verifier checks the changed diff and acceptance. The verifier
  contract is named in the implementation handoff, so no strategist restatement card is needed.

### Immediate execution and owner-validation window

New outcome-owned work starts as soon as it is dependency-ready and owner-approved; there is no
multi-day trial, observation, or pilot gate before local execution. The engineer must use the
same goal-mode session to inspect, implement, run focused checks, correct task-owned failures,
and rerun safe checks through local PASS. A compile, test, lint, or build failure is immediate
feedback, not a reason to wait for a later planning cycle.

The owner's seven-day validation period begins only after independently verified local acceptance.
It is reserved for real use of the best delivered result. It neither delays the first execution
nor pauses the next safe dependency-ready outcome. Stop only for an external dependency, missing
owner approval, unsafe side effect, required human language approval, or unresolved product or
architecture decision. Do not impose calendar delays, scorecard sample sizes, or weekly review
milestones on ordinary local engineering.

Retrospective measurement only: after five completed outcomes, review first-card acceptance,
return-to-strategy rate, elapsed time, and independent-verifier PASS. These metrics never delay
or authorize an otherwise dependency-ready outcome.

---

## File Structure Template

Every handoff file MUST contain ALL of these sections.
Missing sections = Hermes rejects the file.

    # [TASK TITLE]

    ⚠️ HEBREW-SAFETY: waoengineer types ZERO Hebrew bytes in this task. Any Hebrew in scope is
    either (a) pre-existing text left byte-identical, or (b) runtime data already sitting in a
    .json file, read and passed through — never typed, retyped, reformatted, or invented from
    memory. If the spec below doesn't hand you Hebrew text verbatim to copy, you don't write any.

    ⚠️ EXECUTION SCOPE: run only the named checks within their declared side-effect boundaries.
    Read-only source/log inspection is permitted. Safe local checks may be repeated within the
    explicit local correction budget; do not weaken assertions to obtain PASS. No unspecified
    access to live client data, credentials, providers, publication, or deployment is authorized.
    A production-sensitive stage needs separate exact authorization and retry/idempotency rules.

    ## Metadata
    - Task ID: [YYYY-MM-DD]_[SEQUENCE]
    - Target Agent: [waoengineer | waocopy | waohebrewqa | waoverifier | waoverifier-media | waouxtester]
    - Priority: [P0-Critical | P1-High | P2-Medium | P3-Low]
    - Estimated Complexity: [Simple | Moderate | Complex]
    - Created By: waostrategy (Strategist, GPT-5.6 Sol)
    - Created At: [ISO 8601 timestamp]
    - Status: pending
    - Contract Version: 3
    - Dispatch Approved: [no until preflight is evidenced]
    - Observable Outcome: [one sentence]
    - Required Capabilities / Preflight Evidence: [only capabilities not already normal for the target]
    - Accepted Dependencies / Board Parent IDs: [explicit IDs and evidence; none if independent]
    - Supersedes: [exact handoff/card IDs or none]
    - Execution Class: [read-only-repeatable | outcome-owned-local | one-shot-side-effecting]
    - Local Correction Budget: [safe local checks repeat inside one goal-mode run; state time/turn bound]
    - Automatic Redispatch: none for deterministic, dependency, capability, or protocol blocks

    ## Context
    2-3 sentences explaining WHY this task exists.

    ## Specification
    Detailed requirements. Be extremely specific.

    ### Requirements:
    1. Requirement 1 - specific, measurable
    2. Requirement 2 - specific, measurable

    ### Constraints:
    - Constraint 1
    - Constraint 2

    ### Technical Details:
    - Files to Modify: [exact file paths]
    - Files to Create: [exact file paths]
    - Files to Read: [exact file paths]
    - Dependencies: [what must be in place first]

    ## Acceptance Criteria
    - [ ] Criterion 1
    - [ ] Criterion 2

    ## Implementation Notes
    ### Do:
    - Pattern to follow
    ### Don't:
    - Anti-pattern to avoid

    ## Testing Requirements
    - Test Command: [readable exact commands or an allowlisted harness, in ordered stages:
      focused acceptance, scoped lint/type checks, applicable canonical/integration checks.
      For each: expected behavior and whether it is safe to repeat.
      No live client writes or ambient credentials. Explicitly authorize each exceptional
      side-effecting stage separately. Do not assert a stale total test count; prove the named
      tests actually ran and failed tests are zero. List test-discovery registration.]

    ## Verification Checklist (waoengineer Final Gate)
    Report each applicable check separately; N/A requires a task-specific reason:

    - [ ] **npm run build** — Build succeeds when required; lint is a separate named check, not assumed to run during the build. Attach output.
    - [ ] **npm run test** — All tests pass. Attach test output or failed test names if any fail.
    - [ ] **Dev server smoke test** — `npm run dev` → curl/visit changed routes, HTTP 200 + expected content. List routes tested + curl evidence.
    - [ ] **Evidence screenshots** — If UI changes, attach before/after or runtime screenshots proving the change rendered correctly.

    **Report Outcome:** Record focused_acceptance and release_health separately. Task PASS needs
    every task-required criterion and evidence. Release needs all required integration and
    independent verification gates. Preserve focused PASS if an unrelated release gate fails;
    report its owner/boundary without changing unrelated code or claiming the product shipped.

    ### Escalation Routing (waoengineer decision)
    Report any missing specialist gate to waostrategy; do not select/dispatch a new owner or
    author a successor. Planned independent verification belongs in the strategist's task graph:

    - **waoverifier** (runtime smoke checks) — Route here if: HTTP status codes, redirects, API response structure need deeper validation
    - **waouxtester** (Hermes-native screenshot inspection) — Route here if: Hebrew bidi, mixed-script rendering, mobile layout, visual regressions need verification
    - **waoverifier-media** (video/audio QA) — Route here if: TTS quality, video pipeline output (MP4 frames, embeds), audio transcoding needs validation

    **If escalation needed:** Report the failing or unverified criterion, exact evidence path,
    preserved working boundaries, and required capability. waostrategy scopes any follow-up.

    **If NO escalation needed:** Append to completion report: "**Escalation:** None — all checks self-sufficient."

    ## Handoff Instructions for Hermes
    1. Read this file completely before starting.
    2. Check that all files listed in Files to Read exist.
    3. If a dependency is missing, stop before edits and record a dependency hold. Use a
       dependency block only with an unfinished parent edge; otherwise use needs_input.
    4. Execute the specification EXACTLY as written — nothing added, nothing "helpfully"
       extended. If you see a way to improve something beyond this spec's named Requirements,
       do not do it; note it in your completion report instead so it can become its own spec.
    5. Before writing any file: re-check the HEBREW-SAFETY banner at the top of this file. If
       your planned edit would require typing a new Hebrew string that isn't already sitting
       verbatim in a Requirement or an existing file, stop before that edit and record the
       language-ownership boundary. Do not corrupt or regenerate the text.
    6. Re-check the execution class and check boundaries. Run the named checks; inspect source
       and resulting logs as needed. Keep correcting in-scope implementation, test, fixture,
       config, or harness defects inside this same goal-mode run without weakening acceptance.
    7. Run the test command and verify all acceptance criteria.
    8. Complete every task-applicable check and preserve stage-level evidence. No inferred PASS.
    9. Report independent verification or escalation status; never dispatch or create a spec.
    10. On a Kanban run, record kanban_complete only when the task contract passes. Use
        kanban_block only for an external/safety/approval/capability/architecture boundary, not
        because a safe local check is red and needs another edit. Record the outcome before prose.
        Read back the outcome; a zero process exit or final message is not board completion.
    11. Only the executor reconciles this handoff's disposition to its evidenced outcome.
        Dependency waits are not implementation failures. Historical files remain immutable.

---

## Hebrew-Safety Rule (non-negotiable, added 2026-08-13)

**`waoengineer` (GPT-5.6 Terra) must NEVER type a single Hebrew byte into a file.** It is a code
model, not a language model, and reliably corrupts Hebrew/mixed-script text — including short
single-word labels — when asked to type it from memory. Caught in production on task 011: only 2 of
9 Hebrew strings were tokenized, and the coder corrupted all 7 of the untokenized ones (injected
Chinese/Portuguese fragments, garbled words) while the file still passed `tsc` cleanly.

**Rule for any spec touching a file with Hebrew text:**
1. Tokenize **every** Hebrew string in the file with an ASCII placeholder (`"__FOO__"`), not just
   the "important" ones.
2. Author the real Hebrew separately — default to `waocopy` (Qwen 3.8 Max), falling back to Claude's
   `copywriter` subagent when DashScope is rate-limited or the string count is trivial.
3. Substitute via a small Python `str.replace` patch script, asserting each token's count before
   writing. The coder runs this script as its final build step; it never edits the Hebrew directly.
4. Verification must scan the served HTML for non-Hebrew/non-Latin scripts (CJK/Arabic/Cyrillic
   Unicode ranges) and known garbage tokens as a standard check, not a spot-check of a few strings.

---

## Spec Discipline for waocopy Tasks (added 2026-08-31)

**When waostrategy writes specs for `waocopy` (Qwen 3.8 Max):**
1. **Be concise and to the point** — do not explain the background rationale or meta-logic in the spec. Save tokens.
2. **Provide the core inputs:** target persona, the specific offer/angle to weave into the copy, core entity anchors, and keyword research targets.
3. **Trust waocopy's execution:** `waocopy` knows how to reach the exact persona and seamlessly weave the offer for maximum engagement.
4. **Content length is waocopy's decision:** based on proven entities and keyword research needed to make pages shine and rank in Google SERPs and AI Overviews (AIO).

---

## Execution-Scope Rule (non-negotiable, added 2026-08-17)

**waoengineer stays inside the named verification and side-effect scope.** `data/clients/`
is live production data. Contract v3 permits outcome-owned iteration on safe local checks, not
broader access or execution against customers. Legacy commands remain governed by their
original authorization until explicitly amended; a consumed run is never silently reset.

Rule for every spec:
1. Test Command must be provably inert on live client data, or must name the exact client +
   flags if it can't be. Never leave scope to Hermes's judgment.
2. "Verify end-to-end" is not authorization to run a generator/regeneration script. If real
   end-to-end proof is needed, the strategist runs it personally, not Hermes as part of the task.
3. After every `/completed/` move, the strategist runs `git diff` across `data/clients/` before
   trusting the result — a clean acceptance-criteria checklist is not sufficient evidence alone.

---

## Quick Reference

| Action | Directory | Who Does It |
|---|---|---|
| Create new task | /handoff/pending/ | Strategist (waostrategy) |
| Start working | /handoff/in-progress/ | Hermes |
| Task complete | /handoff/completed/ | Hermes |
| Task failed | /handoff/failed/ | Hermes |
| Clean up old tasks | /handoff/archive/ | Strategist (weekly) |
