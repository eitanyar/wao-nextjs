# Inner Coach — Vision Spec (v1 draft)

**Owner:** Eitan · **Drafted:** 29.7.2026 · **Status:** DRAFT — awaiting Eitan's reactions before any code
**Sibling system:** the staff voice trainer (M1 voice room / M2 Coach / M3 Judge) — Inner Coach is a
deliberate re-instantiation of that architecture with a different charter, personas, and judge.

---

## 1. What this is

A private, voice-to-voice self-development companion (Hebrew, Gemini Live) whose job is to help
Eitan **replace limiting beliefs with empowering ones** — and to prove the replacement is real by
tracking his *actual spoken language* and *logged real-world actions* over time.

Source inspiration: the Howes/hypnotherapist interview (transcript in Drive). Its operating theory,
stripped of metaphysics, is concrete and buildable:

1. Limiting beliefs are **programs** installed early ("I'm not good enough", "I deserve this"),
   running subconsciously and expressed in everyday speech.
2. Three recurring low-frequency programs: **comparison/jealousy**, **fear** ("they'll find out
   I'm bad"), **victimhood** ("the world happens to me, I have no agency").
3. The change process: **awareness** (it's a program, not me) → **reframe** ("I'm the director,
   not the movie") → **evidence actions** that disprove the old belief → **focus-out**
   (gratitude / generosity).
4. The daily tool: deliberate spoken **"I am" statements** — language as direction to the
   subconscious. "Your body is listening to every word you say."

## 2. Why voice-to-voice is the whole point

The mechanism above runs on *spoken* language — what you say and what you hear back. The trainer
proved Gemini native voice-to-voice sounds genuinely human in Hebrew, hears tone and hesitation,
and responds in the same breath. A journaling app, a text chatbot, or a TTS affirmation player
all miss the substrate. This product exists *because* that capability exists.

## 3. Core principles

- **The evidence-action loop is the engine; affirmations are the ritual wrapper.** The product's
  center of gravity is logging real actions that disprove old beliefs (the scary sales call made,
  the price held, the gym session done) — not reciting phrases.
- **Show, don't preach.** The system never says "believe in yourself." It quotes Eitan's own words
  back to him: *this* sentence today was the victimhood program; *this* one was the empowered
  frame. Progress is a measured language ratio, not a vibe.
- **Coaching, not therapy** (hard red line — §8).
- **One manual artifact** (same discipline as the trainer): the Belief Ledger. Everything else is
  generated or computed.

## 4. The Belief Ledger (the one manual artifact)

`data/inner-coach/ledger.json` — seeded by a one-time voice **intake session** in which the coach
interviews Eitan (origin stories, current bypass-lies, desired identity), drafts the ledger, and
Eitan edits/approves it by hand. Shape:

```jsonc
{
  "owner": "Eitan",
  "identityNorthStar": "Brave entrepreneur with deep love for humankind; hunger for life.",
  "beliefs": [
    {
      "id": "b1",
      "limiting": "…the old program, in Eitan's own words (Hebrew)…",
      "program": "fear | victimhood | comparison",       // detection taxonomy, §6
      "origin": "…one-line origin story, if known…",
      "empowering": "…the chosen replacement 'I am' statement (Hebrew)…",
      "evidenceActions": [                                 // appended over time by sessions
        { "date": "2026-07-29", "action": "…", "loggedInSession": "…id…" }
      ],
      "status": "active | retiring | retired",             // retired = enough evidence logged
      "retireThreshold": 10                                 // evidence actions to retire it
    }
  ],
  "redLines": [ "…see §8, copied in verbatim…" ]
}
```

## 5. Session modes (the M2 analog generates one per day)

Daily generator picks a mode + one `active` belief, honoring variety and recency (same
cache-per-day + QA-gate + regenerate-once pattern as the trainer's Coach):

| Mode | When | What happens (voice, Hebrew, 5–10 min) |
|---|---|---|
| **Intake** | once, then on demand | Coach interviews Eitan, drafts/extends the Belief Ledger. |
| **Morning priming** | AM | "I am" work on today's belief + one committed evidence action for today. |
| **Evening evidence review** | PM | "What happened today that disproves the old belief?" — logs evidence actions to the ledger; celebrates them concretely. |
| **Inner-critic rehearsal** | generated | **The persona engine plays the externalized program**: the agent voices the limiting belief as a character ("you're going to be found out…") and Eitan practices dismantling it out loud — awareness → reframe → counter-evidence. Direct reuse of the trainer's adversarial-persona roleplay. |
| **Focus-out cooldown** | appended to any session | 60–90 seconds of gratitude + one concrete generosity intent (the interview's "when in doubt, focus out"). |

## 6. The Language Mirror (the M3 analog — reflector, not judge)

After each session, the transcript pipeline (reused wholesale) runs a *reflector* instead of a
scorer. No pass/fail, no 0–10 — a language audit:

- **Detection taxonomy:** utterances tagged `fear` / `victimhood` / `comparison` /
  `bypass-lie` (the "physical therapists are a scam" pattern — a self-serving generalization that
  excuses inaction) / `empowered` ("I am…", agency framings, committed actions).
- **Every tag quotes the exact Hebrew utterance** (same evidence discipline as the Judge — no
  unquoted claims).
- **Dashboard:** empowered-vs-limiting ratio over time (line, weeks), per-program breakdown,
  per-belief evidence-action counters with retire progress bars, and a "today the program said /
  today the director said" quote pair.
- **Belief retirement** is the celebration moment: when `evidenceActions ≥ retireThreshold`, the
  belief moves to `retired` and the dashboard marks it visibly. Retired ≠ deleted — relapse
  detection (the reflector tagging a retired belief's pattern again) flags it back to `retiring`.

## 7. Architecture: reuse map (≈70% exists)

| Exists in trainer | Inner Coach delta |
|---|---|
| Ephemeral-token session mint (`gemini.ts`, `engine.ts`, persona-parameterized) | Reuse as-is; personas come from the daily generator. |
| Transcript persistence + identity resolution (`/api/trainer/transcript`) | Reuse pattern; new namespace `data/inner-coach/`. |
| M2 daily generator w/ charter + QA gate + cache (`coach.ts`) | New prompts (ledger-aware); same pipeline shape. |
| M3 Judge + metrics + debrief route | Swap rubric for the reflector taxonomy; drop pass/fail. |
| Dashboard + SVG charts + rank shell | New views (§6); same component patterns. |
| Staff gating (`wao-admin` cookie) | Reuse — this is *more* private than the trainer; Eitan-only. |
| Runtime-data symlink survival across deploys | Reuse — ledger and sessions must survive deploys. |

**New work:** prompts (strategy — Lior-owned text, same discipline as trainer prompts), the
Ledger schema + read/write module, the reflector prompt + taxonomy, dashboard views. No new
infrastructure. Rough shape: M1' (voice session with a kind coach persona + hardcoded belief)
is days; the full loop is the same 3-milestone ladder the trainer climbed.

## 8. Red lines (charter-level, non-negotiable)

- **No clinical claims.** The coach never diagnoses, never uses medical/psychotherapeutic framing
  ("trauma treatment", "hypnotherapy"), never promises outcomes.
- **Distress escalation.** If a session surfaces acute distress (self-harm ideation, crisis
  language), the coach stops the exercise, acknowledges warmly, and recommends talking to a
  human professional. It does not improvise therapy.
- **No mysticism in the product voice.** The interview's framing (Source, karma, Saint Germain)
  stays in the inspiration doc. The product speaks in plain psychological language: programs,
  reframes, evidence, identity. (Ho'oponopono-style gratitude phrasing is fine as an optional
  closing ritual — it's a gratitude practice, not a claim.)
- **Private by construction.** Eitan-only gate; ledger and transcripts never leave the runtime
  data dir; no analytics, no sharing surface.
- **Honest mirror.** The reflector may be warm but never flattering — same anti-grade-inflation
  stance as the Judge. An empowered ratio that only ever goes up is a broken instrument.

## 9. Open questions for Eitan (react before build)

1. **Coach voice/character:** one consistent warm coach persona, or does the inner-critic
   rehearsal warrant a deliberately different voice so "the program" never sounds like the coach?
   (Recommendation: two distinct voices — the contrast is the point.)
2. **Session cadence:** daily like the trainer (5/week), or morning+evening pairs?
3. **Ledger privacy:** comfortable with the ledger living in the same server runtime-data dir as
   trainer sessions, or should this run locally only? (It's gated, but it's intimate material.)
4. **Language:** sessions in Hebrew (matches the "your own voice" thesis) — confirm, or mixed?
5. **Name:** "Inner Coach" is a placeholder.
