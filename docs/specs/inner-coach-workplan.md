# Inner Coach — Detailed Work Plan (v1)

**Owner:** Eitan · **Planner:** Lior · **Drafted:** 31.7.2026 · **Status:** PLAN — expands
`inner-coach-vision.md` into an executable build ladder. No code until Eitan reacts to §9 of the
vision + the two architecture-shaping decisions in §2 below.

**Companion doc:** `docs/specs/inner-coach-vision.md` (the *what* and *why*). This doc is the
*how, in what order, by whom, and how we know it works* — grounded in a read of the live trainer
code, not the vision's estimate.

---

## 0. What the code review changed vs. the vision's reuse map

I read the trainer before planning. The ~70%-reuse claim holds, and the pipeline shapes map
almost 1:1. But three things the vision's reuse table treats as "reuse as-is" are actually
small, real deltas. Naming them now is the point of this plan — they're the difference between a
clean build and mid-build surprises.

| Vision said | Reality in code | Consequence |
|---|---|---|
| "Two distinct voices — reuse persona engine" | The Gemini voice is **not parameterized**. `gemini-session-room.tsx:284` sets `speechConfig: { languageCode: 'he-IL' }` only — no `prebuiltVoiceConfig`. Both trainer characters use Gemini's default voice. | Two voices = thread a `voice` field: `persona → GeminiSessionConfig (gemini.ts) → client speechConfig.voiceConfig`. ~15 lines across 3 files. **Cheap — so the decision is purely product, not cost.** |
| "Swap rubric for the reflector; drop pass/fail" (M3) | The Judge doesn't just score — the debrief route (`debrief/route.ts`) persists into a **skill-mastery EWMA profile** (`profile.ts`) + a **memos** system. The reflector's persistence target is completely different: it appends `evidenceActions` to the *ledger* and computes a *ratio*, not a mastery vector. | The reflector reuses the Judge's **prompt/quote-discipline shape** and the debrief route's **transcript-resolution + validation guards**, but `updateProfile`/`updateMemos`/`rank.ts`/`skill-radar` do **not** transfer. This is the largest net-new module. |
| "Reuse metrics" (implied by pipeline reuse) | `metrics.ts` computes Hebrew filler counts, talk-ratio, question-ratio — sales-conversation metrics. | Irrelevant to a self-talk reflector. Don't force-reuse it. The reflector's "Layer-1 code metric" is **tag counting + ratio math over the reflector's own tagged output** — a new ~40-line module, not `computeMetrics`. |

Everything else in the vision's reuse table is accurate and transfers cleanly: ephemeral-token
mint (`engine.ts`/`gemini.ts`), transcript persistence + identity resolution
(`transcript/route.ts`), the daily-generator pipeline shape with QA-gate + regenerate-once + cache
(`coach.ts`), the staff gate (`auth.ts` → `verifyAdminToken`), and the dashboard/SVG-chart
component patterns.

---

## 1. Guiding constraints (inherited, non-negotiable)

- **Milestone ladder, same as the trainer.** Nothing ships as "the product." We climb M1′ → M2′
  → M3′, each with a runtime verifier gate (Roni) before the next starts. No partial pass.
- **One manual artifact.** `data/inner-coach/ledger.json`. Everything else generated/computed.
- **Prompts are strategy-owned text** (Lior-authored, same discipline as trainer prompts) and go
  through **language-qa (Noa)** before they ship — they're Hebrew the user will *hear*.
- **Red lines are code, not vibes** (vision §8). They get a QA-gate check and a verifier test
  each — see §6.
- **Engineering is Adam's** (per project memory: trainer-class work is subscription-covered and
  Adam writes it directly; hermes/local only for cheap loops/scripting).

---

## 2. Two decisions that gate the build (need Eitan before M1′)

Everything downstream forks on these. I give a recommendation + the concrete code cost of each so
the decision is informed, not abstract.

### D1 — Two voices (coach vs. inner-critic)?
- **Recommendation: yes.** The externalization *is* the mechanism — the program must not sound
  like the coach. The vision agrees; the code review makes it cheap (see §0).
- **Cost if yes:** add optional `voice?: string` to `TrainerPersona`/the Inner-Coach persona type
  → carry through `GeminiSessionConfig` → set `speechConfig.voiceConfig.prebuiltVoiceConfig`
  client-side. Two named Gemini voices, picked once. ~15 lines, 3 files. Lands in M1′.
- **Cost if no:** zero, but the inner-critic rehearsal (M2′ mode) loses its teeth.

### D2 — Ledger locality: server runtime-dir or local-only?
This is the real fork. The ledger is intimate origin-story material.
- **Option A — server `data/inner-coach/` (trainer parity).** Cheapest; reuses the runtime-data
  symlink-survival-across-deploys machinery verbatim; dashboard is a normal server component.
  Gated by the same `wao-admin` cookie. *Risk:* intimate data sits on the same VPS as client work.
