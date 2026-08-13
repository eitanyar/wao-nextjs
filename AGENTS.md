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
|- **Engine:** Claude Opus 4.8 (via Claude Code — the main session, not Hermes)
|- **Role:** System Architecture, Google Ads Bot Strategy, Codebase Analysis, Mission Planning.
|- **Mandate:** Writes Technical Specifications and Architecture diagrams to `/handoff/pending/`. Analyzes A-Z progress. Does NOT write final production code. Defers all execution to `waoengineer`.

## 2. Eitan-Dev — Engineer / Executor (Profile: `waoengineer`)
|- **Engine:** Qwen 3 Coder Next (via Hermes, DashScope API)
|- **Model Config:**
  - model: qwen3-coder-next
  - context_length: 262144 (verified against the model registry 2026-08-13 — NOT 1M; keep spec scope, screenshots, and pasted JSON/logs small enough to fit)
  - api_key_env: QWEN_API_KEY
  - base_url_env: QWEN_BASE_URL
  - temperature: 0.2
|- **Role:** Next.js Code Implementation, Script Execution, Google Ads API Wiring.
|- **Mandate:** Receives Technical Specifications from `/handoff/pending/` and implements them exactly as written — no freelancing, no "improvements in passing" (improvements are a strategist decision made in the spec). Runs tests (`node --test`), validates builds (`npm run build`).
|- **Bot Turns:** Any bot turn change must update BOTH `src/app/api/bot/route.ts` (simulation) AND `src/lib/bot/prompts.ts` (live path).

## 3. Tamar / Gil / Noa — Content & Pedagogy (Profile: `waocopy`)
|- **Engine:** Qwen 3.8 Max (via Hermes, DashScope API)
|- **Model Config:**
  - model: qwen3.8-max
  - context_length: 1000000 (verified against the model registry 2026-08-13 — accurate)
  - api_key_env: QWEN_API_KEY
  - base_url_env: QWEN_BASE_URL
  - temperature: 0.7
|- **Role:** Landing Pages, Bot Scripts, Marp Video Lessons, Voiceover QA.
|- **Mandate:** Writes persuasive Israeli Hebrew (Singular Male always). No robotic or translated speech. Limits sentences to 12-15 words for ElevenLabs compatibility.
|- **Voiceover Rule:** Modifies ONLY `🎙️ Narration` blocks in `.md` files.
|- **Human gate:** Any founder-facing or voiceover Hebrew passes a human spot-check by Eitan before it ships, until the model has proven native Sabra register — grammatical correctness is not voice approval.

## 4a. Roni / Maya — App Verifier
|- **Structural/runtime checks (HTTP status, curl flows, grep scans, sim-conversation drives):**
  Claude `verifier` subagent, **Sonnet 5**, spawned directly (not via Hermes).
|- **Head/meta-tag checks only** (title/canonical/meta-description correctness) — offloaded to
  local `qwen3:8b` via Ollama (`localhost:11434/api/chat`), validated 100% 2026-08-13. Zero cost,
  6-17s/call. Details/prompt pattern: see memory `project_local_model_offload_results`. Does NOT
  extend to redirects, sim-conversation, or video-pipeline checks — those stay on Sonnet 5.
|- **Visual/RTL-rendering checks — two-tier, both called DIRECTLY via DashScope multimodal
  endpoint** (`$QWEN_BASE_URL/chat/completions`, base64 image), not through any Hermes wrapper:
  - **Quick/iterative checks:** `qwen3.5-omni-plus` — ~3s/call, 6/7 on benchmark, misses overflow.
  - **Serious/pre-deploy/from-scratch checks:** `qwen3.8-max` — ~90-110s/call, 7/7, only model
    that catches overflow. Superseded `waoverifier-app` (Qwen3-VL-Plus) 2026-08-13.
  - Details/benchmark data: memory `project_local_vision_verifier_unreliable`.
  - api_key_env: QWEN_API_KEY / base_url_env: QWEN_BASE_URL / temperature: 0.1
