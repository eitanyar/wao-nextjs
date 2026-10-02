# Onboarding Chat Model Reconciliation — Decision Memo (2026-09-30)

Task: t_477587c1. Author: waostrategy. Evidence-only memo; no code, no profile, no credential, and no deployment change made here.

## Question
Qwen 3.8 Flash vs Gemini Flash for the Google Ads onboarding chat (/api/bot live path): what is implemented, what is active, where is Gemini 3.8 Flash used in onboarding, and what is the next safe step?

## Observed (this run, 2026-09-30)
1. Active code on hermes-migration (shared worktree): `src/app/api/bot/route.ts` POST → `handleGemini` → `callGemini` (route.ts:846-928 region). `GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-3.8-flash"` (route.ts:859). Fallback chain: bounded DIAGNOSING wrapper → `handleSimulation` when no GEMINI_API_KEY.
2. App credential state (`.env.local`, values never printed): GEMINI_API_KEY present; QWEN_API_KEY present but points at the OLD DashScope intl base (https://dashscope-intl.aliyuncs.com/compatible-mode/v1).
3. Live probes (this run):
   - Gemini `generateContent` with the app key → HTTP 429 "project has exceeded its monthly spending cap" (RESOURCE_EXHAUSTED). Same failure mode recorded 2026-09-29. ⇒ The live Gemini path is DEAD at runtime; every onboarding turn degrades to simulation fallback.
   - App-level QWEN key against its configured intl base → HTTP 401 invalid_api_key.
   - waocopy profile Token Plan base (https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1) with the same key family → HTTP 200 exact PONG for BOTH qwen3.8-flash and qwen3.8-max, JSON-mode (`response_format: json_object`, `enable_thinking:false`) verified. ⇒ The Token Plan endpoint serves the flash model the candidate needs.
4. Implemented-but-not-active candidate: branch `wao/qwen-chat-candidate` @ fe8739c "feat(bot): prefer Qwen Flash for live chat" (handoff 2026-09-29_001, card t_be5d4ec1 done, tests+build green in its isolated worktree; NOT merged into hermes-migration — verified `git merge-base --is-ancestor` = false). It makes Qwen primary when QWEN_API_KEY+QWEN_BASE_URL set, Gemini secondary, simulation final fallback; adds `callQwenChatJSON` in src/lib/ai/qwen-fast.ts.
5. Other Gemini 3.8 Flash users in onboarding phase: `src/lib/ai/gemini-model-resolver.ts` / `gemini-fast.ts` are shared by GEO content generation (per AGENTS.md GEO uses gemini-3.8-flash primary with qwen3.8-max fallback) — separate from /api/bot; not touched by this reconciliation.
6. Profile vs application distinction: the waocopy profile PONG (Token Plan) does NOT mean the app works — the app reads .env.local, whose QWEN base 401s and whose Gemini key is capped. Both facts re-verified live this run.

## Conclusion
- Implemented: Qwen-primary /api/bot exists and is tested (fe8739c).
- Active: Gemini-only code path, dead at runtime (429 cap) → simulation serves every live onboarding turn today.
- Gemini 3.8 Flash in onboarding = the sole live LLM provider in route.ts (line ~859), currently unusable due to billing cap.
- The 2026-09-29 "Qwen 3.8 Flash for onboarding" decision is CORRECT and remains recommended; the blocker is activation, not design.

## Next safe step (dispatched, local-only)
Card t_cbd07de4 (waoengineer, goal mode): integrate fe8739c's scoped files into the shared worktree preserving unrelated dirty work; acceptance = focused tests + npm run test + npm run build. Then one owner-gated decision remains (Eitan): update `.env.local` QWEN_BASE_URL to the Token Plan endpoint (credential/config change — owner action; agents must not edit .env*). Until then the app keeps its safe simulation fallback. No production deploy involved; production keeps its own env.

## Non-decisions recorded
- No model switch for GEO (gemini-3.8-flash primary stays; AGENTS.md rule).
- No waocopy profile change needed (already qwen3.8-max on Token Plan; PONG re-verified).
- No deploy.sh, no push, no publish in this mission.