- **Option B — local-only.** Ledger + transcripts never leave Eitan's machine; run the whole
  Inner Coach on `localhost` only, never deployed. *Cost:* the "survives deploys / access from
  phone" affordance is gone; a second run target to maintain.
- **Recommendation: A, with a hardening rider** — `data/inner-coach/` added to a server-side
  `.gitignore` **and** an at-rest note, Eitan-only cookie enforced on every route (already the
  default via `isStaff`), and **no** analytics/sharing surface (vision §8). If Eitan's gut says
  "still too intimate for the VPS," take B and accept the lost affordances. **This is a comfort
  call, not a technical one — Eitan decides.**

*(Vision §9 also asks: coach cadence, Hebrew-only, and the product name. Those don't gate the
architecture — cadence is a generator parameter, Hebrew-only is assumed, and the name is a string.
Defaults: Hebrew-only, daily like the trainer with AM/PM mode selection, name TBD.)*

---

## 3. The net-new / changed modules (interfaces first)

Six units of new work. Everything else is reuse. Namespace: `src/lib/inner-coach/`, data in
`data/inner-coach/`, routes under `src/app/api/inner-coach/`, dashboard at `/inner-coach`.

1. **Ledger module** — `src/lib/inner-coach/ledger.ts`
   - Schema = vision §4. `loadLedger()`, `saveLedger()`, `appendEvidence(beliefId, action, sessionId)`,
     `retireIfReady(beliefId)` (evidenceActions ≥ retireThreshold → `retired`),
     `flagRelapse(beliefId)` (retired → `retiring`), `pickActiveBelief(recencyWindow)`.
   - Mirrors `coach.ts`'s charter-load discipline: read JSON, validate shape, throw on malformed.
   - The **one hand-edited file**. Module never invents beliefs outside intake.

2. **Daily generator** — `src/lib/inner-coach/session.ts` (the `coach.ts` analog)
   - Replaces `pickTrack` with `pickMode(now)` (AM→priming, PM→evidence-review; intake/rehearsal/
     cooldown on demand) + `pickActiveBelief`. Same **cache-per-day + QA-gate + regenerate-once**
     pipeline. Cache key `${date}-${mode}` (or `-${beliefId}` where a belief is bound).
   - Emits an Inner-Coach persona (coach voice, or critic voice for rehearsal per D1) + the
     session frame the client mints against.

3. **Reflector** — `src/lib/inner-coach/reflector.ts` (the `judge.ts` analog)
   - Input: transcript + the active belief(s). Output: `{ tags: TaggedUtterance[] }` where each is
     `{ program: 'fear'|'victimhood'|'comparison'|'bypass-lie'|'empowered', quoteHe: string, note?: string }`.
     **Every tag quotes exact Hebrew** (Judge discipline). **No scores, no pass/fail.**
   - Plus `computeReflection(tags)` — the Layer-1 *code* metric (not the LLM): empowered-vs-limiting
     ratio, per-program counts. This replaces `metrics.ts`, doesn't reuse it.

4. **Prompts** — `src/lib/inner-coach/prompts.ts`
   - Five mode system-prompts (intake / priming / evidence-review / inner-critic rehearsal /
     cooldown), the ledger-aware user-prompt builder, the reflector taxonomy prompt, and the
     **QA-gate** prompt extended with the §8 red-line checks. Lior drafts → Noa gates.

5. **Routes** — `src/app/api/inner-coach/{next,session,transcript,reflect,ledger}/route.ts`
   - `next` (generate/peek today), `session` (mint), `transcript` (persist — fork the gemini path
     from the trainer's `transcript/route.ts` verbatim, new dir), `reflect` (the debrief analog:
     resolve transcript → reflector → append evidence to ledger + persist reflection), `ledger`
     (read for dashboard; **intake write goes through a hand-approve step, not a blind POST**).
   - All `isStaff()`-gated, reused as-is.

6. **Dashboard** — `src/app/(app)/inner-coach/page.tsx` + view components
   - Views (vision §6): empowered-vs-limiting ratio line over weeks, per-program breakdown,
     per-belief evidence counters with **retire progress bars**, "today the program said / the
     director said" quote pair. Reuse the trainer's SVG-chart + card component patterns; **drop**
     rank shell / skill-radar.

---

## 4. The build ladder

### M1′ — One real voice session (days)
**Goal:** Eitan holds a full Hebrew voice conversation with a warm coach persona about **one
hard-coded belief**, transcript persists, and it survives a deploy.
- Scaffold `data/inner-coach/` + namespace + `isStaff` gate on a stub `/inner-coach` page.
- Hard-code one coach persona (analog of `DANNY_PERSONA`) — one belief, warm coach voice.
- Wire the session room: fork `gemini-session-room.tsx`; mint via reused `engine.ts`/`gemini.ts`.
- **Land D1 here:** thread the `voice` field so the coach has a deliberate voice (and the plumbing
  exists for the critic voice in M2′).
- Fork `transcript/route.ts` → `data/inner-coach/sessions/`.
- **Verifier gate (Roni):** page 200 behind gate / 401 without; a real session's transcript lands
  in the jsonl; file survives a deploy (symlink check).

