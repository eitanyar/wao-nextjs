import {
  classifySearchIntent,
  expandServiceSeeds,
  fetchKeywordMetrics,
  fetchLocalSerpEvidence,
  ResearchBudgetExceededError,
  type KeywordMetric,
  type LocalSerpEvidence,
  type SearchIntentResult,
} from './dataForSeoResearch';
import { compileBusinessTruthModel, findBusinessTruthGaps, type BusinessTruthInput } from './businessTruth';
import { compileCityEvidence, compileSemanticEvidenceGraph } from './evidenceGraph';
import { createServiceQuery, getServiceQuery, type NeuronServiceQuery, type ServiceQueryInput } from './neuronWriter';
import { readResearchDossier, writeResearchDossierAtomic } from './researchStore';
import type { EvidenceNode, HumanGate, SiteResearchDossier } from './types';

export const RESEARCH_STAGES = ['truth', 'seed_expansion', 'metrics', 'intent', 'shortlist', 'live_serps', 'neuron_enrichment', 'evidence_graph', 'usage_ledger', 'readiness'] as const;
export type ResearchStage = (typeof RESEARCH_STAGES)[number];

export interface ResearchProviders {
  dataForSeo: {
    expand(seeds: string[]): ReturnType<typeof expandServiceSeeds>;
    metrics(keywords: string[]): ReturnType<typeof fetchKeywordMetrics>;
    intent(keywords: string[]): ReturnType<typeof classifySearchIntent>;
    serps(keywords: string[]): ReturnType<typeof fetchLocalSerpEvidence>;
  };
  neuron: {
    create(input: ServiceQueryInput): Promise<NeuronServiceQuery>;
    get(queryId: string, input: Pick<ServiceQueryInput, 'serviceKeyword' | 'intentCluster'>): Promise<NeuronServiceQuery>;
  };
}

export interface SiteResearchInput {
  businessTruth: BusinessTruthInput;
  seeds?: string[];
}

export interface SiteResearchOptions {
  providers?: ResearchProviders;
  now?: () => Date;
  baseDir?: string;
}

export interface SiteResearchResult {
  dossier: SiteResearchDossier;
  stages: ResearchStage[];
  gates: HumanGate[];
}

const DEMAND_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const SERP_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function defaultProviders(): ResearchProviders {
  return {
    dataForSeo: { expand: expandServiceSeeds, metrics: fetchKeywordMetrics, intent: classifySearchIntent, serps: fetchLocalSerpEvidence },
    neuron: { create: createServiceQuery, get: getServiceQuery },
  };
}

function nowIso(now: () => Date): string { return now().toISOString(); }
function expiresAt(now: () => Date, ttlMs: number): string { return new Date(now().getTime() + ttlMs).toISOString(); }
function isFresh(value: { expiresAt?: string }, now: () => Date): boolean { return Boolean(value.expiresAt && Date.parse(value.expiresAt) > now().getTime()); }
function opaqueId(value: string): boolean { return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value); }

function ownerEvidence(input: BusinessTruthInput, now: () => Date): EvidenceNode[] {
  const compiled = compileBusinessTruthModel(input);
  return compiled.confirmedServices.map(service => ({
    id: `owner-service:${service.value.toLowerCase().replace(/\s+/g, '-')}`,
    claim: service.label,
    sourceKind: 'manual',
    providerRecordId: service.owner.sourceId,
    retrievedAt: service.owner.capturedAt || nowIso(now),
    confidence: 0.95,
    assertionStatus: 'verified',
  }));
}

function initialDossier(researchId: string, input: SiteResearchInput, now: () => Date): SiteResearchDossier {
  const assertions = ownerEvidence(input.businessTruth, now);
  const timestamp = nowIso(now);
  return {
    researchId,
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
    businessTruth: { businessName: input.businessTruth.businessName.trim(), assertions, status: assertions.length ? 'verified' : 'unknown' },
    evidence: [], evidenceEdges: [], keywordEvidence: [], serpObservations: [], pageOpportunities: [], internalLinkEdges: [], providerUsage: [], humanGates: [],
  };
}

