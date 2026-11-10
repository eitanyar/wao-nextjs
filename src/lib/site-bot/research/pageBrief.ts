/**
 * Bounded, evidence-selected copy briefs for approved research pages.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

export const MAX_PAGE_BRIEF_PAYLOAD_CHARS = 100_000;
const MAX_EVIDENCE_VALUE_CHARS = 240;
const MAX_ITEMS_PER_SECTION = 24;
const MAX_FAQ_ITEMS = 8;
const MIN_FAQ_RELEVANCE = 0.6;

export type BriefEvidenceStatus = 'approved' | 'held' | 'rejected';
export type FaqSource = 'paa' | 'neuronwriter' | 'owner_faq' | 'review' | 'sales_objection';
export type FaqPolicy = 'none' | 'optional' | 'required_for_user_clarity';

export interface BriefEvidence {
  id: string;
  value: string;
  status: BriefEvidenceStatus;
}

export interface PageBriefFaqCandidate {
  id: string;
  question: string;
  answer: string;
  source: FaqSource;
  relevance: number;
  answerEvidenceIds: string[];
  requiredForUserClarity?: boolean;
}

export interface PageBriefLink {
  targetPath: string;
  relationship: string;
  evidenceIds: string[];
}

/**
 * Site-level facts the copy step needs (M2a.1). All values are owner wording or the
 * persisted site identity; nothing here is model copy.
 */
export interface PageBriefSite {
  /** Plain name of this page's subject: the service name (money page) or trade (homepage). */
  pageName: string;
  /** Hero relevance term: this page's own service; the primary service on the homepage. */
  relevanceTerm: string;
  /** Base city display name, or null. */
  city: string | null;
  /** Owner-stated places, never widened. */
  serviceArea: string[];
  /** Every owner-confirmed service name, this page's own first. */
  serviceLabels: string[];
  /** M2a.3: the owner's wording of each service, aligned with serviceLabels (scopes fix-time claims). */
  serviceSources?: string[];
  businessName: string;
  soloOperator: boolean;
  /** True on the one page per site that may use the "my name is <owner>" opener. */
  ownerIntroPage: boolean;
}

/**
 * Content depth (Yonatan, 2026-11-10; before-M3 part). Service (money) pages size their copy from NeuronWriter's competitor
 * word target, clamped to [floor, ceiling]; never padded (facts run out -> a shorter page and a logged fact_gap).
 */
export const DEPTH_WORD_FLOOR = 250;
export const DEPTH_WORD_CEILING = 600;
export const MAX_QUESTION_POOL = 8;
export const MAX_SUGGESTED_TERMS = MAX_ITEMS_PER_SECTION;
/** B4 renders 3 to 6 Q&A items, so the block is enabled only with at least this many pooled questions. */
export const QA_MIN_POOL = 3;

export interface LengthBand { floor: number; target: number; ceiling: number }
/** A NeuronWriter content term: a suggestion, never a requirement; at most `max` uses on the page. */
export interface BriefTerm { t: string; min: number; max: number }
export type BriefQuestionSource = 'paa' | 'suggested' | 'topic' | 'content';
export interface BriefQuestion { id: string; question: string; source: BriefQuestionSource }
/** Which service-page blocks this page may generate, from the owner facts that exist (B1 process, B4 Q&A, B6 proof). */
export interface BlocksEnabled { process: boolean; qa: boolean; proof: boolean }

/** Depth inputs of one service page: NeuronWriter data (already filtered by the caller's predicates) and service facts. */
export interface PageBriefDepthInput {
  wordTarget?: number;
  terms: BriefTerm[];
  questions: Array<{ question: string; source: BriefQuestionSource }>;
  /** Owner facts about how this service is done (the job walkthrough / service attributes). They enable B1. */
  serviceFacts?: BriefEvidence[];
  /** Brand / place / service / price predicates (functions; input only, never on the compiled brief). */
  filters?: DepthTextFilters;
}

export interface PageBriefInput {
  page: {
    id: string;
    targetPath: string;
    pageClass: string;
  };
  persona: BriefEvidence;
  waoOffer: BriefEvidence;
  targetQueries: BriefEvidence[];
  entityAnchors: BriefEvidence[];
  firstPartyProof: BriefEvidence[];
  localFacts: BriefEvidence[];
  customerDecisions: BriefEvidence[];
  constraints: BriefEvidence[];
  links: PageBriefLink[];
  informationGainGaps: string[];
  prohibitedClaims: string[];
  faqCandidates: PageBriefFaqCandidate[];
  siblingFaqQuestions?: string[];
  site?: PageBriefSite;
  /** Content depth: service pages only; absent = no depth fields on the brief (homepage, legacy briefs). */
  depth?: PageBriefDepthInput;
}

