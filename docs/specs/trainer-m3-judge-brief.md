# Trainer M3 — Judge, Dashboard & Adaptive Loop: Implementation Brief

**From:** Lior (strategist) · **To:** Eitan-Dev (`waoengineer`) · **Date:** 26.7.2026
**Parent spec:** `docs/specs/articulation-trainer.md` (v2) — §3b, §4, §5, §7-M3
**Prereq:** M1 verified + committed (Roni PASS post-`authTokens` fix). M2 (Coach) briefed in
`trainer-m3`… no — in `trainer-m2-coach-brief.md`. **M3 can be built independently of M2** —
it scores whatever transcript exists; it does not need the Coach to generate personas first.

## Why now (the observed gap)

Eitan ran a real M1 session against Danny (26.7) and hit a wall: **there is no analysis
button, no dashboard, no history, no rank.** The call happens, the transcript saves, and
then nothing. M3 is the half that turns "a voice call" into "a training system." A real
session transcript is captured for you as a golden test fixture:
`data/trainer/seed/2026-07-26-danny.json` — includes a `referenceDebrief` block (Lior's
manual scoring) the Judge output should land near.

## Same LLM-provider deviation as M2 (decided, don't re-litigate)

Spec §4 says Judge runs on `claude-sonnet-5`; **there is no `ANTHROPIC_API_KEY`.** Reuse
`src/lib/trainer/llm.ts` (the `generateJson` Gemini abstraction from M2). If M2 isn't built
yet, create that file here — it's the shared seam and M3 needs it too. Provider swap stays a
one-file change.

## Split of responsibility — code vs. LLM (critical design point)

**Do NOT let the LLM compute the numeric behavioral metrics.** LLMs are unreliable at
counting. Two-layer debrief:

- **Layer 1 — objective metrics, computed in code** from the transcript (`src/lib/trainer/metrics.ts`):
  - `talkRatio` — user chars ÷ total chars (proxy; if per-turn timings exist later, use time).
  - `avgUserTurnChars` and `longestUserTurnChars` — pacing/density signal.
  - `questionCount` / `questionRatio` — user turns containing '?' ÷ user turns.
  - `fillerCount` — count of a Hebrew filler list ('אה', 'אמ', 'כאילו', 'יעני', 'בקיצור',
    'אתה יודע', 'וואלה') across user turns; normalize per-100-words.
  - These are facts. They feed BOTH the dashboard and the Judge prompt (as context, so the
    Judge's qualitative scores are grounded, not guessed).
- **Layer 2 — qualitative scoring, the Judge (LLM)** scores the rubric skills that require
  judgment (emotion labeling, objection handling, framing, boundary setting, closing) and
  quotes exact utterances as evidence. It receives the Layer-1 metrics as input but does not
  recompute them.

## Deliverables

### 1. `src/lib/trainer/metrics.ts` — objective metrics (pure, unit-tested)
Pure function `computeMetrics(transcript): ObjectiveMetrics`. No I/O, no LLM. This is the
easiest thing to test hard — write `node --test` cases against the seed transcript with
known expected counts.

### 2. `src/lib/trainer/judge.ts` — the Judge
**The prompt is already authored — do not write your own.** Import `JUDGE_SYSTEM_PROMPT`,
`DEFAULT_RUBRIC`, and `buildJudgeUserPrompt()` from `src/lib/trainer/prompts.ts` (authored by
Lior). Your job is only to wire the `generateJson` call around them and parse the result.
- Input: the session transcript + the scenario's `rubric` (from the generated scenario, or
  `DEFAULT_RUBRIC` when scoring an M1 hardcoded-Danny session that has none).
- Prompt: the persona's `hiddenObjective` is the scoring key — the Judge must check whether
  Eitan hit the unlock condition (for Danny: did he label the fear before pitching?). Inject
  the Layer-1 metrics. Demand strict JSON: `{ scores: Record<skill, 0-10>, overall, passed
  (overall ≥ 7), strengths[], weaknesses[], drills[] }`. Quoted evidence stays **Hebrew**;
  the Judge's own prose is **English** (house rule).
- One retry on malformed JSON.

### 3. `src/lib/trainer/profile.ts` — skill mastery (EWMA) + memos
- `data/trainer/profile.json`: per-skill `mastery` 0–100, updated per §3b:
  `mastery = 0.7·old + 0.3·(10·score)` (score is 0–10 → ×10 to a 0–100 scale). New skills
  seed at the first observed `10·score`.
- `data/trainer/memos.jsonl`: the Judge also emits recurring-pattern memos (one line, with an
  evidence quote + the skill it maps to + `status:'live'`). A memo resolves (`status:'resolved'`)
  when its skill isn't flagged for 3 consecutive relevant sessions. Keep the append-only +
  status-rewrite discipline simple; this is single-user local data.

