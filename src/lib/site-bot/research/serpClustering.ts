/**
 * Pure SERP-overlap clustering for research keyword variants.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

export const SERP_OVERLAP_THRESHOLDS = {
  strongMerge: 0.7,
  strongSplit: 0.3,
} as const;

const MIN_SERP_RESULTS = 3;

type SearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';
type ResultClassification = 'local_business' | 'directory_aggregator' | 'ecommerce' | 'informational' | 'official' | 'mismatched';

export interface ClusterSerpResult {
  url?: string;
  domain?: string;
  classification: ResultClassification;
}

export interface KeywordClusterInput {
  keyword: string;
  intent?: SearchIntent;
  evidenceQueryIds: string[];
  serp: {
    localPack?: ClusterSerpResult[];
    organic: ClusterSerpResult[];
    exclusions: Array<ClusterSerpResult & { reason: string }>;
  };
}

export type ClusterDecision = 'merge' | 'split' | 'gate';
export type ClusterGateReason = 'middle_band_overlap' | 'mixed_intent' | 'sparse_serp' | 'result_mismatch' | 'directory_dominated';

export interface KeywordEvidenceCluster {
  keywords: string[];
  intent?: SearchIntent;
  decision: ClusterDecision;
  rationale: string;
  evidenceQueryIds: string[];
  confidence: number;
  gateReasons?: ClusterGateReason[];
  excludedResultTypes?: ResultClassification[];
}

function normalizedUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = (parsed.pathname.replace(/\/+$/, '') || '/').toLowerCase();
    return `${parsed.protocol.toLowerCase()}//${hostname}${pathname}`;
  } catch {
    return null;
  }
}

function normalizedDomain(result: ClusterSerpResult): string | null {
  if (result.domain?.trim()) return result.domain.trim().toLowerCase().replace(/^www\./, '');
  const url = result.url ? normalizedUrl(result.url) : null;
  return url ? new URL(url).hostname : null;
}

function resultKeys(results: ClusterSerpResult[]): Set<string> {
  const keys = new Set<string>();
  for (const result of results) {
    const url = result.url ? normalizedUrl(result.url) : null;
    const domain = normalizedDomain(result);
    if (url) keys.add(`url:${url}`);
    if (domain) keys.add(`domain:${domain}`);
  }
  return keys;
}

export function calculateSerpOverlap(left: ClusterSerpResult[], right: ClusterSerpResult[]): number {
  const leftKeys = resultKeys(left);
  const rightKeys = resultKeys(right);
  if (!leftKeys.size && !rightKeys.size) return 0;
  const union = new Set([...leftKeys, ...rightKeys]);
  const intersection = [...leftKeys].filter(key => rightKeys.has(key));
  return intersection.length / union.size;
}

function allResults(input: KeywordClusterInput): ClusterSerpResult[] {
  return [...(input.serp.localPack ?? []), ...input.serp.organic];
}

function hasSparseSerp(input: KeywordClusterInput): boolean {
  return resultKeys(allResults(input)).size < MIN_SERP_RESULTS;
}

function isDirectoryDominated(input: KeywordClusterInput): boolean {
  const included = allResults(input).length;
  const directories = input.serp.exclusions.filter(result => result.classification === 'directory_aggregator').length;
  return directories > 0 && directories >= included;
}

function hasResultMismatch(left: KeywordClusterInput, right: KeywordClusterInput): boolean {
  const classifications = new Map<string, ResultClassification>();
  for (const result of allResults(left)) {
    for (const key of resultKeys([result])) classifications.set(key, result.classification);
  }
  for (const result of allResults(right)) {
    for (const key of resultKeys([result])) {
      const existing = classifications.get(key);
      if (existing && existing !== result.classification) return true;
    }
  }
  return false;
}

function unique<T>(values: T[]): T[] { return [...new Set(values)]; }

function decisionFor(left: KeywordClusterInput, right: KeywordClusterInput): Pick<KeywordEvidenceCluster, 'decision' | 'rationale' | 'confidence' | 'gateReasons'> {
  const overlap = calculateSerpOverlap(allResults(left), allResults(right));
  const gateReasons: ClusterGateReason[] = [];
  if (left.intent && right.intent && left.intent !== right.intent) gateReasons.push('mixed_intent');
  if (hasSparseSerp(left) || hasSparseSerp(right)) gateReasons.push('sparse_serp');
  if (isDirectoryDominated(left) || isDirectoryDominated(right)) gateReasons.push('directory_dominated');
  if (hasResultMismatch(left, right)) gateReasons.push('result_mismatch');
  if (overlap > SERP_OVERLAP_THRESHOLDS.strongSplit && overlap < SERP_OVERLAP_THRESHOLDS.strongMerge) gateReasons.push('middle_band_overlap');

  if (gateReasons.length) {
    return { decision: 'gate', rationale: `Human review required: ${gateReasons.join(', ')} (SERP overlap ${overlap.toFixed(2)}).`, confidence: 0.5, gateReasons };
  }
  if (overlap >= SERP_OVERLAP_THRESHOLDS.strongMerge && left.intent === right.intent) {
    return { decision: 'merge', rationale: `Automatic merge: strong SERP overlap (${overlap.toFixed(2)}) with compatible intent.`, confidence: overlap };
  }
  return { decision: 'split', rationale: `Automatic split: strong SERP separation (${overlap.toFixed(2)}).`, confidence: 1 - overlap };
}

function toCluster(inputs: KeywordClusterInput[], result: Pick<KeywordEvidenceCluster, 'decision' | 'rationale' | 'confidence' | 'gateReasons'>): KeywordEvidenceCluster {
  const excludedResultTypes = unique(inputs.flatMap(input => input.serp.exclusions.map(result => result.classification)));
  const intents = unique(inputs.flatMap(input => input.intent ? [input.intent] : []));
  return {
    keywords: inputs.map(input => input.keyword),
    ...(intents.length === 1 ? { intent: intents[0] } : {}),
    decision: result.decision,
    rationale: result.rationale,
    evidenceQueryIds: unique(inputs.flatMap(input => input.evidenceQueryIds)),
    confidence: result.confidence,
    ...(result.gateReasons?.length ? { gateReasons: result.gateReasons } : {}),
    ...(excludedResultTypes.length ? { excludedResultTypes } : {}),
  };
}

export function clusterKeywordEvidence(inputs: KeywordClusterInput[]): KeywordEvidenceCluster[] {
  const ordered = inputs.filter(input => input.keyword.trim());
  const clusters: KeywordEvidenceCluster[] = [];
  const consumed = new Set<number>();

  for (let index = 0; index < ordered.length; index += 1) {
    if (consumed.has(index)) continue;
    const current = ordered[index];
    const related = [current];
    let decision: ReturnType<typeof decisionFor> | null = null;
    for (let candidateIndex = index + 1; candidateIndex < ordered.length; candidateIndex += 1) {
      if (consumed.has(candidateIndex)) continue;
      const candidateDecision = decisionFor(current, ordered[candidateIndex]);
      if (candidateDecision.decision === 'split') continue;
      related.push(ordered[candidateIndex]);
      consumed.add(candidateIndex);
      decision = candidateDecision;
    }
    if (!decision) {
      clusters.push(toCluster(related, { decision: 'split', rationale: 'Automatic split: no compatible SERP evidence candidate.', confidence: 1 }));
    } else {
      clusters.push(toCluster(related, decision));
    }
  }
  return clusters;
}

export function findAmbiguousClusters(clusters: KeywordEvidenceCluster[]): KeywordEvidenceCluster[] {
  return clusters.filter(cluster => cluster.decision === 'gate');
}
