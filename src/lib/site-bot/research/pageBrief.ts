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
  businessName: string;
  soloOperator: boolean;
  /** True on the one page per site that may use the "my name is <owner>" opener. */
  ownerIntroPage: boolean;
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
  for (const key of ['informationGainGaps', 'prohibitedClaims'] as const) {
    const items = value[key];
    if (!denseArray(items, MAX_ITEMS_PER_SECTION) || !items.every(boundedText)) invalidBrief();
  }
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
      !boundedText(site.businessName) || typeof site.soloOperator !== 'boolean' || typeof site.ownerIntroPage !== 'boolean') invalidBrief();
  }
  try {
    if (JSON.stringify(value).length > MAX_PAGE_BRIEF_PAYLOAD_CHARS) invalidBrief();
  } catch {
    invalidBrief();
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

export function compilePageBrief(input: PageBriefInput): PageBrief {
  const persona = compactEvidence([input.persona])[0];
  const waoOffer = compactEvidence([input.waoOffer])[0];
  if (!persona || !waoOffer) throw new Error('An approved persona and WAO offer are required for a page brief.');

  const supportedEvidenceIds = approvedIdSet(input);
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
    firstPartyProof: compactEvidence(input.firstPartyProof),
    assertableLocalFacts: compactEvidence(input.localFacts),
    customerDecisions: compactEvidence(input.customerDecisions),
    constraints: compactEvidence(input.constraints),
    links,
    informationGainGaps: compactStrings(input.informationGainGaps),
    prohibitedClaims: compactStrings(input.prohibitedClaims),
    faqPolicy,
    faqCandidates,
    ...(input.site ? { site: structuredClone(input.site) } : {}),
  });
}
