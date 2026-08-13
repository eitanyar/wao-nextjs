# Trainer M4 — Multi-Scenario Support (Small Talk / Networking / Dating)

**Author:** Lior (strategist) · 2026-08-13
**Status:** Approved for execution — handoff tasks `2026-08-13_001…005` in `/handoff/pending/`.

## 1. Codebase analysis — what is already generalized vs. hardcoded

Already generalized (DO NOT touch):

| Layer | File(s) | Why it needs no change |
|---|---|---|
| Voice session rooms (Gemini / ElevenLabs) | `src/app/(product)/trainer/*-session-room.tsx`, `src/lib/trainer/gemini.ts`, `src/lib/trainer/engine.ts` | They consume a `TrainerPersona` object; any scenario's persona flows through unchanged. |
| Session minting | `src/app/api/trainer/session/route.ts` | Already loads any generated persona by `generatedId`, falls back to Danny. |
| Objective metrics | `src/lib/trainer/metrics.ts` | talkRatio / questions / fillers are scenario-agnostic. |
| Coach pipeline mechanics | `src/lib/trainer/coach.ts` | Already generates persona+scenario+**per-scenario rubric**, QA-gates it, caches it. Already accepts a `track` param end-to-end (`POST /api/trainer/next` body → `generateSession`). |
| Judge mechanics | `src/lib/trainer/judge.ts`, debrief route | Already scores against the **generated scenario's rubric** + `hiddenObjective`, not a fixed rubric. |
| History / profile / radar | `history.ts`, `profile.ts` | Keyed by arbitrary skill strings; new skills simply appear. |

Hardcoded to the sales use case (the actual gap — 4 spots):

1. **`COACH_SYSTEM_PROMPT`** (`prompts.ts`): "The persona is a realistic Israeli small-business owner — a genuine WAO prospect type" + grounding in the WAO onboarding corpus.
2. **`JUDGE_SYSTEM_PROMPT`** (`prompts.ts`): first paragraph frames every session as "move an Israeli small-business owner toward WAO's services".
3. **Corpus grounding** (`coach.ts` `loadCorpusSample`): always injected — wrong for small talk / dating.
4. **UI** (`session-of-day.tsx`): level selector exists; **no scenario tag selector**.

`charter.json` `trackWeights` already names three tracks (`T1_wao_funnel_selling`, `T2_professional_networking`, `T3_social_general`) but nothing downstream interprets the track string — it's passed to the Coach as a bare label.

## 2. Minimum architectural change

**One new config module + parametrized prompt builders. No data-model, engine, or storage changes.**

- New file `src/lib/trainer/scenarios.ts` — a `ScenarioConfig` registry (§4 below, verbatim). The scenario key **reuses the existing `track` field** everywhere (CoachResult, cache files, API body) — zero schema migration.
- `prompts.ts`: `COACH_SYSTEM_PROMPT` / `JUDGE_SYSTEM_PROMPT` become `buildCoachSystemPrompt(scenario)` / `buildJudgeSystemPrompt(scenario)`; the old constant names stay exported as the sales-built versions (back-compat, tests keep passing).
- `coach.ts`: resolve `track` → `ScenarioConfig`; gate corpus sampling on `scenario.useCorpus`; if a cached today-session's track ≠ requested track, generate fresh.
- Debrief: `resolvePersonaContext` additionally returns the generated file's `track`; `runJudge` takes it and builds the matching Judge system prompt. Danny fallback ⇒ `sales`.
- UI: a 4-tag scenario row on the session-of-day card; clicking a tag POSTs `{ track }` to the existing `/api/trainer/next`.

Unknown/legacy track strings (e.g. old `T1_wao_funnel_selling` cache files) resolve to `sales` via `getScenario()` — nothing breaks.

## 3. Evaluation criteria per scenario (what each trains)

