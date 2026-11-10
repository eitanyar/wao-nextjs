/**
 * Site Bot paid-journey v2 M1 (F3/F4): the intake model behind the /site-bot/start chat.
 * Step A is one confirm card (pre-filled from GBP when available, otherwise empty but
 * editable). Step B is at most 3 questions, the truth gaps M0 found: priority services,
 * travel boundary / service area (with the service model when the card could not infer
 * it), and the differentiator. Everything else is derived, never asked.
 *
 * The answers land in the fields the research truth layer reads
 * (research/researchInput.ts -> businessTruth.ts), so a research run no longer stops on
 * truth_missing_serviceability / truth_missing_priority / truth_missing_capability.
 *
 * Pure and browser-safe. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { CollectedData } from '../bot/prompts';
import { derivePreferredSlug } from './siteSlug';
import { credentialsCollectedFields, type CredentialsAnswers } from './credentialsCopy';

export type IntakeServiceModel = 'field' | 'location' | 'mixed' | 'remote';
export const INTAKE_SERVICE_MODELS: readonly IntakeServiceModel[] = ['field', 'location', 'mixed', 'remote'];

export interface IntakeCard {
  businessName: string;
  businessNiche: string;
  phone: string;
  streetAddress: string;
  city: string;
  businessHours: string;
  websiteUri: string;
  serviceModel: IntakeServiceModel | '';
  /** True when the service model came from the GBP category; then the card shows it and Q2 does not ask it. */
  serviceModelInferred: boolean;
}

/** Facts carried into collectedData that the owner never edits. No Places rating/review content (M1 decision). */
export interface IntakeEvidence {
  hasGoogleBusiness?: boolean;
}

export type IntakeQuestionKey = 'priorityServices' | 'travelBoundary' | 'usp';
/** M2b.1g: servedAreaChoice = the towns the owner picked when his travel answer named more than the cap (checkout re-validates). */
/** credentials: the optional credentials step after the 3 questions (credentialsCopy.ts); absent = skipped. */
export type IntakeAnswers = Partial<Record<IntakeQuestionKey, string>> & { servedAreaChoice?: string[]; credentials?: CredentialsAnswers };

export const MAX_INTAKE_QUESTIONS = 3;
/** The card cannot be confirmed without these: checkout needs a niche, the site needs a name and phone, serviceability needs a base. */
export const INTAKE_REQUIRED_FIELDS = ['businessName', 'businessNiche', 'phone', 'city'] as const;
/** Editable text fields, in card order. */
export const INTAKE_CARD_FIELDS = ['businessName', 'businessNiche', 'phone', 'streetAddress', 'city', 'businessHours', 'websiteUri'] as const;
export type IntakeCardField = (typeof INTAKE_CARD_FIELDS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PLACE_ID = /^[A-Za-z0-9_-]{8,256}$/;

/** True when the start URL carries a well-formed auditId + placeId pair worth a pre-fill request. */
export function isPrefillRequest(auditId: string | null | undefined, placeId: string | null | undefined): boolean {
  return typeof auditId === 'string' && UUID.test(auditId) && typeof placeId === 'string' && PLACE_ID.test(placeId);
}

export function emptyIntakeCard(): IntakeCard {
  return { businessName: '', businessNiche: '', phone: '', streetAddress: '', city: '', businessHours: '', websiteUri: '', serviceModel: '', serviceModelInferred: false };
}

/** Seeded collectedData (seedFromPrefillSnapshot) -> card + read-only evidence. */
export function intakeFromSeed(seed: Partial<CollectedData> | undefined): { card: IntakeCard; evidence: IntakeEvidence } {
  const card = emptyIntakeCard();
  if (!seed) return { card, evidence: {} };
  card.businessName = seed.businessName ?? '';
  card.businessNiche = seed.businessNiche ?? '';
  card.phone = seed.phone ?? '';
  card.streetAddress = seed.streetAddress ?? '';
  card.city = seed.targetLocation ?? seed.specificCities ?? '';
  card.businessHours = seed.businessHours ?? '';
  card.websiteUri = seed.websiteUri ?? '';
  const model = seed.serviceModel;
  if (model === 'field' || model === 'location' || model === 'mixed' || model === 'remote') {
    card.serviceModel = model;
    card.serviceModelInferred = true;
  }
  const evidence: IntakeEvidence = {};
  if (seed.hasGoogleBusiness) evidence.hasGoogleBusiness = true;
  return { card, evidence };
}

export function missingCardFields(card: IntakeCard): IntakeCardField[] {
  return INTAKE_REQUIRED_FIELDS.filter(field => !card[field].trim());
}

/**
 * The question steps for this card: never more than 3. A remote business has no travel
 * boundary, so a GBP-inferred remote model skips Q2 (it cannot be inferred today, since
 * seedFromAudit only yields field or location, but the rule is kept honest).
 */
export function intakeQuestions(card: IntakeCard): IntakeQuestionKey[] {
  const steps: IntakeQuestionKey[] = ['priorityServices'];
  if (!(card.serviceModelInferred && card.serviceModel === 'remote')) steps.push('travelBoundary');
  steps.push('usp');
  return steps;
}

/** True when Q2 must first ask the service model (the card could not infer it). */
export function travelStepNeedsServiceModel(card: IntakeCard): boolean {
  return card.serviceModel === '';
}

/** "a, b; c\n d" -> ["a", "b", "c", "d"]: commas, semicolons and line breaks only. */
export function splitServiceList(text: string | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (text ?? '').split(/[,;\n]+/)) {
    const value = part.trim().replace(/\s+/g, ' ');
    const key = value.toLowerCase();
    if (value && !seen.has(key)) { seen.add(key); out.push(value); }
  }
  return out;
}