export interface PageBrief {
  page: PageBriefInput['page'];
  persona: { id: string; value: string };
  waoOffer: { id: string; value: string };
  targetQueries: Array<{ id: string; value: string }>;
  approvedEntityAnchors: Array<{ id: string; value: string }>;
  firstPartyProof: Array<{ id: string; value: string }>;
  assertableLocalFacts: Array<{ id: string; value: string }>;
  customerDecisions: Array<{ id: string; value: string }>;
  constraints: Array<{ id: string; value: string }>;
  links: PageBriefLink[];
  informationGainGaps: string[];
  prohibitedClaims: string[];
  faqPolicy: FaqPolicy;
  faqCandidates: PageBriefFaqCandidate[];
  site?: PageBriefSite;
  /** Content depth (service pages only; every field absent on other and older briefs). */
  lengthBand?: LengthBand;
  suggestedTerms?: BriefTerm[];
  questionPool?: BriefQuestion[];
  blocksEnabled?: BlocksEnabled;
  serviceFacts?: Array<{ id: string; value: string }>;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function boundedText(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_EVIDENCE_VALUE_CHARS && value.trim().length > 0;
}

function denseArray(value: unknown, limit: number): value is unknown[] {
  return Array.isArray(value) && value.length <= limit &&
    Array.from({ length: value.length }, (_, index) => Object.hasOwn(value, index)).every(Boolean);
}

function invalidBrief(): never {
  throw new Error('Invalid bounded page brief.');
}

/** Validate request data without normalizing it or conferring factual approval. */
export function assertBoundedPageBrief(value: unknown): asserts value is PageBrief {
  if (!plainObject(value) || !plainObject(value.page) ||
    !boundedText(value.page.id) || !boundedText(value.page.targetPath) || !boundedText(value.page.pageClass)) invalidBrief();

  const evidenceIds = new Set<string>();
  const evidence = (item: unknown, sectionIds: Set<string>): void => {
    if (!plainObject(item) || !boundedText(item.id) || !boundedText(item.value) || sectionIds.has(item.id)) invalidBrief();
    sectionIds.add(item.id);
    evidenceIds.add(item.id);
  };
  evidence(value.persona, new Set());
  evidence(value.waoOffer, new Set());
  for (const key of ['targetQueries', 'approvedEntityAnchors', 'firstPartyProof', 'assertableLocalFacts',
    'customerDecisions', 'constraints'] as const) {
    const items = value[key];
    if (!denseArray(items, MAX_ITEMS_PER_SECTION)) invalidBrief();
    const sectionIds = new Set<string>();
    for (const item of items) evidence(item, sectionIds);
  }
  if (value.serviceFacts !== undefined) {
    if (!denseArray(value.serviceFacts, MAX_ITEMS_PER_SECTION)) invalidBrief();
    const sectionIds = new Set<string>();
    for (const item of value.serviceFacts) evidence(item, sectionIds);
  }
  for (const key of ['informationGainGaps', 'prohibitedClaims'] as const) {
    const items = value[key];
    if (!denseArray(items, MAX_ITEMS_PER_SECTION) || !items.every(boundedText)) invalidBrief();
  }
  assertDepthFields(value);
  if (value.faqPolicy !== 'none' && value.faqPolicy !== 'optional' &&
    value.faqPolicy !== 'required_for_user_clarity') invalidBrief();
  if (!denseArray(value.faqCandidates, MAX_FAQ_ITEMS) || !denseArray(value.links, MAX_ITEMS_PER_SECTION)) invalidBrief();

  const referencedIds = (ids: unknown): boolean => denseArray(ids, MAX_ITEMS_PER_SECTION) && ids.length > 0 &&
    ids.every(id => boundedText(id) && evidenceIds.has(id));
  for (const item of value.faqCandidates) {
    if (!plainObject(item) || !boundedText(item.id) || !boundedText(item.question) ||
      !boundedText(item.answer) || !['paa', 'neuronwriter', 'owner_faq', 'review', 'sales_objection'].includes(item.source as string) ||
      typeof item.relevance !== 'number' || !Number.isFinite(item.relevance) ||
      item.relevance < 0 || item.relevance > 1 || !referencedIds(item.answerEvidenceIds) ||
      (item.requiredForUserClarity !== undefined && typeof item.requiredForUserClarity !== 'boolean')) invalidBrief();
  }
  for (const item of value.links) {
    if (!plainObject(item) || !boundedText(item.targetPath) || !boundedText(item.relationship) ||
      !referencedIds(item.evidenceIds)) invalidBrief();
  }
  if (value.site !== undefined) {
    const site = value.site;
    const list = (items: unknown) => denseArray(items, MAX_ITEMS_PER_SECTION) && items.every(boundedText);
    if (!plainObject(site) || !boundedText(site.pageName) || !boundedText(site.relevanceTerm) ||
      (site.city !== null && !boundedText(site.city)) || !list(site.serviceArea) || !list(site.serviceLabels) ||
      !boundedText(site.businessName) || typeof site.soloOperator !== 'boolean' || typeof site.ownerIntroPage !== 'boolean' ||
      (site.serviceSources !== undefined && (!list(site.serviceSources) || site.serviceSources.length !== site.serviceLabels.length))) invalidBrief();
  }
  try {
    if (JSON.stringify(value).length > MAX_PAGE_BRIEF_PAYLOAD_CHARS) invalidBrief();
  } catch {
    invalidBrief();
  }
}

const wholeCount = (value: unknown, min: number, max: number): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/** Content depth: the optional depth fields of a request brief (each absent, or well-formed and bounded). */
function assertDepthFields(value: Record<string, unknown>): void {
  if (value.lengthBand !== undefined) {
    const band = value.lengthBand;
    if (!plainObject(band) || !wholeCount(band.floor, 0, 5000) || !wholeCount(band.target, 0, 5000) || !wholeCount(band.ceiling, 0, 5000) ||
      (band.floor as number) > (band.target as number) || (band.target as number) > (band.ceiling as number)) invalidBrief();
  }
  if (value.suggestedTerms !== undefined) {
    if (!denseArray(value.suggestedTerms, MAX_SUGGESTED_TERMS)) invalidBrief();
    for (const term of value.suggestedTerms) {
      if (!plainObject(term) || !boundedText(term.t) || !wholeCount(term.min, 0, 100) || !wholeCount(term.max, 0, 100) || (term.min as number) > (term.max as number)) invalidBrief();
    }
  }
  if (value.questionPool !== undefined) {
    if (!denseArray(value.questionPool, MAX_QUESTION_POOL)) invalidBrief();
    const ids = new Set<string>();
    for (const item of value.questionPool) {
      if (!plainObject(item) || !boundedText(item.id) || ids.has(item.id) || !boundedText(item.question) ||
        !['paa', 'suggested', 'topic', 'content'].includes(item.source as string)) invalidBrief();
      ids.add(item.id as string);
    }
  }
  if (value.blocksEnabled !== undefined) {
    const blocks = value.blocksEnabled;
    if (!plainObject(blocks) || ['process', 'qa', 'proof'].some(key => typeof blocks[key] !== 'boolean')) invalidBrief();
  }
}

function normalizeText(value: string, maxLength = MAX_EVIDENCE_VALUE_CHARS): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function canonicalQuestion(value: string): string {
  return normalizeText(value, MAX_EVIDENCE_VALUE_CHARS).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function compactEvidence(items: BriefEvidence[]): Array<{ id: string; value: string }> {
  const selected = new Map<string, { id: string; value: string }>();
  for (const item of items) {
    const id = item.id.trim();
    const value = normalizeText(item.value);
    if (item.status !== 'approved' || !id || !value || selected.has(id)) continue;
    selected.set(id, { id, value });
    if (selected.size === MAX_ITEMS_PER_SECTION) break;
  }
  return [...selected.values()];
}

function approvedIdSet(input: PageBriefInput): Set<string> {
  return new Set([
    input.persona,
    input.waoOffer,
    ...input.targetQueries,
    ...input.entityAnchors,
    ...input.firstPartyProof,
    ...input.localFacts,
    ...input.customerDecisions,
    ...input.constraints,
  ].filter(item => item.status === 'approved').map(item => item.id.trim()).filter(Boolean));
}

export function selectFaqCandidates(
  candidates: PageBriefFaqCandidate[],
  siblingQuestions: Set<string>,
  supportedEvidenceIds: Set<string>,
): PageBriefFaqCandidate[] {
  const selected: PageBriefFaqCandidate[] = [];
  const seenQuestions = new Set(siblingQuestions);
  for (const candidate of candidates) {
    const question = normalizeText(candidate.question);
    const answer = normalizeText(candidate.answer);
    const canonical = canonicalQuestion(question);
    const evidenceIds = [...new Set(candidate.answerEvidenceIds.map(id => id.trim()).filter(Boolean))];
    const answerable = evidenceIds.some(id => supportedEvidenceIds.has(id));
    if (!candidate.id.trim() || !canonical || !answer || !Number.isFinite(candidate.relevance)
      || candidate.relevance < MIN_FAQ_RELEVANCE || !answerable || seenQuestions.has(canonical)) continue;
    selected.push({
      ...candidate,
      id: candidate.id.trim(),
      question,
      answer,
      answerEvidenceIds: evidenceIds.filter(id => supportedEvidenceIds.has(id)),
    });
    seenQuestions.add(canonical);
    if (selected.length === MAX_FAQ_ITEMS) break;
  }
  return selected;
}

function compactStrings(values: string[]): string[] {
  const selected = new Set<string>();
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) selected.add(normalized);
    if (selected.size === MAX_ITEMS_PER_SECTION) break;
  }
  return [...selected];
}

