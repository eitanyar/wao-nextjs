# Development workflow denial audit

Date: 2026-10-30 (+07:00). Scope: recent inbox failure chain and installed worker/approval mechanisms, not a month-wide failure census.

## Decision

Preserve the product implementation. Correct workflow compatibility first; do not rebuild WAO, replace Hermes, disable security, or build a new sandbox platform based on these incidents alone. This audit changes shared instructions only. It does not resume the inbox, waive an acceptance criterion, or establish independent product acceptance.

## Evidence inspected

- Installed Hermes: v0.21.5+4532.g30a8b53, checkout /home/eitanya/.hermes/hermes-agent.
- `hermes --profile waoengineer config get approvals` and the same for waoverifier: mode smart; single_query_mode, unattended_mode and cron_mode deny. Strategist mode manual, same context defaults deny. No settings changed.
- `hermes_cli/kanban_db_dispatch.py:_worker_argv`, lines 2743-2777: worker command ends with `chat -q`; goal mode uses that same path.
- `tools/approval.py:_presence`, lines 934-948: single-query context clears interactive/gateway/ask presence. `_run_approval_gate`, lines 979-1002: unattended context policy is consulted and deny returns a blocked result. This is source inspection, not a fresh worker smoke test.
- `hermes kanban --board autonomous-hybrid-demand runs t_15c22a29` and `log t_15c22a29`; original profile session records below.
- Official security page downloaded to strategist scratch as hermes-security-audit.html. Matching installed documentation: website/docs/user-guide/security.md, especially single_query_mode and Tirith approval behavior. Online extraction tool was unavailable; curl retrieval succeeded. Runtime conclusions are grounded in installed source and actual denial payloads, not assumed docs-version parity.

## Failure chain

### October 27: required checks coupled to optional timing

Engineer session 20261027_232441_743f47, messages 52442-52445, run 2432. A terminal call combined required source checksums, a date and a printf elapsed calculation with nested shell substitution. Tirith reported HIGH unresolved nested executable body and incomplete nested-command analysis. The tool response also explicitly stated single-query mode had no user present to approve it. No command output was produced.

Earlier in that run, focused operator and intake suites passed according to the saved worker log (21 and 31 tests respectively), plus syntax/diff checks. These are historical engineer-run results, not freshly rerun tests or independent review. Contract006's whole-task-stop requirement prevented finishing preservation/status evidence.

This proves a scanner/approval incompatibility for that combined payload, NOT a general ban on hashing or a verified scanner false positive. Do not rerun, split or rephrase the denied payload under this audit.

### October 29: prohibited helper chosen before instructions were read

Engineer session 20261029_232154_8f3d9c, messages 53461-53468, run 2436. kanban_show produced a 137,455-character saved result. Its generic spillover advice suggested execute_code. The worker issued an execute_code JSON summarizer in the SAME batch as its first handoff read; that handoff explicitly prohibited execute_code. The tool returned a single-query approval denial, zero internal tool calls, zero execution duration.

The subsequent needs_input block returned formal status triage. This was a preventable instruction-order/tool-selection error amplified by a blanket stop rule, not a product defect. The spillover helper suggestion did not override the task restriction.

### Recovery obstruction

Installed `specify_triage_task` in hermes_cli/kanban_db.py, lines 3996-4050, transitions triage to todo and recomputes readiness. CLI specify invokes auxiliary specification generation. schedule_task excludes triage; block_task excludes triage. No live transition was attempted. A safe supported same-card recovery path with controlled dispatch remains unverified; no direct database edit or completion bypass is acceptable.

## Correction applied

Edited only shared project workflow prose in CLAUDE_TO_HERMES_HANDOFF.md:

1. Read the complete handoff and amendments before dependent commands/helpers.
2. Check actual worker launch mode and effective approval compatibility before dispatch.
3. Avoid routine execute_code history parsing in unattended deny-mode work; keep resume briefs concise.
4. For new authorized work, separate required checks from optional telemetry and avoid unnecessary nested shell calculations. This does not authorize rerouting denied operations.
5. Stop the denied operation; continue only unrelated already-permitted work when the task allows it. Block on unresolved required gates; do not claim partial PASS.
6. Make timing metrics optional rather than a completion gate, using existing run metadata when available.

Updated the strategist's handoff-authoring skill with these lessons and removed direct-database admin-close advice from its main guidance. No other profile's skill/config was modified. Historical handoffs and task status remain unchanged.

## Behavioral review of the revised instructions

- First contract read plus helper execution: forbidden ordering; instructions must be read first.
- Oversized task output suggesting a prohibited parser: generic suggestion cannot override contract or approval policy.
- Optional elapsed metrics unavailable: report unavailable; do not add a nested helper or block acceptance for timing alone.
- Required preservation check denied: remains unproved; blocked acceptance, no fabricated PASS or alternate-tool retry.
- Allowed local test fails normally: correct within the same engineer session, without a successor card.
- Previously stopped task: new shared guidance is not a retroactive resume authorization or scheduler transition.

This is a document-level review against observed cases, not a measured reduction in failure rate. No product tests, build, browser/server, installs, customer-data access, deployment or denied-command retries were performed.

## Remaining next step

Resolve the existing inbox's supported same-card recovery with dispatch controlled and reviewed resume instructions preserved. Finish its already-authorized local preservation/acceptance work, then one independent verifier. If a required operation genuinely needs permission, present that exact operation through a supported approval mechanism; do not globally turn deny into approve. Consider stronger development isolation only if the remaining required build/runtime work demonstrates an actual isolation gap.