### 4. `POST /api/trainer/debrief` — route
Staff-gated (`isStaff()`). Body: `{ sessionRef }` (path or id of a saved session line) OR an
inline `{ transcript, personaId, level }`. Flow: load transcript → `computeMetrics` →
`judge` → persist a `SessionResult` (spec §5) to the session record → update profile + memos
→ return the full debrief JSON. Errors: `401` unauth, `502` `{error}` on Judge failure (never
persist a half-scored result).

### 5. Dashboard — `src/app/(app)/trainer/page.tsx` (the visible payoff)
This is what Eitan asked for. Staff-gated. Three sections:
- **Skill radar** — the 8 rubric skills from `profile.json` as a radar/spider chart. Keep it
  dependency-light (inline SVG or a tiny helper — do NOT pull a heavy chart lib into this RTL
  Next app without checking bundle impact). RTL-safe labels (Hebrew skill names).
- **History** — reverse-chronological session list: persona, level, overall score, pass/fail
  chip, date. Click → the debrief detail (scores + quoted strengths/weaknesses + drills).
- **"Rank" / progress** — a simple derived level from mean mastery (e.g. bands: מתחיל /
  מתקדם / בקיא / אלוף) + current streak + the top 1–2 live memos as "this week's focus."
  Keep the copy Hebrew and native — route the visible Hebrew strings through Noa before ship.
- **Debrief trigger:** a "נתח את השיחה" (Analyze) button on a just-finished/any un-scored
  session that POSTs to `/api/trainer/debrief`. THIS is the missing button.

### 6. Session-room hook-up
After a session's transcript posts successfully, either auto-fire the debrief or surface the
Analyze button in the room. Eitan's preference: **show the button, don't auto-run** — he may
want to bail on a botched take without it counting. Confirm on build; default to button.

## Data model — use spec §5 verbatim
`SessionResult` (§5) is the persisted shape. Add the Layer-1 `metrics` object alongside
`scores`. Don't invent new top-level shapes.

## Adaptive scheduling — MINIMAL in M3, full in M4
M3 only needs profile + memos populated correctly. The **next-session selection** (target
lowest-mastery skill with a live memo, difficulty for ~70–80% success) can be a stub that
just reads `profile.json` and names the weakest skill on the dashboard as "focus." The full
scheduler + weekly regeneration is M4 — don't over-build here.

## Hard constraints
- English agent prose; Hebrew only inside generated/scored content and UI strings.
- No `knowledge.ts`. No client-facing surface — staff-gated, `noindex`.
- Judge/profile/memos data is private → same gitignore rule (`data/trainer/*` except
  `charter.json`). **The seed file `data/trainer/seed/2026-07-26-danny.json` is the one
  exception worth committing** (it's a test fixture, no secrets) — add
  `!data/trainer/seed/` to the ignore rules so it's tracked, or move it under `docs/`.
- `npm run build` + `tsc --noEmit` clean. `node --test` for: `computeMetrics` against the
  seed (assert known counts), EWMA update math, memo open→resolve transition, Judge JSON
  parse+retry.

## Acceptance (Roni gate — runtime)
1. `POST /api/trainer/debrief` on the seed transcript → valid `SessionResult`; scores in the
   same neighborhood as the seed's `referenceDebrief` (esp. **low emotion_labeling / low
   listening, high closing** — if the Judge scores the empathy miss highly, the rubric prompt
   is wrong). Weaknesses must quote actual Hebrew utterances from the transcript.
2. Unauth `POST /api/trainer/debrief` → 401, nothing written.
3. `profile.json` updated by the EWMA formula after a debrief; a second debrief moves it again.
4. At least one live memo written to `memos.jsonl` for the empathy/labeling pattern.
5. Dashboard at `/trainer` (authed) renders the radar, the seed session in history, a rank
   band, and a working Analyze button that produces a debrief end-to-end.
6. `git check-ignore` confirms sessions/profile/memos ignored; seed fixture tracked.

Report PASS/FAIL per item with evidence; no partial pass.

## Appendix — the reference debrief (Lior, manual)
See `data/trainer/seed/2026-07-26-danny.json → referenceDebrief`. Headline: strong close
mechanics and good discovery-question instinct, but the whole call missed Danny's core unlock
— he named his fear repeatedly ('נכוויתי', 'אכלתי אותה') and it was never labeled before the
pitch continued, so his guard never dropped. That miss is Phase B / W4 of the curriculum and
should be the first thing the profile flags as weak.