function ensurePayloadBound(brief: PageBrief): PageBrief {
  if (JSON.stringify(brief).length <= MAX_PAGE_BRIEF_PAYLOAD_CHARS) return brief;
  return {
    ...brief,
    firstPartyProof: brief.firstPartyProof.slice(0, 8),
    assertableLocalFacts: brief.assertableLocalFacts.slice(0, 8),
    customerDecisions: brief.customerDecisions.slice(0, 8),
    constraints: brief.constraints.slice(0, 8),
    informationGainGaps: brief.informationGainGaps.slice(0, 8),
    prohibitedClaims: brief.prohibitedClaims.slice(0, 8),
    faqCandidates: brief.faqCandidates.slice(0, 4),
  };
}

/** Content depth: clamp(NeuronWriter word target, floor, ceiling); no target -> the floor. */
export function lengthBandFor(wordTarget: number | undefined): LengthBand {
  const raw = typeof wordTarget === 'number' && Number.isFinite(wordTarget) ? Math.round(wordTarget) : DEPTH_WORD_FLOOR;
  return { floor: DEPTH_WORD_FLOOR, target: Math.min(DEPTH_WORD_CEILING, Math.max(DEPTH_WORD_FLOOR, raw)), ceiling: DEPTH_WORD_CEILING };
}