function gate(id: string, note: string, now: () => Date): HumanGate {
  return { id, requiredFor: 'architecture_ready', status: 'held', requestedAt: nowIso(now), note };
}

function addGate(dossier: SiteResearchDossier, item: HumanGate): void {
  if (!dossier.humanGates.some(existing => existing.id === item.id)) dossier.humanGates.push(item);
}

function addUsage(dossier: SiteResearchDossier, provider: string, entries: Array<{ operation: string; taskIds: string[]; estimatedCostUsd?: number }>, now: () => Date): void {
  for (const entry of entries) {
    const providerRecordId = entry.taskIds.join(',') || `${provider}:${entry.operation}`;
    if (dossier.providerUsage.some(usage => usage.provider === provider && usage.operation === entry.operation && usage.providerRecordId === providerRecordId)) continue;
    dossier.providerUsage.push({ provider, operation: entry.operation, units: 1, ...(entry.estimatedCostUsd === undefined ? {} : { estimatedCostUsd: entry.estimatedCostUsd }), sourceKind: 'provider', providerRecordId, retrievedAt: nowIso(now), confidence: 1, assertionStatus: 'verified' });
  }
}

function hasUsage(dossier: SiteResearchDossier, operation: string): boolean { return dossier.providerUsage.some(usage => usage.operation === operation); }

async function save(dossier: SiteResearchDossier, options: SiteResearchOptions, now: () => Date): Promise<void> {
  dossier.updatedAt = nowIso(now);
  if (!await writeResearchDossierAtomic(dossier.researchId, dossier, options.baseDir)) throw new Error('Unable to persist research dossier');
}

function keywordsFor(input: SiteResearchInput, dossier: SiteResearchDossier): string[] {
  const seeded = input.seeds?.map(seed => seed.trim()).filter(Boolean) ?? [];
  return [...new Set([...seeded, ...dossier.businessTruth.assertions.map(assertion => assertion.claim)])];
}

function shortList(dossier: SiteResearchDossier): string[] {
  return dossier.keywordEvidence
    .filter(item => item.intent === 'commercial' || item.intent === 'transactional')
    .sort((left, right) => (right.searchVolume ?? 0) - (left.searchVolume ?? 0))
    .slice(0, 10)
    .map(item => item.keyword);
}

function applyMetrics(dossier: SiteResearchDossier, metrics: KeywordMetric[], intents: SearchIntentResult['intents'], now: () => Date): void {
  const intentByKeyword = new Map(intents.map(item => [item.keyword, item.intent]));
  dossier.keywordEvidence = metrics.map(metric => ({ keyword: metric.keyword, ...(metric.searchVolume === undefined ? {} : { searchVolume: metric.searchVolume }), ...(intentByKeyword.has(metric.keyword) ? { intent: intentByKeyword.get(metric.keyword) } : {}), sourceKind: 'keyword_provider', providerRecordId: `keyword:${metric.keyword}`, retrievedAt: nowIso(now), expiresAt: expiresAt(now, DEMAND_TTL_MS), timeSensitive: true, confidence: 0.9, assertionStatus: 'verified' }));
}

function applySerps(dossier: SiteResearchDossier, evidence: LocalSerpEvidence[], now: () => Date): void {
  dossier.serpObservations = evidence.flatMap(item => [...item.localPack, ...item.organic].map(result => ({ query: item.query, ...(result.rank === undefined ? {} : { rank: result.rank }), ...(result.url ? { observedUrl: result.url } : {}), observation: result.classification, sourceKind: 'serp_provider' as const, providerRecordId: item.taskId ?? `serp:${item.query}`, retrievedAt: nowIso(now), expiresAt: expiresAt(now, SERP_TTL_MS), timeSensitive: true, confidence: 0.8, assertionStatus: 'verified' })));
}

function applyNeuron(dossier: SiteResearchDossier, query: NeuronServiceQuery, now: () => Date): void {
  const id = `neuron-query:${query.serviceKeyword.toLowerCase().replace(/\s+/g, '-')}`;
  dossier.evidence = dossier.evidence.filter(item => item.id !== id);
  dossier.evidence.push({ id, claim: query.serviceKeyword, sourceKind: 'provider', providerRecordId: query.id, retrievedAt: nowIso(now), confidence: query.status === 'ready' ? 0.8 : 0.6, assertionStatus: query.status === 'ready' ? 'verified' : 'held' });
}

