/**
 * Content depth (Yonatan's spec, Eitan-approved 2026-11-10; before-M3 part): the service-page blocks
 * B1 process steps, B4 Q&A and B6 proof. Pure helpers: block limits and shapes, the fact-trace and
 * term-density checks, visible word counts, and the cross-client similarity helper.
 *
 * Every block item carries the brief fact IDs it was written from (factIds). Nothing here imports the
 * gate module (copyGates.ts calls in, passing its detectors), so there is no import cycle.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import { PREFIX_LETTERS } from './hebrewPrefixLetters';

export interface DepthProcessStep { text: string; factIds: string[] }
export interface DepthQaItem { questionId: string; q: string; a: string; factIds: string[] }
export interface DepthProofItem { text: string; factIds: string[] }

/** The depth fields of a SiteCopy (each absent on records generated before content depth). */
export interface DepthBlockCopy {
  processHeadline?: string | null;
  processSteps?: DepthProcessStep[] | null;
  qaHeadline?: string | null;
  qaItems?: DepthQaItem[] | null;
  proofHeadline?: string | null;
  proofItems?: DepthProofItem[] | null;
}

export type DepthBlockId = 'process' | 'qa' | 'proof';

/** Block limits (brief: B1 3-6 steps of at most 25 words; B4 3-6 items, answers at most 60 words; B6 proof facts). */
export const DEPTH_BLOCK_LIMITS = {
  headlineMaxChars: 40,
  process: { minItems: 3, maxItems: 6, maxWords: 25, maxChars: 200 },
  qa: { minItems: 3, maxItems: 6, maxQuestionChars: 160, maxAnswerWords: 60, maxAnswerChars: 420 },
  proof: { minItems: 1, maxItems: 4, maxWords: 25, maxChars: 200 },
  /** B6: at most this many verbatim reviews (system-filled from the owner's review data). */
  maxReviews: 2,
  maxFactIds: 6,
} as const;

/** The JSON budget of the depth fields, counted apart from SITE_COPY_MAX_BYTES so a deep page never squeezes the base fields. */
export const DEPTH_BLOCKS_MAX_BYTES = 12 * 1024;

export const DEPTH_BLOCKS: ReadonlyArray<{ id: DepthBlockId; headline: keyof DepthBlockCopy; items: keyof DepthBlockCopy }> = [
  { id: 'process', headline: 'processHeadline', items: 'processSteps' },
  { id: 'qa', headline: 'qaHeadline', items: 'qaItems' },
  { id: 'proof', headline: 'proofHeadline', items: 'proofItems' },
];

/** Every depth key, in output order. */
export const DEPTH_BLOCK_KEYS: readonly string[] = DEPTH_BLOCKS.flatMap(block => [block.headline, block.items]);
export const DEPTH_HEADLINE_KEYS: readonly string[] = DEPTH_BLOCKS.map(block => block.headline);
export const DEPTH_ITEM_KEYS: readonly string[] = DEPTH_BLOCKS.map(block => block.items);
/** Item keys that hold model text (gated); factIds / questionId are references, never page text. */
export const DEPTH_TEXT_KEYS: Readonly<Record<DepthBlockId, readonly string[]>> = { process: ['text'], qa: ['q', 'a'], proof: ['text'] };
/** Item keys that are references, never gated as copy text. */
export const DEPTH_REFERENCE_KEYS: readonly string[] = ['factIds', 'questionId'];

/** Content depth renders on service (money) pages only. */
export function rendersDepthBlocks(classification: string): boolean {
  return classification === 'money_service';
}

type Loose = Record<string, unknown>;

const isPlain = (value: unknown): value is Loose => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** Words of a text: whitespace-separated runs holding a letter or a digit (punctuation and dashes are not words). */
export function textWords(value: string): string[] {
  return value.split(/\s+/u).filter(token => /[\p{L}\p{N}]/u.test(token));
}

export function wordCount(value: string): number {
  return textWords(value).length;
}

function factIdsOk(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= DEPTH_BLOCK_LIMITS.maxFactIds && value.every(nonEmpty);
}

function exactKeys(item: Loose, keys: readonly string[]): boolean {
  const own = Object.keys(item);
  return own.length === keys.length && keys.every(key => own.includes(key));
}

