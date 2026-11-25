/**
 * Site Bot step 2b: the owner fact schema (defined ONCE here; step 3's fact ledger extends it) and its pure rules.
 *
 * A fact is one claim the site may make about the owner, taken from his own interview answers:
 *   { id, type, serviceId?, quote, condition?, status, source, ownerText?, reviewedAt? }
 *   - type: job | refusal | price_rule | local | tool | number | credential
 *   - quote: HIS words. For a model-extracted fact it must be an exact substring of one of his answers (both
 *     whitespace-normalised and NFC), or the fact is dropped (enforceQuote). A price-chip fact's quote is the chip label he
 *     ticked; a credential fact's quote is his credentials-step answer (or the chip label he picked there).
 *   - condition: optional, the scope he stated ("on weekdays"); kept only when it is also a substring of his answer.
 *   - serviceId: optional, one of the dossier's owner-service evidence ids (runResearch ownerEvidence), never invented.
 *   - status: pending -> confirmed | edited | removed (the confirm-facts screen). An edited fact keeps the original quote
 *     and carries the owner's new text in ownerText: the edit is itself owner-stated.
 * The set is stored in the research dossier (SiteResearchDossier.interviewFacts), one set per answer-set version.
 *
 * Pure and browser-safe (the start page imports the types and the type order).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { InterviewTextQuestionKey, PriceChipId } from './interviewQuestions';
import type { SiteBotStep2bCopyKey } from './step2bCopy.generated';

export const INTERVIEW_FACT_TYPES = ['job', 'refusal', 'price_rule', 'local', 'tool', 'number', 'credential'] as const;
export type InterviewFactType = (typeof INTERVIEW_FACT_TYPES)[number];
/** The types the model may extract; price_rule from chips and every credential are built in code. */
export const MODEL_FACT_TYPES: readonly InterviewFactType[] = ['job', 'refusal', 'price_rule', 'local', 'tool', 'number'];

export const INTERVIEW_FACT_STATUSES = ['pending', 'confirmed', 'edited', 'removed'] as const;
export type InterviewFactStatus = (typeof INTERVIEW_FACT_STATUSES)[number];

export type CredentialField = 'yearsInField' | 'license' | 'guarantee';

export type InterviewFactSource =
  | { kind: 'answer'; questionKey: InterviewTextQuestionKey; part: 'answer' | 'followUp' }
  | { kind: 'price_chip'; chip: PriceChipId }
  | { kind: 'credential'; field: CredentialField };

export interface InterviewFact {
  id: string;
  type: InterviewFactType;
  serviceId?: string;
  quote: string;
  condition?: string;
  status: InterviewFactStatus;
  source: InterviewFactSource;
  /** The owner's own correction (status 'edited'); the original quote stays. */
  ownerText?: string;
  reviewedAt?: string;
}

export interface InterviewFactSet {
  version: 1;
  /** The interview session's answer-set version these facts were taken from. */
  answersVersion: number;
  extractedAt: string;
  /** 'model' when the model call succeeded; 'code_only' = price chips + credentials only (model failed or stale claim). */
  extraction: 'model' | 'code_only';
  facts: InterviewFact[];
  /** FACTS_DONE: every fact reviewed. */
  confirmedAt?: string;
}

export const FACT_TYPE_COPY_KEY: Readonly<Record<InterviewFactType, SiteBotStep2bCopyKey>> = {
  job: 'FACT_TYPE_JOB',
  refusal: 'FACT_TYPE_REFUSAL',
  price_rule: 'FACT_TYPE_PRICE_RULE',
  local: 'FACT_TYPE_LOCAL',
  tool: 'FACT_TYPE_TOOL',
  number: 'FACT_TYPE_NUMBER',
  credential: 'FACT_TYPE_CREDENTIAL',
};

/** The visually hidden role="status" text of a reviewed fact (the confirm-facts screen announces his tap's result). */
export const FACT_STATUS_COPY_KEY: Readonly<Record<Exclude<InterviewFactStatus, 'pending'>, SiteBotStep2bCopyKey>> = {
  confirmed: 'FACT_STATUS_CONFIRMED',
  edited: 'FACT_STATUS_EDITED',
  removed: 'FACT_STATUS_REMOVED',
};