- **Sales (existing, default):** unchanged — the 8 `DEFAULT_RUBRIC` skills (emotion labeling, listening, question quality, objection handling, framing, boundaries, brevity, closing).
- **Small Talk:** trains social ease, not persuasion. Success = warm mutual flow. Skills: natural opening, active listening (building on what was said), follow-up questions, balanced self-disclosure, smooth topic transitions, warmth, brevity, graceful exit.
- **Networking:** trains professional presence. Success = memorable intro + mutual value + concrete follow-up. Skills: elevator-pitch clarity (≤2 jargon-free sentences), question quality about *their* work, listening ratio, mutual-value discovery, memorability (specifics over generic pitch), framing, follow-up close.
- **Dating:** trains conversational confidence and attunement. Success = the persona feels heard and comfortable. Skills: warmth/authenticity, emotional attunement, curious open questions (not interview mode), disclosure reciprocity, humor/playfulness, confident pacing (pauses, talk ratio), boundary respect (a hard skill: pressure or pickup-artist tactics ⇒ 0-2). Charter red lines already ban sexual content and manipulation; one dating-specific red line is added.

Exact keys, Hebrew labels, weights, and descriptions are authored in §4 — the Coach must build each scenario's rubric only from its listed skill set, so the skill radar stays comparable across sessions.

## 4. Authored content (Lior-owned — engineer copies VERBATIM)

### 4a. `src/lib/trainer/scenarios.ts` — full file

```ts
/**
 * Scenario registry — AUTHORED BY LIOR (strategist), not the executor.
 *
 * Each scenario configures the Coach (what persona/world to generate), the
 * Judge (how to frame scoring), and the rubric skill set. The scenario key
 * reuses the existing `track` field end-to-end (CoachResult, cache files,
 * /api/trainer/next body) — no schema migration. Content changes only with
 * strategist sign-off, same discipline as prompts.ts.
 */

export type ScenarioKey = 'sales' | 'small_talk' | 'networking' | 'dating';

export interface ScenarioConfig {
  key: ScenarioKey;
  labelHe: string;
  labelEn: string;
  /** Ground the persona in the WAO onboarding corpus? Only true for sales. */
  useCorpus: boolean;
  /** Completes the Coach system prompt's first paragraph: who the persona is. */
  coachPersonaLine: string;
  /** Injected into the Coach user prompt: setting + what the trainee practices. */
  coachContext: string;
  /** The rubric skill set the Coach must draw from — exact keys/labels/weights. */
  rubricGuidance: string;
  /** First paragraph of the Judge system prompt — the scoring frame. */
  judgeIntro: string;
}

export const SCENARIOS: Record<ScenarioKey, ScenarioConfig> = {
  sales: {
    key: 'sales',
    labelHe: 'שיחת מכירה',
    labelEn: 'Sales',
    useCorpus: true,
    coachPersonaLine:
      'The persona is a realistic Israeli small-business owner — a genuine WAO prospect type.',
    coachContext:
      'SETTING: a phone call in which the trainee tries to move an Israeli small-business owner toward WAO\'s marketing services — opening a real discovery conversation, handling objections, and driving toward a concrete next step (a meeting, a follow-up, a decision). The persona answers the phone mid-workday.',
    rubricGuidance: `- emotion_labeling | שיקוף רגש | weight 1.5 | Named/reflected the other side's emotion (fear, frustration, skepticism) BEFORE answering content or pitching.
