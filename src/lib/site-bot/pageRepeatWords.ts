/**
 * Site Bot step 2c, Noa's live-preview fix 2026-11-26 (round 2): the page-wide repeated-word lint of the homepage preview.
 * The prompt rule ONE WORD, ONE SECTION (researchPageCopy.ts INTERVIEW_WRITING_RULES) is binding; this is its code check.
 *
 * Sections, in page order: hero (heroSubheadline), story (storyHeadline + storyBody), cards (every serviceDetails
 * description), about (aboutPageBody). A hit is a Hebrew content word that appears in more than one section.
 *
 * Content word: a Hebrew letter token whose form after stripping up to two attached prefix letters (only while the rest is
 * longer than three letters) still has at least 4 letters. Two tokens are the same word when they share such a form.
 * Never a hit (code lists only, nothing typed here):
 *   - the page's anchors: the trade (page name), every verified service name, the business name, the owner's name, the
 *     city and every place name of the locality list (removed from the text before tokenising);
 *   - the promise: every word of heroHeadline and of the owner's usp (a deliberate echo of the promise is allowed);
 *   - the trade's fault words (generationData.ts STICKY_PROBLEM_WORDS, every trade group): the customer's own words for
 *     the fault, which the HOME WORDS rule asks for wherever the fault is named;
 *   - time words (firstScreenFact.ts isTimeWord) and the person forms of subheadlinePerson.ts, copyGates.config.ts
 *     WE_FORM_TOKENS / PLURAL_ADDRESS_TOKENS and generationData.ts SUBJECT_CARRY_TOKENS, STORY_QUANTIFIER_EXCLUSIONS,
 *     PREPOSITION_SKIP_ADVERBS (function words; most are shorter than 4 letters anyway).
 *
 * On a hit, the caller (previewGeneration.ts) runs one repair round on the later field(s); if hits remain it logs
 * `page_repeat_words` with the field names and a count, never the text, and ships. Pure, except the repair's model call.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { CollectedData } from '../bot/prompts';
import { PLURAL_ADDRESS_TOKENS, WE_FORM_TOKENS } from '../lp/copyGates.config';
import { PREPOSITION_SKIP_ADVERBS, STICKY_PROBLEM_WORDS, STORY_QUANTIFIER_EXCLUSIONS, SUBJECT_CARRY_TOKENS } from '../lp/generationData';
import { PREFIX_LETTERS } from '../lp/hebrewPrefixLetters';
import type { SiteCopy } from '../lp/lpCopyPrompt';
import {
  assertBoundedGeneratedSiteCopy, briefGateContext, emDashText, gateViolations, shapeOptions, SITE_COPY_OPTIONAL_PRESENCE_LIMITS,
  SITE_COPY_PAIR_LIST_LIMITS, STORY_MAX_SENTENCES, STORY_MIN_SENTENCES, TYPOGRAPHY_RULE, REDUPLICATION_RULE, type QwenJsonCaller,
} from '../lp/researchPageCopy';
import { SERVICE_DESCRIPTION_MIN_CHARS } from '../lp/copyGates.config';
import type { PageBrief } from './research/pageBrief';
import { isTimeWord } from './firstScreenFact';
import { localitiesNamedIn, type Locality } from './servedAreas';
import { FIRST_PERSON_SINGULAR_FORMS, SECOND_PERSON_SINGULAR_FORMS } from './subheadlinePerson';

export type RepeatSection = 'hero' | 'story' | 'cards' | 'about';
export const REPEAT_SECTION_ORDER: readonly RepeatSection[] = ['hero', 'story', 'cards', 'about'];
/** Minimum letters of a content word after its prefixes are stripped. */
export const REPEAT_MIN_LETTERS = 4;

const HEBREW_TOKEN = /[\u05D0-\u05EA]+/gu;
const NIQQUD = /[\u0591-\u05C7]/gu;

/** The prefix-stripped forms of one token (the token itself first). */
function forms(token: string): string[] {
  const out = [token];
  let current = token;
  for (let i = 0; i < 2; i += 1) {
    if (current.length > 3 && PREFIX_LETTERS.includes(current[0])) {
      current = current.slice(1);
      out.push(current);
    } else break;
  }
  return out;
}

