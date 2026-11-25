/**
 * Site Bot step 2c: the first-screen fact rule v2, (a)-(h) of docs/missions/site-bot-step2-interview-preview-2026-11-25.md
 * (Fable 5.2 on Koray K-01; Yonatan re-sign-off 2026-11-25 after Noa found the in-subheadline version unpublishable).
 * Home page only. Pure.
 *
 * (a) The hero subheadline is a free USP sentence in the H1's grammatical person (the prompt rule lives in
 *     researchPageCopy.ts firstScreenRule); it never quotes an owner fact. Nothing here reads or changes the title or H1.
 * (b) The owner's fact is a code-rendered quote line under the subheadline: `{frame(type)} \u05F4{quote}\u05F4`. The frame
 *     and the name fallback come byte-exact from the waocopy files (ownerQuoteCopy.generated.ts); `{name}` is his first
 *     name when it is all Hebrew letters and 2-15 long, else QUOTE_NAME_FALLBACK. The LLM never writes, rewrites or picks
 *     wording for this line: the quote is his own text after the cleanup of (c) only.
 * (c) Eligibility and cleanup, checked in order; the first failing reason is recorded (firstScreenCheck). The type gate of
 *     (d) (local never, job scope, money price rules) and the trust-bar duplicate check of (c8) run right after (c1): both
 *     are about what the fact is, not its wording, so a trust-bar credential such as "12" is recorded as a duplicate
 *     rather than as too short.
 * (d) Priority: refusal, job, tool, number (with its condition), credential as a sentence, non-money price_rule; ties by
 *     answer order. `local` is never eligible here.
 * (e) No quote line: a credential the code-built trust bar shows satisfies the rule (source trust_bar); otherwise the
 *     caller logs `first_screen_fact_missing` with every candidate and its reason.
 * (f), (g), (h): the renderer (lp/researchedSite.ts ownerQuoteHtml, homepageMetaDescription): the quote line is in no
 *     meta description and no structured data, and its marks are always U+05F4.
 *
 * Yonatan C3 (2026-11-25) stays: a callerQuestion answer is never a job, and a job needs the work or the problem in it.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes (letters and the closed time-phrase list are \u escapes, copied
 * from the mission doc by a script; the other time words come from lp/generationData.ts).
 */
import { BEFORE_TIME_WORD_EXCLUSIONS, BEFORE_TOKENS, STORY_TIME_ANCHORS } from '../lp/generationData';
import type { InterviewTextQuestionKey } from './interviewQuestions';
import type { InterviewFact, InterviewFactSet, InterviewFactType } from './interviewFacts';
import { localitiesNamedIn, type Locality } from './servedAreas';

/** A fact the writer may use: confirmed, or edited (his own correction is the text). */
export interface UsableFact {
  id: string;
  type: InterviewFactType;
  text: string;
  condition?: string;
  serviceId?: string;
  /** True when the text is his correction (status edited). */
  edited?: boolean;
  /** The interview question the fact was taken from (model-extracted facts only). */
  questionKey?: InterviewTextQuestionKey;
}

/** Confirmed and edited facts only (pending and removed are never used). Edited -> ownerText. */
export function usableFacts(set: InterviewFactSet | null | undefined): UsableFact[] {
  if (!set || !Array.isArray(set.facts)) return [];
  return set.facts.flatMap((fact: InterviewFact): UsableFact[] => {
    if (fact.status !== 'confirmed' && fact.status !== 'edited') return [];
    const text = (fact.status === 'edited' && fact.ownerText ? fact.ownerText : fact.quote).trim();
    if (!text) return [];
    return [{
      id: fact.id, type: fact.type, text,
      ...(fact.condition && fact.status !== 'edited' ? { condition: fact.condition } : {}),
      ...(fact.serviceId ? { serviceId: fact.serviceId } : {}),
      ...(fact.status === 'edited' && fact.ownerText ? { edited: true } : {}),
      ...(fact.source?.kind === 'answer' ? { questionKey: fact.source.questionKey } : {}),
    }];
  });
}

