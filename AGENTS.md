<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Communication Language — Hard Rule
**All agent responses MUST be written in English.**
- Eitan may ask in Hebrew, English, or any mix — agents always respond in English.
- Hebrew text is only permitted inside content being *created* (e.g., narration script, bot turn) — never in the agent's own prose response.

---

# WAO Agent Profiles (Hermes Architecture)

## 1. Dror / Lior — Strategist (Profile: `waostrategy`)
|- **Engine:** Qwen 3.8 Max (via Hermes, Alibaba) — active profile verified 2026-10-01; medium reasoning effort.
|- **Model Config:**
  - model: qwen3.8-max
  - provider: alibaba
  - reasoning_effort: medium
  - context_length: 1000000
  - temperature: 0.2
|- **Role:** Lead Strategist and Orchestrator for system architecture, Google Ads Bot strategy, Site-Bot retention/growth, codebase analysis, mission planning, worker routing, and end-to-end product acceptance.
|- **Mandate:** Owns A-Z outcome judgment. It inspects the existing codebase and unfinished work first; chooses scope, models, specialists, and workflow; writes concise Contract v3 handoffs to `/handoff/pending/`; creates, links, and dispatches worker and verifier tasks; browses and tests the real runtime; reviews desktop/mobile screenshots, bugs, and business quality; and keeps the mission moving without returning ordinary reversible decisions to Eitan. It does NOT write final production code or Hebrew marketing copy: those deliverables remain owned by `waoengineer` / `waocopy` and their independent QA gates.
|- **Spec Discipline for waocopy:** When spec'ing tasks for `waocopy`, keep all instructions concise and straight to the point without verbose logic explanations (saving token costs). Provide the core entity anchors, keyword research targets, persona requirements, and the offer to be woven. Trust `waocopy` to determine content length, structure, and persona engagement based on proven entities and keyword research that optimize for SERPs and AI Overviews (AIO).

## 2. Eitan-Dev — Engineer / Executor (Profile: `waoengineer`)
|- **Engine:** GPT-6 Sol (via Hermes, OpenAI Codex OAuth) — active profile verified 2026-10-01 for implementation and self-verification with medium reasoning effort.
|- **Model Config:**
  - model: gpt-6-sol
  - provider: openai-codex
  - reasoning_effort: medium
  - context_length: 1000000
  - temperature: 0.2
|- **Role:** Next.js Code Implementation, Script Execution, Google Ads API Wiring.
|- **Mandate:** Receives Technical Specifications from `/handoff/pending/` and implements them exactly as written — no freelancing, no "improvements in passing" (improvements are a strategist decision made in the spec). Runs tests (`node --test`), validates builds (`npm run build`).
|- **Bot Turns:** Any bot turn change must update BOTH `src/app/api/bot/route.ts` (simulation) AND `src/lib/bot/prompts.ts` (live path).

## 3. Tamar / Gil — Content & Pedagogy (Profile: `waocopy`)
|- **Engine:** Qwen 3.8 Max (via Hermes, DashScope API)
|- **Model Config:**
  - model: qwen3.8-max
  - context_length: 1000000 (verified against the model registry 2026-08-13 — accurate)
  - api_key_env: QWEN_API_KEY (+ DASHSCOPE_API_KEY)
  - base_url_env: QWEN_BASE_URL
  - temperature: 0.7
|- **Role:** Landing Pages, Bot Scripts, Marp Video Lessons, SEO/AIO Content Pages — drafting only.
|- **Mandate:** Writes persuasive Israeli Hebrew (Singular Male always). No robotic or translated speech. Limits sentences to 12-15 words for ElevenLabs compatibility. Master at reaching target personas and seamlessly weaving WAO's offer into content for optimal engagement. Content length is model-decided based on proven entities and keyword research required to make pages shine in Google SERPs and AI Overviews (AIO). Does NOT self-QA — that is `waohebrewqa` (§3b).
|- **Voiceover Rule:** Modifies ONLY `🎙️ Narration` blocks in `.md` files.
|- **Human gate:** Any founder-facing or voiceover Hebrew passes a human spot-check by Eitan before it ships, until the model has proven native Sabra register — grammatical correctness is not voice approval.

