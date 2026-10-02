/**
 * Deterministic eligibility and certification boundaries for rank-and-rent work.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

export const ELIGIBILITY_STATUSES = ['eligible', 'needs_evidence', 'manual_review', 'rejected'] as const;
export type EligibilityStatus = (typeof ELIGIBILITY_STATUSES)[number];

export const CERTIFICATION_LEVELS = ['not_certified', 'evidence_ready', 'pilot_certified', 'outcome_verified'] as const;
export type CertificationLevel = (typeof CERTIFICATION_LEVELS)[number];

export type EligibilityReasonCode =
  | 'contested_ownership'
  | 'ineligible_business_identity'
  | 'ineligible_gbp_business'
  | 'suspension_appeal'
  | 'regulated_or_high_liability_claims'
  | 'large_commerce_catalog_scope'
  | 'custom_application_scope'
  | 'complex_multi_location_estate';

export type EligibilityMissingEvidence =
  | 'uncontested_identity_access'
  | 'verified_nap_and_services'
  | 'verified_service_area_truth'
  | 'contact_consent'
  | 'media_rights'
  | 'lead_response_capacity'
  | 'lead_recipient_disclosure_acceptance'
  | 'bounded_static_brochure_or_local_service_scope'
  | 'owner_approved_facts_and_media'
  | 'approved_redirect_content_migration_plan';

export interface EligibilityResult {
  readonly status: EligibilityStatus;
  readonly reasonCodes: readonly EligibilityReasonCode[];
  readonly missingEvidence: readonly EligibilityMissingEvidence[];
}

export interface ProviderEligibilityInput {
  readonly uncontestedIdentityAccess: boolean;
  readonly businessIdentityEligible: boolean;
  readonly verifiedNapAndServices: boolean;
  readonly verifiedServiceAreaTruth: boolean;
  readonly contactConsent: boolean;
  readonly mediaRights: boolean;
  readonly leadResponseCapacity: boolean;
  readonly leadRecipientDisclosureAccepted: boolean;
  readonly contestedOwnership: boolean;
  readonly suspensionAppeal: boolean;
  readonly regulatedOrHighLiabilityClaims: boolean;
  readonly largeCommerceCatalogScope: boolean;
  readonly customApplicationScope: boolean;
  readonly complexMultiLocationEstate: boolean;
}

export interface FixMyBusinessEligibilityInput extends ProviderEligibilityInput {
  readonly gbpApplicable: boolean;
  readonly gbpBusinessEligible: boolean;
  readonly boundedStaticBrochureOrLocalServiceScope: boolean;
  readonly ownerApprovedFactsAndMedia: boolean;
  readonly approvedRedirectContentMigrationPlan: boolean;
}

export type CertificationMissingEvidence =
  | 'uncontested_identity_access'
  | 'verified_nap_and_services'
  | 'verified_service_area_truth'
  | 'contact_consent'
  | 'media_rights'
  | 'lead_response_capacity'
  | 'lead_recipient_disclosure_acceptance'
  | 'pilot_approval'
  | 'dated_cohort'
  | 'approved_proof_record';

export interface CertificationResult {
  readonly level: CertificationLevel;
  readonly reasonCodes: readonly string[];
  readonly missingEvidence: readonly CertificationMissingEvidence[];
}

export interface CertificationInput {
  readonly uncontestedIdentityAccess: boolean;
  readonly verifiedNapAndServices: boolean;
  readonly verifiedServiceAreaTruth: boolean;
  readonly contactConsent: boolean;
  readonly mediaRights: boolean;
  readonly leadResponseCapacity: boolean;
  readonly leadRecipientDisclosureAccepted: boolean;
  readonly pilotApproved: boolean;
  readonly datedCohort?: string;
  readonly approvedProofRecord: boolean;
}

const providerEvidence = (input: ProviderEligibilityInput): EligibilityMissingEvidence[] => {
  const missing: EligibilityMissingEvidence[] = [];
  if (!input.uncontestedIdentityAccess) missing.push('uncontested_identity_access');
  if (!input.verifiedNapAndServices) missing.push('verified_nap_and_services');
  if (!input.verifiedServiceAreaTruth) missing.push('verified_service_area_truth');
  if (!input.contactConsent) missing.push('contact_consent');
  if (!input.mediaRights) missing.push('media_rights');
  if (!input.leadResponseCapacity) missing.push('lead_response_capacity');
  if (!input.leadRecipientDisclosureAccepted) missing.push('lead_recipient_disclosure_acceptance');
  return missing;
};

const manualReviewReasons = (input: ProviderEligibilityInput): EligibilityReasonCode[] => {
  const reasons: EligibilityReasonCode[] = [];
  if (input.suspensionAppeal) reasons.push('suspension_appeal');
  if (input.regulatedOrHighLiabilityClaims) reasons.push('regulated_or_high_liability_claims');
  if (input.largeCommerceCatalogScope) reasons.push('large_commerce_catalog_scope');
  if (input.customApplicationScope) reasons.push('custom_application_scope');
  if (input.complexMultiLocationEstate) reasons.push('complex_multi_location_estate');
  return reasons;
};

function evaluateBaseEligibility(input: ProviderEligibilityInput): EligibilityResult {
  const rejectionReasons: EligibilityReasonCode[] = [];
  if (input.contestedOwnership) rejectionReasons.push('contested_ownership');
  if (!input.businessIdentityEligible) rejectionReasons.push('ineligible_business_identity');
  if (rejectionReasons.length > 0) {
    return { status: 'rejected', reasonCodes: rejectionReasons, missingEvidence: providerEvidence(input) };
  }

  const reviewReasons = manualReviewReasons(input);
  if (reviewReasons.length > 0) {
    return { status: 'manual_review', reasonCodes: reviewReasons, missingEvidence: providerEvidence(input) };
  }

  const missingEvidence = providerEvidence(input);
  if (missingEvidence.length > 0) {
    return { status: 'needs_evidence', reasonCodes: [], missingEvidence };
  }

  return { status: 'eligible', reasonCodes: [], missingEvidence: [] };
}

export function evaluateProviderEligibility(input: ProviderEligibilityInput): EligibilityResult {
  return evaluateBaseEligibility(input);
}

export function evaluateFixMyBusinessEligibility(input: FixMyBusinessEligibilityInput): EligibilityResult {
  const base = evaluateBaseEligibility(input);
  if (base.status === 'rejected') return base;

  if (input.gbpApplicable && !input.gbpBusinessEligible) {
    return {
      status: 'rejected',
      reasonCodes: ['ineligible_gbp_business'],
      missingEvidence: base.missingEvidence,
    };
  }

  if (base.status === 'manual_review') return base;

  const missingEvidence = [...base.missingEvidence];
  if (!input.boundedStaticBrochureOrLocalServiceScope) missingEvidence.push('bounded_static_brochure_or_local_service_scope');
  if (!input.ownerApprovedFactsAndMedia) missingEvidence.push('owner_approved_facts_and_media');
  if (!input.approvedRedirectContentMigrationPlan) missingEvidence.push('approved_redirect_content_migration_plan');

  if (missingEvidence.length > 0) {
    return { status: 'needs_evidence', reasonCodes: [], missingEvidence };
  }

  return { status: 'eligible', reasonCodes: [], missingEvidence: [] };
}

function isValidDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function deriveCertificationStatus(input: CertificationInput): CertificationResult {
  const missingEvidence: CertificationMissingEvidence[] = [];
  if (!input.uncontestedIdentityAccess) missingEvidence.push('uncontested_identity_access');
  if (!input.verifiedNapAndServices) missingEvidence.push('verified_nap_and_services');
  if (!input.verifiedServiceAreaTruth) missingEvidence.push('verified_service_area_truth');
  if (!input.contactConsent) missingEvidence.push('contact_consent');
  if (!input.mediaRights) missingEvidence.push('media_rights');
  if (!input.leadResponseCapacity) missingEvidence.push('lead_response_capacity');
  if (!input.leadRecipientDisclosureAccepted) missingEvidence.push('lead_recipient_disclosure_acceptance');
  if (missingEvidence.length > 0) {
    return { level: 'not_certified', reasonCodes: ['required_evidence_incomplete'], missingEvidence };
  }

  if (!input.pilotApproved) {
    return { level: 'evidence_ready', reasonCodes: ['pilot_approval_required'], missingEvidence: ['pilot_approval'] };
  }

  const outcomeMissing: CertificationMissingEvidence[] = [];
  if (!isValidDate(input.datedCohort)) outcomeMissing.push('dated_cohort');
  if (!input.approvedProofRecord) outcomeMissing.push('approved_proof_record');
  if (outcomeMissing.length > 0) {
    return { level: 'pilot_certified', reasonCodes: ['outcome_proof_incomplete'], missingEvidence: outcomeMissing };
  }

  return { level: 'outcome_verified', reasonCodes: ['dated_cohort_and_approved_proof_record'], missingEvidence: [] };
}