- listening_ratio | הקשבה | weight 1.2 | Let the other person talk; asked then made space. Grounded by the talkRatio metric.
- question_quality | איכות שאלות | weight 1.2 | Asked open, real questions that uncovered the actual pain or business reality.
- objection_handling | טיפול בהתנגדויות | weight 1.3 | Met price/skepticism/"been burned" objections without caving and without steamrolling; reframed rather than argued.
- framing_analogy | מסגור והסבר | weight 1.0 | Explained the offer in the listener's world, jargon-free, concrete; avoided feature-dumping.
- boundary_setting | הצבת גבולות | weight 1.0 | Held price and scope, and RESPECTED boundaries the other side set.
- brevity_pacing | קצב ותמציתיות | weight 1.0 | Answers were tight. Grounded by avgUserTurnChars / longestUserTurnChars.
- closing | סגירה | weight 1.2 | Drove toward a concrete next step; credit the close attempt itself, not whether the deal is contractually done.`,
    judgeIntro:
      'You are a demanding sales-conversation and EQ coach for WAO, an Israeli B2C marketing agency. You score a training role-play in which the trainee (role "user") tried to move an Israeli small-business owner (role "agent", played by a persona) toward WAO\'s services.',
  },

  small_talk: {
    key: 'small_talk',
    labelHe: 'שיחת חולין',
    labelEn: 'Small Talk',
    useCorpus: false,
    coachPersonaLine:
      'The persona is a realistic Israeli the trainee might meet in everyday life — a neighbor, a fellow parent at kindergarten pickup, someone seated next to them at a wedding, a regular at the gym, a person in a waiting room. NOT a business prospect; no one is buying or selling anything.',
    coachContext:
      'SETTING: an everyday, low-stakes chance encounter. The trainee practices starting and sustaining a pleasant casual conversation. Success is warmth and flow — there is no transaction, no pitch, no agenda. The persona has normal social guardedness toward small talk that eases when shown genuine interest and light reciprocal self-disclosure. The firstMessage should fit the setting naturally (a remark about the situation, a hesitant greeting, a question about something at hand) — not a phone-call opener.',
    rubricGuidance: `- opening_naturalness | פתיחה טבעית | weight 1.2 | Opened in a way that fits the shared context (the place, the moment), not a canned line; no awkward interview start.
- active_listening | הקשבה פעילה | weight 1.3 | Built on what the persona actually said — referenced their words, followed their threads instead of resetting topics. Grounded by the talkRatio metric.
- followup_questions | שאלות המשך | weight 1.2 | Asked light open follow-ups that invited the persona to keep talking, without interrogating.
- self_disclosure | שיתוף עצמי | weight 1.0 | Shared small genuine things about themselves in return — balanced, reciprocal, no monologue and no vault.
- topic_transitions | מעברי נושא | weight 1.0 | Moved between topics smoothly; rescued dead-ends gracefully instead of letting silence turn awkward.
- warmth_positivity | חום וחיוביות | weight 1.0 | Kept the tone light and generous; humor or appreciation where natural; no complaining spiral.
- brevity_pacing | קצב ותמציתיות | weight 1.0 | Turns were conversational in length. Grounded by avgUserTurnChars / longestUserTurnChars.
- graceful_exit | סיום חינני | weight 1.1 | Ended the exchange warmly and left the door open (a wish, a "see you around", a light reason to talk again) — did not trail off or escape abruptly.`,
    judgeIntro:
      'You are a demanding conversation and EQ coach. You score a training role-play in which the trainee (role "user") practiced casual small talk with an Israeli stranger or acquaintance (role "agent", played by a persona) in an everyday setting. Success is a warm, flowing, mutually enjoyable exchange — NOT persuasion, selling, or extracting anything. Judge social ease, not outcomes.',
  },

  networking: {
    key: 'networking',
    labelHe: 'נטוורקינג',
    labelEn: 'Networking',
    useCorpus: false,
    coachPersonaLine:
      'The persona is a realistic Israeli professional the trainee might meet at a conference, meetup, or business event — a potential partner, a peer founder, a prospective client, or a senior figure with limited time and attention. They are NOT waiting to be pitched.',
    coachContext:
      'SETTING: a professional event (conference break, meetup, business gathering). The trainee practices introducing themselves and WAO crisply, showing genuine interest in the other person\'s work, finding real mutual value, and earning a concrete follow-up (coffee, an intro, exchanging details). The persona is polite but time-boxed and allergic to being pitched; they open up to genuine curiosity about THEIR work. The firstMessage should fit the event setting.',
    rubricGuidance: `- self_intro_clarity | הצגה עצמית | weight 1.4 | Introduced who they are and the value they create in at most two tight, jargon-free sentences; no rambling bio, no buzzwords.
