/**
 * Pure provenance-aware compiler for research entities, city facts, and FAQ candidates.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

export const EVIDENCE_CONFIDENCE_THRESHOLDS = {
  ownerConfirmed: 0.8,
  officialFact: 0.8,
  questionCandidate: 0.6,
} as const;

export type SemanticEntityType =
  | 'service'
  | 'subservice'
  | 'problem'
  | 'job_type'
  | 'material_system'
  | 'brand'
  | 'credential'
  | 'cost_factor'
  | 'local_condition';
export type EvidenceAssertionStatus = 'public_assertable' | 'context_only' | 'held';
export type EvidenceSourceKind =
  | 'owner'
  | 'places'
  | 'official'
  | 'municipal'
  | 'serp'
  | 'competitor'
  | 'paa'
  | 'neuronwriter'
  | 'review'
  | 'sales_objection'
  | 'model';

export interface SemanticEvidenceSource {
  kind: EvidenceSourceKind;
  sourceId: string;
  sourceUrl?: string;
  confidence: number;
  serviceRelevant?: boolean;
  locationConfirmed?: boolean;
}

export interface SemanticEntityInput {
  name: string;
  type: SemanticEntityType;
  capabilityConfirmed?: boolean;
  sources: SemanticEvidenceSource[];
}

export interface SemanticRelationshipInput {
  from: string;
  fromType: SemanticEntityType;
  to: string;
  toType: SemanticEntityType;
  kind: 'solves' | 'includes' | 'uses' | 'requires' | 'affects';
  sources: SemanticEvidenceSource[];
}

export interface QuestionCandidateInput {
  question: string;
  source: SemanticEvidenceSource;
  clusterRelevance: number;
}

export interface SemanticEvidenceGraphInput {
  entities?: SemanticEntityInput[];
  relationships?: SemanticRelationshipInput[];
  questions?: QuestionCandidateInput[];
}

export interface SemanticEvidenceNode {
  id: string;
  name: string;
  canonicalName: string;
  type: SemanticEntityType;
  capabilityConfirmed: boolean;
  assertionStatus: EvidenceAssertionStatus;
  provenance: SemanticEvidenceSource[];
}

export interface SemanticEvidenceRelationship {
  fromNodeId: string;
  toNodeId: string;
  kind: SemanticRelationshipInput['kind'];
  assertionStatus: EvidenceAssertionStatus;
  provenance: SemanticEvidenceSource[];
}

export interface QuestionCandidate {
  question: string;
  canonicalQuestion: string;
  clusterRelevance: number;
  status: 'optional';
  provenance: SemanticEvidenceSource[];
}

export interface SemanticEvidenceGraph {
  nodes: SemanticEvidenceNode[];
  relationships: SemanticEvidenceRelationship[];
  questions: QuestionCandidate[];
}

export interface CityEvidenceInput {
  city: string;
  sources: SemanticEvidenceSource[];
}

export interface CityEvidence {
  city: string;
  canonicalCity: string;
  assertionStatus: EvidenceAssertionStatus;
  provenance: SemanticEvidenceSource[];
}

const CAPABILITY_GATED_TYPES = new Set<SemanticEntityType>([
  'service', 'subservice', 'material_system', 'brand', 'credential',
]);

function canonicalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function canonicalQuestion(value: string): string {
  return canonicalize(value).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function validSource(source: SemanticEvidenceSource): boolean {
  return Boolean(source.sourceId.trim()) && Number.isFinite(source.confidence) && source.confidence >= 0 && source.confidence <= 1;
}

function usableSources(sources: SemanticEvidenceSource[]): SemanticEvidenceSource[] {
  return sources.filter(validSource);
}

function hasSource(sources: SemanticEvidenceSource[], kind: EvidenceSourceKind, threshold: number): boolean {
  return sources.some(source => source.kind === kind && source.confidence >= threshold);
}

function hasOfficialFact(sources: SemanticEvidenceSource[]): boolean {
  return sources.some(source =>
    (source.kind === 'official' || source.kind === 'municipal')
    && Boolean(source.sourceUrl)
    && source.serviceRelevant === true
    && source.confidence >= EVIDENCE_CONFIDENCE_THRESHOLDS.officialFact
  );
}

function sourceAssertionStatus(sources: SemanticEvidenceSource[]): EvidenceAssertionStatus {
  if (sources.some(source => source.kind === 'model' || source.kind === 'competitor' || source.kind === 'serp')) return 'context_only';
  if (hasSource(sources, 'owner', EVIDENCE_CONFIDENCE_THRESHOLDS.ownerConfirmed) || hasOfficialFact(sources)) return 'public_assertable';
  return 'context_only';
}

function entityAssertionStatus(entity: Pick<SemanticEntityInput, 'type' | 'capabilityConfirmed' | 'sources'>): EvidenceAssertionStatus {
  const sources = usableSources(entity.sources);
  if (!sources.length) return 'held';
  if (CAPABILITY_GATED_TYPES.has(entity.type) && !entity.capabilityConfirmed) return 'context_only';
  return sourceAssertionStatus(sources);
}

function uniqueSources(sources: SemanticEvidenceSource[]): SemanticEvidenceSource[] {
  const byKey = new Map<string, SemanticEvidenceSource>();
  for (const source of sources) {
    if (!validSource(source)) continue;
    const key = `${source.kind}:${source.sourceId}:${source.sourceUrl ?? ''}`;
    if (!byKey.has(key)) byKey.set(key, source);
  }
  return [...byKey.values()];
}

export function canAssertEvidence(evidence: Pick<SemanticEvidenceNode | CityEvidence, 'assertionStatus'>): boolean {
  return evidence.assertionStatus === 'public_assertable';
}

export function compileCityEvidence(input: CityEvidenceInput): CityEvidence {
  const provenance = uniqueSources(input.sources);
  const assertionStatus = provenance.some(source =>
    source.kind === 'places'
    && Boolean(source.sourceUrl)
    && source.locationConfirmed === true
    && source.confidence >= EVIDENCE_CONFIDENCE_THRESHOLDS.officialFact
  ) || hasOfficialFact(provenance)
    ? 'public_assertable'
    : provenance.length ? 'context_only' : 'held';

  return {
    city: input.city.trim(),
    canonicalCity: canonicalize(input.city),
    assertionStatus,
    provenance,
  };
}

export function compileSemanticEvidenceGraph(input: SemanticEvidenceGraphInput): SemanticEvidenceGraph {
  const nodesById = new Map<string, SemanticEvidenceNode>();
  for (const entity of input.entities ?? []) {
    const name = entity.name.trim();
    const canonicalName = canonicalize(name);
    if (!canonicalName) continue;
    const id = `${entity.type}:${canonicalName}`;
    const existing = nodesById.get(id);
    const mergedSources = uniqueSources([...(existing?.provenance ?? []), ...entity.sources]);
    const capabilityConfirmed = Boolean(existing?.capabilityConfirmed || entity.capabilityConfirmed);
    nodesById.set(id, {
      id,
      name: existing?.name ?? name,
      canonicalName,
      type: entity.type,
      capabilityConfirmed,
      assertionStatus: entityAssertionStatus({ type: entity.type, capabilityConfirmed, sources: mergedSources }),
      provenance: mergedSources,
    });
  }

  const relationships = (input.relationships ?? []).flatMap(relationship => {
    const fromNodeId = `${relationship.fromType}:${canonicalize(relationship.from)}`;
    const toNodeId = `${relationship.toType}:${canonicalize(relationship.to)}`;
    if (!nodesById.has(fromNodeId) || !nodesById.has(toNodeId)) return [];
    const provenance = uniqueSources(relationship.sources);
    const assertionStatus: EvidenceAssertionStatus = hasSource(provenance, 'owner', EVIDENCE_CONFIDENCE_THRESHOLDS.ownerConfirmed)
      ? 'public_assertable'
      : provenance.length ? 'context_only' : 'held';
    return [{
      fromNodeId,
      toNodeId,
      kind: relationship.kind,
      assertionStatus,
      provenance,
    }];
  });

  const questionsByKey = new Map<string, QuestionCandidate>();
  for (const candidate of input.questions ?? []) {
    const question = candidate.question.trim();
    const key = canonicalQuestion(question);
    if (!key || !validSource(candidate.source) || candidate.clusterRelevance < EVIDENCE_CONFIDENCE_THRESHOLDS.questionCandidate) continue;
    const existing = questionsByKey.get(key);
    questionsByKey.set(key, {
      question: existing?.question ?? question,
      canonicalQuestion: key,
      clusterRelevance: Math.max(existing?.clusterRelevance ?? 0, candidate.clusterRelevance),
      status: 'optional',
      provenance: uniqueSources([...(existing?.provenance ?? []), candidate.source]),
    });
  }

  return { nodes: [...nodesById.values()], relationships, questions: [...questionsByKey.values()] };
}