function applyGraph(dossier: SiteResearchDossier, cityFacts: Array<{ value: string; owner: { sourceId: string; capturedAt: string } }>, now: () => Date): void {
  const graph = compileSemanticEvidenceGraph({
    entities: dossier.businessTruth.assertions.map(assertion => ({ name: assertion.claim, type: 'service' as const, capabilityConfirmed: true, sources: [{ kind: 'owner' as const, sourceId: assertion.providerRecordId ?? assertion.id, confidence: assertion.confidence }] })),
    questions: dossier.evidence.filter(item => item.id.startsWith('neuron-query:')).map(item => ({ question: item.claim, source: { kind: 'neuronwriter' as const, sourceId: item.providerRecordId ?? item.id, confidence: item.confidence }, clusterRelevance: 0.8 })),
  });
  dossier.evidenceEdges = graph.relationships.map(edge => ({ fromEvidenceId: edge.fromNodeId, toEvidenceId: edge.toNodeId, relationship: edge.assertionStatus === 'held' ? 'contradicts' : 'supports' }));
  dossier.pageOpportunities = graph.nodes.filter(node => node.type === 'service').map(node => ({ id: `service:${node.canonicalName}`, targetPath: `/services/${node.canonicalName.replace(/\s+/g, '-')}`, opportunity: node.name, evidenceIds: node.provenance.map(source => source.sourceId), status: node.assertionStatus === 'public_assertable' ? 'ready' : 'held' }));
  dossier.internalLinkEdges = dossier.pageOpportunities.map(opportunity => ({ fromPath: '/', toPath: opportunity.targetPath, rationale: 'research evidence', evidenceIds: opportunity.evidenceIds }));
  for (const cityFact of cityFacts) {
    const city = compileCityEvidence({ city: cityFact.value, sources: [{ kind: 'owner', sourceId: cityFact.owner.sourceId, confidence: 0.95 }] });
    dossier.evidence.push({ id: `city:${city.canonicalCity}`, claim: city.city, sourceKind: 'manual', providerRecordId: cityFact.owner.sourceId, retrievedAt: cityFact.owner.capturedAt || nowIso(now), confidence: 0.95, assertionStatus: city.assertionStatus === 'public_assertable' ? 'verified' : 'held' });
  }
  dossier.updatedAt = nowIso(now);
}

function completedStages(dossier: SiteResearchDossier): ResearchStage[] {
  const stages: ResearchStage[] = ['truth'];
  if (hasUsage(dossier, 'seed')) stages.push('seed_expansion');
  if (hasUsage(dossier, 'metrics')) stages.push('metrics');
  if (hasUsage(dossier, 'intent')) stages.push('intent');
  if (dossier.keywordEvidence.length) stages.push('shortlist');
  if (hasUsage(dossier, 'serp')) stages.push('live_serps');
  if (dossier.evidence.some(item => item.id.startsWith('neuron-query:'))) stages.push('neuron_enrichment');
  if (dossier.pageOpportunities.length) stages.push('evidence_graph');
  if (dossier.providerUsage.length) stages.push('usage_ledger');
  if (dossier.status === 'architecture_ready' || dossier.status === 'held') stages.push('readiness');
  return stages;
}

