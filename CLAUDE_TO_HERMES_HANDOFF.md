# Claude to Hermes Handoff Protocol

## Purpose
This document defines how Claude Code (running Opus) structures its output
so that Hermes (running Qwen models) can pick up work seamlessly.

## The Golden Rule
Claude THINKS and PLANS. Hermes EXECUTES.
Claude never writes production code directly.
Claude writes SPECIFICATIONS. Hermes writes CODE.

---

## Directory Structure

All handoff files live in this structure:

    /handoff/
      /pending/          <- Claude writes here
      /in-progress/      <- Hermes moves files here when it starts
      /completed/        <- Hermes moves files here when done
      /failed/           <- Hermes moves files here if blocked
      /archive/          <- Old completed tasks (cleanup weekly)

---

## File Naming Convention

Every handoff file MUST follow this pattern:

    [YYYY-MM-DD]_[SEQUENCE]_[AGENT-TARGET]_[TASK-SLUG].md

Examples:

    2026-08-10_001_waoengineer_fix-bot-route-rtl.md
    2026-08-10_002_waocopy_rewrite-onboarding-hebrew.md
    2026-08-10_003_waostrategy_google-ads-campaign-spec.md

Rules:
- Date: today's date (YYYY-MM-DD)
- Sequence: 3-digit counter, reset daily (001, 002, 003...)
- Agent Target: one of waoengineer, waocopy, waoverifier-app, waoverifier-media
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
  `Target Agent` field (`waoengineer`, `waocopy`, `waoverifier-app`, `waoverifier-media`), per
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
`/completed/` or `/failed/`. In `hermes` mode, the orchestrating session still runs the `hermes -z`
dispatch itself via Bash (per `feedback_orchestrator_runs_hermes_directly` — Claude Code executes
Hermes dispatches directly, it is not handed off as a script for the user to run).

---

## Execution Order

Hermes processes /pending/ files in ascending filename order, ONE task at a time.
- Never start a task whose Dependencies (see template) are not already in /completed/.
- If a dependency sits in /failed/, move the dependent task to /failed/ too, with
  a note naming the blocking task — do not attempt it.
- Parallel execution is allowed ONLY for tasks with no dependency relationship
  and different Target Agents.

---

## File Structure Template

