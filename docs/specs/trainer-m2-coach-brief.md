# Trainer M2 — Coach Generator: Implementation Brief

**From:** Lior (strategist) · **To:** Eitan-Dev (`waoengineer`) · **Date:** 26.7.2026
**Parent spec:** `docs/specs/articulation-trainer.md` (v2) — §3b, §4, §5, §7-M2
**Prereq:** M1 is code-complete but **unverified and uncommitted** — see STATUS.md. Verify + commit M1 first.

## Goal

Replace the hardcoded `DANNY_PERSONA` with a **Coach** that generates today's persona +
scenario from three inputs: the charter, the WAO corpus, and (once M3 exists) the skill
profile. After M2, Eitan clicks "start today's session" and gets a fresh, WAO-relevant
Hebrew role-play partner — zero authored content.

## Deviation from spec §4 (decided, don't re-litigate)

Spec says Coach/Judge run on `claude-sonnet-5`. **There is no `ANTHROPIC_API_KEY` in
`.env.local`.** M2 therefore runs the Coach on the existing Gemini key using the same
REST pattern as `src/app/api/bot/route.ts` (`generativelanguage.googleapis.com`,
`GEMINI_MODEL_NAME` — the non-Live text model). Put the call behind one function so the
provider can be swapped without touching the Coach logic. If Eitan sources an Anthropic
key later, that's a one-file change.

## Deliverables

### 1. `data/trainer/charter.json` — seed exists, tracked in git
A draft is already committed (see file). It's the ONE manual artifact: goals, track
weights (T1/T2/T3 = 70/20/10), session length, red lines, tone preferences. The Coach
must treat every `redLines` entry as a hard constraint in its generation prompt.
**Gitignore rule:** `data/trainer/` is generated/private EXCEPT `charter.json` — add
`data/trainer/*` + `!data/trainer/charter.json` (sessions/transcripts must never be committed).

### 2. `src/lib/trainer/llm.ts` — model abstraction
`async function generateJson(systemPrompt: string, userPrompt: string): Promise<unknown>`
— Gemini REST call (reuse the bot route's fetch pattern, not a new SDK), JSON-mode
response, one retry on malformed JSON. Server-only.

### 3. `src/lib/trainer/coach.ts` — the generator
**Prompts already authored — do not write your own.** Import `COACH_SYSTEM_PROMPT` and
`QA_GATE_PROMPT` from `src/lib/trainer/prompts.ts` (authored by Lior). Wire the
`generateJson` calls around them; the generation/QA logic is yours, the prompt text is not.
- **Corpus loader:** read 2–3 random persona records from `scripts/onboarding-personas.json`
  (real vertical objections/fears in native Hebrew) + the charter. Keep the corpus
  excerpt under ~4k tokens — sample, don't dump.
- **Generation:** one `generateJson` call producing `{ persona: TrainerPersona,
  scenario: TrainerScenario }` conforming to spec §5 (`Persona` needs `systemPrompt`,
  `firstMessage`, `situation`, `hiddenObjective` — same fields the M1 session flow
  already consumes, so the session room needs no changes). Track selection: weighted
  random by charter weights (profile-driven selection is M3).
- **Level:** accept `level: 1|2|3` param; append the level-modifier block to the
  generated `systemPrompt` (L1 cooperative / L2 one hidden objection / L3 hostile+
  interruptions, per spec §5).
- **Noa QA gate (automated):** second `generateJson` call prompted with the language-qa
  charter essentials (native spoken register, no calque/translated Hebrew, gershayim not
  ASCII quotes, no double spaces) returning `{ pass: boolean, fixes?: {...} }`. On fail:
  regenerate ONCE with the QA notes injected; on second fail: return the result flagged
  `qaFlagged: true` (session still runnable — don't block training on a QA hiccup).
- **Cache:** write to `data/trainer/generated/YYYY-MM-DD-<id>.json`. `POST /api/trainer/next`
  with no args returns today's cached session if one exists and is unused; `{ fresh: true }`
  forces regeneration.

### 4. `POST /api/trainer/next` — route
Staff-gated via `isStaff()` (same as the other trainer routes). Body:
`{ fresh?: boolean, level?: 1|2|3, track?: 'T1'|'T2'|'T3' }`. Returns the generated
session JSON. Errors: `401` unauthenticated, `502` with `{ error }` on generation failure
— never a half-formed persona.

### 5. Wiring the generated persona into the session flow
- `mintGeminiSession()` / `mintElevenLabsSession()` currently hardcode `DANNY_PERSONA`.
  Change signature to `mintTrainerSession(persona: TrainerPersona)`; the session route
  accepts `{ generatedId?: string }`, loads the persona from the generated cache, and
  **falls back to Danny** when absent (Danny becomes the offline/fallback persona — keep him).
- `POST /api/trainer/transcript` currently stamps `DANNY_PERSONA.id` — record the actual
  `personaId` + `generatedId` + `level` from the request body instead (validated, not trusted blindly:
  `personaId` must match the loaded cache entry when `generatedId` is given).
- Dashboard (`trainer/page.tsx`): a "session of the day" card — situation text, track,
  level picker, start button. Minimal; no scenario library yet (M3+).

## Contracts (from spec §5 — do not drift)

Use the spec's `Persona`/`Scenario` interfaces. Scenario fields the Coach must fill in M2:
`id`, `title`, `level`, `personaId`, `situation`, `firstMessage`, `goal`, `timeCapMin`
(default 8, hard-cap 15), `rubric` (generate it now even though the Judge is M3 — it's
the scenario's success definition and Eitan reads it in the debrief screen later).
`week`/`drillsOnFail` may be omitted in M2.

## Hard constraints

- English-only agent prose; generated persona/scenario content is Hebrew.
- `GEMINI_API_KEY` never reaches the client (existing pattern — ephemeral tokens only).
- No `knowledge.ts` involvement anywhere in this mission.
- Session transcripts and generated personas are private data — verify the gitignore
  rule actually excludes them (`git check-ignore` in tests, same discipline as STATUS.md's
  credential-leak check).
- `npm run build` + `tsc --noEmit` clean; unit tests with `node --test` for: charter
  loading, level-modifier append, QA-fail→regenerate-once path, cache reuse vs `fresh`.

## Acceptance (Roni gate — runtime, not code-reading)

1. Authenticated `POST /api/trainer/next` → valid session JSON; Hebrew fields are
   native-register Hebrew (spot-read), `redLines` respected (probe: charter red line
   "never train manipulative tactics" → generated goal/rubric contains none).
2. Unauthenticated → `401`, no generation call made (no cache file appears).
3. Full loop: next → start session with generated persona → live Hebrew call in the
   session room → transcript saved with the correct `personaId`/`generatedId`.
4. Same-day second `next` (no `fresh`) returns the cached session — one generation call, not two.
5. `git check-ignore` confirms `data/trainer/sessions/` and `data/trainer/generated/`
   are ignored; `charter.json` is tracked.

Report PASS/FAIL per item with evidence; no partial pass.
