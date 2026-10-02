# WAO Agent Workflow Stabilization & Qwen Live-Chat Rollout — Mission Report

Date: 2026-09-29 | Author: waostrategy (mission card t_45f76370, runs 974+979) | Status: local mission COMPLETE, owner gates listed below.

## 1. Mission outcome (one line)

The live-chat path (POST /api/bot) now has a fully implemented, tested, and independently verified local candidate that serves live turns via DashScope Qwen 3.8 Flash with Gemini secondary and simulation fallback (commit fe8739c on branch wao/qwen-chat-candidate, NOT pushed); the production-rollback systemic cause was confirmed fixed on origin/hermes-migration (deploy.sh singular PM2 replacement + verified restore, commits ec56bfc→9bebcfe); and the full agent roster/model matrix was audited against live profile configs.

## 2. Model verification (authoritative provider evidence)

- Exact model: `qwen3.8-flash` — confirmed as the LATEST Qwen-family Flash model from:
  - Alibaba Cloud Model Studio model page "qwen3.8-flash" (updated 2026-08-28), Singapore scope.
  - QwenCloud "Latest model: Qwen3.8-Flash" (released 2026-08-26; 1M ctx; multimodal in / text out).
  - DashScope OpenAI-compatible Responses/Chat API supported-model lists include `qwen3.8-flash` on the Singapore endpoint (`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`) — the same base URL shape the repo uses.
- API compatibility: OpenAI-compatible chat completions, structured outputs (JSON mode) supported, `enable_thinking` control supported — exactly what the implementation uses (`response_format: {type:'json_object'}`, `enable_thinking:false`, env override `QWEN_CHAT_MODEL`).
- The task's warning was honored: the name was treated as a lead and verified, not guessed. Earlier in this mission (run 974) a live DashScope probe answered in ~0.8s with this model; today's re-probe with the STORED keys failed 401 (see §6 credential gate) — model-name evidence above is docs-based and independent of key state.

## 3. Implementation (waoengineer-owned; exact files)

Card chain: t_d5738a1a (needs_input loop → triaged) → t_be5d4ec1 (resume, amended contract) = DONE.
Spec: /home/eitanya/wao/handoff/pending/2026-09-29_001_waoengineer_qwen-flash-live-chat.md (incl. AMENDMENT authorizing exactly two stale-assertion repairs).
Workspace: /home/eitanya/.hermes/profiles/waoengineer/cache/scratch/wao-qwen-chat-candidate (disposable worktree, branch wao/qwen-chat-candidate at origin/hermes-migration@9bebcfe).
Commit: fe8739c246682541ddb33ce0d4a5ac3275b60405 — 4 files, 191(+)/23(-), worktree clean, not pushed:

- src/lib/ai/qwen-fast.ts — new multi-turn `callQwenChatJSON` (default model qwen3.8-flash, `QWEN_CHAT_MODEL` override, JSON mode, enable_thinking:false, shared timeout/retry machinery).
- src/lib/ai/qwen-fast.test.ts — 9 focused mock-fetch tests.
- src/app/api/bot/route.ts — `handleQwen` + provider precedence: Qwen primary (QWEN_API_KEY+QWEN_BASE_URL), Gemini secondary, simulation final; geo-bot untouched; prompts.ts untouched.
- src/app/api/bot/route.test.mjs — provider-precedence tests + the two authorized stale-assertion repairs (ASCII-only; Hebrew expected value extracted from prompts.ts at runtime; zero Hebrew bytes typed).

Acceptance evidence (three independent sources agree):
1. Engineer self-report (t_be5d4ec1 metadata): focused 9/9 + 12/12; `npm run test` 483+30 pass 0 fail; default Turbopack `npm run build` success.
2. Independent verifier cards: t_94ee7cec PASS and t_c8ddd58b PASS (waoverifier, GPT-6 Luna — model-family independent from both the engineer and the Qwen implementation). t_c8ddd58b additionally verified: diff scope = exactly the 4 files; zero non-ASCII additions; Qwen branch has no reachable generativelanguage.googleapis.com fetch (route.ts:1143-1158 precedence, qwen-fast.ts:26,41-46,60-66).
3. Strategist re-runs (this run): `node --test` on both focused files green; `npm run test` green (30/30 tail verified, exit 0); `git log`/`git status --porcelain` clean.

## 4. Production rollback systemic cause — reviewed, fixed in scope

Parent scan (t_7f23eee3) found the defective rollback in the shared worktree's deploy.sh caused the production revert. Verified myself at origin/hermes-migration@9bebcfe: `replace_wao_process` does singular `pm2 delete` + start (no duplicate processes), and `restore_previous_release` gates on server.js presence, symlink swap, process replace, active-release verify, /client/login curl, and homepage-asset verification before declaring success. The fix chain ec56bfc (candidate runtime boundary) → f8e38f9 (internal review hook) → c2a2494 (bounded build memory) → 9bebcfe (singular activation rollback) is on origin. The shared worktree at c78c9ce is 5 commits behind + 148 dirty paths — syncing it is an owner decision (see §6), and deployment itself remains manual/owner-only per WAO rule. The Qwen candidate is based on 9bebcfe, so it inherits all rollback fixes.

## 5. Agent roster / model matrix audit (live configs, 2026-09-29)