export async function runSiteResearch(researchId: string, input: SiteResearchInput, options: SiteResearchOptions = {}): Promise<SiteResearchResult> {
  if (!opaqueId(researchId)) throw new Error('Research ID must be opaque');
  const now = options.now ?? (() => new Date());
  const providers = options.providers ?? defaultProviders();
  const dossier = await readResearchDossier(researchId, options.baseDir) ?? initialDossier(researchId, input, now);
  if (dossier.status === 'architecture_ready') return { dossier, stages: completedStages(dossier), gates: dossier.humanGates };
  dossier.status = 'researching';
  dossier.humanGates = dossier.humanGates.filter(item => !['provider_outage', 'budget_exhausted'].includes(item.id) && !item.id.startsWith('truth_'));
  await save(dossier, options, now);

  const truth = compileBusinessTruthModel(input.businessTruth);
  const truthGates = findBusinessTruthGaps(truth);
  if (truthGates.length) {
    for (const item of truthGates) addGate(dossier, gate(`truth_${item.kind}`, item.reason, now));
    dossier.status = 'held';
    await save(dossier, options, now);
    return { dossier, stages: completedStages(dossier), gates: dossier.humanGates };
  }
  dossier.businessTruth = { businessName: truth.businessName, assertions: ownerEvidence(input.businessTruth, now), status: 'verified' };
  await save(dossier, options, now);

  try {
    const seeds = keywordsFor(input, dossier);
    if (!hasUsage(dossier, 'seed')) {
      const expanded = await providers.dataForSeo.expand(seeds);
      addUsage(dossier, 'dataforseo', expanded.usage.entries.map(entry => ({ ...entry, operation: 'seed' })), now);
      for (const keyword of expanded.keywords) if (!dossier.keywordEvidence.some(item => item.keyword === keyword)) dossier.keywordEvidence.push({ keyword, sourceKind: 'keyword_provider', providerRecordId: `seed:${keyword}`, retrievedAt: nowIso(now), confidence: 0.7, assertionStatus: 'unknown' });
      await save(dossier, options, now);
    }
    const allKeywords = dossier.keywordEvidence.map(item => item.keyword);
    if (!dossier.keywordEvidence.every(item => isFresh(item, now))) {
      const metricResult = await providers.dataForSeo.metrics(allKeywords);
      addUsage(dossier, 'dataforseo', metricResult.usage.entries.map(entry => ({ ...entry, operation: 'metrics' })), now);
      await save(dossier, options, now);
      const intentResult = await providers.dataForSeo.intent(allKeywords);
      addUsage(dossier, 'dataforseo', intentResult.usage.entries.map(entry => ({ ...entry, operation: 'intent' })), now);
      applyMetrics(dossier, metricResult.metrics, intentResult.intents, now);
      await save(dossier, options, now);
    }
    const shortlisted = shortList(dossier);
    if (!shortlisted.length) throw new Error('No commercial or transactional keyword evidence is available');
    await save(dossier, options, now);
    if (!dossier.serpObservations.length || !dossier.serpObservations.every(item => isFresh(item, now))) {
      const serpResult = await providers.dataForSeo.serps(shortlisted);
      addUsage(dossier, 'dataforseo', serpResult.usage.entries.map(entry => ({ ...entry, operation: 'serp' })), now);
      applySerps(dossier, serpResult.evidence, now);
      await save(dossier, options, now);
    }
    for (const keyword of shortlisted) {
      const queryEvidence = dossier.evidence.find(item => item.id === `neuron-query:${keyword.toLowerCase().replace(/\s+/g, '-')}`);
      const queryInput = { serviceKeyword: keyword, intentCluster: keyword, pageClass: 'service' as const };
      const query = queryEvidence?.providerRecordId ? await providers.neuron.get(queryEvidence.providerRecordId, queryInput) : await providers.neuron.create(queryInput);
      applyNeuron(dossier, query, now);
      await save(dossier, options, now);
    }
    applyGraph(dossier, truth.cityPageEligibleAreas.flatMap(city => {
      const match = [...truth.servedAreas, ...(truth.base ? [truth.base] : [])].find(item => item.value === city);
      return match ? [match] : [];
    }), now);
    await save(dossier, options, now);
    dossier.status = 'architecture_ready';
    await save(dossier, options, now);
  } catch (error) {
    addGate(dossier, gate(error instanceof ResearchBudgetExceededError ? 'budget_exhausted' : 'provider_outage', error instanceof Error ? error.message : 'Research provider failed', now));
    dossier.status = 'held';
    await save(dossier, options, now);
  }
  return { dossier, stages: completedStages(dossier), gates: dossier.humanGates };
}

export async function resumeSiteResearch(researchId: string, input: SiteResearchInput, options: SiteResearchOptions = {}): Promise<SiteResearchResult> {
  return runSiteResearch(researchId, input, options);
}