## 3b. Noa — Hebrew QA & Voice Director (Profile: `waohebrewqa`)
|- **Engine:** Qwen 3.8 Max (via Hermes, Alibaba)
|- **Model Config:** model: qwen3.8-max, provider: alibaba, reasoning_effort: medium,
  context_length: 1000000.
|- **Role:** QA pass on Hermes-authored Hebrew — Sabra naturalness, TTS/narration readiness, final
  language review.
|- **Mandate:** Reviews `waocopy`'s output before it is handed back; does not draft original copy.
  Reports only material, outcome-changing issues (meaning, natural Sabra register, safety/claim
  accuracy, persona/gender consistency, confusing access instructions, or TTS-breaking wording),
  never miscellaneous stylistic polish.
  This is the in-Hermes QA step for Hermes-dispatched pipelines (e.g. kanban/swarm flows). For
  anything Claude Code/Adam authors or touches directly, the gate is the `language-qa` Claude
  subagent (Noa's other seat) instead — same person, two seats for two different pipelines.

## 4a. Roni / Maya — App Verifier
|- **Structural/runtime checks (HTTP status, curl flows, grep scans, sim-conversation drives):**
  Claude `verifier` subagent, **Haiku 4.5** (model override `haiku`), spawned directly (not via Hermes).
  Swapped from Sonnet 5 2026-08-14 to cut cost ($1/$5 vs $3/$15) while keeping the gate INDEPENDENT of
  the Grok coder — it stays a Claude subagent, never Grok, so it never grades its own code. Escalate a
  specific check back to Sonnet 5 only if Haiku 4.5 demonstrably misses it (hardest sim-conversation /
  video-pipeline drives).
|- **Head/meta-tag checks only** (title/canonical/meta-description correctness) — offloaded to
  local `qwen3:8b` via Ollama (`localhost:11434/api/chat`), validated 100% 2026-08-13. Zero cost,
  6-17s/call. Details/prompt pattern: see memory `project_local_model_offload_results`. Does NOT
  extend to redirects, sim-conversation, or video-pipeline checks — those stay on the Claude `verifier` subagent (Haiku 4.5, §4a).
|- **Visual/RTL-rendering checks — two-tier, both called DIRECTLY via DashScope multimodal
  endpoint** (`$QWEN_BASE_URL/chat/completions`, base64 image), not through any Hermes wrapper:
  - **Quick/iterative checks:** `qwen3.5-omni-plus` — ~3s/call, 6/7 on benchmark, misses overflow.
  - **Serious/pre-deploy/from-scratch checks:** `qwen3.8-max` — ~90-110s/call, 7/7, only model
    that catches overflow. Superseded `waoverifier-app` (Qwen3-VL-Plus) 2026-08-13; that profile
    archived 2026-08-24 (moved to `~/.hermes/profiles.archived-20260824/`, not deleted).
  - Details/benchmark data: memory `project_local_vision_verifier_unreliable`.
  - api_key_env: QWEN_API_KEY / base_url_env: QWEN_BASE_URL / temperature: 0.1
|- **Role:** Runtime QA, RTL-correct rendering via vision, Browser/HTTP smoke checks.
|- **Mandate:** Verification is runtime observation only (curl, browser execution, screenshots). Returns PASS / FAIL / BLOCKED with strict evidence. Does not fix code — reports failures back to `waoengineer`.
|- **Spec-sizing rule:** one screenshot per call, narrow single-action prompt — same discipline as
  the retired `waoverifier-app` dispatch pattern, now applied to the direct API call instead of a
  Hermes spec file.
|- **Hermes-native verifier profile (`waoverifier`):** separate from the direct-API pattern above —
  for Hermes-orchestrated flows that need an in-Hermes verifier profile rather than a direct API
  call. Active profile uses **GPT-6 Luna** (OpenAI Codex OAuth), independent from the Sol engineer.
  model: gpt-6-luna / provider: openai-codex / reasoning_effort: medium /
  context_length: 1000000.

## 4b. Shira / Yael — Media Verifier (Profile: `waoverifier-media`)
|- **Engine:** GPT-6 Luna (via Hermes, OpenAI Codex OAuth) — active profile verified 2026-10-01.
|- **Model Config:**
  - model: gpt-6-luna
  - provider: openai-codex
  - reasoning_effort: medium
  - context_length: 1000000
  - temperature: 0.1
|- **Role:** Video production QA, TTS/audio quality, banner and frame analysis.
|- **Mandate:** Processes video and audio natively. Returns PASS / FAIL / BLOCKED with strict evidence. Does not fix code — reports failures back to `waoengineer` or `waocopy`.

## 4c. Real-User QA Tester (Profile: `waouxtester`)
|- **Engine:** GPT-6 Sol (via Hermes, OpenAI Codex OAuth) — active profile verified 2026-10-01.
|- **Model Config:**
  - model: gpt-6-sol
  - provider: openai-codex
  - reasoning_effort: medium
  - context_length: 1000000
  - temperature: 0.1
|- **Role:** Visual QA on real product flows via screenshot inspection — RTL/BiDi layout, mobile
  overflow, UI regressions.
|- **Mandate:** Returns PASS / FAIL / BLOCKED with strict evidence. Does not fix code — reports
  failures back to `waoengineer`.

---

# Workflow Rules
|- **Mandatory WAO task reporting:** Any agent session that reports the status or terminal result of a WAO Kanban task to Eitan MUST state the formal board outcome (running, done, or blocked) and distinguish independently verified evidence from a worker's self-report. `waostrategy` owns the next autonomous action and may dispatch the dependency-ready implementation or independent-verification task without asking Eitan. Ask Eitan only for a named external, irreversible, legal, credential, material-spend, publication, or deployment decision. Never end with `none`, `wait`, a vague instruction, or owner homework for an ordinary reversible product decision.
|- **Outcome-owned delivery (Contract v3):** Keep strategist and engineer profiles separate, but merge planning, implementation, debugging, and local acceptance into ONE `waoengineer` run. The strategist supplies one concise outcome contract; the engineer inspects the code, chooses implementation details, and keeps correcting task-owned failures in the same session. A safe local red result is feedback, never a consumed authorization and never a reason for another strategist card.
|- **Strategy use:** `waostrategy` decides priorities, architecture, safety boundaries, specialist ownership, execution flow, and acceptance outcomes. It may change the agentic workflow when evidence shows a faster or higher-quality path. Do not spend a strategist run on ordinary compiler/test/harness corrections; those stay with the outcome-owning worker. Return to strategy only for an unresolved product decision, unsafe/external side effect, dependency/approval gap, or repeated evidence that the architecture itself is wrong.
|- **Code & Execution:** `waostrategy` may create, link, assign, and dispatch one concise Contract v3 handoff to `waoengineer` on `gpt-6-sol` using Kanban goal mode (`--goal`) so the same worker session owns implementation through local PASS. It may dispatch `waocopy`, `waohebrewqa`, `waoverifier`, `waouxtester`, and `waoverifier-media` as their gates become dependency-ready. Adam/orchestrator is an optional durable dispatch surface, not a required human relay. Kanban is a durable ledger, not a chain of micro-handoffs. Do not create recovery cards for task-owned test failures.
|- **Execution order:** One implementation writer at a time in `/home/eitanya/wao`. Finish and independently verify the highest-value incomplete outcome before starting another. Legacy pending specs remain `REVIEW_REQUIRED`; they are not a backlog to execute in filename order. Missing prose dependencies without an unfinished edge use sticky `needs_input`, never a dependency-wait/promotion loop.
|- **Acceptance:** Use existing focused tests plus canonical `npm run test` and `npm run build`; use scoped lint until repository-wide lint debt is separately cleared. `waostrategy` also owns real browser/runtime inspection, desktop/mobile snapshots, bug triage, and sellability review, using premium models where they materially improve quality. Do not create bespoke evidence harnesses, red-evidence ceremonies, immutable worktree snapshots, or exact-once local commands unless the task itself is a production-sensitive one-shot operation. After engineer PASS, `waostrategy` dispatches one independent verifier card from the verification contract already embedded in the handoff; do not require another strategist card merely to restate it.
|- **Content Generation:** Hermes uses `qwen3.8-max` for all Hebrew content (subject to the human gate above) — **except GEO opportunity generation** (`scripts/geo-generate-content.mjs`), where `gemini-3.8-flash` is PRIMARY and `qwen3.8-max` is the fallback. Every saved GEO action is stamped `generatedVia: "primary:gemini-3.8-flash"` or `"fallback:qwen3.8-max"`. Applies to every GEO-entitled client (`retter`, `ajudaica`, `wao`).
|- **App Verification:** structural checks → Claude `verifier` (Haiku 4.5, direct subagent, not Hermes; escalate to Sonnet 5 only if Haiku misses a hard drive). Visual/RTL checks → two-tier: `qwen3.5-omni-plus` (quick/iterative) or `qwen3.8-max` (serious/from-scratch, pre-deploy gate) via direct DashScope API call (see §4a); for real-user flow QA via screenshot inspection, `waouxtester` (GPT-6 Sol, §4c). **Media Verification:** `waoverifier-media` (GPT-6 Luna, §4b) for video/audio QA. **Hermes-orchestrated flows** use the `waoverifier` profile (GPT-6 Luna, §4a) as their in-Hermes verifier.
|- **Autonomous milestone push & deploy:** Post-milestone completion, the Lead Architect auto-commits, pushes to `hermes-migration`, and triggers `./deploy.sh` via SSH key once independent verification (tests, build, scope checks) passes.
|- **Context-budget check:** before writing a spec that routes through a Hermes/Qwen profile, the strategist checks that profile's real context_length above (not an aspirational number) against the spec's expected payload (repo context + tool outputs + screenshots/JSON dumps it will produce). If a spec is likely to exceed it, split it into narrower tasks rather than write one large one and hope. New profiles must have a working `.env` (verify with `hermes profile show <name>` before dispatching to it) — a profile scaffolded via `hermes profile create` has no credentials until one is added.

## Cost & Context Hygiene

Default WAO implementation work uses one goal-mode engineer session plus one independent verifier
session. Avoid chains of stateless strategist/executor/recovery cards. Rationale + verified pricing:
[[project_model_cost_geometry]].

**OpenAI Codex** (active configs verified 2026-10-01: `waoengineer` and `waouxtester` on `gpt-6-sol`, `orchestrator`, `waoverifier`, and `waoverifier-media` on `gpt-6-luna`): profile roles remain separate; the engineer run owns implementation planning and local convergence. `waostrategy`, `waocopy`, and `waohebrewqa` use `qwen3.8-max` via Alibaba.

**Qwen 3.8 Max** (`waocopy`): flat rate to 1M — deep reasoning and nuanced generation for Hebrew copy. Still enforce:
- One scoped task per `/handoff/pending/` MD; name exact paths/functions; never dump whole files or the repo.
- `knowledge.ts` edits = surgical Python `str.replace` patches only (file never loaded whole).
- No Hebrew in the coder's (`waoengineer`) context — tokenize/placeholder all strings; Hebrew edits arrive as byte-exact patches Qwen (`waocopy`) authored ([[feedback_hebrew_edits_need_patch_not_retype]]).
- Dispatch with `--usage-file` for visibility even though there's no ceiling to enforce.

**Qwen 3.8 Max** (`waohebrewqa`): focused Hebrew-language QA tier; reports only material issues and supports the modalities exposed by its transport.

---

## Environment Variables

Required in `.env.local` (local dev) and `.env.production` (servers):

    QWEN_API_KEY=<your-dashscope-singapore-api-key>
    QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
    GEMINI_API_KEY=<your-google-ai-studio-key>

For any Hermes profile on `alibaba`/Qwen: both `QWEN_API_KEY` and `DASHSCOPE_API_KEY` must be set
to the same value in that profile's own `.env` — Hermes' credential-pool cache resolves the
`alibaba` provider via `DASHSCOPE_API_KEY` specifically (see §2). For any profile on `gemini`:
`GEMINI_API_KEY` alone is sufficient; base_url is `https://generativelanguage.googleapis.com/v1beta/openai`.

---

## Direct Claude Code Tasks (Sonnet 5)

The following tasks are implemented directly by Claude Code (Sonnet 5) instead of through Hermes, due to code quality, context efficiency, and API reliability:

- **Panel Copy Audit & Hebrew Rewriting** (`src/lib/operators/hebrew-rewriter.ts`): Translates Google Ads operator task copy (titles, explanations, actions) from technical English to plain Hebrew for business owners. Calls Qwen 3.8 Max via DashScope for translation, cached in-memory. Implemented in Claude Code to avoid Hermes context budget constraints and improve iteration speed.

- **Runtime Gemini Flash Model Detection** (planned): Auto-discovers latest available Gemini Flash version via Google's `/listModels` API, eliminating manual version hardcoding.

---

This file is the single source of truth for agent roles, mandates, and model configs.
