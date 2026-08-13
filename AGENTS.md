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
  - context_length: 1000000
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
  - context_length: 1000000
  - api_key_env: QWEN_API_KEY
  - base_url_env: QWEN_BASE_URL
  - temperature: 0.7
|- **Role:** Landing Pages, Bot Scripts, Marp Video Lessons, Voiceover QA.
|- **Mandate:** Writes persuasive Israeli Hebrew (Singular Male always). No robotic or translated speech. Limits sentences to 12-15 words for ElevenLabs compatibility.
|- **Voiceover Rule:** Modifies ONLY `🎙️ Narration` blocks in `.md` files.
|- **Human gate:** Any founder-facing or voiceover Hebrew passes a human spot-check by Eitan before it ships, until the model has proven native Sabra register — grammatical correctness is not voice approval.

## 4a. Roni / Maya — App Verifier (Profile: `waoverifier-app`)
|- **Engine:** Qwen 3 VL Plus (via Hermes, DashScope API — vision)
|- **Model Config:**
  - model: qwen3-vl-plus
  - context_length: 1000000
  - api_key_env: QWEN_API_KEY
  - base_url_env: QWEN_BASE_URL
  - temperature: 0.1
|- **Role:** Runtime QA, RTL correct rendering via vision, Browser/HTTP smoke checks.
|- **Mandate:** Verification is runtime observation only (curl, browser execution, screenshots). Returns PASS / FAIL / BLOCKED with strict evidence. Does not fix code — reports failures back to `waoengineer`.

## 4b. Shira / Yael — Media Verifier (Profile: `waoverifier-media`)
|- **Engine:** Qwen 3.5 Omni Plus (via Hermes, DashScope API — audio/video)
|- **Model Config:**
  - model: qwen3.5-omni-plus
  - context_length: 1000000
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
|- **App Verification:** `qwen3-vl-plus` for UI/RTL runtime checks. **Media Verification:** `qwen3.5-omni-plus` for video/audio QA.
|- **Never push or deploy directly:** Eitan manually triggers `deploy.sh` after successful Verification.

---

## Environment Variables

Required in `.env.local` (local dev) and `.env.production` (servers):

    QWEN_API_KEY=<your-dashscope-singapore-api-key>
    QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1

---

This file is the single source of truth for agent roles, mandates, and model configs.
