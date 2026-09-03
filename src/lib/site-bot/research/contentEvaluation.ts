/**
 * Bounded, competitor-relative content evaluation for approved service briefs.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

export type ApprovedSemanticKind = 'term' | 'entity';
export type EvaluationStatus = 'skipped' | 'pending_revision' | 'pass' | 'revision_pass' | 'held';

export interface ApprovedSemanticItem {
  value: string;
  kind: ApprovedSemanticKind;
  relevance: number;
}

export interface EvaluationContent {
  html: string;
  title: string;
  description: string;
}

export interface ProviderEvaluation {
  score?: number;
  terms: string[];
  entities: string[];
  unsupported?: string[];
  overused?: string[];
}

export interface EvaluationAttempt {
  score?: number;
  competitorMedian?: number;
  scoreDelta?: number;
  missingApprovedTerms: string[];
  missingApprovedEntities: string[];
  unsupported: string[];
  overused: string[];
}

export interface RevisionDelta {
  missingApprovedTerms: string[];
  missingApprovedEntities: string[];
  unsupported: string[];
  overused: string[];
}

export interface PageEvaluationInput {
  page: { id: string; pageClass: string };
  queryId?: string;
  content: EvaluationContent;
  approvedItems: ApprovedSemanticItem[];
  competitorScores: number[];
}

export interface PageEvaluationResult {
  pageId: string;
  queryId?: string;
  status: EvaluationStatus;
  attempts: EvaluationAttempt[];
  revisionDelta?: RevisionDelta;
  holdReason?: 'provider_outage' | 'revision_unavailable' | 'second_miss';
}

export interface ContentEvaluationDependencies {
  evaluate(queryId: string, content: EvaluationContent): Promise<ProviderEvaluation>;
  revise?(content: EvaluationContent, delta: RevisionDelta): Promise<EvaluationContent>;
  persist?(result: PageEvaluationResult): Promise<void>;
}

const HIGH_RELEVANCE = 0.7;
const MAX_DELTA_ITEMS = 12;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function concise(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))].slice(0, MAX_DELTA_ITEMS);
}

function median(values: number[]): number | undefined {
  const scores = values.filter(value => Number.isFinite(value)).sort((left, right) => left - right);
  if (!scores.length) return undefined;
  const middle = Math.floor(scores.length / 2);
  return scores.length % 2 ? scores[middle] : (scores[middle - 1] + scores[middle]) / 2;
}

function attemptFrom(input: PageEvaluationInput, evaluation: ProviderEvaluation): EvaluationAttempt {
  const terms = new Set(evaluation.terms.map(normalize));
  const entities = new Set(evaluation.entities.map(normalize));
  const approved = input.approvedItems.filter(item => Number.isFinite(item.relevance) && item.relevance >= HIGH_RELEVANCE);
  const competitorMedian = median(input.competitorScores);
  const score = Number.isFinite(evaluation.score) ? evaluation.score : undefined;
  return {
    ...(score === undefined ? {} : { score }),
    ...(competitorMedian === undefined ? {} : { competitorMedian }),
    ...(score === undefined || competitorMedian === undefined ? {} : { scoreDelta: score - competitorMedian }),
    missingApprovedTerms: concise(approved.filter(item => item.kind === 'term' && !terms.has(normalize(item.value))).map(item => item.value)),
    missingApprovedEntities: concise(approved.filter(item => item.kind === 'entity' && !entities.has(normalize(item.value))).map(item => item.value)),
    unsupported: concise(evaluation.unsupported ?? []),
    overused: concise(evaluation.overused ?? []),
  };
}

export function needsResearchRevision(attempt: EvaluationAttempt): boolean {
  return attempt.scoreDelta === undefined
    || attempt.scoreDelta < 0
    || attempt.missingApprovedTerms.length > 0
    || attempt.missingApprovedEntities.length > 0
    || attempt.unsupported.length > 0
    || attempt.overused.length > 0;
}

export function buildRevisionDelta(attempt: EvaluationAttempt): RevisionDelta {
  return {
    missingApprovedTerms: attempt.missingApprovedTerms,
    missingApprovedEntities: attempt.missingApprovedEntities,
    unsupported: attempt.unsupported,
    overused: attempt.overused,
  };
}

async function persist(result: PageEvaluationResult, dependencies: ContentEvaluationDependencies): Promise<void> {
  await dependencies.persist?.(result);
}

export async function evaluatePageAgainstBrief(
  input: PageEvaluationInput,
  dependencies: ContentEvaluationDependencies,
): Promise<PageEvaluationResult> {
  const pageId = input.page.id.trim();
  const queryId = input.queryId?.trim();
  if (input.page.pageClass !== 'service' || !queryId) {
    return { pageId, ...(queryId ? { queryId } : {}), status: 'skipped', attempts: [] };
  }

  const evaluate = async (content: EvaluationContent): Promise<EvaluationAttempt> => attemptFrom(input, await dependencies.evaluate(queryId, content));
  const base = { pageId, queryId };
  let first: EvaluationAttempt;
  try {
    first = await evaluate(input.content);
  } catch {
    const result: PageEvaluationResult = { ...base, status: 'held', attempts: [], holdReason: 'provider_outage' };
    await persist(result, dependencies);
    return result;
  }

  if (!needsResearchRevision(first)) {
    const result: PageEvaluationResult = { ...base, status: 'pass', attempts: [first] };
    await persist(result, dependencies);
    return result;
  }

  const revisionDelta = buildRevisionDelta(first);
  if (!dependencies.revise) {
    const result: PageEvaluationResult = { ...base, status: 'held', attempts: [first], revisionDelta, holdReason: 'revision_unavailable' };
    await persist(result, dependencies);
    return result;
  }

  await persist({ ...base, status: 'pending_revision', attempts: [first], revisionDelta }, dependencies);
  let second: EvaluationAttempt;
  try {
    second = await evaluate(await dependencies.revise(input.content, revisionDelta));
  } catch {
    const result: PageEvaluationResult = { ...base, status: 'held', attempts: [first], revisionDelta, holdReason: 'provider_outage' };
    await persist(result, dependencies);
    return result;
  }

  const result: PageEvaluationResult = needsResearchRevision(second)
    ? { ...base, status: 'held', attempts: [first, second], revisionDelta, holdReason: 'second_miss' }
    : { ...base, status: 'revision_pass', attempts: [first, second], revisionDelta };
  await persist(result, dependencies);
  return result;
}