/**
 * Display-only bidi fix for the hours field: each time range ("08:00-18:00", en dash or hyphen)
 * is wrapped in LRI ... PDI so an RTL input shows it left-to-right instead of "18:00-08:00".
 * Isolates never reach collectedData: stripBidiIsolates runs on every update and in
 * buildIntakeCollectedData.
 */
const TIME_RANGE = /(?<![\u2066\d])(\d\d:\d\d[\u2013-]\d\d:\d\d)(?![\u2069\d])/g;
const BIDI_ISOLATES = /[\u2066-\u2069]/g;

export function isolateTimeRanges(display: string): string {
  return stripBidiIsolates(display).replace(TIME_RANGE, '\u2066$1\u2069');
}

export function stripBidiIsolates(value: string): string {
  return value.replace(BIDI_ISOLATES, '');
}

/** Card + evidence + answers -> the collectedData handed to checkout init. */
export function buildIntakeCollectedData(card: IntakeCard, evidence: IntakeEvidence, answers: IntakeAnswers): CollectedData {
  const text = (value: string | undefined) => stripBidiIsolates(value ?? '').trim();
  const niche = text(card.businessNiche);
  const city = text(card.city);
  const phone = text(card.phone);
  const services = splitServiceList(answers.priorityServices);
  const travel = text(answers.travelBoundary);
  const usp = text(answers.usp);
  const address = text(card.streetAddress);
  const hours = text(card.businessHours);
  const website = text(card.websiteUri);
  const model = card.serviceModel || undefined;
  const data: CollectedData = {
    businessName: text(card.businessName),
    businessNiche: niche,
    primaryService: niche,
    ...(model ? { serviceModel: model } : {}),
    ...(city ? { targetLocation: city, specificCities: city } : {}),
    // LocalBusiness street address only when customers come to the business (pre-M1 rule).
    ...(address && (model === 'location' || model === 'mixed') ? { streetAddress: address } : {}),
    ...(services.length ? { priorityServices: services, secondaryServices: services.join(', ') } : {}),
    ...(travel ? { travelBoundary: travel } : {}),
    ...(travel && answers.servedAreaChoice?.length ? { servedAreaChoice: answers.servedAreaChoice.map(text).filter(Boolean) } : {}),
    ...(usp ? { usp } : {}),
    ...(phone ? { phone, whatsappNumber: phone } : {}),
    ...(hours ? { businessHours: hours } : {}),
    ...(website ? { websiteUri: website } : {}),
    ...(evidence.hasGoogleBusiness ? { hasGoogleBusiness: true } : {}),
    // The optional credentials step: yearsInField / license / guarantee (the licence only for licensed trades).
    ...credentialsCollectedFields(answers.credentials, niche),
  };
  const slug = derivePreferredSlug({ websiteUri: website, businessName: data.businessName, businessNiche: niche, phone });
  if (slug) data.preferredSlug = slug;
  return data;
}
