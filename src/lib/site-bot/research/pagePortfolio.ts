/**
 * Evidence-selected page portfolio and internal-link graph.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

export type ServiceModel = 'field' | 'location' | 'event' | 'mixed' | 'remote';
export type PageClassification =
  | 'homepage'
  | 'service_hub'
  | 'money_service'
  | 'qualified_service_area'
  | 'trust'
  | 'process'
  | 'pricing'
  | 'proof'
  | 'supporting'
  | 'rejected'
  | 'backlog';

export interface PageOpportunityCandidate {
  id: string;
  kind: Exclude<PageClassification, 'homepage' | 'service_hub' | 'rejected' | 'backlog'>;
  targetPath: string;
  serviceId?: string;
  areaId?: string;
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  ownerPriority?: number;
  businessValue: number;
  capability: number;
  demand: number;
  serpOpportunity: number;
  graphContribution: number;
  expertise: number;
  localFacts: number;
  cannibalizationRisk: number;
  doorwayScaledRisk: number;
  maintenanceCost: number;
  confidence: number;
  serviceability?: boolean;
  distinctIntent?: boolean;
  assertableLocalEvidence?: boolean;
  ambiguityReasons?: string[];
}

export interface PagePortfolioDossier {
  serviceModel: ServiceModel;
  candidates: PageOpportunityCandidate[];
  maxIndexedPages?: number;
}

export interface OpportunityScoreComponents {
  businessValue: number;
  intent: number;
  capability: number;
  demand: number;
  serpOpportunity: number;
  graphContribution: number;
  expertise: number;
  localFacts: number;
  cannibalization: number;
  doorwayScaledRisk: number;
  maintenance: number;
  confidence: number;
}

export interface ScoredPageOpportunity {
  id: string;
  targetPath: string;
  candidate: PageOpportunityCandidate;
  components: OpportunityScoreComponents;
  score: number;
}

export interface PortfolioPage extends ScoredPageOpportunity {
  classification: PageClassification;
  rejectionReasons: string[];
}

export interface PortfolioGate {
  id: 'gate-c-owner-priority' | 'gate-c-ambiguous';
  reason: string;
  candidateIds: string[];
}

export interface MoneyPageSelection {
  pages: ScoredPageOpportunity[];
  gates: PortfolioGate[];
}

export interface PageOpportunityPortfolio {
  serviceModel: ServiceModel;
  indexed: PortfolioPage[];
  backlog: PortfolioPage[];
  rejected: PortfolioPage[];
  held: PortfolioPage[];
  gates: PortfolioGate[];
}

export interface InternalLinkGraphEdge {
  sourceId: string;
  destinationId: string;
  fromId: string;
  toId: string;
  purpose: 'discovery' | 'service_navigation' | 'local_relevance' | 'supporting_context';
  relationship: 'site_hierarchy' | 'service_child' | 'service_area' | 'area_peer' | 'contextual';
  anchorConcepts: string[];
  required: boolean;
}

export interface InternalLinkGraph {
  required: InternalLinkGraphEdge[];
  optional: InternalLinkGraphEdge[];
  orphans: string[];
}

const MAX_INDEXED_PAGES = 30;
const HIGH_RISK_THRESHOLD = 7;

function bounded(value: number): number {
  return Math.max(0, Math.min(10, value));
}

function intentValue(intent: PageOpportunityCandidate['intent']): number {
  return intent === 'transactional' ? 10 : intent === 'commercial' ? 8 : intent === 'informational' ? 5 : 3;
}

export function scorePageOpportunity(candidate: PageOpportunityCandidate): ScoredPageOpportunity {
  const components: OpportunityScoreComponents = {
    businessValue: bounded(candidate.businessValue),
    intent: intentValue(candidate.intent),
    capability: bounded(candidate.capability),
    demand: bounded(candidate.demand),
    serpOpportunity: bounded(candidate.serpOpportunity),
    graphContribution: bounded(candidate.graphContribution),
    expertise: bounded(candidate.expertise),
    localFacts: bounded(candidate.localFacts),
    cannibalization: -bounded(candidate.cannibalizationRisk),
    doorwayScaledRisk: -bounded(candidate.doorwayScaledRisk),
    maintenance: -bounded(candidate.maintenanceCost),
    confidence: bounded(candidate.confidence),
  };
  const score = Object.values(components).reduce((total, component) => total + component, 0);
  return { id: candidate.id, targetPath: candidate.targetPath, candidate, components, score };
}

function ownerPriorityGate(candidates: PageOpportunityCandidate[]): PortfolioGate | null {
  const services = candidates.filter(candidate => candidate.kind === 'money_service');
  const missingPriority = services.filter(candidate => candidate.ownerPriority === undefined);
  if (missingPriority.length) {
    return {
      id: 'gate-c-owner-priority',
      reason: 'Owner priority is required before choosing money services.',
      candidateIds: missingPriority.map(candidate => candidate.id),
    };
  }

  const scored = services.map(scorePageOpportunity);
  const ownerFirst = [...scored].sort((left, right) => (right.candidate.ownerPriority ?? 0) - (left.candidate.ownerPriority ?? 0))[0];
  const evidenceFirst = [...scored].sort((left, right) => right.score - left.score)[0];
  if (ownerFirst && evidenceFirst && ownerFirst.candidate.id !== evidenceFirst.candidate.id && ownerFirst.score < evidenceFirst.score * 0.6) {
    return {
      id: 'gate-c-owner-priority',
      reason: 'Owner priority materially conflicts with the available evidence.',
      candidateIds: [ownerFirst.candidate.id, evidenceFirst.candidate.id],
    };
  }
  return null;
}

export function selectMoneyPages(dossier: PagePortfolioDossier): MoneyPageSelection {
  const candidates = dossier.candidates.filter(candidate => candidate.kind === 'money_service');
  const gate = ownerPriorityGate(candidates);
  if (gate) return { pages: [], gates: [gate] };

  const pages = candidates
    .map(scorePageOpportunity)
    .sort((left, right) => {
      const priorityDifference = (right.candidate.ownerPriority ?? 0) - (left.candidate.ownerPriority ?? 0);
      return priorityDifference || right.score - left.score || left.candidate.id.localeCompare(right.candidate.id);
    })
    .slice(0, 4);
  return { pages, gates: [] };
}

function generatedPage(id: string, classification: 'homepage' | 'service_hub', targetPath: string): PortfolioPage {
  const candidate: PageOpportunityCandidate = {
    id,
    kind: classification === 'homepage' ? 'supporting' : 'supporting',
    targetPath,
    intent: 'navigational',
    businessValue: 0,
    capability: 10,
    demand: 0,
    serpOpportunity: 0,
    graphContribution: 10,
    expertise: 0,
    localFacts: 0,
    cannibalizationRisk: 0,
    doorwayScaledRisk: 0,
    maintenanceCost: 1,
    confidence: 10,
  };
  return { ...scorePageOpportunity(candidate), classification, rejectionReasons: [] };
}

function rejectionReasons(candidate: PageOpportunityCandidate): string[] {
  const reasons: string[] = [];
  if (candidate.kind === 'qualified_service_area') {
    if (!candidate.serviceability) reasons.push('serviceability is not established');
    if (!candidate.distinctIntent) reasons.push('distinct local intent is not established');
    if (!candidate.assertableLocalEvidence) reasons.push('assertable local evidence is not established');
  }
  if (candidate.cannibalizationRisk >= HIGH_RISK_THRESHOLD) reasons.push('cannibalization risk is too high');
  if (candidate.doorwayScaledRisk >= HIGH_RISK_THRESHOLD) reasons.push('doorway or scaled-content risk is too high');
  return reasons;
}

function toPage(scored: ScoredPageOpportunity, classification: PageClassification, reasons: string[] = []): PortfolioPage {
  return { ...scored, classification, rejectionReasons: reasons };
}

export function buildPageOpportunityPortfolio(dossier: PagePortfolioDossier): PageOpportunityPortfolio {
  const maxIndexedPages = Math.min(dossier.maxIndexedPages ?? MAX_INDEXED_PAGES, MAX_INDEXED_PAGES);
  const rejected: PortfolioPage[] = [];
  const held: PortfolioPage[] = [];
  const gates: PortfolioGate[] = [];
  const eligible: ScoredPageOpportunity[] = [];

  for (const candidate of dossier.candidates) {
    const scored = scorePageOpportunity(candidate);
    const reasons = rejectionReasons(candidate);
    if (reasons.length) {
      rejected.push(toPage(scored, 'rejected', reasons));
      continue;
    }
    if (candidate.ambiguityReasons?.length) {
      held.push(toPage(scored, candidate.kind, candidate.ambiguityReasons));
      continue;
    }
    eligible.push(scored);
  }

  if (held.length) {
    gates.push({
      id: 'gate-c-ambiguous',
      reason: 'Ambiguous candidate evidence requires human review.',
      candidateIds: held.map(page => page.candidate.id),
    });
  }

  const money = selectMoneyPages({ ...dossier, candidates: eligible.map(page => page.candidate) });
  gates.push(...money.gates);
  if (money.gates.length) {
    const moneyIds = new Set(dossier.candidates.filter(candidate => candidate.kind === 'money_service').map(candidate => candidate.id));
    for (const scored of eligible.filter(page => moneyIds.has(page.candidate.id))) {
      held.push(toPage(scored, scored.candidate.kind, [money.gates[0].reason]));
    }
  }

  const indexed: PortfolioPage[] = [generatedPage('home', 'homepage', '/')];
  if (eligible.length) indexed.push(generatedPage('services', 'service_hub', '/services'));

  const selectedMoneyIds = new Set(money.pages.map(page => page.candidate.id));
  const selected = money.gates.length
    ? eligible.filter(page => page.candidate.kind !== 'money_service')
    : [
      ...money.pages,
      ...eligible.filter(page => page.candidate.kind !== 'money_service'),
    ];

  const uniqueSelected = selected.filter((page, index, pages) => pages.findIndex(other => other.candidate.id === page.candidate.id) === index);
  const availableSlots = Math.max(0, maxIndexedPages - indexed.length);
  const kept = uniqueSelected.slice(0, availableSlots);
  indexed.push(...kept.map(page => toPage(page, page.candidate.kind)));

  const indexedCandidateIds = new Set(indexed.map(page => page.candidate.id));
  const heldCandidateIds = new Set(held.map(page => page.candidate.id));
  const backlog = eligible
    .filter(page => !indexedCandidateIds.has(page.candidate.id) && !heldCandidateIds.has(page.candidate.id))
    .map(page => toPage(page, 'backlog'));
  if (!money.gates.length) {
    const selectedMoney = money.pages.filter(page => selectedMoneyIds.has(page.candidate.id));
    if (selectedMoney.length < 3 && eligible.filter(page => page.candidate.kind === 'money_service').length >= 3) {
      throw new Error('Money-page selection must retain at least three services when evidence provides them.');
    }
  }

  return { serviceModel: dossier.serviceModel, indexed, backlog, rejected, held, gates };
}

function edge(source: PortfolioPage, destination: PortfolioPage, purpose: InternalLinkGraphEdge['purpose'], relationship: InternalLinkGraphEdge['relationship'], anchorConcepts: string[], required: boolean): InternalLinkGraphEdge {
  return { sourceId: source.candidate.id, destinationId: destination.candidate.id, fromId: source.candidate.id, toId: destination.candidate.id, purpose, relationship, anchorConcepts, required };
}

export function buildInternalLinkGraph(portfolio: PageOpportunityPortfolio): InternalLinkGraph {
  const required: InternalLinkGraphEdge[] = [];
  const optional: InternalLinkGraphEdge[] = [];
  const home = portfolio.indexed.find(page => page.classification === 'homepage');
  const hub = portfolio.indexed.find(page => page.classification === 'service_hub');
  if (!home || !hub) return { required, optional, orphans: portfolio.indexed.map(page => page.candidate.id) };

  required.push(edge(home, hub, 'discovery', 'site_hierarchy', ['services'], true));
  const moneyPages = portfolio.indexed.filter(page => page.classification === 'money_service');
  for (const page of moneyPages) required.push(edge(hub, page, 'service_navigation', 'service_child', [page.candidate.id], true));

  for (const page of portfolio.indexed.filter(page => page.classification === 'qualified_service_area')) {
    const parent = moneyPages.find(service => service.candidate.id === page.candidate.serviceId) ?? hub;
    required.push(edge(parent, page, 'local_relevance', 'service_area', [page.candidate.areaId ?? page.candidate.id], true));
  }

  for (const page of portfolio.indexed.filter(page => ['trust', 'process', 'pricing', 'proof', 'supporting'].includes(page.classification))) {
    required.push(edge(hub, page, 'supporting_context', 'contextual', [page.candidate.id], true));
  }

  const reachable = new Set<string>([home.candidate.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const link of required) {
      if (reachable.has(link.sourceId) && !reachable.has(link.destinationId)) {
        reachable.add(link.destinationId);
        changed = true;
      }
    }
  }
  const orphans = portfolio.indexed.filter(page => !reachable.has(page.candidate.id)).map(page => page.candidate.id);
  return { required, optional, orphans };
}