- question_quality | איכות שאלות | weight 1.2 | Asked genuine, specific questions about the OTHER person's work and challenges — showed interest before relevance.
- listening_ratio | הקשבה | weight 1.1 | Made space; did not turn the exchange into a monologue about themselves. Grounded by the talkRatio metric.
- mutual_value_discovery | זיהוי ערך הדדי | weight 1.3 | Found and named a concrete overlap — where the two sides could actually help each other — rather than a generic "let's keep in touch".
- memorability | זכירות | weight 1.0 | Left a concrete hook — a specific example, story, or sharp phrasing — instead of an interchangeable generic pitch.
- framing_analogy | מסגור והסבר | weight 1.0 | Explained what they do in the listener's world, concrete and jargon-free.
- followup_close | סגירת המשך | weight 1.3 | Proposed a specific, low-friction next step (coffee, an intro, sending something) and asked for it plainly; credit the ask itself even if the persona defers.`,
    judgeIntro:
      'You are a demanding networking and EQ coach. You score a training role-play in which the trainee (role "user") practiced professional networking with an Israeli professional (role "agent", played by a persona) at a business event. Success is a clear memorable self-introduction, genuine mutual discovery, and a concrete follow-up step — a hard sell or a monologue about oneself is a failure even if fluent.',
  },

  dating: {
    key: 'dating',
    labelHe: 'דייטינג',
    labelEn: 'Dating',
    useCorpus: false,
    coachPersonaLine:
      'The persona is a realistic Israeli woman on a first date with the trainee — they matched on an app or were introduced by a mutual friend. Give her a real life, real interests, a mood, and a distinct energy level (shy, talkative, guarded, playful). Keep it fully respectful — no sexual content.',
    coachContext:
      'SETTING: a first date at a café or bar, first minutes in. The trainee practices relaxed, authentic conversation — being curious, sharing back, reading the other side\'s energy, and staying confident without dominating. Success is genuine connection: the persona feels heard, comfortable, and curious for more. The hidden objective must be about emotional attunement (e.g. she opens up only when her mood or a deflection is noticed and respected), never about being "won". The firstMessage should fit the setting (sitting down, a greeting, a nervous opener). Strictly no sexual content, no pickup-artist dynamics.',
    rubricGuidance: `- warmth_authenticity | חום ואותנטיות | weight 1.3 | Came across as a genuine person, not a rehearsed performance; reacted honestly, admitted small human things.
- emotional_attunement | כוונון רגשי | weight 1.3 | Noticed and gently named the persona's mood or energy (nervousness, guardedness, excitement) and adapted to it.
- curiosity_questions | שאלות מסקרנות | weight 1.2 | Asked open questions that went somewhere real — interests, stories, what she cares about — without slipping into interview mode.
- disclosure_reciprocity | הדדיות בשיתוף | weight 1.2 | Matched depth — shared about himself in proportion; neither interrogated nor monologued. Grounded by the talkRatio metric.
- humor_playfulness | הומור וקלילות | weight 1.0 | Kept moments light and playful where natural; humor that includes, never humor at her expense.
- confident_pacing | ביטחון וקצב | weight 1.1 | Comfortable with pauses; no nervous rambling or over-explaining. Grounded by avgUserTurnChars / fillerPer100Words.
- boundary_respect | כיבוד גבולות | weight 1.3 | Read signals and respected deflections — changed topic when she deflected, never pushed, pressured, or negged. Any manipulation or pickup tactic scores this 0-2 regardless of fluency.`,
    judgeIntro:
      'You are a demanding conversation and EQ coach. You score a first-date role-play in which the trainee (role "user") practiced authentic dating conversation with an Israeli woman (role "agent", played by a persona). Success is genuine connection: she feels heard, comfortable, and curious for more. Any pressure, manipulation, or pickup-artist tactic is a hard failure on boundary_respect (score 0-2) no matter how smooth the delivery.',
  },
};

export const DEFAULT_SCENARIO_KEY: ScenarioKey = 'sales';

/** Resolves any track string (including legacy charter keys) to a scenario — unknown ⇒ sales. */
export function getScenario(key: string | undefined | null): ScenarioConfig {
  if (key && key in SCENARIOS) return SCENARIOS[key as ScenarioKey];
  return SCENARIOS[DEFAULT_SCENARIO_KEY];
}

/** Hebrew labels for every scenario rubric skill — for the dashboard (memos, radar table). */
export const SKILL_LABELS_HE: Record<string, string> = {
  emotion_labeling: 'שיקוף רגש', listening_ratio: 'הקשבה', question_quality: 'איכות שאלות',
  objection_handling: 'טיפול בהתנגדויות', framing_analogy: 'מסגור והסבר', boundary_setting: 'הצבת גבולות',
  brevity_pacing: 'קצב ותמציתיות', closing: 'סגירה',
  opening_naturalness: 'פתיחה טבעית', active_listening: 'הקשבה פעילה', followup_questions: 'שאלות המשך',
  self_disclosure: 'שיתוף עצמי', topic_transitions: 'מעברי נושא', warmth_positivity: 'חום וחיוביות',
  graceful_exit: 'סיום חינני',
  self_intro_clarity: 'הצגה עצמית', mutual_value_discovery: 'זיהוי ערך הדדי', memorability: 'זכירות',
  followup_close: 'סגירת המשך',
  warmth_authenticity: 'חום ואותנטיות', emotional_attunement: 'כוונון רגשי', curiosity_questions: 'שאלות מסקרנות',
  disclosure_reciprocity: 'הדדיות בשיתוף', humor_playfulness: 'הומור וקלילות', confident_pacing: 'ביטחון וקצב',
  boundary_respect: 'כיבוד גבולות',
};
```