/** Why one block's item list is malformed (null = well-formed). Shape only: fact tracing is a gate, not shape. */
export function depthItemsProblem(id: DepthBlockId, value: unknown): string | null {
  if (!Array.isArray(value)) return 'type';
  const limits = DEPTH_BLOCK_LIMITS[id];
  if (value.length < limits.minItems) return 'min_items';
  if (value.length > limits.maxItems) return 'max_items';
  for (const item of value) {
    if (!isPlain(item)) return 'item_type';
    if (id === 'qa') {
      const qa = DEPTH_BLOCK_LIMITS.qa;
      if (!exactKeys(item, ['questionId', 'q', 'a', 'factIds']) || !nonEmpty(item.questionId) || !nonEmpty(item.q) || !nonEmpty(item.a)) return 'item_keys';
      if ((item.q as string).length > qa.maxQuestionChars || (item.a as string).length > qa.maxAnswerChars) return 'item_chars';
      if (wordCount(item.a as string) > qa.maxAnswerWords) return 'item_words';
    } else {
      const block = DEPTH_BLOCK_LIMITS[id];
      if (!exactKeys(item, ['text', 'factIds']) || !nonEmpty(item.text)) return 'item_keys';
      if ((item.text as string).length > block.maxChars) return 'item_chars';
      if (wordCount(item.text as string) > block.maxWords) return 'item_words';
    }
    if (!factIdsOk(item.factIds)) return 'fact_ids';
  }
  return null;
}

/** Well-formed headline: a non-empty string within the limit. */
export function depthHeadlineOk(value: unknown): value is string {
  return nonEmpty(value) && value.length <= DEPTH_BLOCK_LIMITS.headlineMaxChars;
}

/** Validator view: every present depth key is null or well-formed. */
export function depthShapeViolations(value: Loose): Array<{ field: string; rule: string }> {
  const out: Array<{ field: string; rule: string }> = [];
  for (const block of DEPTH_BLOCKS) {
    if (block.headline in value && value[block.headline] !== null && !depthHeadlineOk(value[block.headline])) out.push({ field: block.headline, rule: 'depth_headline' });
    if (block.items in value && value[block.items] !== null) {
      const problem = depthItemsProblem(block.id, value[block.items]);
      if (problem) out.push({ field: block.items, rule: `depth_${problem}` });
    }
  }
  const depth = Object.fromEntries(DEPTH_BLOCK_KEYS.filter(key => key in value).map(key => [key, value[key]]));
  try {
    const bytes = Buffer.byteLength(JSON.stringify(depth), 'utf8');
    if (bytes > DEPTH_BLOCKS_MAX_BYTES) out.push({ field: '$depth', rule: 'depth_max_bytes' });
  } catch {
    out.push({ field: '$depth', rule: 'depth_not_serializable' });
  }
  return out;
}

/** Normalised H1 head-term comparison (whitespace, case, NFC). */
const normalized = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * System pass over the depth fields of one service page (withSystemFields): keys of a block this page may not generate
 * are removed; a malformed item list becomes null (dropped whole, never edited); a headline that is malformed, belongs to a
 * dropped block, or repeats the H1 head term verbatim becomes null (the renderer then shows the approved fallback H2).
 * Returns the reasons (field + rule; never copy text). An absent key stays absent.
 */
export function settleDepthBlocks(next: Loose, enabled: Readonly<Record<DepthBlockId, boolean>> | null, anchorName: string | null): Array<{ field: string; rule: string }> {
  const notes: Array<{ field: string; rule: string }> = [];
  for (const block of DEPTH_BLOCKS) {
    if (!enabled?.[block.id]) {
      delete next[block.headline];
      delete next[block.items];
      continue;
    }
    if (block.items in next && next[block.items] !== null) {
      const problem = depthItemsProblem(block.id, next[block.items]);
      if (problem) {
        notes.push({ field: block.items, rule: `depth_${problem}` });
        next[block.items] = null;
      }
    }
    if (!(block.headline in next)) continue;
    const headline = next[block.headline];
    const itemsGone = !(block.items in next) || next[block.items] === null;
    if (headline !== null && (!depthHeadlineOk(headline) || itemsGone)) {
      if (!itemsGone) notes.push({ field: block.headline, rule: 'depth_headline' });
      next[block.headline] = null;
    } else if (typeof headline === 'string' && anchorName && normalized(headline).includes(normalized(anchorName))) {
      notes.push({ field: block.headline, rule: 'depth_headline_repeats_h1_term' });
      next[block.headline] = null;
    }
  }
  return notes;
}

