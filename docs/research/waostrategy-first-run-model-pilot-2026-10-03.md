# WAOStrategy First-Run Model Pilot

Started: 2026-10-03 (+07)
Owner authorization: Eitan — “GO for both.”

## Question and primary measure

Compare WAOStrategy on `qwen3.8-max` (`alibaba`) versus `gpt-6-sol` (`openai-codex`) for carrying eligible real WAO strategy tasks through an accepted deliverable and correct downstream spec/dispatch decisions.

Primary metric: **first-run completion success rate** = eligible strategy tasks that reach formal `done` on their first worker run and satisfy their task acceptance criteria, divided by all eligible tasks started in that model arm. A later retry does not convert a first-run failure into success. Report blocked/review/failed outcomes separately. Exclude only tasks declared ineligible *before dispatch* because required owner input or an external prerequisite is absent; retain the exclusion reason.

## Trial method

- Prospective real-work pilot; do not replay closed tasks or create duplicate production work.
- Target 10 eligible tasks per model, with a 14-day collection window. If either arm has fewer than 10 eligible runs at the end, label the result directional, not conclusive.
- Match/stratify by task type and complexity (e.g. design/specification, recovery/triage, dependency/dispatch). Assign each newly created eligible task to the less-represented arm within its stratum; use task-level model/provider overrides. Do not change the WAOStrategy profile default or other profiles during the test.
- Keep the same WAOStrategy role instructions, tools, task acceptance gates, and normal independent QA. Continue all existing product safety and human approval boundaries. The model may produce and dispatch normal real work only within the task's existing authorization.
- Capture the actual model/provider from the worker session log, Kanban first-run status/outcome, accepted artifact paths, downstream task/dependency/dispatch evidence, retry count, elapsed time, and any blocker. Do not rely on a task's configured model alone as proof of the model used.
- Independent acceptance is judged from task criteria and evidence, not by either model grading its own output.

## Initial Qwen arm observations (verified, preliminary)

1. `t_30bcdc81` — first run `1141`, formal `done/completed`. Its session log explicitly records `qwen3.8-max/alibaba`. The accepted deliverable was the exit-prompt decision memo and dependency-ordered copy/QA cards `t_e854e3a7` → `t_f6d685a4`. **First-run success: yes.**
2. `t_3a2ac2fb` — first run `1143`, formal `done/completed`. Its session log explicitly records `qwen3.8-max/alibaba`. It independently reconciled the checkout QA failure, authored the fix/re-QA/commit handoffs, and created the linked follow-up cards. **First-run success: yes.**

Preliminary Qwen observations: **2/2 first-run successes**. This is a tiny, non-randomized starting cohort, not a comparative result.

## Sol arm / next action

No duplicate is being made of the active exit-prompt copy/QA work or completed checkout diagnosis. No eligible new WAOStrategy card was ready at registration time. Pin the **next eligible, genuinely new** WAOStrategy task to `gpt-6-sol/openai-codex` at task creation/dispatch; then balance subsequent eligible tasks by stratum until the target/window is reached. Keep a Qwen first-run comparison cohort using the same criteria. Record all model assignments and exclusions here as the Kanban outcomes arrive.

## Decision rule

Compare exact first-run rates with denominators and task mix shown. Do not switch the default on a 1–2 task difference or a tiny sample. Recommend a default change only if Sol's accepted first-run completion is at least as good as Qwen's, it does not increase harmful/incorrect dispatches or downstream first-dispatch failures, and any gains in elapsed time/stalls justify the tradeoff. A failed hard safety or acceptance gate cannot be offset by speed or a weighted score.