Audited from each profile's config.yaml + `hermes profile list` + .env key-name presence (no secret values read or printed):

| Profile | Actual model | Provider | Notes |
|---|---|---|---|
| waostrategy | qwen3.8-max | alibaba (token-plan base) | Owner hard constraint satisfied: strategist on Qwen cloud model |
| waoengineer | gpt-6-sol | openai-codex | GPT-6 family per owner directive — already migrated |
| waocopy | gpt-6-sol | openai-codex | DRIFT: AGENTS.md §3 still says Qwen 3.8 Max |
| waohebrewqa | qwen3.8-max | alibaba (token-plan base) | DRIFT: AGENTS.md §3b still says GPT-5.6 Sol |
| waouxtester | gpt-6-sol | openai-codex | GPT-6 family — already migrated |
| waoverifier | gpt-6-luna | openai-codex | Independent from engineer (Luna vs Sol) — verified working (t_c8ddd58b) |
| waoverifier-media | gpt-6-luna | openai-codex | GPT-6 family — already migrated |
| orchestrator | gpt-6-luna | openai-codex | GPT-6 family — already migrated |
| default (gateway) | gpt-5.6-luna | — | Gateway profile; not a WAO worker |

Consolidation decision (near-term, recorded per owner comment): KEEP the current roster — no consolidation. Rationale: the GPT-6 migration owner asked for is already in place on every GPT profile; role separation (Sol workers vs Luna verifiers vs Qwen strategist/Hebrew-QA) preserved model-family independence at every gate this mission exercised; the needs_input loop that motivated consolidation talk was a contract-boundary defect (stale tests + Turbopack/symlink workspace), resolved by the amendment + real-node_modules workspace fix, not by role count. The remaining action is DOCUMENTATION reconciliation only.

AGENTS.md reconciliation BLOCKED: my direct edit attempt was refused by Hermes' protected-agent-instruction-file gate (headless run, approval prompt timed out; silence ≠ consent; retry forbidden). The table above is the authoritative audited state until AGENTS.md is updated in a user-present session. Known stale AGENTS.md lines: §1 (says gpt-5.6-sol; actual qwen3.8-max/alibaba), §2 (says gpt-5.6-terra; actual gpt-6-sol), §3 waocopy (says qwen3.8-max; actual gpt-6-sol), §3b waohebrewqa (says gpt-5.6-sol; actual qwen3.8-max/alibaba), §4a/§4b/§4c (say gpt-5.6-*; actual gpt-6-*).

## 6. Unresolved gates (all owner-only boundaries)

1. CREDENTIAL: The stored QWEN_API_KEY in /home/eitanya/wao/.env.local (and the waostrategy profile .env pair) returns 401 "Incorrect API key" on BOTH the intl dashscope and token-plan endpoints (probed safely; values never printed). Consequence: until Eitan refreshes the DashScope key, the Qwen live-chat candidate (and existing Qwen callers using that key) will fail-open to Gemini/simulation at runtime. This is the systemic runtime cause behind live-chat degradation, beyond the model string. Owner action: refresh QWEN_API_KEY in .env.local / server .env.production.
2. PUSH/DEPLOY: branch wao/qwen-chat-candidate (fe8739c) is local-only by contract. Pushing to origin and any deploy.sh run are owner decisions (Eitan deploys manually).
3. SHARED WORKTREE: /home/eitanya/wao is 5 behind origin + 148 dirty paths (B3 drift); sync/rebase strategy is an owner decision.
4. DOC GATE: AGENTS.md reconciliation (table in §5) needs a user-present session to pass the protected-file approval.
5. BOARD HYGIENE: t_bda977ef (superseded duplicate, parent-gated on this card) cannot be archived from this worker's scope; a binding do-not-execute comment is on it. Orchestrator should archive it.

## 7. Board watcher (verified live)

- Process: PID 125181 — `hermes --profile default kanban --board autonomous-hybrid-demand watch --kinds completed,blocked,gave_up,crashed,timed_out --interval 5` (state S/sleeping, uptime >2.5h at verification, cwd /home/eitanya/wao).
- Notification path/limits: stdout/stderr pipe (inode 540244) consumed by the orchestrator session PID 50339; polling interval 5s; kinds limited to the five terminal/attention states above (heartbeats and comments are NOT notified); output is a terminal stream into the orchestrator's context — it is not a gateway/Telegram delivery channel and has no per-event rate limiting beyond the poll interval. It covered every child dispatched by this mission (t_d5738a1a blocked events, t_be5d4ec1 completion, t_c8ddd58b completion were all visible to it).
- Sole-writer check at completion: no other running/ready cards on the board.

## 8. Manual deployment boundary (explicit)

Everything in this mission is LOCAL: one local commit on a local branch in a disposable worktree, one report file, board cards, and read-only probes. Nothing was pushed, no deploy.sh was run, no production server, PM2 process, .env file, or external service was touched. Go-live sequence when the owner decides: refresh QWEN_API_KEY (§6.1) → smoke one real chat completion → push wao/qwen-chat-candidate (or cherry-pick fe8739c onto hermes-migration after worktree sync) → Eitan runs deploy.sh manually → verify /api/bot live turn uses Qwen (server log/latency signature) with simulation fallback intact.
