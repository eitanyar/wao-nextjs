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
- objection_handling | טיפול בהתנגדויות | weight 1.3 | Met price/skepticism/\"been burned\" objections without caving and without steamrolling; reframed rather than argued.
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