### 4b. `prompts.ts` — new Coach system-prompt builder (replaces the `COACH_SYSTEM_PROMPT` constant body)

```ts
import type { ScenarioConfig } from './scenarios';

export function buildCoachSystemPrompt(scenario: ScenarioConfig): string {
  const groundingSource = scenario.useCorpus
    ? '2-3 real vertical persona records sampled from WAO\'s onboarding data (their real niches, fears, objections)'
    : 'a SCENARIO CONTEXT brief describing the setting and who the persona should be';
  const groundingRule = scenario.useCorpus
    ? '- Ground the persona in the sampled real vertical data (niche, actual fears, actual objections) — do not invent a generic buyer.'
    : '- Ground the persona in the SCENARIO CONTEXT — invent a specific, believable individual with a real life, real details, and a distinct mood. Never a generic archetype.';

  return `You are the Coach for WAO's articulation trainer. You generate ONE Hebrew role-play persona plus a scenario for the trainee (Eitan) to practice against by voice. ${scenario.coachPersonaLine}

You receive: the training charter (goals, RED LINES, tone), ${groundingSource}, the scenario context, the rubric skill set, and the target difficulty level.

HARD RULES:
- The charter's redLines are absolute. Never generate a scenario that rehearses manipulation, deception, false scarcity, lying about results/pricing, or any listed red line. If the target would require it, generate a legitimate variant instead.
- The persona speaks NATIVE SPOKEN ISRAELI HEBREW — dialect, impatience, sentence fragments, slang where real. NEVER literary Hebrew, NEVER translated-from-English register. This realism is the entire product.
${groundingRule}
- Build the scenario rubric ONLY from the RUBRIC SKILL SET given in the user prompt — use its exact skill keys, Hebrew labels, and weights; pick 5-8 of them, the most relevant to the concrete scenario you generate.
- Use Hebrew typography correctly: gershayim (״) and geresh (׳), never ASCII quotes; em-dash single-spaced; no double spaces.

DIFFICULTY LEVEL:
- L1: cooperative, answers openly, mild objections, generous pacing.
- L2: realistic resistance, one hidden objection or reservation, needs some trust before opening.
- L3: hostile/chaotic — interrupts, is skeptical or closed-off, emotional bait, NOT won over by weak moves; the persona should actively test the trainee.