/**
 * The matching key of a content word: the token with up to two prefix letters stripped, each only while at least
 * REPEAT_MIN_LETTERS letters remain; null when the key is shorter than that (not a content word).
 */
function contentKey(token: string): string | null {
  let current = token;
  for (let i = 0; i < 2; i += 1) {
    if (current.length > REPEAT_MIN_LETTERS && PREFIX_LETTERS.includes(current[0])) current = current.slice(1);
    else break;
  }
  return current.length >= REPEAT_MIN_LETTERS ? current : null;
}

function hebrewTokens(text: string): string[] {
  return text.normalize('NFC').replace(NIQQUD, '').match(HEBREW_TOKEN) ?? [];
}

/** Every form of every Hebrew token of the texts (the exclusion side folds prefixes too). */
function formSet(texts: ReadonlyArray<string | null | undefined>): Set<string> {
  return new Set(texts.flatMap(text => (text ? hebrewTokens(text).flatMap(forms) : [])));
}

/** The text with every place it names removed. */
function withoutPlaces(text: string, localities: readonly Locality[]): string {
  let out = text.normalize('NFC');
  for (const place of localitiesNamedIn(out, localities)) {
    for (const name of [place.he_name, ...(place.he_aliases ?? [])].map(item => item.normalize('NFC').trim()).filter(Boolean)) out = out.split(name).join(' ');
  }
  return out;
}

const FUNCTION_FORMS: ReadonlySet<string> = formSet([
  ...FIRST_PERSON_SINGULAR_FORMS, ...SECOND_PERSON_SINGULAR_FORMS, ...SUBJECT_CARRY_TOKENS,
  ...WE_FORM_TOKENS.map(entry => entry.token), ...PLURAL_ADDRESS_TOKENS.map(entry => entry.token),
  ...STORY_QUANTIFIER_EXCLUSIONS, ...PREPOSITION_SKIP_ADVERBS,
]);
const FAULT_FORMS: ReadonlySet<string> = formSet(Object.values(STICKY_PROBLEM_WORDS).flat());

export interface RepeatAnchors {
  pageName: string;
  businessName: string;
  city: string | null;
  serviceLabels: readonly string[];
  ownerName?: string | null;
  heroHeadline: string;
  usp?: string | null;
}

/** The anchors of a homepage brief and its copy. */
export function repeatAnchors(brief: PageBrief, data: CollectedData, copy: Pick<SiteCopy, 'heroHeadline'>): RepeatAnchors {
  const site = brief.site;
  return {
    pageName: site?.pageName ?? '', businessName: site?.businessName ?? (typeof data.businessName === 'string' ? data.businessName : ''),
    city: site?.city ?? null, serviceLabels: site?.serviceLabels ?? [], ownerName: typeof data.ownerName === 'string' ? data.ownerName : null,
    heroHeadline: copy.heroHeadline ?? '', usp: typeof data.usp === 'string' ? data.usp : null,
  };
}

/** One linted field: its path in the copy and its section. */
export interface RepeatField { field: string; section: RepeatSection; value: string }

/** The linted fields of a copy, in page order. */
export function repeatFields(copy: SiteCopy): RepeatField[] {
  const out: RepeatField[] = [];
  const add = (field: string, section: RepeatSection, value: unknown) => {
    if (typeof value === 'string' && value.trim()) out.push({ field, section, value });
  };
  const loose = copy as unknown as Record<string, unknown>;
  add('heroSubheadline', 'hero', copy.heroSubheadline);
  add('storyHeadline', 'story', loose.storyHeadline);
  add('storyBody', 'story', loose.storyBody);
  (Array.isArray(copy.serviceDetails) ? copy.serviceDetails : []).forEach((card, index) => add(`serviceDetails[${index}].description`, 'cards', card?.description));
  add('aboutPageBody', 'about', copy.aboutPageBody);
  return out;
}

/** One repeated word: its matching form, the sections it is in, and the fields after its first section (the repair targets). */
export interface RepeatHit {
  word: string;
  sections: RepeatSection[];
  laterFields: string[];
}