/**
 * Noa corrects the Hebrew; the references stay Tamar's. Per block: when Noa returned the same number of items, each item
 * takes Noa's text keys and Tamar's factIds / questionId; otherwise Tamar's block stands. A key Noa dropped comes back
 * from Tamar; an explicit null from Noa stays null.
 */
export function mergeDepthBlocks(noa: Loose, tamar: Loose): Loose {
  const next: Loose = { ...noa };
  for (const block of DEPTH_BLOCKS) {
    if (!(block.headline in next) && block.headline in tamar) next[block.headline] = tamar[block.headline];
    if (!(block.items in tamar)) continue;
    const mine = tamar[block.items];
    const theirs = next[block.items];
    if (!(block.items in next) || theirs === undefined) { next[block.items] = mine; continue; }
    if (theirs === null || !Array.isArray(mine)) continue;
    if (!Array.isArray(theirs) || theirs.length !== mine.length) { next[block.items] = mine; continue; }
    next[block.items] = mine.map((item, index) => {
      const edited = theirs[index];
      if (!isPlain(item) || !isPlain(edited)) return item;
      const merged: Loose = { ...item };
      for (const key of DEPTH_TEXT_KEYS[block.id]) if (nonEmpty(edited[key])) merged[key] = edited[key];
      return merged;
    });
  }
  return next;
}

/** Every model-text string of the depth blocks, with its field path (headlines, then items' text keys). */
export function depthStrings(copy: Loose): Array<{ field: string; value: string; block: DepthBlockId; index: number | null }> {
  const out: Array<{ field: string; value: string; block: DepthBlockId; index: number | null }> = [];
  for (const block of DEPTH_BLOCKS) {
    const headline = copy[block.headline];
    if (nonEmpty(headline)) out.push({ field: block.headline, value: headline, block: block.id, index: null });
    const items = copy[block.items];
    if (!Array.isArray(items)) continue;
    items.forEach((item, index) => {
      if (!isPlain(item)) return;
      for (const key of DEPTH_TEXT_KEYS[block.id]) {
        if (nonEmpty(item[key])) out.push({ field: `${block.items}[${index}].${key}`, value: item[key] as string, block: block.id, index });
      }
    });
  }
  return out;
}

/** All depth-block text of a page, one string (similarity and word counts). */
export function depthBlockText(copy: Loose): string {
  return depthStrings(copy).map(item => item.value).join('\n');
}

// ---------------------------------------------------------------------------
// Term counting with Hebrew prefix stripping
// ---------------------------------------------------------------------------

const PUNCT_EDGES = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

function bareWord(token: string): string {
  return token.replace(PUNCT_EDGES, '').normalize('NFC').toLowerCase();
}

/** The forms of a text word: itself, and with one or two attached prefix letters stripped (a stem keeps at least 2 letters). */
export function prefixForms(word: string): string[] {
  const forms = [word];
  let current = word;
  for (let strip = 0; strip < 2; strip++) {
    if (current.length > 2 && PREFIX_LETTERS.includes(current[0])) {
      current = current.slice(1);
      forms.push(current);
    } else break;
  }
  return forms;
}

/**
 * Occurrences of a (possibly multi-word) term in a text, counted after Hebrew prefix stripping: a text word matches a term
 * word when it equals it, or equals it once one or two leading prefix letters are removed. The term's own first word may
 * itself carry a prefix (NeuronWriter lists prefixed forms too), so both sides are compared through their prefix forms.
 */
export function countTermOccurrences(text: string, term: string): number {
  const words = textWords(text).map(bareWord).filter(Boolean);
  const termWords = textWords(term).map(bareWord).filter(Boolean);
  if (!termWords.length || words.length < termWords.length) return 0;
  const matches = (word: string, termWord: string, first: boolean) => {
    const textForms = prefixForms(word);
    const termForms = first ? prefixForms(termWord) : [termWord];
    return textForms.some(form => termForms.includes(form)) || (!first && textForms.includes(termWord));
  };
  let count = 0;
  for (let at = 0; at + termWords.length <= words.length; at++) {
    if (termWords.every((termWord, offset) => matches(words[at + offset], termWord, offset === 0))) {
      count++;
      at += termWords.length - 1;
    }
  }
  return count;
}