/**
 * Content depth: what the caller's filters decide about one NeuronWriter term or question (pure here; the predicates live
 * with the gate data). A term is dropped when any predicate rejects it: a competitor brand, a place outside the owner's
 * stated area, a service he does not offer, or a price.
 */
export interface DepthTextFilters {
  competitorBrand?: (text: string) => boolean;
  otherPlace?: (text: string) => boolean;
  unofferedService?: (text: string) => boolean;
  price?: (text: string) => boolean;
  /**
   * Latin-letter terms are dropped (on a Hebrew page they are brands, domains or platform names) unless the page's own search
   * keyword is Latin (synthetic fixtures, Latin trade names).
   */
  latinAllowed?: boolean;
}

function rejectedBy(text: string, filters: DepthTextFilters): boolean {
  return [filters.competitorBrand, filters.otherPlace, filters.unofferedService, filters.price].some(check => Boolean(check?.(text)));
}

/** Suggested terms: bounded, deduped, Latin-free unless allowed (brands and domains are Latin), and passing every filter. */
export function filterSuggestedTerms(terms: readonly BriefTerm[], filters: DepthTextFilters = {}): BriefTerm[] {
  const out: BriefTerm[] = [];
  const seen = new Set<string>();
  for (const term of terms) {
    const t = normalizeText(term.t);
    const key = t.toLowerCase();
    if (!t || seen.has(key) || (!filters.latinAllowed && /[A-Za-z]/.test(t)) || !Number.isInteger(term.min) || !Number.isInteger(term.max) || term.min < 0 || term.max < term.min) continue;
    if (rejectedBy(t, filters)) continue;
    seen.add(key);
    out.push({ t, min: term.min, max: term.max });
    if (out.length === MAX_SUGGESTED_TERMS) break;
  }
  return out;
}