### M2′ — The daily loop + the ledger (the core)
**Goal:** the generator picks a mode + active belief each day; intake seeds the ledger; morning/
evening modes run; inner-critic rehearsal uses the second voice.
- Build `ledger.ts` + the schema, seed a **real ledger via one intake session**, hand-approve it.
- Build `session.ts` (mode + belief selection, QA-gate + regenerate-once, cache-per-day).
- Write all five mode prompts (Lior) → **Noa gate** → wire `next`/`session` routes.
- Inner-critic rehearsal mode uses the critic voice (D1) + adversarial-persona reuse.
- **Verifier gate:** each mode generates a valid, on-charter session; QA-gate rejects a red-line
  violation and the regenerate-once fires; intake produces a draft ledger that hand-edit persists.

### M3′ — The Language Mirror (the payoff)
**Goal:** after a session, the reflector tags real utterances, evidence appends to the ledger,
beliefs retire, and the dashboard shows the ratio over time.
- Build `reflector.ts` + `computeReflection` + the `reflect` route (fork debrief's guards; swap
  persistence to `appendEvidence` + reflection record).
- Belief retirement + relapse detection wired into `ledger.ts`.
- Dashboard views (§3.6).
- **Verifier gate:** a known transcript yields correctly-tagged quotes (all quotes verbatim from
  the transcript — zero hallucinated quotes, same regression bar as the Judge); evidence counter
  increments; a belief at threshold flips to `retired` and renders its progress bar full; the
  ratio line renders from ≥2 sessions.

---

## 5. Sequencing & parallelization (Adam's routing)

- **Serial spine:** M1′ → M2′ → M3′ (each gated). Non-negotiable ordering.
- **Parallelizable *within* prep (before/independent of the spine):**
  - Lior drafts all five mode prompts + the reflector taxonomy prompt **now**, in parallel with
    M1′ engineering — they're needed at M2′/M3′, not M1′.
  - Noa can gate prompts as they land (streaming, not a big-bang QA pass at the end).
  - Dashboard component-pattern extraction (from the trainer) can start during M2′.
- **Hard dependencies:** ledger schema (M2′) blocks the reflector's `appendEvidence` (M3′); the
  `voice` threading (M1′) blocks the two-voice rehearsal (M2′); intake (M2′) must produce a real
  ledger before any evidence-review mode has content to work on.

---

## 6. Red-line enforcement checkpoints (vision §8 → concrete gates)

Each red line gets a mechanism, not just a promise:
- **No clinical claims / no mysticism in voice** → a line in every mode's system prompt **and** an
  explicit check in the QA-gate prompt (§3.4). Regenerate-once on violation, like the trainer.
- **Distress escalation** → a standing instruction in every coach persona prompt to stop the
  exercise and recommend a human professional on crisis language. **Verifier test:** a scripted
  distress utterance triggers the stop-and-refer behavior, not improvised therapy.
- **Private by construction** → `isStaff` on every route (reused); no analytics import; ledger dir
  git-ignored server-side (D2 rider). Verifier confirms 401 on every route without the cookie.
- **Honest mirror** → the reflector prompt carries the anti-flattery clause; **QA signal:** a
  reflection whose empowered-ratio only ever rises across sessions is a broken-instrument flag to
  surface on the dashboard, not hide.

---

## 7. Owner routing (WAO agent framework)

| Work | Owner |
|---|---|
| This plan, mode/reflector prompt drafts, taxonomy, red-line prompt text | **Lior** (strategy) |
| Hebrew QA on every prompt before ship (SERP-style gate) | **Noa** (language-qa) |
| All implementation — modules, routes, session room, dashboard, voice threading | **Adam** (trainer-class, subscription-covered) |
| Runtime verification at each milestone gate | **Roni** (verifier) |
| Ledger content (origin stories, beliefs, "I am" statements) | **Eitan** — the one manual artifact, hand-authored/approved |

---

## 8. Decisions — RESOLVED (31.7.2026)

1. **D1 (two voices) — ACCEPTED.** Coach and inner-critic get deliberately distinct Gemini
   voices. `voice` field threaded in M1′ (§4). Specific voice names picked during M1′ (needs a
   quick listen — see item 4).
2. **D2 (ledger locality) — RESOLVED: server `data/inner-coach/` + hardening rider** (Eitan
   delegated the call to Lior). Rider is binding: (a) `data/inner-coach/` git-ignored server-side;
   (b) `isStaff` (Eitan-only cookie) enforced on every route — no exceptions; (c) zero analytics
   imports, zero sharing surface. If Eitan's comfort changes, B (local-only) remains a clean
   fallback — the namespace boundary makes the switch cheap.
3. Vision §9 leftovers (cadence, name) — defaulted (Hebrew-only, daily w/ AM/PM mode selection,
   name TBD); override anytime, no architectural cost.
4. **Open:** which two Gemini voice names for coach vs. critic (pick during M1′; needs a listen).