/** One answer part a quote may come from (interviewQuestions.answerTexts). */
export interface FirstScreenAnswer {
  key: InterviewTextQuestionKey;
  part: 'answer' | 'followUp';
  text: string;
}

export interface FirstScreenContext {
  /** The owner-service evidence ids the homepage covers (dossier owner-service:* assertions of its services). */
  homeServiceIds: readonly string[];
  localities?: readonly Locality[];
  /** Digit runs the code-built trust bar shows (years, rating, review count...). */
  trustBarNumbers: readonly string[];
  /** The cred-* fact ids whose code-built trust-bar item is shown (credentialTrustItems with an item). */
  trustBarCredentialIds: readonly string[];
  /** His answers (check c1); null = not available, so an answer-sourced fact is never eligible (fail closed). */
  answers: readonly FirstScreenAnswer[] | null;
}

/** Rule (d) priority. `local` is never eligible here (it belongs to the service-area section). */
export const FIRST_SCREEN_PRIORITY: readonly InterviewFactType[] = ['refusal', 'job', 'tool', 'number', 'credential', 'price_rule'];
const DIGITS = /\d+/g;
const SHEKEL_SIGN = /\u20AA/;
const SHEKEL = /[\u20AA]|\u05E9["\u05F4]\u05D7/;

// ---------------------------------------------------------------------------------------------------------------------
// (c) checks

/** Rule (c3): the closed list of relative time phrases (copied from the mission doc as escapes by a script). */
export const FIRST_SCREEN_TIME_PHRASES: readonly string[] = [
  '\u05DC\u05E4\u05E0\u05D9 \u05D7\u05D5\u05D3\u05E9',
  '\u05DC\u05E4\u05E0\u05D9 \u05E9\u05D1\u05D5\u05E2',
  '\u05DC\u05E4\u05E0\u05D9 \u05E9\u05E0\u05D4',
  '\u05DC\u05E4\u05E0\u05D9 \u05D9\u05D5\u05DE\u05D9\u05D9\u05DD',
  '\u05E9\u05D1\u05D5\u05E2 \u05E9\u05E2\u05D1\u05E8',
  '\u05D7\u05D5\u05D3\u05E9 \u05E9\u05E2\u05D1\u05E8',
  '\u05D0\u05EA\u05DE\u05D5\u05DC',
  '\u05D4\u05E9\u05D1\u05D5\u05E2',
  '\u05D4\u05D7\u05D5\u05D3\u05E9',
  '\u05D4\u05E9\u05E0\u05D4',
  '\u05DC\u05D0\u05D7\u05E8\u05D5\u05E0\u05D4',
  '\u05E2\u05DB\u05E9\u05D9\u05D5',
  '\u05D4\u05D9\u05D5\u05DD',
];
/** One-letter prefixes a time phrase may carry on its first word (vav, bet, lamed, mem, kaf, shin, he). */
const TIME_PREFIX_LETTERS = '\u05D5\u05D1\u05DC\u05DE\u05DB\u05E9\u05D4';
const HEBREW_LETTER = /[\u05D0-\u05EA]/u;
/** Final-form letters (kaf, mem, nun, pe, tsadi): on a Hebrew keyboard they are the keys l, o, i, ; and . */
const FINAL_LETTER = /[\u05DA\u05DD\u05DF\u05E3\u05E5]/u;

const nfc = (value: string) => value.normalize('NFC');
/** The form the substring check compares: NFC, whitespace collapsed, ASCII quotes removed (the cleanup's own changes). */
const matchForm = (value: string) => nfc(value).replace(/["']/g, '').replace(/\s+/g, ' ').trim();

/** Rule (c2): trim, collapse double spaces, strip trailing .,;:!? and remove ASCII " and '. Never anything else. */
export function cleanQuote(value: string): string {
  return nfc(value).replace(/["']/g, '').replace(/\s+/g, ' ').trim().replace(/[.,;:!?]+$/u, '').trim();
}

/** Space-separated words of a cleaned quote. */
const words = (value: string) => value.split(' ').filter(Boolean);
/** Letter tokens (maqaf, punctuation and digits split them). */
const letterTokens = (value: string) => value.split(/[^\p{L}]+/u).filter(Boolean);

/** The time phrase that starts at word `index` of `list` (a one-letter prefix allowed on its first word), or null. */
function timePhraseAt(list: readonly string[], index: number): string[] | null {
  const strip = (token: string) => token.replace(/[^\p{L}]+/gu, '');
  for (const phrase of FIRST_SCREEN_TIME_PHRASES) {
    const parts = phrase.split(' ');
    if (index + parts.length > list.length) continue;
    const match = parts.every((part, offset) => {
      const token = strip(list[index + offset]);
      if (token === part) return true;
      return offset === 0 && token.length === part.length + 1 && TIME_PREFIX_LETTERS.includes(token[0]) && token.slice(1) === part;
    });
    if (match) return parts;
  }
  return null;
}

/** Rule (c3): the exact contiguous text after an opening time phrase (and a following comma or space); null = none opens it. */
export function afterOpeningTimePhrase(text: string): string | null {
  const list = words(text);
  const phrase = timePhraseAt(list, 0);
  if (!phrase) return null;
  let at = 0;
  for (let i = 0; i < phrase.length; i += 1) at = text.indexOf(list[i], at) + list[i].length;
  return text.slice(at).replace(/^[,\s]+/u, '');
}

/** Rule (c3): any time phrase anywhere in the text. */
export function containsTimePhrase(text: string): boolean {
  const list = words(text);
  return list.some((_, index) => timePhraseAt(list, index) !== null);
}

/**
 * Rule (c6): gibberish. A letter repeated 3+ times in a row, or a Hebrew token of 3+ letters that reads as English typed
 * on a Hebrew keyboard: a final-form letter before its last letter (the final forms sit on the English keys l, o, i, ;
 * and ., so English typed there carries them mid-word; Hebrew spelling never does). Yonatan 2026-11-25: no vowel-letter
 * condition, since English typed on a Hebrew keyboard often yields vowel letters.
 */
export function isGibberish(text: string): boolean {
  if (/(\p{L})\1\1/u.test(text)) return true;
  return letterTokens(text).some(token => token.length >= 3 && HEBREW_LETTER.test(token) && FINAL_LETTER.test(token.slice(0, -1)));
}

/** Rule (c5): the script reason of a cleaned quote, or null. */
function scriptReason(text: string): string | null {
  if (/[A-Za-z]/.test(text)) return 'latin';
  if (SHEKEL_SIGN.test(text)) return 'shekel_sign';
  if (/\d{7,}/.test(text)) return 'digits_7';
  if (/https?:|www\.|@/iu.test(text)) return 'url';
  const letters = text.match(/\p{L}/gu) ?? [];
  const hebrew = letters.filter(char => HEBREW_LETTER.test(char)).length;
  if (!letters.length || hebrew / letters.length < 0.85) return 'hebrew_ratio';
  return null;
}

export const QUOTE_MIN_WORDS = 4;
export const QUOTE_MAX_WORDS = 12;
export const QUOTE_MAX_CHARS = 80;

/** The question order of the interview (ties of rule d): price chips at priceStyle, credentials last. */
const ANSWER_ORDER = ['recentJob', 'turnedDown', 'callerQuestion', 'priceStyle', 'areaPattern'];
function answerOrder(fact: InterviewFact): number {
  const source = fact.source;
  if (source?.kind === 'answer') return ANSWER_ORDER.indexOf(source.questionKey) * 2 + (source.part === 'followUp' ? 1 : 0);
  if (source?.kind === 'price_chip') return ANSWER_ORDER.indexOf('priceStyle') * 2;
  return ANSWER_ORDER.length * 2;
}

/** The type gate of rule (d) (and Yonatan C3), or null. */
function typeReason(fact: InterviewFact, text: string, context: FirstScreenContext): string | null {
  switch (fact.type) {
    case 'local': return 'local_not_first_screen';
    case 'job':
      if (fact.source?.kind === 'answer' && fact.source.questionKey === 'callerQuestion') return 'job_caller_question';
      if (!hasWorkContent(text, context.localities)) return 'job_without_work';
      return !fact.serviceId || context.homeServiceIds.includes(fact.serviceId) ? null : 'job_other_service';
    case 'price_rule': return /\d/.test(text) || SHEKEL.test(text) ? 'price_rule_money' : null;
    case 'number': return (text.match(DIGITS) ?? []).length ? null : 'number_without_digits';
    case 'refusal': case 'tool': case 'credential': return null;
    default: return 'unknown_type';
  }
}

/** Rule (c8): a number or credential the trust bar already shows. */
function trustBarDuplicate(fact: InterviewFact, text: string, context: FirstScreenContext): boolean {
  if (fact.type === 'credential') return context.trustBarCredentialIds.includes(fact.id);
  if (fact.type === 'number') {
    const digits = text.match(DIGITS) ?? [];
    return digits.length > 0 && digits.every(run => context.trustBarNumbers.includes(run));
  }
  return false;
}

/** Rule (c1): the text is his exact words (an edited fact's ownerText is his by definition). */
function inHisWords(fact: InterviewFact, text: string, context: FirstScreenContext): string | null {
  if (fact.status === 'edited') return null;
  if (fact.source?.kind !== 'answer') return null; // price chip / credential: the code-built source is the text itself
  if (!context.answers) return 'answer_unavailable';
  const { questionKey, part } = fact.source;
  const answer = context.answers.find(item => item.key === questionKey && item.part === part);
  return answer && matchForm(answer.text).includes(matchForm(text)) ? null : 'not_in_answer';
}

export interface FirstScreenCheck {
  id: string;
  type: InterviewFactType;
  /** Null = eligible. */
  reason: string | null;
  /** The cleaned quote (eligible facts only). */
  quote: string | null;
}

/** Rule (c), in order, on one fact of the set (any status). */
export function firstScreenCheck(fact: InterviewFact, context: FirstScreenContext): FirstScreenCheck {
  const out = (reason: string | null, quote: string | null = null): FirstScreenCheck => ({ id: fact.id, type: fact.type, reason, quote });
  // (c1) status
  if (fact.status !== 'confirmed' && fact.status !== 'edited') return out(`status_${fact.status}`);
  const edited = fact.status === 'edited' && typeof fact.ownerText === 'string' && fact.ownerText.trim() !== '';
  if (fact.status === 'edited' && !edited) return out('edited_without_text');
  const original = edited ? fact.ownerText! : fact.quote;
  const typed = typeReason(fact, original, context);
  if (typed) return out(typed);
  if (trustBarDuplicate(fact, original, context)) return out('trust_bar_duplicate');
  // An edited fact drops the condition it was extracted with (usableFacts).
  const condition = edited ? '' : (fact.condition ?? '').trim();
  let text = original;
  for (let pass = 0; pass < 4; pass += 1) {
    const substring = inHisWords(fact, text, context); // (c1), re-run after every cut
    if (substring) return out(substring);
    text = cleanQuote(text); // (c2)
    const after = afterOpeningTimePhrase(text); // (c3): an opening time phrase is cut, then every check runs again
    if (after !== null) {
      text = after;
      continue;
    }
    if (containsTimePhrase(text)) return out('time_word');
    const count = words(text).length; // (c4): never cut to fit
    if (count < QUOTE_MIN_WORDS) return out('too_short');
    if (count > QUOTE_MAX_WORDS || text.length > QUOTE_MAX_CHARS) return out('too_long');
    const script = scriptReason(text); // (c5)
    if (script) return out(script);
    if (isGibberish(text)) return out('gibberish'); // (c6)
    if (condition && !matchForm(text).includes(matchForm(condition))) return out('condition_outside'); // (c7)
    return out(null, text);
  }
  return out('time_word');
}

/** Every fact of the set with its (c) result, in rule (d) order: priority type, then answer order, then set order. */
export function firstScreenChecks(set: InterviewFactSet | null | undefined, context: FirstScreenContext): FirstScreenCheck[] {
  const facts = set && Array.isArray(set.facts) ? set.facts : [];
  const rank = (fact: InterviewFact) => {
    const at = FIRST_SCREEN_PRIORITY.indexOf(fact.type);
    return at < 0 ? FIRST_SCREEN_PRIORITY.length : at;
  };
  return facts
    .map((fact, index) => ({ fact, index }))
    .sort((a, b) => rank(a.fact) - rank(b.fact) || answerOrder(a.fact) - answerOrder(b.fact) || a.index - b.index)
    .map(({ fact }) => firstScreenCheck(fact, context));
}

// ---------------------------------------------------------------------------------------------------------------------
// The carry check

/** Hebrew one-letter prefixes (vav, he, bet, lamed, mem, shin, kaf), folded up to twice. */
const PREFIX_LETTERS = '\u05D5\u05D4\u05D1\u05DC\u05DE\u05E9\u05DB';
const NIQQUD = /[\u0591-\u05C7]/g;

function tokens(text: string): string[] {
  return text.normalize('NFC').replace(NIQQUD, '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(token => token.length >= 2);
}

function variants(token: string): string[] {
  const out = [token];
  let current = token;
  for (let i = 0; i < 2; i++) {
    if (current.length > 3 && PREFIX_LETTERS.includes(current[0])) {
      current = current.slice(1);
      out.push(current);
    } else break;
  }
  return out;
}

function stems(text: string): Set<string> {
  return new Set(tokens(text).flatMap(variants));
}

/**
 * Time words (never content): moved from the existing generation-data lists (lp/generationData.ts: the story time
 * anchors, the "before" tokens and the time words after them), split into words. A story-anchor word that starts with a
 * bet prefix ("in the ...") also adds its unprefixed form; nothing else is folded on the list side (folding the shin of
 * "that passed" or of a number word would turn work words into time words). A token is a time word when any of its
 * prefix-folded variants is in this set.
 */
const BET = '\u05D1';
const TIME_WORDS: ReadonlySet<string> = new Set([
  ...STORY_TIME_ANCHORS.flatMap(tokens).flatMap(token => (token.length > 3 && token.startsWith(BET) ? [token, token.slice(1)] : [token])),
  ...BEFORE_TOKENS.flatMap(tokens),
  ...BEFORE_TIME_WORD_EXCLUSIONS.flatMap(tokens),
]);

export function isTimeWord(token: string): boolean {
  return variants(token).some(item => TIME_WORDS.has(item));
}

/** The text with every locality name it names removed (the prefix letters left behind are too short to count). */
function withoutPlaces(text: string, localities: readonly Locality[] | undefined): string {
  if (!localities?.length) return text;
  let out = text.normalize('NFC');
  for (const place of localitiesNamedIn(out, localities)) {
    for (const name of [place.he_name, ...(place.he_aliases ?? [])].map(item => item.normalize('NFC').trim()).filter(Boolean)) {
      out = out.split(name).join(' ');
    }
  }
  return out;
}

/** The words of a fact beyond place and time words (three letters or more, no bare digits). */
export function workContentTokens(text: string, localities?: readonly Locality[]): string[] {
  return tokens(withoutPlaces(text, localities)).filter(token => token.length >= 3 && !/^\d+$/.test(token) && !isTimeWord(token));
}

/** True when the fact says something beyond where and when: the work or the problem (Yonatan C3). */
export function hasWorkContent(text: string, localities?: readonly Locality[]): boolean {
  return workContentTokens(text, localities).length > 0;
}

/**
 * The content words of a fact text: three letters or more, minus the page's own anchor words (name, city, business),
 * time words, and (with `localities`) every place the fact names.
 */
function contentTokens(text: string, exclude: ReadonlySet<string>, localities?: readonly Locality[]): string[] {
  const seen = new Set<string>();
  return tokens(withoutPlaces(text, localities)).filter(token => {
    if (token.length < 3 || /^\d+$/.test(token)) return false;
    if (isTimeWord(token)) return false;
    if (variants(token).some(item => exclude.has(item))) return false;
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}

/** The words that never count as carrying a fact: the page's trade / city / business name (they are on the page anyway). */
export function anchorExclusions(...texts: Array<string | null | undefined>): Set<string> {
  return new Set(texts.flatMap(text => (text ? [...stems(text)] : [])));
}

/**
 * True when `subheadline` carries `fact`: every digit run of the fact (and of its condition) appears in it, and enough of
 * the fact's content words do (2 for a short fact, up to 3 for a long one; all of them for a fact of one or two words);
 * a condition needs at least one of its own words too. Place words (with `localities`) and time words are never content
 * (Yonatan 2026-11-25): an overlap on them alone never counts as carrying the fact.
 */
export function subheadlineCarriesFact(subheadline: string, fact: Pick<UsableFact, 'text' | 'condition'>, exclude: ReadonlySet<string> = new Set(), localities?: readonly Locality[]): boolean {
  const sub = stems(subheadline);
  const subDigits = new Set(subheadline.match(DIGITS) ?? []);
  const factDigits = [...(fact.text.match(DIGITS) ?? []), ...((fact.condition ?? '').match(DIGITS) ?? [])];
  if (factDigits.some(run => !subDigits.has(run))) return false;
  const hit = (token: string) => variants(token).some(item => sub.has(item));
  const words = contentTokens(fact.text, exclude, localities);
  const matched = words.filter(hit).length;
  const need = words.length <= 2 ? words.length : Math.min(3, Math.max(2, Math.ceil(words.length * 0.3)));
  if (words.length === 0 && factDigits.length === 0) return false;
  if (matched < need) return false;
  if (fact.condition) {
    const conditionWords = contentTokens(fact.condition, exclude, localities);
    if (conditionWords.length && !conditionWords.some(hit)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------------------------------------------------
// (b) The quote line and (e) the outcome

export type FirstScreenSource = 'quote_line' | 'trust_bar';

/** The code-rendered quote line: the frame (its name filled) and his cleaned words, never model-written. */
export interface OwnerQuoteLine {
  frame: string;
  quote: string;
}

export interface FirstScreenOutcome {
  firstScreenFactId: string | null;
  source: FirstScreenSource | null;
  /** Every fact of the set with its (c) reason (null = eligible), in rule (d) order. */
  candidates: Array<{ id: string; type: InterviewFactType; reason: string | null }>;
  /** The rendered quote line (source quote_line), else null. */
  quoteLine: OwnerQuoteLine | null;
  /** Rule (e): nothing satisfies the rule (the caller logs first_screen_fact_missing). */
  missing: boolean;
}

/** A credential fact and the trust-bar item the code built from it (null = the bar shows no item from it). */
export interface CredentialTrustItem {
  factId: string;
  item: string | null;
}

/** The frame copy the quote line uses (ownerQuoteCopy.generated.ts, injected so this module stays copy-free). */
export interface QuoteFrameCopy {
  QUOTE_FRAME_REFUSAL: string;
  QUOTE_FRAME_JOB: string;
  QUOTE_FRAME_NUMBER: string;
  QUOTE_FRAME_CREDENTIAL: string;
  QUOTE_FRAME_PRICE_RULE: string;
  QUOTE_NAME_FALLBACK: string;
}

const FRAME_KEY: Readonly<Record<InterviewFactType, keyof QuoteFrameCopy | null>> = {
  refusal: 'QUOTE_FRAME_REFUSAL', job: 'QUOTE_FRAME_JOB', tool: 'QUOTE_FRAME_JOB', number: 'QUOTE_FRAME_NUMBER',
  credential: 'QUOTE_FRAME_CREDENTIAL', price_rule: 'QUOTE_FRAME_PRICE_RULE', local: null,
};

/** Rule (b): his first name when it is all Hebrew letters and 2-15 long, else the fallback. */
export function quoteName(ownerName: string | null | undefined, copy: Pick<QuoteFrameCopy, 'QUOTE_NAME_FALLBACK'>): string {
  const first = nfc(typeof ownerName === 'string' ? ownerName : '').trim().split(/\s+/)[0] ?? '';
  return /^[\u05D0-\u05EA]{2,15}$/u.test(first) ? first : copy.QUOTE_NAME_FALLBACK;
}

/** The quote line of one eligible fact (null for a type without a frame). */
export function ownerQuoteLine(type: InterviewFactType, quote: string, ownerName: string | null | undefined, copy: QuoteFrameCopy): OwnerQuoteLine | null {
  const key = FRAME_KEY[type];
  if (!key) return null;
  return { frame: copy[key].split('{name}').join(quoteName(ownerName, copy)), quote };
}

/**
 * The first-screen decision, before generation (the quote line never depends on the model): the first eligible fact in
 * rule (d) order gets the quote line; else (e) a confirmed / edited credential whose code-built trust-bar item exists
 * (the caller confirms it is rendered); else missing.
 */
export function selectFirstScreen(
  set: InterviewFactSet | null | undefined,
  context: FirstScreenContext,
  options: { ownerName?: string | null; copy: QuoteFrameCopy; credentialItems: readonly CredentialTrustItem[] },
): FirstScreenOutcome {
  const checks = firstScreenChecks(set, context);
  const candidates = checks.map(({ id, type, reason }) => ({ id, type, reason }));
  for (const check of checks) {
    if (check.reason !== null || check.quote === null) continue;
    const line = ownerQuoteLine(check.type, check.quote, options.ownerName, options.copy);
    if (line) return { firstScreenFactId: check.id, source: 'quote_line', candidates, quoteLine: line, missing: false };
  }
  const usable = new Set(usableFacts(set).filter(fact => fact.type === 'credential').map(fact => fact.id));
  const credential = options.credentialItems.find(entry => entry.item && usable.has(entry.factId));
  if (credential) return { firstScreenFactId: credential.factId, source: 'trust_bar', candidates, quoteLine: null, missing: false };
  return { firstScreenFactId: null, source: null, candidates, quoteLine: null, missing: true };
}

/** The outcome when the trust-bar item it relies on is not in the rendered page (rule e: then it is missing). */
export function withoutTrustBarFallback(outcome: FirstScreenOutcome): FirstScreenOutcome {
  return outcome.source === 'trust_bar' ? { ...outcome, firstScreenFactId: null, source: null, missing: true } : outcome;
}

/** The rule (e) log line: every candidate id and its reason. */
export function firstScreenMissingLine(sessionId: string, round: number, outcome: Pick<FirstScreenOutcome, 'candidates'>): string {
  const list = outcome.candidates.map(item => `${item.id}:${item.reason ?? 'eligible_without_frame'}`).join(',');
  return `[site-bot preview] first_screen_fact_missing session=${sessionId} round=${round} candidates=${list || 'none'}`;
}

/** The digit runs of the code-built trust bar (rule c8). */
export function trustBarNumbers(items: readonly string[]): string[] {
  return [...new Set(items.flatMap(item => item.match(DIGITS) ?? []))];
}

/**
 * The facts that truly appear in the rendered output: the quote line's fact (or the trust-bar credential of rule e), a
 * credential whose trust-bar item is shown, and any usable fact whose whole text (NFC, whitespace folded, ASCII quotes
 * dropped) is in the rendered visible text. A fact the brief handed to the writer but the output does not show is never
 * listed (step 3's ledger adds sentence-to-fact links for paraphrases).
 */
export function renderedFactIds(
  usable: readonly UsableFact[],
  visibleText: string,
  outcome: Pick<FirstScreenOutcome, 'firstScreenFactId' | 'source'>,
  shownCredentialIds: readonly string[],
): string[] {
  const text = matchForm(visibleText);
  const ids = new Set<string>();
  if (outcome.firstScreenFactId && outcome.source) ids.add(outcome.firstScreenFactId);
  for (const fact of usable) {
    if (fact.type === 'credential') {
      if (shownCredentialIds.includes(fact.id)) ids.add(fact.id);
      continue;
    }
    const body = matchForm(fact.text);
    if (body.length >= 2 && text.includes(body)) ids.add(fact.id);
  }
  return usable.map(fact => fact.id).filter(id => ids.has(id));
}

/** The brief constraint id that carries the first-screen instruction (one definition: researchPageCopy.ts). */
export { FIRST_SCREEN_CONSTRAINT_ID } from '../lp/researchPageCopy';
/** The brief evidence id of one interview fact (firstPartyProof). */
export function interviewEvidenceId(factId: string): string {
  return `interview-${factId}`;
}