Every handoff file MUST contain ALL of these sections.
Missing sections = Hermes rejects the file.

    # [TASK TITLE]

    ⚠️ HEBREW-SAFETY: waoengineer types ZERO Hebrew bytes in this task. Any Hebrew in scope is
    either (a) pre-existing text left byte-identical, or (b) runtime data already sitting in a
    .json file, read and passed through — never typed, retyped, reformatted, or invented from
    memory. If the spec below doesn't hand you Hebrew text verbatim to copy, you don't write any.

    ⚠️ EXECUTION SCOPE: run the Test Command below VERBATIM, character for character, exactly
    once. Do not substitute it, extend it, drop its flags, or run any other command against
    data/clients/ "to double-check" or "to verify end-to-end" — every client under data/clients/
    is live production data (real client content, possibly already approved and published). If
    the Test Command as written isn't enough to prove the acceptance criteria, that's a bug in
    this spec — move the task to /failed/ and say so. Never improvise a broader verification run.

    ## Metadata
    - Task ID: [YYYY-MM-DD]_[SEQUENCE]
    - Target Agent: [waoengineer | waocopy | waoverifier-app | waoverifier-media]
    - Priority: [P0-Critical | P1-High | P2-Medium | P3-Low]
    - Estimated Complexity: [Simple | Moderate | Complex]
    - Created By: Claude Opus (Strategist)
    - Created At: [ISO 8601 timestamp]
    - Status: pending

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
    - Test Command: [exact command to run — must be copy-paste runnable with no placeholders,
      and scoped so it CANNOT write to any client's live data. Prefer node --check, unit
      functions, or a --client/--urls scope small and inert enough that even a full run is
      harmless. If proving the acceptance criteria genuinely requires exercising a pipeline
      that writes into data/clients/<id>/tasks/ or data/clients/<id>/client.json's existing
      fields, that client and exact flags are named explicitly here — never left to Hermes
      to pick.]

    ## Verification Checklist (waoengineer Final Gate)
    waoengineer assumes NOTHING works until all four are verified. Report status + evidence:

    - [ ] **npm run build** — Zero TypeScript / lint errors. Attach build log or excerpt proving success.
    - [ ] **npm run test** — All tests pass. Attach test output or failed test names if any fail.
    - [ ] **Dev server smoke test** — `npm run dev` → curl/visit changed routes, HTTP 200 + expected content. List routes tested + curl evidence.
    - [ ] **Evidence screenshots** — If UI changes, attach before/after or runtime screenshots proving the change rendered correctly.

    **Report Outcome:** Mark PASS only when ALL four checks complete successfully + evidence provided. If any fail, report FAIL with root cause.

    ### Escalation Routing (waoengineer decision)
    After self-verification, assess if deeper specialist verification is needed:

    - **waoverifier** (runtime smoke checks) — Route here if: HTTP status codes, redirects, API response structure need deeper validation
    - **waoverifier-app** (RTL/rendering via vision) — Route here if: Hebrew bidi, mixed-script rendering, mobile layout, visual regressions need verification
    - **waoverifier-media** (video/audio QA) — Route here if: TTS quality, video pipeline output (MP4 frames, embeds), audio transcoding needs validation

    **If escalation needed:** Create a new `/handoff/pending/` spec with:
    - Task name: `[YYYY-MM-DD]_[SEQ+1]_[waoverifier|waoverifier-app|waoverifier-media]_[task-slug]`
    - Reference: "Escalated from [original-task-id] — waoengineer self-verify passed, requesting specialist gate"
    - Scope: Name exact routes, files, or media assets to verify

    **If NO escalation needed:** Append to completion report: "**Escalation:** None — all checks self-sufficient."

    ## Handoff Instructions for Hermes
    1. Read this file completely before starting.
    2. Check that all files listed in Files to Read exist.
    3. If any dependency is missing, move this file to /failed/.
    4. Execute the specification EXACTLY as written — nothing added, nothing "helpfully"
       extended. If you see a way to improve something beyond this spec's named Requirements,
       do not do it; note it in your completion report instead so it can become its own spec.
    5. Before writing any file: re-check the HEBREW-SAFETY banner at the top of this file. If
       your planned edit would require typing a new Hebrew string that isn't already sitting
       verbatim in a Requirement or an existing file, stop and move this file to /failed/ with
       that named as the reason.
    6. Before running anything: re-check the EXECUTION SCOPE banner. Run ONLY the Test Command
       exactly as written. Do not run any other script, especially not a content-generation or
       regeneration script, against any client under data/clients/ — not even "just to confirm,"
       not even on a client the spec didn't mention. If the Test Command as given doesn't let
       you verify an acceptance criterion, that is a spec defect: move to /failed/ and report
       it, don't work around it by running something broader yourself.
    7. Run the test command and verify all acceptance criteria.
    8. **FULL SELF-VERIFICATION (waoengineer only):** Complete all four checks in the Verification Checklist above. Do NOT move to /completed/ without evidence for all four. Assume nothing works until proven.
    9. **ESCALATION ROUTING (waoengineer decision):** After self-verification passes, assess whether specialist verification is needed (see Escalation Routing section). If yes, create a new escalation spec and note it in completion report. If no, append "Escalation: None" to report.
    10. If all criteria + all verification checks pass + escalation routed (or noted as unnecessary), move this file to /completed/ with full checklist evidence + escalation status.
    11. If any criterion or verification check fails, move this file to /failed/ with a detailed failure report naming which check(s) failed.

---

## Hebrew-Safety Rule (non-negotiable, added 2026-08-13)

**`waoengineer` (Qwen3-Coder-Next) must NEVER type a single Hebrew byte into a file.** It is a code
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

## Execution-Scope Rule (non-negotiable, added 2026-08-17)

**waoengineer runs ONLY the literal Test Command given — never a broader one it invents to "be
thorough" or "verify end-to-end."** `data/clients/` is live production data.

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
| Create new task | /handoff/pending/ | Claude |
| Start working | /handoff/in-progress/ | Hermes |
| Task complete | /handoff/completed/ | Hermes |
| Task failed | /handoff/failed/ | Hermes |
| Clean up old tasks | /handoff/archive/ | Claude (weekly) |
