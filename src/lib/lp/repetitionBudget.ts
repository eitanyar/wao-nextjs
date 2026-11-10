/**
 * Copy v2 slice 5 (docs/missions/site-bot-code-owns-facts-2026-11-10.md): the repetition budget, as drops, never repairs.
 *
 * One ordered list of the page's rendered strings, in render order, including the code-built ones (trust bar, B6 proof, price
 * promise line, cost FAQ). Clause keys (clauseRepeatKeys: a run of CLAUSE_REPEAT_MIN_WORDS words inside one clause, at least
 * two of them not free) are owned by the first full statement; a later string that repeats an owned key is over budget (a
 * short reference of three words or fewer never forms a key, so it is always allowed). Code-built strings own their keys
 * first and are never dropped.
 *
 * What is over budget is dropped, whole: a card loses its description (the name stays), a process step or a Q&A item goes
 * (the block falls back to null below its minimum), a story / about sentence goes while the minimum sentence count holds, a
 * nullable heading becomes null. The hero, the about headline and the form headline are never dropped (the gates and the one
 * repair take what is left). Depth items and card descriptions also pass a novelty test: an item that adds fewer than
 * NOVELTY_MIN_NEW_WORDS new words, or under NOVELTY_MIN_SHARE of its content words, adds nothing and is dropped.
 *
 * Item 5: storyHeadline is dropped when its clause keys are a subset of storyBody (the hidden fallback heading takes over);
 * an aboutPageBody sentence sharing a run of STORY_ABOUT_ECHO_MIN_WORDS words with a storyBody sentence is dropped (the
 * about section renders later). Site-wide: a key the homepage owns (priorMechanismKeys) may appear in at most
 * PRIOR_KEY_MAX_STRINGS strings of a later page; past that, the same drops apply.
 *
 * Pure: decisions only (field, sentence index, reason); researchPageCopy applies them. HEBREW-SAFETY: ZERO Hebrew bytes.
 */
import { clauseRepeatKeys, echoTokens, longestSharedRun } from './copyGates';
import { prefixForms, stemSet, textWords } from './depthBlocks';
import { proseSentences } from './factRestatement';

type Loose = Record<string, unknown>;

/** A new word must not be a prefix form of a word already on the page; the item needs at least this many ... */
export const NOVELTY_MIN_NEW_WORDS = 3;
/** ... and at least this share of its content words new. */
export const NOVELTY_MIN_SHARE = 0.4;
/** Content words have at least this many letters (shorter words are function words). */
export const NOVELTY_MIN_WORD_LETTERS = 3;
/** Item 5: a story / about sentence pair sharing a run of this many words is an echo. */
export const STORY_ABOUT_ECHO_MIN_WORDS = 5;
/** Site-wide: a homepage key may appear in at most this many strings of a later page. */
export const PRIOR_KEY_MAX_STRINGS = 2;

/** One rendered string of the page. `code` = built by the system (owns its keys first, never dropped). */
export interface BudgetString {
  field: string;
  value: string;
  code: boolean;
}

/** The code-built strings that are not stored in the copy (the hero price promise line, the cost FAQ). */
export interface BudgetCodeStrings {
  pricePromises: readonly string[];
  costFaq: { q: string; a: string } | null;
  /** Copy fields the code builds (CODE_OWNED_FACT_FIELDS while code owns the facts). */
  codeOwnedFields: readonly string[];
}

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';
const isPlain = (value: unknown): value is Loose => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Render order of the research page (researchedSite.ts page body), with the code-built slots. */
export const BUDGET_RENDER_ORDER: readonly string[] = [
  'heroHeadline', 'heroSubheadline', '$pricePromises', 'trustBarItems', 'storyHeadline', 'storyBody', 'processHeadline', 'processSteps',
  '$costFaq', 'proofHeadline', 'proofItems', 'qaHeadline', 'qaItems', 'serviceDetails', 'aboutPageHeadline', 'aboutPageBody', 'formHeadline',
];

/** The page's rendered strings in render order (fields the page type does not render are skipped; system names never count). */
export function budgetStrings(copy: Loose, code: BudgetCodeStrings, renderedFields: readonly string[]): BudgetString[] {
  const out: BudgetString[] = [];
  const push = (field: string, value: unknown, isCode: boolean) => { if (nonEmpty(value)) out.push({ field, value, code: isCode }); };
  for (const slot of BUDGET_RENDER_ORDER) {
    if (slot === '$pricePromises') { code.pricePromises.forEach((item, index) => push(`$pricePromises[${index}]`, item, true)); continue; }
    if (slot === '$costFaq') { if (code.costFaq) { push('$costFaq.q', code.costFaq.q, true); push('$costFaq.a', code.costFaq.a, true); } continue; }
    if (!renderedFields.includes(slot)) continue;
    const isCode = code.codeOwnedFields.includes(slot);
    const value = copy[slot];
    if (typeof value === 'string') { push(slot, value, isCode); continue; }
    if (!Array.isArray(value)) continue;
    value.forEach((item, index) => {
      if (typeof item === 'string') push(`${slot}[${index}]`, item, isCode);
      else if (isPlain(item)) {
        // The Q&A question is the pool's (slice 6 makes it code-owned): only the answer is budgeted.
        for (const key of slot === 'qaItems' ? ['a'] : slot === 'serviceDetails' ? ['description'] : ['text']) push(`${slot}[${index}].${key}`, item[key], isCode);
      }
    });
  }
  return out;
}