/** The question pool: deduped (canonical form), filtered like the terms (minus the price filter), at most MAX_QUESTION_POOL. */
export function buildQuestionPool(questions: PageBriefDepthInput['questions'], filters: DepthTextFilters = {}, exclude: ReadonlySet<string> = new Set()): BriefQuestion[] {
  const out: BriefQuestion[] = [];
  const seen = new Set(exclude);
  const { price: _price, latinAllowed: _latin, ...questionFilters } = filters;
  void _price;
  void _latin;
  for (const item of questions) {
    const question = normalizeText(item.question);
    const canonical = canonicalQuestion(question);
    if (!canonical || seen.has(canonical) || rejectedBy(question, questionFilters)) continue;
    seen.add(canonical);
    out.push({ id: `question-${out.length + 1}`, question, source: item.source });
    if (out.length === MAX_QUESTION_POOL) break;
  }
  return out;
}

/** Content depth: the fact IDs a block item may cite (owner facts only: never the persona, the queries or a question). */
export function briefFactTexts(brief: Pick<PageBrief, 'waoOffer' | 'approvedEntityAnchors' | 'firstPartyProof' | 'assertableLocalFacts' | 'customerDecisions' | 'constraints' | 'serviceFacts'>): Map<string, string> {
  return new Map([
    brief.waoOffer,
    ...brief.approvedEntityAnchors,
    ...brief.firstPartyProof,
    ...brief.assertableLocalFacts,
    ...brief.customerDecisions,
    ...brief.constraints,
    ...(brief.serviceFacts ?? []),
  ].map(item => [item.id, item.value]));
}

function compileDepth(input: PageBriefInput, proof: Array<{ id: string; value: string }>): Pick<PageBrief, 'lengthBand' | 'suggestedTerms' | 'questionPool' | 'blocksEnabled' | 'serviceFacts'> | null {
  const depth = input.depth;
  if (!depth) return null;
  const serviceFacts = compactEvidence(depth.serviceFacts ?? []);
  const questionPool = buildQuestionPool(depth.questions, depth.filters ?? {}, new Set((input.siblingFaqQuestions ?? []).map(canonicalQuestion).filter(Boolean)));
  const ownerAnswerFacts = proof.length + serviceFacts.length + compactEvidence(input.constraints).length;
  return {
    lengthBand: lengthBandFor(depth.wordTarget),
    suggestedTerms: filterSuggestedTerms(depth.terms, depth.filters ?? {}),
    questionPool,
    blocksEnabled: {
      process: serviceFacts.length > 0,
      qa: questionPool.length >= QA_MIN_POOL && ownerAnswerFacts > 0,
      proof: proof.length > 0,
    },
    serviceFacts,
  };
}

export function compilePageBrief(input: PageBriefInput): PageBrief {
  const persona = compactEvidence([input.persona])[0];
  const waoOffer = compactEvidence([input.waoOffer])[0];
  if (!persona || !waoOffer) throw new Error('An approved persona and WAO offer are required for a page brief.');

  const supportedEvidenceIds = approvedIdSet(input);
  const firstPartyProof = compactEvidence(input.firstPartyProof);
  const depth = compileDepth(input, firstPartyProof);
  const faqCandidates = selectFaqCandidates(
    input.faqCandidates,
    new Set((input.siblingFaqQuestions ?? []).map(canonicalQuestion).filter(Boolean)),
    supportedEvidenceIds,
  );
  const faqPolicy: FaqPolicy = faqCandidates.some(candidate => candidate.requiredForUserClarity)
    ? 'required_for_user_clarity'
    : faqCandidates.length ? 'optional' : 'none';
  const links = input.links
    .filter(link => link.targetPath.trim() && link.relationship.trim() && link.evidenceIds.length > 0 && link.evidenceIds.every(id => supportedEvidenceIds.has(id)))
    .slice(0, MAX_ITEMS_PER_SECTION)
    .map(link => ({ ...link, targetPath: link.targetPath.trim(), relationship: link.relationship.trim(), evidenceIds: [...new Set(link.evidenceIds)] }));

  return ensurePayloadBound({
    page: { id: input.page.id.trim(), targetPath: input.page.targetPath.trim(), pageClass: input.page.pageClass.trim() },
    persona,
    waoOffer,
    targetQueries: compactEvidence(input.targetQueries),
    approvedEntityAnchors: compactEvidence(input.entityAnchors),
    firstPartyProof,
    assertableLocalFacts: compactEvidence(input.localFacts),
    customerDecisions: compactEvidence(input.customerDecisions),
    constraints: compactEvidence(input.constraints),
    links,
    informationGainGaps: compactStrings(input.informationGainGaps),
    prohibitedClaims: compactStrings(input.prohibitedClaims),
    faqPolicy,
    faqCandidates,
    ...(input.site ? { site: structuredClone(input.site) } : {}),
    ...(depth ?? {}),
  });
}
