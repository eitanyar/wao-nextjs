/**
 * Copy v2 slice 6 (docs/missions/site-bot-code-owns-facts-2026-11-10.md; amended by Yonatan's SEO sign-off 2026-11-10):
 * the Q&A block of a service page while code owns the facts.
 *
 * - Pool questions whose topic is a code-owned fact (price, licence, callback / response, warranty, years) never reach the
 *   model. When the page has that owner fact, the question becomes a CODE-BUILT item: q = the pool question verbatim,
 *   a = the code-rendered fact (the existing B6 proof sentence, or the cost FAQ answer for the price). Zero model text.
 *   No fact -> no question (never a "depends on the job" filler). One item per topic, in QA_TOPIC_PRIORITY.
 * - Every other pool question goes to the model, which writes only `a`: `q` is the pool question verbatim when it is
 *   Hebrew, and the code puts the qaAnswerLead ("At {business} in {city}:") in front of `a` after the final gates, in the
 *   same string (so the renderer shows lead and answer in one paragraph).
 * - Code-built items sit first in qaItems; their paths and every model item's `q` are code-owned (no gate hit, never
 *   dropped by the repetition budget: the gates and the budget read QaCodeOwnership).
 *
 * Topic tokens: price = costQuestionTokens (Noa); warranty = the warranty claim tokens; licence = the license_grade claim
 * tokens plus the licence noun family of licenseDocumentNouns; years = the "years in the trade" template phrases (the
 * restatement spec's lists). Optional Noa lists in the template file (qaLicenseQuestionTokens, qaResponseQuestionTokens,
 * qaWarrantyQuestionTokens, qaYearsQuestionTokens) replace them when present. The callback / response topic has no
 * approved list yet: it is not detected (QA_TOPICS_PENDING) and its questions stay with the model, as before.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { CollectedData } from '../bot/prompts';
import type { BriefQuestion, PageBrief } from '../site-bot/research/pageBrief';
import { CLAIM_RULES } from './copyGates.config';
import { withoutQaLead as withoutLead, type QaCodeOwnership } from './copyGates';
import { DEPTH_BLOCK_LIMITS, wordCount, type DepthQaItem } from './depthBlocks';
import { CLAIM_TOKENS } from './generationData';
import { PREFIX_LETTERS } from './hebrewPrefixLetters';
import { fillTemplate, licenseDocumentNouns, ownerFacts, proofText, type FactOptionalListKey, type OwnerFactTemplates } from './ownerFactCopy';
import { costFaq } from './researchedPricing';

export type QaFactTopic = 'price' | 'license' | 'callback' | 'warranty' | 'years';
/** Yonatan: when the Q&A slot count is limited, code-built items in this order. */
export const QA_TOPIC_PRIORITY: readonly QaFactTopic[] = ['price', 'license', 'callback', 'warranty', 'years'];

/** Optional Noa question-topic lists (template file keys; absent = the fallback reuse below, or pending for callback). */
export const QA_TOPIC_TOKEN_KEYS: Readonly<Record<Exclude<QaFactTopic, 'price'>, FactOptionalListKey>> = {
  license: 'qaLicenseQuestionTokens',
  callback: 'qaResponseQuestionTokens',
  warranty: 'qaWarrantyQuestionTokens',
  years: 'qaYearsQuestionTokens',
};

/** The fixed words of a template (slots and sentence punctuation removed), when at least two words remain. */
function phraseOf(template: string): string | null {
  const words = template.replace(/\{[a-z]+\}/g, ' ').replace(/[.,:;!?]/g, ' ').normalize('NFC').trim().split(/\s+/u).filter(Boolean);
  return words.length >= 2 ? words.join(' ') : null;
}

/** The question-topic tokens of each code-owned fact (an empty list = that topic is not detected yet). */
export function qaTopicTokens(templates: OwnerFactTemplates): Record<QaFactTopic, readonly string[]> {
  const optional = (topic: Exclude<QaFactTopic, 'price'>): readonly string[] | null => {
    const value = templates[QA_TOPIC_TOKEN_KEYS[topic]];
    return Array.isArray(value) && value.length && value.every(item => typeof item === 'string' && item.trim()) ? value : null;
  };
  const licenceNoun = licenseDocumentNouns(templates)[0] ?? '';
  return {
    price: templates.costQuestionTokens,
    license: optional('license') ?? [...(CLAIM_TOKENS.license_grade ?? []), ...licenseDocumentNouns(templates).filter(noun => licenceNoun && noun.startsWith(licenceNoun))],
    callback: optional('callback') ?? [],
    warranty: optional('warranty') ?? [...(CLAIM_RULES.find(rule => rule.id === 'warranty')?.tokens ?? [])],
    years: optional('years') ?? [templates.trustYears, templates.trustYearsOne, templates.trustYearsTwo].map(phraseOf).filter((item): item is string => Boolean(item)),
  };
}