OUTPUT — strict JSON only, no markdown fence:
{
  "persona": {
    "id": "<kebab-case-hebrew-transliterated, e.g. moshe-skeptical-electrician>",
    "name": "<Hebrew first name>",
    "archetype": "skeptic|rambler|aggressive|anxious|analytical|friendly-flake|price-hunter|silent|shy|playful|guarded",
    "systemPrompt": "<Hebrew role-play prompt: who they are, mood, background, how they open, and their hidden agenda. Written in 2nd person to the model playing them, like the Danny persona. Instruct them to stay in character and speak only as the persona.>",
    "firstMessage": "<Hebrew opening line the persona says first — must fit the scenario's setting>",
    "situation": "<Hebrew context card shown to the trainee before starting: the setting, who they're talking to, and the goal>",
    "hiddenObjective": "<Hebrew: the real condition that softens/moves this persona — the Judge's scoring key. Do NOT reveal it in systemPrompt's spoken behavior; it's internal.>"
  },
  "scenario": {
    "id": "<kebab-case>",
    "title": "<Hebrew short title>",
    "level": <1|2|3>,
    "personaId": "<matches persona.id>",
    "situation": "<same as persona.situation or a scenario-specific framing>",
    "firstMessage": "<matches persona.firstMessage>",
    "goal": "<Hebrew: the trainee's success condition for this scenario>",
    "timeCapMin": 8,
    "rubric": [ { "skill": "<key from the RUBRIC SKILL SET>", "labelHe": "<its Hebrew label>", "weight": <its weight>, "description": "<its description, English>" }, ... 5-8 skills ]
  }
}

Return nothing but the JSON object.`;
}

export const COACH_SYSTEM_PROMPT = buildCoachSystemPrompt(SCENARIOS.sales); // back-compat
```

(`SCENARIOS` imported from `./scenarios`; import must be `import { SCENARIOS, type ScenarioConfig } from './scenarios';` — `scenarios.ts` imports nothing from `prompts.ts`, so no cycle.)

### 4c. `prompts.ts` — Judge system-prompt builder

The current `JUDGE_SYSTEM_PROMPT` keeps everything from its second paragraph ("You will receive: …") onward VERBATIM. Only the first paragraph becomes `scenario.judgeIntro`:

```ts
export function buildJudgeSystemPrompt(scenario: ScenarioConfig): string {
  return `${scenario.judgeIntro}\n\n${JUDGE_SYSTEM_BODY}`;
}
export const JUDGE_SYSTEM_PROMPT = buildJudgeSystemPrompt(SCENARIOS.sales); // back-compat
```

where `JUDGE_SYSTEM_BODY` is a private constant holding the existing prompt text from "You will receive:" to the end, unchanged.

### 4d. `buildCoachUserPrompt` additions

Signature gains `scenario: ScenarioConfig`. Appended to the returned string, between the corpus block and `TARGET TRACK`:

```
SCENARIO: ${scenario.labelEn} (${scenario.key})
SCENARIO CONTEXT:
${scenario.coachContext}

RUBRIC SKILL SET (build the rubric ONLY from these — exact keys, Hebrew labels, weights):
${scenario.rubricGuidance}
```

When `scenario.useCorpus` is false, the `REAL VERTICAL SAMPLE` block is omitted entirely (caller passes `corpusSample: []`).

### 4e. `data/trainer/charter.json` changes (owner: Eitan — flag for his review)

- `trackWeights` → `{ "sales": 0.55, "networking": 0.2, "small_talk": 0.15, "dating": 0.1 }`
- Append red line: `"Dating scenarios train authentic connection and confidence — never pickup-artist tactics, negging, pressure, or any sexual content."`

## 5. Task sequence

| Seq | Target | Task | Depends on |
|---|---|---|---|
| 001 | waoengineer | Create `scenarios.ts` + charter update | — |
| 002 | waoengineer | Parametrize prompts + coach.ts wiring | 001 |
| 003 | waoengineer | Judge/debrief scenario threading | 001, 002 |
| 004 | waoengineer | Scenario tag selector UI + skill labels | 001–003 |
| 005 | waoverifier | Runtime verification of all four flows | 001–004 |
