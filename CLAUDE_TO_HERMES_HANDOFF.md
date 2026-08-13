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
    - Test Command: [exact command to run]

    ## Handoff Instructions for Hermes
    1. Read this file completely before starting.
    2. Check that all files listed in Files to Read exist.
    3. If any dependency is missing, move this file to /failed/.
    4. Execute the specification exactly as written.
    5. Run the test command and verify all acceptance criteria.
    6. If all criteria pass, move this file to /completed/.
    7. If any criterion fails, move this file to /failed/ with a failure report.

---

## Quick Reference

| Action | Directory | Who Does It |
|---|---|---|
| Create new task | /handoff/pending/ | Claude |
| Start working | /handoff/in-progress/ | Hermes |
| Task complete | /handoff/completed/ | Hermes |
| Task failed | /handoff/failed/ | Hermes |
| Clean up old tasks | /handoff/archive/ | Claude (weekly) |