/** The page-wide repeated-word hits of a copy (word order: first appearance). */
export function pageRepeatHits(copy: SiteCopy, anchors: RepeatAnchors, localities: readonly Locality[] = []): RepeatHit[] {
  const excluded = new Set<string>([
    ...formSet([anchors.pageName, anchors.businessName, anchors.city, anchors.ownerName, anchors.heroHeadline, anchors.usp, ...anchors.serviceLabels]),
    ...FUNCTION_FORMS, ...FAULT_FORMS,
  ]);
  // form -> field -> section (insertion order = page order)
  const seen = new Map<string, Map<string, RepeatSection>>();
  for (const { field, section, value } of repeatFields(copy)) {
    for (const token of hebrewTokens(withoutPlaces(value, localities))) {
      // The key is prefix-stripped, so a prefixed and a bare use meet; the exclusions match any prefix-folded form.
      const key = contentKey(token);
      if (!key || forms(token).some(form => excluded.has(form)) || isTimeWord(token)) continue;
      const fields = seen.get(key) ?? new Map<string, RepeatSection>();
      fields.set(field, section);
      seen.set(key, fields);
    }
  }
  const out: RepeatHit[] = [];
  for (const [word, fields] of seen) {
    const sections = REPEAT_SECTION_ORDER.filter(section => [...fields.values()].includes(section));
    if (sections.length < 2) continue;
    const first = sections[0];
    out.push({ word, sections, laterFields: [...fields].filter(([, section]) => section !== first).map(([field]) => field) });
  }
  return out;
}

/** The fields a repair rewrites: every later field of every hit, in page order. */
export function repeatRepairFields(copy: SiteCopy, hits: readonly RepeatHit[]): string[] {
  const wanted = new Set(hits.flatMap(hit => hit.laterFields));
  return repeatFields(copy).map(item => item.field).filter(field => wanted.has(field));
}

/** The log summary: field names and a count, never the text. */
export function repeatSummary(copy: SiteCopy, hits: readonly RepeatHit[]): { count: number; fields: string[] } {
  return { count: hits.length, fields: repeatRepairFields(copy, hits) };
}

// ---------------------------------------------------------------------------------------------------------------------
// The one repair round

export const PAGE_REPEAT_REPAIR_SYSTEM = `You are Tamar, a Hebrew conversion copywriter. You are rewriting a few fields of a site-copy JSON object so that no content word repeats across the sections of the page. Return only a JSON object with exactly the keys you are asked for, with no prose or markdown.\n\n${TYPOGRAPHY_RULE} ${REDUPLICATION_RULE}`;

const FIELD_LIMIT = (field: string): number => {
  if (field === 'storyHeadline') return SITE_COPY_OPTIONAL_PRESENCE_LIMITS.storyHeadline;
  if (field === 'storyBody') return SITE_COPY_OPTIONAL_PRESENCE_LIMITS.storyBody;
  if (field === 'aboutPageBody') return 400;
  return SITE_COPY_PAIR_LIST_LIMITS.serviceDetails.maxChars[1];
};

/** The repair request (English; the Hebrew in it is the page's own copy and the words the lint found). */
export function pageRepeatRepairPrompt(copy: SiteCopy, fields: readonly string[], hits: readonly RepeatHit[]): string {
  const current = Object.fromEntries(fields.map(field => [field, fieldValue(copy, field)]));
  const earlier = repeatFields(copy).filter(item => !fields.includes(item.field)).map(item => [item.field, item.value]);
  return `Some content words of these fields already appear in an earlier section of the page (found: ${JSON.stringify(hits.map(hit => hit.word))}). Rewrite only these fields so that none of the found words, in any form or with any prefix, appears in them.

RULES:
- Keep each field's meaning, its facts and its grammatical person. Never add a claim, number, name, place, tool, method, sound, smell or promise that is not already in the current value.
- Use a different plain spoken word, or drop the word when the sentence stands without it. Never a translated adjective-noun pair, and never a word that also appears in an earlier section listed below.
- Keep the length limits: ${fields.map(field => `${field} at most ${FIELD_LIMIT(field)} characters`).join('; ')}.${fields.includes('storyBody') ? ` storyBody keeps ${STORY_MIN_SENTENCES} to ${STORY_MAX_SENTENCES} sentences.` : ''}${fields.some(field => field.startsWith('serviceDetails[')) ? ` A serviceDetails description stays one full first-person sentence of at least ${SERVICE_DESCRIPTION_MIN_CHARS} characters.` : ''}

Earlier sections (never change them): ${JSON.stringify(Object.fromEntries(earlier))}
Fields to rewrite (return exactly these keys): ${JSON.stringify(current)}`;
}

