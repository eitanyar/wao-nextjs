/**
 * Owner answers (CollectedData) -> research input (business truth + seeds).
 * Moved verbatim from checkout/callback/paid.ts so the paid callback and the
 * admin research->site orchestration (paid-journey v2 M2a, B3) build the same input.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { CollectedData } from '../../bot/prompts';
import type { SiteResearchInput } from './runResearch';

export function buildSiteResearchInput(
  sourceId: string,
  collectedData: CollectedData,
  now: () => Date = () => new Date(),
  fallbackBusinessName: string = sourceId,
): SiteResearchInput {
  const capturedAt = now().toISOString();
  const owner = { sourceId, capturedAt };
  const serviceModel = collectedData.serviceModel === 'location'
    ? 'fixed'
    : collectedData.serviceModel === 'mixed'
      ? 'hybrid'
      : collectedData.serviceModel === 'event'
        ? 'field'
        : collectedData.serviceModel ?? 'remote';
  const services = [collectedData.primaryService, ...(collectedData.secondaryServices ?? '').split(',')]
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value));
  return {
    businessTruth: {
      businessName: collectedData.businessName ?? collectedData.ownerName ?? fallbackBusinessName,
      serviceModel,
      confirmedServices: services.map(value => ({ value, owner })),
      moneyPriorities: (collectedData.priorityServices ?? []).map(value => ({ value, owner })),
      ...(collectedData.targetLocation ? { base: { value: collectedData.targetLocation, owner } } : {}),
      ...(collectedData.travelBoundary ? { travelBoundary: { value: collectedData.travelBoundary, owner } } : {}),
      servedAreas: (collectedData.specificCities ?? '').split(',').map(value => value.trim()).filter(Boolean).map(value => ({ value, owner })),
      excludedAreas: (collectedData.geographicExclusions ?? []).map(value => ({ value, owner })),
      ...(serviceModel === 'fixed' ? { customerTravel: { value: true, owner } } : {}),
    },
    seeds: services,
  };
}