/** The stem set of a text (every prefix form of every word): anchor / brand / place word membership. */
export function stemSet(text: string): Set<string> {
  return new Set(textWords(text).map(bareWord).filter(Boolean).flatMap(prefixForms));
}

/** True when every word of the term (in some prefix form) is one of the anchor stems (page name, city, business name). */
export function isAnchorTerm(term: string, anchorStems: ReadonlySet<string>): boolean {
  const words = textWords(term).map(bareWord).filter(Boolean);
  return words.length > 0 && words.every(word => prefixForms(word).some(form => anchorStems.has(form)));
}

/** Term density (brief): each term at most the top of its sugg_usage; at most once on a page under this many visible words. */
export const TERM_DENSITY_SHORT_PAGE_WORDS = 400;

export function termLimit(max: number, pageWords: number): number {
  return pageWords < TERM_DENSITY_SHORT_PAGE_WORDS ? Math.min(1, max) : max;
}

export interface TermDensityHit { termIndex: number; count: number; limit: number; field: string }

/**
 * Term-density hits of the depth blocks: per suggested term (anchor terms exempt: the H1 / city / business name are
 * governed by the anchor rules), the occurrences across the depth text against termLimit. The hit's field is the item
 * holding the first occurrence past the limit.
 */
export function termDensityHits(copy: Loose, terms: ReadonlyArray<{ t: string; max: number }>, pageWords: number, anchorStems: ReadonlySet<string>): TermDensityHit[] {
  const strings = depthStrings(copy);
  const hits: TermDensityHit[] = [];
  terms.forEach((term, termIndex) => {
    if (isAnchorTerm(term.t, anchorStems)) return;
    const limit = termLimit(term.max, pageWords);
    let seen = 0;
    let field: string | null = null;
    for (const item of strings) {
      const count = countTermOccurrences(item.value, term.t);
      if (!count) continue;
      seen += count;
      if (seen > limit && field === null) field = item.field;
    }
    if (field !== null) hits.push({ termIndex, count: seen, limit, field });
  });
  return hits;
}

// ---------------------------------------------------------------------------
// Fact trace
// ---------------------------------------------------------------------------

export interface FactTraceDetectors {
  /** Tool groups a text names (copyGates tool stems; owner-confirmed service labels masked). */
  toolGroups(text: string): string[];
  /** True when a text tells a customer story (copyGates invented-story patterns). */
  tellsStory(text: string): boolean;
}

export interface FactTraceContext {
  /** The brief's citable owner facts: id -> fact text. */
  factTexts: Readonly<Record<string, string>>;
  /** The brief's question pool IDs (B4). */
  questionIds: readonly string[];
}

export type FactTraceKind = 'fact_ids' | 'unknown_fact' | 'number' | 'tool' | 'story' | 'question';
export interface FactTraceHit { field: string; kind: FactTraceKind; detail?: string; block: DepthBlockId; index: number | null }

const digitRuns = (value: string) => value.match(/\d+(?:[.,]\d+)?/g) ?? [];

/**
 * Fact trace (hard gate): every block item cites at least one existing fact ID, and every number, tool and story in its
 * text is in the facts it cites. A headline has no citations: its numbers and tools must be in some owner fact, and it
 * tells no story. A Q&A item also names a pooled question.
 */
