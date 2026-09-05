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
|- **Engine:** GPT-5.6 Sol (via Hermes, OpenAI Codex OAuth) — migrated 2026-09-01 for deep reasoning with medium effort.
|- **Model Config:**
  - model: gpt-5.6-sol
  - provider: openai-codex
  - reasoning_effort: medium
  - context_length: 1000000
  - temperature: 0.2
|- **Role:** System Architecture, Google Ads Bot Strategy, Site-Bot retention/growth strategy, Codebase Analysis, Mission Planning.
|- **Mandate:** Writes Technical Specifications and Architecture diagrams to `/handoff/pending/`. Analyzes A-Z progress. Does NOT write final production code or Hebrew marketing copy. Defers all execution to `waoengineer` / `waocopy`.
|- **Spec Discipline for waocopy:** When spec'ing tasks for `waocopy`, keep all instructions concise and straight to the point without verbose logic explanations (saving token costs). Provide the core entity anchors, keyword research targets, persona requirements, and the offer to be woven. Trust `waocopy` to determine content length, structure, and persona engagement based on proven entities and keyword research that optimize for SERPs and AI Overviews (AIO).

## 2. Eitan-Dev — Engineer / Executor (Profile: `waoengineer`)
|- **Engine:** GPT-5.6 Terra (via Hermes, OpenAI Codex OAuth) — migrated 2026-09-01 for fast, precise specification execution with medium reasoning effort.
|- **Model Config:**
  - model: gpt-5.6-terra
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
|- **Engine:** Gemini 3.8 Flash (via Hermes, Google API)
|- **Model Config:** model: gemini-3.8-flash, provider: gemini, context_length: 1000000,
  api_key_env: GEMINI_API_KEY, base_url: https://generativelanguage.googleapis.com/v1beta/openai.
|- **Role:** QA pass on Hermes-authored Hebrew — Sabra naturalness, TTS/narration readiness, final
  language review.
|- **Mandate:** Reviews `waocopy`'s output before it is handed back; does not draft original copy.
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
  for Hermes-orchestrated flows (e.g. kanban `swarm`) that need an in-Hermes verifier profile
  rather than a direct API call. Reconfigured 2026-08-24 from `qwen3.8-max` to **Gemini 3.8 Flash**
  specifically to restore model-family independence: the prior same-family Qwen config meant the
  verifier could grade its own family's work, defeating the point of an independent gate.
  model: gemini-3.8-flash / provider: gemini / api_key_env: GEMINI_API_KEY / base_url:
  `https://generativelanguage.googleapis.com/v1beta/openai` / context_length: 1000000.

## 4b. Shira / Yael — Media Verifier (Profile: `waoverifier-media`)
|- **Engine:** Gemini 3.8 Flash (via Hermes, Google API) — reconfigured 2026-08-24 from Qwen 3.5
  Omni Plus. The prior config had drifted to plain `qwen3.8-max` (text-only, could not actually
  process media) with a generic unconfigured system prompt; Gemini restores real multimodal
  capability and keeps model-family independence from `waoengineer`/`waocopy`.
|- **Model Config:**
  - model: gemini-3.8-flash
  - provider: gemini
  - base_url: https://generativelanguage.googleapis.com/v1beta/openai
  - context_length: 1000000
  - api_key_env: GEMINI_API_KEY
  - temperature: 0.1
|- **Role:** Video production QA, TTS/audio quality, banner and frame analysis.
|- **Mandate:** Processes video and audio natively. Returns PASS / FAIL / BLOCKED with strict evidence. Does not fix code — reports failures back to `waoengineer` or `waocopy`.

## 4c. Real-User QA Tester (Profile: `waouxtester`)
|- **Engine:** GPT-5.6 Sol (via Hermes, OpenAI Codex OAuth) — reconfigured 2026-09-04 after
  live validation showed Gemini's OpenAI-compatible endpoint rejecting Hermes image tool results,
  while Codex accepted the same screenshot natively and completed detailed RTL/BiDi visual QA.
