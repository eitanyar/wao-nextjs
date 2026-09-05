# Orchestrator Runbook — Autonomous Hybrid Demand Queue

Date: 2026-09-03
Board: `autonomous-hybrid-demand`
Workspace: `/home/eitanya/wao`
Specs: `/home/eitanya/wao/handoff/pending/2026-09-03_001_*.md` through `_015_*.md`

## Founder prerequisites

Do these without sharing secrets in chat:

1. In `https://app.fraudblocker.com/account/api`, create/copy the Fraud Blocker API key.
2. Add `FRAUD_BLOCKER_API_KEY` to `/home/eitanya/wao/.env.local` and the server's `.env.production`. Do not add it to git or paste it into a Kanban card.
3. In `https://app.fraudblocker.com/integrations/google-ads-setup`, complete the one-time MCC connection:
   - choose the Manager Accounts/MCC path;
   - enter WAO's MCC customer ID;
   - accept Fraud Blocker's MCC invitation in Google Ads;
   - return to Fraud Blocker and complete Sign in with Google;
   - select the sandbox child account first.
4. Ask Fraud Blocker support one exact question: “After my MCC is linked, can every newly created child Google Ads account be selected/activated automatically by API or account default, or must each child be selected manually? If automatic, provide the documented endpoint/setting.” The public API documents domain/report/IP operations but no Google Ads child-account linking endpoint.
5. Do not create GTM tags for WAO-controlled Site-Bot or Ads-LP pages. The queued implementation provisions the domain through `POST /domains`, receives `sid`, and injects the documented tracker directly after `<head>`. GTM remains only for external sites WAO cannot render.

## Start the orchestrator

From `/home/eitanya/wao`:

```text
hermes --profile orchestrator
```

Paste the dispatch brief below exactly.

## Dispatch brief for Adam/orchestrator

```text
You are dispatch-only. Do not plan, rewrite, merge, split, expand, or implement any task.

Read these files first:
- /home/eitanya/wao/AGENTS.md
- /home/eitanya/wao/CLAUDE.md
- /home/eitanya/wao/CLAUDE_TO_HERMES_HANDOFF.md
- /home/eitanya/wao/docs/missions/autonomous-hybrid-demand-engine-2026-09-03.md

Then create and start a new Hermes Kanban queue exactly as follows:

1. Create board `autonomous-hybrid-demand` with display name `Autonomous Hybrid Demand`, default workdir `/home/eitanya/wao`, and switch to it. If it already exists, switch to it; do not duplicate it.
2. Read every spec matching `/home/eitanya/wao/handoff/pending/2026-09-03_*.md`, sorted by filename ascending. There must be exactly 15 files, sequence 001 through 015. Stop and report BLOCKED if the count or sequence differs.
3. Create exactly one Kanban card per spec. Use:
   - title: the spec H1;
   - body: the complete spec verbatim, without rewriting;
   - assignee: the exact `Target Agent` metadata value;
   - workspace: `dir:/home/eitanya/wao`;
   - idempotency key: the spec filename without `.md`;
   - max runtime: `2h`;
   - max retries: `1`;
   - created by: `waostrategy`.
4. Prevent dispatch while constructing the graph: create task 001 initially blocked. Create each later task with the immediately preceding task as an additional serialization parent, while preserving every dependency already declared inside the spec. This intentionally forces one shared-working-tree task at a time.
5. After all 15 cards and edges exist, validate:
   - 15 cards total;
   - assignees match every spec;
   - one linear serialization path 001 -> 002 -> ... -> 015;
   - no card body differs from its source spec;
   - task 001 is the only card eligible to start after unblocking.
6. Show the board and run one dry dispatch pass with max 1. If validation is clean, unblock/promote task 001 and run one real dispatch pass with max 1.
7. Do not call deploy.sh, commit, push, edit specs, or choose another agent.
8. After each task completes, verify its declared dependencies and dispatch only the next ready card. Stop the queue on any failed or blocked task and relay the exact failure; do not improvise a fix or skip ahead.
```

## Expected first card

`2026-09-03_001_waoengineer_remove-review-content-steering.md`

This is intentionally first because it removes a Google Maps policy risk before autonomous reputation work expands.

## Monitoring commands

Run outside the orchestrator session if needed:

```text
hermes kanban --board autonomous-hybrid-demand list --sort created
hermes kanban --board autonomous-hybrid-demand stats
hermes kanban --board autonomous-hybrid-demand watch
```

Inspect a failed/running card with:

```text
hermes kanban --board autonomous-hybrid-demand show <task-id>
hermes kanban --board autonomous-hybrid-demand log <task-id>
hermes kanban --board autonomous-hybrid-demand runs <task-id>
```

## Dispatch behavior

The gateway dispatcher is already running in this environment. Creating task 001 as blocked prevents it from starting before all cards and dependency edges exist. After validation, unblocking task 001 starts the serialized queue. Do not launch parallel `waoengineer` cards against the shared directory.

## Post-build live gates

No implementation task may use the real Fraud Blocker key. After tasks 013-015 pass with mocks:

1. Verify `GET https://backend.fraudblocker.com/api/domains` using the local secret without printing the header/key.
2. Provision only the sandbox domain first.
3. Verify the rendered sandbox HTML contains one `fbt.js?sid=` tracker and one noscript `fbt.gif?sid=` fallback.
4. Verify `GET /ips?sid=...` returns matching domain/SID, `monitoring_only=false`, and non-null `synced_at`.
5. Keep live Ads autonomy in shadow mode until the one-time legal version and Fraud Blocker protection gates both pass.
6. Never run `deploy.sh`; Eitan deploys manually.