export function factTraceHits(copy: Loose, ctx: FactTraceContext, detect: FactTraceDetectors): FactTraceHit[] {
  const hits: FactTraceHit[] = [];
  const allFacts = Object.values(ctx.factTexts).join('\n');
  const check = (field: string, text: string, cited: string, block: DepthBlockId, index: number | null) => {
    const citedNumbers = new Set(digitRuns(cited));
    for (const run of digitRuns(text)) if (!citedNumbers.has(run)) hits.push({ field, kind: 'number', block, index });
    const allowed = new Set(detect.toolGroups(cited));
    for (const group of detect.toolGroups(text)) if (!allowed.has(group)) hits.push({ field, kind: 'tool', detail: group, block, index });
    if (detect.tellsStory(text) && !detect.tellsStory(cited)) hits.push({ field, kind: 'story', block, index });
  };
  for (const block of DEPTH_BLOCKS) {
    const headline = copy[block.headline];
    if (nonEmpty(headline)) check(block.headline, headline, allFacts, block.id, null);
    const items = copy[block.items];
    if (!Array.isArray(items)) continue;
    items.forEach((item, index) => {
      if (!isPlain(item)) return;
      const base = `${block.items}[${index}]`;
      const ids = Array.isArray(item.factIds) ? item.factIds.filter(nonEmpty) : [];
      if (!ids.length) { hits.push({ field: `${base}.factIds`, kind: 'fact_ids', block: block.id, index }); return; }
      const unknown = ids.filter(id => !Object.prototype.hasOwnProperty.call(ctx.factTexts, id));
      if (unknown.length) { hits.push({ field: `${base}.factIds`, kind: 'unknown_fact', block: block.id, index }); return; }
      if (block.id === 'qa' && !(typeof item.questionId === 'string' && ctx.questionIds.includes(item.questionId))) {
        hits.push({ field: `${base}.questionId`, kind: 'question', block: block.id, index });
      }
      const cited = ids.map(id => ctx.factTexts[id]).join('\n');
      // The question is the searcher's wording (from the pool): only the answer is a claim.
      const keys = block.id === 'qa' ? ['a'] : DEPTH_TEXT_KEYS[block.id];
      for (const key of keys) if (nonEmpty(item[key])) check(`${base}.${key}`, item[key] as string, cited, block.id, index);
    });
  }
  return hits;
}

/**
 * The depth blocks with whole items removed (never edited): `drop` maps a block to the item indices to remove. A block
 * left under its minimum becomes null, and so does its headline. Returns the fix notes.
 */
export function dropDepthItems(next: Loose, drop: ReadonlyMap<DepthBlockId, ReadonlySet<number>>): string[] {
  const fixes: string[] = [];
  for (const block of DEPTH_BLOCKS) {
    const indices = drop.get(block.id);
    const items = next[block.items];
    if (!indices?.size || !Array.isArray(items)) continue;
    const kept = items.filter((_, index) => !indices.has(index));
    if (kept.length < DEPTH_BLOCK_LIMITS[block.id].minItems) {
      next[block.items] = null;
      if (block.headline in next) next[block.headline] = null;
      fixes.push(`drop_depth_block:${block.items}:${items.length}->0`);
    } else {
      next[block.items] = kept;
      fixes.push(`drop_depth_items:${block.items}:${items.length}->${kept.length}`);
    }
  }
  return fixes;
}

// ---------------------------------------------------------------------------
// Cross-client similarity (warn only; offline helper)
// ---------------------------------------------------------------------------

/** Word 5-grams of a text (prefix-insensitive bare words). */
export function wordNgrams(text: string, n = 5): Set<string> {
  const words = textWords(text).map(bareWord).filter(Boolean);
  const grams = new Set<string>();
  for (let at = 0; at + n <= words.length; at++) grams.add(words.slice(at, at + n).join(' '));
  return grams;
}

/** Jaccard similarity of two texts' word n-grams (0 when either has none). */
export function ngramJaccard(left: string, right: string, n = 5): number {
  const a = wordNgrams(left, n);
  const b = wordNgrams(right, n);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared++;
  return shared / (a.size + b.size - shared);
}

/** Acceptance (d): two same-niche clients' service blocks stay below this 5-gram Jaccard. */
export const CROSS_CLIENT_JACCARD_MAX = 0.25;

/** Warn-only cross-client check of two pages' depth blocks. */
export function crossClientSimilarity(left: Loose, right: Loose): { jaccard: number; warn: boolean } {
  const jaccard = ngramJaccard(depthBlockText(left), depthBlockText(right));
  return { jaccard, warn: jaccard >= CROSS_CLIENT_JACCARD_MAX };
}

/** Visible words of the given page strings (the renderer's shown copy). */
export function visibleWordCount(strings: readonly string[]): number {
  return strings.reduce((total, value) => total + wordCount(value), 0);
}

/** The shown strings of the given top-level copy fields (references excluded): visible-word input. */
export function visibleCopyStrings(copy: Loose, fields: readonly string[]): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === 'string') { if (value.trim()) out.push(value); return; }
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (isPlain(value)) for (const [key, inner] of Object.entries(value)) if (!DEPTH_REFERENCE_KEYS.includes(key)) walk(inner);
  };
  for (const field of fields) if (field in copy) walk(copy[field]);
  return out;
}