/** Topics with no approved question list yet (their questions stay with the model). */
export function qaTopicsPending(templates: OwnerFactTemplates): QaFactTopic[] {
  const tokens = qaTopicTokens(templates);
  return QA_TOPIC_PRIORITY.filter(topic => tokens[topic].length === 0);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const EDGE = '\\u05D0-\\u05EAA-Za-z';
/** Whole word or phrase, at most one attached prefix letter; a token that is not a word (a currency sign) matches as is. */
function hasTopicToken(text: string, token: string): boolean {
  const word = token.normalize('NFC').trim();
  if (!word) return false;
  if (!/[\p{L}]/u.test(word)) return text.includes(word);
  return new RegExp(`(?<![${EDGE}])[${PREFIX_LETTERS}]?${escapeRegExp(word)}(?![${EDGE}])`, 'iu').test(text);
}

/** The code-owned topic of a pool question (the first in QA_TOPIC_PRIORITY whose tokens it names), else null. */
export function questionTopic(question: string, templates: OwnerFactTemplates): QaFactTopic | null {
  const text = question.normalize('NFC');
  const tokens = qaTopicTokens(templates);
  return QA_TOPIC_PRIORITY.find(topic => tokens[topic].some(token => hasTopicToken(text, token))) ?? null;
}

export interface QaPlan {
  /** Pool questions the model may answer (no code-owned topic). */
  modelPool: BriefQuestion[];
  /** Code-built items, in QA_TOPIC_PRIORITY (they sit first in qaItems). */
  codeItems: DepthQaItem[];
  /** Pool questions on a code-owned topic the page has no fact for (dropped: never answered). */
  droppedQuestionIds: string[];
}

export interface QaPlanOptions {
  installPage: boolean;
}

/** The fact id a price item cites: the brief's pricing note when present, else the system price id (never traced). */
export const SYSTEM_PRICE_FACT_ID = 'system-pricing';

function qaItemFits(q: string, a: string): boolean {
  const limits = DEPTH_BLOCK_LIMITS.qa;
  return q.length <= limits.maxQuestionChars && a.length <= limits.maxAnswerChars && wordCount(a) <= limits.maxAnswerWords;
}

/**
 * The Q&A plan of one service page: which pool questions the model gets, which become code-built items (one per topic that
 * has an owner fact), which are dropped. Pure; deterministic for a brief and its data.
 */
export function planQa(brief: PageBrief, data: CollectedData, templates: OwnerFactTemplates, options: QaPlanOptions): QaPlan {
  const pool = brief.questionPool ?? [];
  const facts = ownerFacts(data, brief, templates);
  const site = brief.site;
  const answer = (topic: QaFactTopic): { a: string; factIds: string[] } | null => {
    switch (topic) {
      case 'price': {
        if (!site) return null;
        const faq = costFaq(data, { service: site.pageName, city: site.city ?? null, business: data.businessName || data.businessNiche || '' });
        if (!faq) return null;
        const id = [...brief.constraints, ...brief.firstPartyProof].find(item => item.id === 'constraint-pricingNotes')?.id ?? SYSTEM_PRICE_FACT_ID;
        return { a: faq.a, factIds: [id] };
      }
      case 'license': case 'warranty': case 'years': {
        const fact = facts[topic];
        const text = fact ? proofText(fact, templates) : null;
        return fact && fact.factId && text ? { a: text, factIds: [fact.factId] } : null;
      }
      case 'callback': {
        const fact = facts.response;
        if (!fact || !fact.factId || options.installPage) return null;
        const text = proofText(fact, templates);
        return text ? { a: text, factIds: [fact.factId] } : null;
      }
    }
  };
  const modelPool: BriefQuestion[] = [];
  const codeByTopic = new Map<QaFactTopic, DepthQaItem>();
  const droppedQuestionIds: string[] = [];
  for (const question of pool) {
    const topic = questionTopic(question.question, templates);
    if (!topic) { modelPool.push(question); continue; }
    const built = codeByTopic.has(topic) ? null : answer(topic);
    if (built && qaItemFits(question.question, built.a)) codeByTopic.set(topic, { questionId: question.id, q: question.question, a: built.a, factIds: built.factIds });
    else droppedQuestionIds.push(question.id);
  }
  const codeItems = QA_TOPIC_PRIORITY.flatMap(topic => codeByTopic.get(topic) ?? []).slice(0, DEPTH_BLOCK_LIMITS.qa.maxItems);
  return { modelPool, codeItems, droppedQuestionIds };
}

const isPlain = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const HEBREW_LETTERS = /[\u05D0-\u05EA]/gu;
const LATIN_LETTERS = /[A-Za-z]/gu;
function mostlyHebrew(value: string): boolean {
  const he = (value.match(HEBREW_LETTERS) ?? []).length;
  const latin = (value.match(LATIN_LETTERS) ?? []).length;
  return he > 0 && he > latin;
}

/** The answer lead of a page ("At {business} in {city}:"), or null without a business name or a city. */
export function qaAnswerLead(brief: PageBrief, data: CollectedData, templates: OwnerFactTemplates): string | null {
  const business = (typeof data.businessName === 'string' && data.businessName.trim()) || brief.site?.businessName?.trim() || '';
  const city = brief.site?.city?.trim() ?? '';
  return business && city ? fillTemplate(templates.qaAnswerLead, { business, city }) : null;
}

/**
 * The qaItems of a code-owned page, before the gates: the code-built items first, then the model's items on non-topic pool
 * questions (q = the pool question verbatim when it is Hebrew; a lead already in `a` is removed), at most maxItems. A model
 * item on a topic question, an unknown question or a repeated question is dropped. Returns the list, or the model value
 * unchanged (null / absent) when there is nothing to add.
 */
export function assembleQaItems(model: unknown, plan: QaPlan, lead: string | null): unknown {
  const pool = new Map(plan.modelPool.map(item => [item.id, item.question]));
  const used = new Set(plan.codeItems.map(item => item.questionId));
  const mine: Record<string, unknown>[] = [];
  if (Array.isArray(model)) {
    for (const item of model) {
      if (!isPlain(item) || typeof item.questionId !== 'string' || !pool.has(item.questionId) || used.has(item.questionId)) continue;
      used.add(item.questionId);
      const question = pool.get(item.questionId) ?? '';
      mine.push({
        ...item,
        q: mostlyHebrew(question) ? question : item.q,
        ...(typeof item.a === 'string' ? { a: withoutLead(item.a, lead) } : {}),
      });
    }
  }
  if (!plan.codeItems.length && !Array.isArray(model)) return model;
  const items = [...plan.codeItems.map(item => ({ ...item, factIds: [...item.factIds] })), ...mine].slice(0, DEPTH_BLOCK_LIMITS.qa.maxItems);
  return items.length ? items : (Array.isArray(model) ? [] : model);
}

/**
 * After the final gates: the lead goes in front of every model-written answer (same string = same rendered paragraph). An
 * answer that no longer fits the limits with its lead is dropped (never cut); a block left under its minimum becomes null
 * with its headline. Code-built items are never touched. Returns the fix notes.
 */
export function applyQaAnswerLeads(copy: Record<string, unknown>, ownership: QaCodeOwnership, lead: string | null): string[] {
  const items = copy.qaItems;
  if (!Array.isArray(items) || !lead) return [];
  const notes: string[] = [];
  const kept: unknown[] = [];
  items.forEach((item, index) => {
    if (index < ownership.codeItems || !isPlain(item) || typeof item.a !== 'string') { kept.push(item); return; }
    const answer = `${lead} ${withoutLead(item.a, lead)}`;
    if (!qaItemFits(typeof item.q === 'string' ? item.q : '', answer)) { notes.push(`qa_lead_drop_item:qaItems[${index}]`); return; }
    kept.push({ ...item, a: answer });
  });
  if (kept.length < DEPTH_BLOCK_LIMITS.qa.minItems) {
    notes.push(`qa_lead_drop_depth_block:qaItems:${items.length}->0`);
    copy.qaItems = null;
    if ('qaHeadline' in copy) copy.qaHeadline = null;
    return notes;
  }
  copy.qaItems = kept;
  return notes;
}