function fieldValue(copy: SiteCopy, field: string): string {
  const card = /^serviceDetails\[(\d+)\]\.description$/.exec(field);
  if (card) return copy.serviceDetails?.[Number(card[1])]?.description ?? '';
  const value = (copy as unknown as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : '';
}

function withField(copy: SiteCopy, field: string, value: string): SiteCopy {
  const card = /^serviceDetails\[(\d+)\]\.description$/.exec(field);
  if (card) {
    const index = Number(card[1]);
    return { ...copy, serviceDetails: copy.serviceDetails.map((item, at) => (at === index ? { ...item, description: value } : item)) };
  }
  return { ...copy, [field]: value } as SiteCopy;
}

const sentenceCount = (value: string) => value.split(/(?<=[.!?])\s+/u).filter(part => part.trim()).length;

export type PageRepeatOutcome = 'clean' | 'repaired' | 'remaining';

export interface PageRepeatResult {
  copy: SiteCopy;
  outcome: PageRepeatOutcome;
  before: { count: number; fields: string[] };
  after: { count: number; fields: string[] };
}

/**
 * The lint and its one repair round. A rewritten field is kept only when it is a non-empty string within its limit (the
 * story keeps its sentence count, a card its minimum length), the whole copy still passes the shape check, and no
 * blocking copy gate hits a rewritten field. Otherwise that field keeps its value. Fixture mode (callJson null) only lints.
 */
export async function gatePageRepeatWords(
  copy: SiteCopy,
  brief: PageBrief,
  data: CollectedData,
  options: { callJson: QwenJsonCaller | null; log: (line: string) => void; sessionId: string; round: number; localities?: readonly Locality[] },
): Promise<PageRepeatResult> {
  const anchors = repeatAnchors(brief, data, copy);
  const localities = options.localities ?? [];
  const where = `session=${options.sessionId} round=${options.round}`;
  const hits = pageRepeatHits(copy, anchors, localities);
  const before = repeatSummary(copy, hits);
  if (!hits.length) return { copy, outcome: 'clean', before, after: before };
  options.log(`[site-bot preview] page_repeat_words_found ${where} count=${before.count} fields=${before.fields.join(',')}`);
  let next = copy;
  if (options.callJson) {
    try {
      const raw = await options.callJson(PAGE_REPEAT_REPAIR_SYSTEM, pageRepeatRepairPrompt(copy, before.fields, hits));
      const parsed: unknown = JSON.parse(raw);
      const answer = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
      const gates = briefGateContext(brief, data);
      for (const field of before.fields) {
        const value = answer[field];
        if (typeof value !== 'string') continue;
        const text = emDashText(value.replace(/\s+/gu, ' ').trim());
        if (!text || text.length > FIELD_LIMIT(field)) continue;
        if (field === 'storyBody' && (sentenceCount(text) < STORY_MIN_SENTENCES || sentenceCount(text) > STORY_MAX_SENTENCES)) continue;
        if (field.startsWith('serviceDetails[') && text.length < SERVICE_DESCRIPTION_MIN_CHARS) continue;
        const candidate = withField(next, field, text);
        try {
          assertBoundedGeneratedSiteCopy(candidate, shapeOptions(brief));
        } catch {
          continue;
        }
        if (gateViolations(candidate as unknown as Record<string, unknown>, gates).some(hit => hit.field === field || hit.field.startsWith(`${field}.`))) continue;
        next = candidate;
      }
    } catch {
      // A failed or unparseable repair call keeps the copy as written.
    }
  }
  const after = repeatSummary(next, pageRepeatHits(next, anchors, localities));
  if (after.count) {
    options.log(`[site-bot preview] page_repeat_words ${where} count=${after.count} fields=${after.fields.join(',')}`);
    return { copy: next, outcome: 'remaining', before, after };
  }
  options.log(`[site-bot preview] page_repeat_words_repaired ${where} count=${before.count}`);
  return { copy: next, outcome: 'repaired', before, after };
}