export const MAX_QUOTE_CHARS = 300;
export const MIN_QUOTE_CHARS = 2;
export const MAX_OWNER_TEXT_CHARS = 300;
export const MAX_MODEL_FACTS = 20;
const FACT_ID = /^[a-z][a-z0-9-]{0,39}$/;

/** Whitespace-normalised, NFC, without the wrapping quote marks a model likes to add. */
export function normalizeQuote(value: string): string {
  return value.normalize('NFC').replace(/\s+/g, ' ').trim().replace(/^["'\u201C\u201D\u05F4]+|["'\u201C\u201D\u05F4]+$/g, '').trim();
}

export function isFactId(value: unknown): value is string {
  return typeof value === 'string' && FACT_ID.test(value);
}

export function isInterviewFactType(value: unknown): value is InterviewFactType {
  return typeof value === 'string' && (INTERVIEW_FACT_TYPES as readonly string[]).includes(value);
}

/** One answer part the quote may come from. */
export interface QuoteSource {
  key: InterviewTextQuestionKey;
  part: 'answer' | 'followUp';
  text: string;
}

/**
 * The answer part that contains the quote exactly (whitespace-normalised), preferring the question the model named;
 * null when no part does (the fact is dropped: a paraphrased, translated or invented quote never reaches the owner).
 */
export function enforceQuote(quote: unknown, sources: readonly QuoteSource[], preferredKey?: unknown): { quote: string; source: QuoteSource } | null {
  if (typeof quote !== 'string') return null;
  const normalized = normalizeQuote(quote);
  if (normalized.length < MIN_QUOTE_CHARS || normalized.length > MAX_QUOTE_CHARS) return null;
  const ordered = [...sources.filter(source => source.key === preferredKey), ...sources.filter(source => source.key !== preferredKey)];
  const source = ordered.find(item => normalizeQuote(item.text).includes(normalized));
  return source ? { quote: normalized, source } : null;
}

/** A model candidate: whatever the model returned for one fact (validated here, never trusted). */
export interface ModelFactCandidate {
  type?: unknown;
  questionKey?: unknown;
  quote?: unknown;
  condition?: unknown;
  serviceId?: unknown;
}

/**
 * The model's candidates -> facts: unknown types and credential types dropped, quotes enforced, a condition kept only
 * when it is his words too, a serviceId only from the known list, duplicates (type + quote) dropped, at most
 * MAX_MODEL_FACTS. Ids are `a<version>-<n>` in output order.
 */
export function factsFromModel(
  candidates: unknown,
  sources: readonly QuoteSource[],
  serviceIds: readonly string[],
  answersVersion: number,
): InterviewFact[] {
  if (!Array.isArray(candidates)) return [];
  const out: InterviewFact[] = [];
  const seen = new Set<string>();
  for (const raw of candidates.slice(0, MAX_MODEL_FACTS * 2)) {
    if (out.length >= MAX_MODEL_FACTS) break;
    if (!raw || typeof raw !== 'object') continue;
    const candidate = raw as ModelFactCandidate;
    if (!isInterviewFactType(candidate.type) || !MODEL_FACT_TYPES.includes(candidate.type)) continue;
    const matched = enforceQuote(candidate.quote, sources, candidate.questionKey);
    if (!matched) continue;
    const dedupe = `${candidate.type}\u0000${matched.quote}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const condition = typeof candidate.condition === 'string' && candidate.condition.trim()
      ? enforceQuote(candidate.condition, sources, matched.source.key)?.quote
      : undefined;
    const serviceId = typeof candidate.serviceId === 'string' && serviceIds.includes(candidate.serviceId) ? candidate.serviceId : undefined;
    out.push({
      id: `a${answersVersion}-${out.length + 1}`,
      type: candidate.type,
      ...(serviceId ? { serviceId } : {}),
      quote: matched.quote,
      ...(condition && condition !== matched.quote ? { condition } : {}),
      status: 'pending',
      source: { kind: 'answer', questionKey: matched.source.key, part: matched.source.part },
    });
  }
  return out;
}

/** Every ticked price chip is its own price_rule fact; its quote is the chip label he ticked. */
export function factsFromPriceChips(chips: readonly PriceChipId[], label: (chip: PriceChipId) => string): InterviewFact[] {
  return chips.map(chip => ({
    id: `chip-${chip.toLowerCase()}`,
    type: 'price_rule' as const,
    quote: normalizeQuote(label(chip)),
    status: 'pending' as const,
    source: { kind: 'price_chip' as const, chip },
  })).filter(fact => fact.quote.length >= MIN_QUOTE_CHARS);
}

/** The credentials-step answers as credential facts (quote = what he answered there; see interviewFactsFlow.ts). */
export function factsFromCredentials(credentials: Partial<Record<CredentialField, string>>): InterviewFact[] {
  const ids: Record<CredentialField, string> = { yearsInField: 'cred-years', license: 'cred-license', guarantee: 'cred-guarantee' };
  return (['yearsInField', 'license', 'guarantee'] as const).flatMap(field => {
    const quote = normalizeQuote(credentials[field] ?? '');
    if (!quote || quote.length > MAX_QUOTE_CHARS) return [];
    return [{ id: ids[field], type: 'credential' as const, quote, status: 'pending' as const, source: { kind: 'credential' as const, field } }];
  });
}

export type FactDecision = { decision: 'confirm' } | { decision: 'remove' } | { decision: 'fix'; text: string };

/** A request body -> a decision, or null (unknown decision, empty or oversized fix text). */
export function parseFactDecision(body: Record<string, unknown>): FactDecision | null {
  if (body.decision === 'confirm' || body.decision === 'remove') return { decision: body.decision };
  if (body.decision !== 'fix' || typeof body.text !== 'string' || body.text.length > MAX_OWNER_TEXT_CHARS * 2) return null;
  const text = body.text.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!text || text.length > MAX_OWNER_TEXT_CHARS) return null;
  return { decision: 'fix', text };
}

/**
 * One review decision on one fact: confirm (an edited fact stays edited: the shown text is already his), remove, or fix
 * (status edited, his text kept next to the original quote). Null when the id is not in the set.
 */
export function reviewFact(set: InterviewFactSet, factId: string, decision: FactDecision, at: Date): InterviewFactSet | null {
  const index = set.facts.findIndex(fact => fact.id === factId);
  if (index < 0) return null;
  const fact = set.facts[index];
  let next: InterviewFact;
  if (decision.decision === 'confirm') next = fact.status === 'edited' && fact.ownerText ? { ...fact, reviewedAt: at.toISOString() } : { ...fact, status: 'confirmed', reviewedAt: at.toISOString() };
  else if (decision.decision === 'remove') next = { ...fact, status: 'removed', reviewedAt: at.toISOString() };
  else next = { ...fact, status: 'edited', ownerText: decision.text, reviewedAt: at.toISOString() };
  return { ...set, facts: set.facts.map((item, at_) => (at_ === index ? next : item)) };
}

/** FACTS_DONE is enabled once no fact is pending. */
export function allFactsReviewed(set: InterviewFactSet): boolean {
  return set.facts.every(fact => fact.status !== 'pending');
}

/** Structural check of a stored set (a dossier read from disk). */
export function isInterviewFactSet(value: unknown): value is InterviewFactSet {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const set = value as Record<string, unknown>;
  return set.version === 1 && typeof set.answersVersion === 'number' && typeof set.extractedAt === 'string'
    && (set.extraction === 'model' || set.extraction === 'code_only') && Array.isArray(set.facts)
    && set.facts.every(fact => Boolean(fact) && typeof fact === 'object' && isFactId((fact as InterviewFact).id)
      && isInterviewFactType((fact as InterviewFact).type) && typeof (fact as InterviewFact).quote === 'string'
      && (INTERVIEW_FACT_STATUSES as readonly string[]).includes((fact as InterviewFact).status));
}
