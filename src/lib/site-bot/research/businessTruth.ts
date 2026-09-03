/**
 * Pure compiler for owner-confirmed business capability and serviceability facts.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

export type BusinessServiceModel = 'field' | 'fixed' | 'hybrid' | 'remote';
export type TruthStatus = 'unknown' | 'verified' | 'excluded';
export type BusinessTruthGateKind =
  | 'missing_capability'
  | 'missing_serviceability'
  | 'missing_priority'
  | 'category_conflict';

export interface OwnerProvenance {
  sourceId: string;
  capturedAt: string;
}

export interface OwnerFact<T = string> {
  value: T;
  owner: OwnerProvenance;
}

export interface ResearchedTerminology {
  service: string;
  label: string;
}

export interface GbpTruthInput {
  categories?: string[];
  services?: string[];
  attributes?: string[];
}

export interface BusinessTruthInput {
  businessName: string;
  serviceModel: BusinessServiceModel;
  confirmedServices?: OwnerFact[];
  excludedServices?: OwnerFact[];
  base?: OwnerFact;
  travelBoundary?: OwnerFact;
  servedAreas?: OwnerFact[];
  excludedAreas?: OwnerFact[];
  customerTravel?: OwnerFact<boolean>;
  moneyPriorities?: OwnerFact[];
  differentiators?: OwnerFact[];
  proof?: OwnerFact[];
  constraints?: OwnerFact[];
  researchedTerminology?: ResearchedTerminology[];
  gbp?: GbpTruthInput;
}

export interface ConfirmedService extends OwnerFact {
  label: string;
}

export interface BusinessTruthGate {
  kind: BusinessTruthGateKind;
  requiredFor: 'architecture_ready';
  reason: string;
}

export interface BusinessTruthModel {
  businessName: string;
  serviceModel: BusinessServiceModel;
  confirmedServices: ConfirmedService[];
  excludedServices: OwnerFact[];
  base?: OwnerFact;
  travelBoundary?: OwnerFact;
  servedAreas: OwnerFact[];
  excludedAreas: OwnerFact[];
  customerTravel?: OwnerFact<boolean>;
  moneyPriorities: OwnerFact[];
  differentiators: OwnerFact[];
  proof: OwnerFact[];
  constraints: OwnerFact[];
  serviceability: {
    status: TruthStatus;
    cityPageEligibleAreas: string[];
  };
  cityPageEligibleAreas: string[];
  gbp: Required<GbpTruthInput>;
  humanGates: BusinessTruthGate[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function distinctFacts(facts: OwnerFact[] | undefined): OwnerFact[] {
  const values = new Map<string, OwnerFact>();
  for (const fact of facts ?? []) {
    const value = fact.value.trim();
    if (!value) continue;
    const key = normalize(value);
    if (!values.has(key)) values.set(key, { ...fact, value });
  }
  return [...values.values()];
}

function distinctStrings(values: string[] | undefined): string[] {
  const found = new Map<string, string>();
  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (trimmed && !found.has(normalize(trimmed))) found.set(normalize(trimmed), trimmed);
  }
  return [...found.values()];
}

function verifiedFixedLocation(input: BusinessTruthInput): boolean {
  return Boolean(input.base?.value.trim() && input.customerTravel?.value === true);
}

function verifiedFieldService(input: BusinessTruthInput): boolean {
  return Boolean(
    input.base?.value.trim()
    && input.travelBoundary?.value.trim()
    && distinctFacts(input.servedAreas).length > 0
  );
}

function gatesFor(input: BusinessTruthInput, serviceability: TruthStatus, categoryConflict: boolean): BusinessTruthGate[] {
  const gates: BusinessTruthGate[] = [];
  if (distinctFacts(input.confirmedServices).length === 0) {
    gates.push({ kind: 'missing_capability', requiredFor: 'architecture_ready', reason: 'Owner-confirmed capability is required.' });
  }
  if (serviceability === 'unknown') {
    gates.push({ kind: 'missing_serviceability', requiredFor: 'architecture_ready', reason: 'Verified serviceability is required.' });
  }
  if (distinctFacts(input.moneyPriorities).length === 0) {
    gates.push({ kind: 'missing_priority', requiredFor: 'architecture_ready', reason: 'Owner-confirmed money priority is required.' });
  }
  if (categoryConflict) {
    gates.push({ kind: 'category_conflict', requiredFor: 'architecture_ready', reason: 'GBP category or service conflicts with owner capability.' });
  }
  return gates;
}

export function compileBusinessTruthModel(input: BusinessTruthInput): BusinessTruthModel {
  const confirmedFacts = distinctFacts(input.confirmedServices);
  const excludedServices = distinctFacts(input.excludedServices);
  const excludedServiceKeys = new Set(excludedServices.map(service => normalize(service.value)));
  const confirmedServices = confirmedFacts
    .filter(service => !excludedServiceKeys.has(normalize(service.value)))
    .map(service => ({
      ...service,
      label: input.researchedTerminology?.find(term => normalize(term.service) === normalize(service.value))?.label.trim() || service.value,
    }));
  const confirmedServiceKeys = new Set(confirmedServices.map(service => normalize(service.value)));
  const gbpInput = input.gbp ?? {};
  const gbpServices = distinctStrings(gbpInput.services).filter(service => confirmedServiceKeys.has(normalize(service)));
  const categoryConflict = distinctStrings(gbpInput.services).some(service => !confirmedServiceKeys.has(normalize(service)));

  const fixedVerified = verifiedFixedLocation(input);
  const fieldVerified = verifiedFieldService(input);
  const serviceability = input.serviceModel === 'remote'
    ? 'verified'
    : input.serviceModel === 'fixed'
      ? fixedVerified ? 'verified' : 'unknown'
      : input.serviceModel === 'field'
        ? fieldVerified ? 'verified' : 'unknown'
        : fixedVerified && fieldVerified ? 'verified' : 'unknown';
  const baseArea = input.base?.value.trim() ?? '';
  const servedAreas = distinctFacts(input.servedAreas).map(area => area.value);
  const cityPageEligibleAreas = input.serviceModel === 'remote'
    ? []
    : input.serviceModel === 'fixed'
      ? fixedVerified ? [baseArea] : []
      : input.serviceModel === 'field'
        ? fieldVerified ? servedAreas : []
        : fixedVerified && fieldVerified ? distinctStrings([baseArea, ...servedAreas]) : [];

  return {
    businessName: input.businessName.trim(),
    serviceModel: input.serviceModel,
    confirmedServices,
    excludedServices,
    ...(input.base?.value.trim() ? { base: { ...input.base, value: input.base.value.trim() } } : {}),
    ...(input.travelBoundary?.value.trim() ? { travelBoundary: { ...input.travelBoundary, value: input.travelBoundary.value.trim() } } : {}),
    servedAreas: distinctFacts(input.servedAreas),
    excludedAreas: distinctFacts(input.excludedAreas),
    ...(input.customerTravel ? { customerTravel: input.customerTravel } : {}),
    moneyPriorities: distinctFacts(input.moneyPriorities),
    differentiators: distinctFacts(input.differentiators),
    proof: distinctFacts(input.proof),
    constraints: distinctFacts(input.constraints),
    serviceability: { status: serviceability, cityPageEligibleAreas },
    cityPageEligibleAreas,
    gbp: {
      categories: distinctStrings(gbpInput.categories),
      services: gbpServices,
      attributes: distinctStrings(gbpInput.attributes),
    },
    humanGates: gatesFor(input, serviceability, categoryConflict),
  };
}

export function findBusinessTruthGaps(model: BusinessTruthModel): BusinessTruthGate[] {
  return model.humanGates.filter(gate => gate.kind !== 'category_conflict' || gate.requiredFor === 'architecture_ready');
}