|- **Model Config:**
  - model: gpt-5.6-sol
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
|- **Strategy & Specs:** `waostrategy` alone decides scope, selects the executing profile, and writes the specific handoff spec under its pinned `gpt-5.6-sol` OpenAI Codex configuration. The orchestrator only dispatches the spec's explicit `Target Agent` without planning, selecting, rewriting, or expanding it. Output goes to `/handoff/pending/` per `CLAUDE_TO_HERMES_HANDOFF.md`.
|- **Code & Execution:** Hermes picks up from `/handoff/pending/` and executes with `waoengineer` on `gpt-5.6-terra` (OpenAI Codex OAuth, medium reasoning effort).
|- **Execution order:** Hermes processes pending files in ascending filename order, one task at a time; a task never starts before its listed Dependencies are in `/completed/`. Parallel only for dependency-free tasks with different target agents.
|- **Content Generation:** Hermes uses `qwen3.8-max` for all Hebrew content (subject to the human gate above) — **except GEO opportunity generation** (`scripts/geo-generate-content.mjs`), where `gemini-3.8-flash` is PRIMARY and `qwen3.8-max` is the fallback. Both Tamar and Noa calls try Gemini first; Qwen only if Gemini's attempts are exhausted. Every saved action is stamped `generatedVia: "primary:gemini-3.8-flash"` or `"fallback:qwen3.8-max"`. Applies to every GEO-entitled client (`retter`, `ajudaica`, `wao`).
|- **App Verification:** structural checks → Claude `verifier` (Haiku 4.5, direct subagent, not Hermes; escalate to Sonnet 5 only if Haiku misses a hard drive). Visual/RTL checks → two-tier: `qwen3.5-omni-plus` (quick/iterative) or `qwen3.8-max` (serious/from-scratch, pre-deploy gate) via direct DashScope API call (see §4a); for real-user flow QA via screenshot inspection, `waouxtester` (GPT-5.6 Sol, §4c). **Media Verification:** `waoverifier-media` (Gemini 3.8 Flash, §4b) for video/audio QA. **Hermes-orchestrated flows** (kanban `swarm`) use the `waoverifier` profile (Gemini 3.8 Flash, §4a) as their in-Hermes verifier.
|- **Autonomous milestone push & deploy:** Post-milestone completion, the Lead Architect auto-commits, pushes to `hermes-migration`, and triggers `./deploy.sh` via SSH key once independent verification (tests, build, scope checks) passes.
|- **Context-budget check:** before writing a spec that routes through a Hermes/Qwen profile, the strategist checks that profile's real context_length above (not an aspirational number) against the spec's expected payload (repo context + tool outputs + screenshots/JSON dumps it will produce). If a spec is likely to exceed it, split it into narrower tasks rather than write one large one and hope. New profiles must have a working `.env` (verify with `hermes profile show <name>` before dispatching to it) — a profile scaffolded via `hermes profile create` has no credentials until one is added.

## Cost & Context Hygiene

All Hermes engines run stateless one-shot `-z` — no caching/compaction to manage. Rationale + verified
pricing: [[project_model_cost_geometry]].

**OpenAI Codex GPT-5.6** (`waostrategy` and `waouxtester` on `gpt-5.6-sol`, `waoengineer` on `gpt-5.6-terra`, `orchestrator` on `gpt-5.6-luna`): high capability reasoning, native screenshot analysis, and fast execution via Codex OAuth.

**Qwen 3.8 Max** (`waocopy`): flat rate to 1M — deep reasoning and nuanced generation for Hebrew copy. Still enforce:
- One scoped task per `/handoff/pending/` MD; name exact paths/functions; never dump whole files or the repo.
- `knowledge.ts` edits = surgical Python `str.replace` patches only (file never loaded whole).
- No Hebrew in the coder's (`waoengineer`) context — tokenize/placeholder all strings; Hebrew edits arrive as byte-exact patches Qwen (`waocopy`) authored ([[feedback_hebrew_edits_need_patch_not_retype]]).
- Dispatch with `--usage-file` for visibility even though there's no ceiling to enforce.

**Gemini 3.8 Flash** (`waohebrewqa`, `waoverifier`, `waoverifier-media`): fast verification tier with native multimodal capability where each profile's transport supports its required modality.

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
