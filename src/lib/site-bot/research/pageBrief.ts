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
  });
}