export type BudgetReason = 'over_budget' | 'no_novelty' | 'prior_key' | 'story_headline_echo' | 'story_about_echo';

/** One drop decision: the field path (an item's text path for items), and for prose the sentence index. */
export interface BudgetDecision {
  field: string;
  sentence?: number;
  reason: BudgetReason;
}

/** Prose fields: over-budget sentences are dropped (while the minimum holds). */
export const BUDGET_PROSE_FIELDS: readonly string[] = ['storyBody', 'aboutPageBody'];
/** Item fields: dropped whole when over budget or when they add nothing new. */
const ITEM_FIELD = /^(?:serviceDetails\[\d+\]\.description|processSteps\[\d+\]\.text|qaItems\[\d+\]\.a)$/;
/** The Q&A question (from the pool) never decides alone; its answer does. Headings that may become null. */
const NULLABLE_HEADINGS: readonly string[] = ['storyHeadline', 'processHeadline', 'qaHeadline'];

export function isBudgetItemField(field: string): boolean {
  return ITEM_FIELD.test(field);
}

/** Bare content words of a text: letters only at the edges, lower-cased, at least NOVELTY_MIN_WORD_LETTERS letters. */
function contentWords(value: string, free: ReadonlySet<string>): string[] {
  return textWords(value)
    .map(word => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').normalize('NFC').toLowerCase())
    .filter(word => (word.match(/\p{L}/gu) ?? []).length >= NOVELTY_MIN_WORD_LETTERS)
    .filter(word => !prefixForms(word).some(form => free.has(form)));
}

/** The novelty of a text against the page so far: new content words (no prefix form already on the page), and their share. */
export function novelty(value: string, pageStems: ReadonlySet<string>, free: ReadonlySet<string>): { words: number; fresh: number; share: number } {
  const words = contentWords(value, free);
  const fresh = words.filter(word => !prefixForms(word).some(form => pageStems.has(form))).length;
  return { words: words.length, fresh, share: words.length ? fresh / words.length : 0 };
}

/** True when an item adds nothing new (fewer than NOVELTY_MIN_NEW_WORDS new words or under NOVELTY_MIN_SHARE new). */
export function addsNothing(value: string, pageStems: ReadonlySet<string>, free: ReadonlySet<string>): boolean {
  const score = novelty(value, pageStems, free);
  return score.fresh < NOVELTY_MIN_NEW_WORDS || score.share < NOVELTY_MIN_SHARE;
}

/** Counted keys of a string (sentence by sentence for prose). */
const keysOf = (value: string, free: ReadonlySet<string>) => clauseRepeatKeys(value, free);

export interface BudgetOptions {
  /** phraseRepeatFreeTokens of the page (names, places, service labels, the search anchor). */
  free: ReadonlySet<string>;
  /** Keys the homepage owns (a later page only); filtered by this page's free tokens. */
  priorKeys?: readonly string[];
  /** Minimum sentence counts of the prose fields. */
  minSentences: Readonly<Record<string, number>>;
}

/**
 * Item 5: the story headline / story body and story body / about body echoes. Decisions only; the about sentence drop
 * keeps the about minimum (the decisions never take a field below it).
 */
export function storyEchoDecisions(copy: Loose, free: ReadonlySet<string>, minSentences: Readonly<Record<string, number>>): BudgetDecision[] {
  const out: BudgetDecision[] = [];
  const body = nonEmpty(copy.storyBody) ? copy.storyBody : '';
  if (nonEmpty(copy.storyHeadline) && body) {
    const headKeys = keysOf(copy.storyHeadline, free);
    const bodyKeys = new Set(keysOf(body, free));
    const bodyStems = stemSet(body);
    const words = contentWords(copy.storyHeadline, free);
    const subset = headKeys.length ? headKeys.every(key => bodyKeys.has(key)) : words.length >= 2 && words.every(word => prefixForms(word).some(form => bodyStems.has(form)));
    if (subset) out.push({ field: 'storyHeadline', reason: 'story_headline_echo' });
  }
  if (body && nonEmpty(copy.aboutPageBody)) {
    const story = proseSentences(body).map(echoTokens);
    const about = proseSentences(copy.aboutPageBody);
    let kept = about.length;
    about.forEach((sentence, index) => {
      if (kept - 1 < (minSentences.aboutPageBody ?? about.length)) return;
      const tokens = echoTokens(sentence);
      if (story.some(other => longestSharedRun(tokens, other) >= STORY_ABOUT_ECHO_MIN_WORDS)) {
        out.push({ field: 'aboutPageBody', sentence: index, reason: 'story_about_echo' });
        kept--;
      }
    });
  }
  return out;
}

/**
 * The budget decisions of one page (story echoes first, then key ownership and novelty in render order). `strings` is
 * budgetStrings(); the story echo decisions are applied to the ownership pass (a dropped sentence or heading owns nothing).
 */
export function repetitionBudgetDecisions(copy: Loose, strings: readonly BudgetString[], options: BudgetOptions): BudgetDecision[] {
  const { free, minSentences } = options;
  const decisions = storyEchoDecisions(copy, free, minSentences);
  const droppedSentences = new Map<string, Set<number>>();
  for (const decision of decisions) {
    if (decision.sentence === undefined) continue;
    const set = droppedSentences.get(decision.field) ?? new Set<number>();
    set.add(decision.sentence);
    droppedSentences.set(decision.field, set);
  }
  const droppedFields = new Set(decisions.filter(decision => decision.sentence === undefined).map(decision => decision.field));
  const prior = new Set((options.priorKeys ?? []).filter(key => keysOf(key, free).includes(key)));
  const priorUse = new Map<string, number>();
  const owners = new Map<string, string>();
  const pageStems = new Set<string>();
  const own = (field: string, value: string) => {
    for (const key of keysOf(value, free)) if (!owners.has(key)) owners.set(key, field);
    for (const stem of stemSet(value)) pageStems.add(stem);
  };
  /** Over budget: a key owned by another field, or a homepage key already used in PRIOR_KEY_MAX_STRINGS strings here. */
  const overBudget = (field: string, value: string): BudgetReason | null => {
    const keys = keysOf(value, free);
    if (keys.some(key => owners.has(key) && owners.get(key) !== field)) return 'over_budget';
    if (keys.some(key => prior.has(key) && (priorUse.get(key) ?? 0) >= PRIOR_KEY_MAX_STRINGS)) return 'prior_key';
    return null;
  };
  const countPrior = (value: string) => { for (const key of new Set(keysOf(value, free))) if (prior.has(key)) priorUse.set(key, (priorUse.get(key) ?? 0) + 1); };
  // Code-built strings own their keys first (they are fixed; the model's repeat of them is the one over budget).
  for (const item of strings) if (item.code) own(item.field, item.value);
  // The story headline is the label of the story body: the body is judged first.
  const order = [...strings.filter(item => !item.code)];
  const headline = order.findIndex(item => item.field === 'storyHeadline');
  const body = order.findIndex(item => item.field === 'storyBody');
  if (headline >= 0 && body > headline) order.splice(body + 1, 0, ...order.splice(headline, 1));
  for (const item of order) {
    if (droppedFields.has(item.field)) continue;
    if (BUDGET_PROSE_FIELDS.includes(item.field)) {
      const parts = proseSentences(item.value);
      const dropped = droppedSentences.get(item.field) ?? new Set<number>();
      let kept = parts.length - dropped.size;
      parts.forEach((sentence, index) => {
        if (dropped.has(index)) return;
        const reason = overBudget(item.field, sentence);
        if (reason && kept - 1 >= (minSentences[item.field] ?? parts.length)) {
          decisions.push({ field: item.field, sentence: index, reason });
          kept--;
          return;
        }
        countPrior(sentence);
        own(item.field, sentence);
      });
      continue;
    }
    if (isBudgetItemField(item.field) || NULLABLE_HEADINGS.includes(item.field)) {
      const reason = overBudget(item.field, item.value) ?? (isBudgetItemField(item.field) && addsNothing(item.value, pageStems, free) ? 'no_novelty' : null);
      if (reason) { decisions.push({ field: item.field, reason }); continue; }
    }
    countPrior(item.value);
    own(item.field, item.value);
  }
  return decisions;
}

/**
 * Report metric ("mechanism count"): the most strings of the page that share one counted key (1 = every statement made once;
 * keys shared only by code-built strings do not count).
 * With `keys`, only those keys are counted (e.g. the homepage's keys on a later page).
 */
export function maxStatementRepeat(strings: readonly BudgetString[], free: ReadonlySet<string>, keys?: ReadonlySet<string>): number {
  const count = new Map<string, Set<string>>();
  const model = new Set<string>();
  for (const item of strings) {
    for (const key of keysOf(item.value, free)) {
      if (keys && !keys.has(key)) continue;
      const set = count.get(key) ?? new Set<string>();
      set.add(item.field.replace(/\.(?:q|a|text|description)$/, ''));
      count.set(key, set);
      if (!item.code) model.add(key);
    }
  }
  // A key only the system's own strings share (trust bar and proof of one fact) is not a model repeat.
  return Math.max(0, ...[...count.entries()].filter(([key]) => model.has(key)).map(([, set]) => set.size));
}

/** Site-wide: the clause keys of a page's model-written rendered strings (no free tokens yet; the later page filters them). */
export function statementKeys(copy: Loose, renderedFields: readonly string[], codeOwnedFields: readonly string[]): string[] {
  const strings = budgetStrings(copy, { pricePromises: [], costFaq: null, codeOwnedFields }, renderedFields).filter(item => !item.code);
  return [...new Set(strings.flatMap(item => keysOf(item.value, new Set())))];
}