|- **Role:** Runtime QA, RTL-correct rendering via vision, Browser/HTTP smoke checks.
|- **Mandate:** Verification is runtime observation only (curl, browser execution, screenshots). Returns PASS / FAIL / BLOCKED with strict evidence. Does not fix code — reports failures back to `waoengineer`.
|- **Spec-sizing rule:** one screenshot per call, narrow single-action prompt — same discipline as
  the retired `waoverifier-app` dispatch pattern, now applied to the direct API call instead of a
  Hermes spec file.

## 4b. Shira / Yael — Media Verifier (Profile: `waoverifier-media`)
|- **Engine:** Qwen 3.5 Omni Plus (via Hermes, DashScope API — audio/video)
|- **Model Config:**
  - model: qwen3.5-omni-plus
  - context_length: UNVERIFIED as of 2026-08-13 — not found in the model registry under the `alibaba`/`alibaba-cn` providers this profile actually uses (only a `nano-gpt`-provider entry exists, ~983K, which is a different gateway and not reliable evidence for this profile). Treat as ~256K-scale until confirmed; keep specs narrow (one media artifact per check) until verified.
  - api_key_env: QWEN_API_KEY
  - base_url_env: QWEN_BASE_URL
  - temperature: 0.1
|- **Role:** Video production QA, TTS/audio quality, banner and frame analysis.
|- **Mandate:** Processes video and audio natively. Returns PASS / FAIL / BLOCKED with strict evidence. Does not fix code — reports failures back to `waoengineer` or `waocopy`.

---

# Workflow Rules
|- **Strategy & Specs:** Run under Claude Code (Opus). Output goes to `/handoff/pending/` per `CLAUDE_TO_HERMES_HANDOFF.md`.
|- **Code & Execution:** Hermes picks up from `/handoff/pending/` and executes with `qwen3-coder-next`.
|- **Execution order:** Hermes processes pending files in ascending filename order, one task at a time; a task never starts before its listed Dependencies are in `/completed/`. Parallel only for dependency-free tasks with different target agents.
|- **Content Generation:** Hermes uses `qwen3.8-max` for all Hebrew content (subject to the human gate above).
|- **App Verification:** structural checks → Claude `verifier` (Sonnet 5, direct subagent, not Hermes). Visual/RTL checks → two-tier: `qwen3.5-omni-plus` (quick/iterative) or `qwen3.8-max` (serious/from-scratch, pre-deploy gate) via direct DashScope API call (see §4a). **Media Verification:** `qwen3.5-omni-plus` for video/audio QA.
|- **Never push or deploy directly:** Eitan manually triggers `deploy.sh` after successful Verification.
|- **Context-budget check:** before writing a spec that routes through a Hermes/Qwen profile, the strategist checks that profile's real context_length above (not an aspirational number) against the spec's expected payload (repo context + tool outputs + screenshots/JSON dumps it will produce). If a spec is likely to exceed it, split it into narrower tasks rather than write one large one and hope. New profiles must have a working `.env` (verify with `hermes profile show <name>` before dispatching to it) — a profile scaffolded via `hermes profile create` has no credentials until one is added.

---

## Environment Variables

Required in `.env.local` (local dev) and `.env.production` (servers):

    QWEN_API_KEY=<your-dashscope-singapore-api-key>
    QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1

---

## Direct Claude Code Tasks (Sonnet 5)

The following tasks are implemented directly by Claude Code (Sonnet 5) instead of through Hermes, due to code quality, context efficiency, and API reliability:

- **Panel Copy Audit & Hebrew Rewriting** (`src/lib/operators/hebrew-rewriter.ts`): Translates Google Ads operator task copy (titles, explanations, actions) from technical English to plain Hebrew for business owners. Calls Qwen 3.8 Max via DashScope for translation, cached in-memory. Implemented in Claude Code to avoid Hermes context budget constraints and improve iteration speed.

- **Runtime Gemini Flash Model Detection** (planned): Auto-discovers latest available Gemini Flash version via Google's `/listModels` API, eliminating manual version hardcoding.

---

This file is the single source of truth for agent roles, mandates, and model configs.
