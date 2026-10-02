import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveCertificationStatus,
  evaluateFixMyBusinessEligibility,
  evaluateProviderEligibility,
} from './eligibility';
import type { CertificationInput, FixMyBusinessEligibilityInput, ProviderEligibilityInput } from './eligibility';

const provider: ProviderEligibilityInput = {
  uncontestedIdentityAccess: true,
  businessIdentityEligible: true,
  verifiedNapAndServices: true,
  verifiedServiceAreaTruth: true,
  contactConsent: true,
  mediaRights: true,
  leadResponseCapacity: true,
  leadRecipientDisclosureAccepted: true,
  contestedOwnership: false,
  suspensionAppeal: false,
  regulatedOrHighLiabilityClaims: false,
  largeCommerceCatalogScope: false,
  customApplicationScope: false,
  complexMultiLocationEstate: false,
};

const fixMyBusiness: FixMyBusinessEligibilityInput = {
  ...provider,
  gbpApplicable: true,
  gbpBusinessEligible: true,
  boundedStaticBrochureOrLocalServiceScope: true,
  ownerApprovedFactsAndMedia: true,
  approvedRedirectContentMigrationPlan: true,
};

const certification: CertificationInput = {
  uncontestedIdentityAccess: true,
  verifiedNapAndServices: true,
  verifiedServiceAreaTruth: true,
  contactConsent: true,
  mediaRights: true,
  leadResponseCapacity: true,
  leadRecipientDisclosureAccepted: true,
  pilotApproved: true,
  datedCohort: '2026-09-01',
  approvedProofRecord: true,
};

test('provider eligibility table covers complete and each missing evidence field', () => {
  const cases: readonly [string, Partial<ProviderEligibilityInput>, string[]][] = [
    ['complete', {}, []],
    ['identity', { uncontestedIdentityAccess: false }, ['uncontested_identity_access']],
    ['nap_services', { verifiedNapAndServices: false }, ['verified_nap_and_services']],
    ['service_area', { verifiedServiceAreaTruth: false }, ['verified_service_area_truth']],
    ['contact_consent', { contactConsent: false }, ['contact_consent']],
    ['media_rights', { mediaRights: false }, ['media_rights']],
    ['lead_capacity', { leadResponseCapacity: false }, ['lead_response_capacity']],
    ['disclosure', { leadRecipientDisclosureAccepted: false }, ['lead_recipient_disclosure_acceptance']],
  ];

  for (const [name, patch, expectedMissing] of cases) {
    const result = evaluateProviderEligibility({ ...provider, ...patch });
    assert.equal(result.status, expectedMissing.length === 0 ? 'eligible' : 'needs_evidence', name);
    assert.deepEqual(result.missingEvidence, expectedMissing, name);
    assert.deepEqual(result.reasonCodes, [], name);
  }
});

test('provider eligibility rejects contested ownership and ineligible identity', () => {
  assert.deepEqual(evaluateProviderEligibility({ ...provider, contestedOwnership: true }), {
    status: 'rejected', reasonCodes: ['contested_ownership'], missingEvidence: [],
  });
  assert.deepEqual(evaluateProviderEligibility({ ...provider, businessIdentityEligible: false }), {
    status: 'rejected', reasonCodes: ['ineligible_business_identity'], missingEvidence: [],
  });
});

test('provider eligibility table keeps every risk boundary in manual review', () => {
  const cases: readonly [string, Partial<ProviderEligibilityInput>, string][] = [
    ['suspension', { suspensionAppeal: true }, 'suspension_appeal'],
    ['regulated', { regulatedOrHighLiabilityClaims: true }, 'regulated_or_high_liability_claims'],
    ['commerce', { largeCommerceCatalogScope: true }, 'large_commerce_catalog_scope'],
    ['custom_application', { customApplicationScope: true }, 'custom_application_scope'],
    ['multi_location', { complexMultiLocationEstate: true }, 'complex_multi_location_estate'],
  ];

  for (const [name, patch, reasonCode] of cases) {
    const result = evaluateProviderEligibility({ ...provider, ...patch });
    assert.equal(result.status, 'manual_review', name);
    assert.deepEqual(result.reasonCodes, [reasonCode], name);
  }
});

test('provider eligibility prioritizes rejection and preserves reason order', () => {
  const result = evaluateProviderEligibility({
    ...provider,
    contestedOwnership: true,
    businessIdentityEligible: false,
    suspensionAppeal: true,
  });
  assert.deepEqual(result, {
    status: 'rejected',
    reasonCodes: ['contested_ownership', 'ineligible_business_identity'],
    missingEvidence: [],
  });
});

test('provider eligibility preserves manual-review reason order', () => {
  const result = evaluateProviderEligibility({
    ...provider,
    suspensionAppeal: true,
    regulatedOrHighLiabilityClaims: true,
    largeCommerceCatalogScope: true,
    customApplicationScope: true,
    complexMultiLocationEstate: true,
  });
  assert.deepEqual(result.reasonCodes, [
    'suspension_appeal',
    'regulated_or_high_liability_claims',
    'large_commerce_catalog_scope',
    'custom_application_scope',
    'complex_multi_location_estate',
  ]);
});

test('fix my business eligibility table covers complete and incomplete scope evidence', () => {
  const cases: readonly [string, Partial<FixMyBusinessEligibilityInput>, string[]][] = [
    ['complete', {}, []],
    ['scope', { boundedStaticBrochureOrLocalServiceScope: false }, ['bounded_static_brochure_or_local_service_scope']],
    ['facts_media', { ownerApprovedFactsAndMedia: false }, ['owner_approved_facts_and_media']],
    ['migration', { approvedRedirectContentMigrationPlan: false }, ['approved_redirect_content_migration_plan']],
  ];

  for (const [name, patch, expectedMissing] of cases) {
    const result = evaluateFixMyBusinessEligibility({ ...fixMyBusiness, ...patch });
    assert.equal(result.status, expectedMissing.length === 0 ? 'eligible' : 'needs_evidence', name);
    assert.deepEqual(result.missingEvidence, expectedMissing, name);
  }
});

test('fix my business rejects an ineligible applicable GBP business', () => {
  assert.deepEqual(evaluateFixMyBusinessEligibility({ ...fixMyBusiness, gbpBusinessEligible: false }), {
    status: 'rejected', reasonCodes: ['ineligible_gbp_business'], missingEvidence: [],
  });
  assert.equal(evaluateFixMyBusinessEligibility({ ...fixMyBusiness, gbpApplicable: false, gbpBusinessEligible: false }).status, 'eligible');
});

test('fix my business never auto-passes a manual-review risk', () => {
  const result = evaluateFixMyBusinessEligibility({ ...fixMyBusiness, complexMultiLocationEstate: true });
  assert.deepEqual(result, {
    status: 'manual_review', reasonCodes: ['complex_multi_location_estate'], missingEvidence: [],
  });
});

test('certification table covers all four deterministic levels', () => {
  const cases: readonly [string, Partial<CertificationInput>, string, string[]][] = [
    ['not_certified', { contactConsent: false }, 'not_certified', ['contact_consent']],
    ['evidence_ready', { pilotApproved: false }, 'evidence_ready', ['pilot_approval']],
    ['pilot_certified_without_cohort', { datedCohort: undefined }, 'pilot_certified', ['dated_cohort']],
    ['pilot_certified_without_proof', { approvedProofRecord: false }, 'pilot_certified', ['approved_proof_record']],
    ['outcome_verified', {}, 'outcome_verified', []],
  ];

  for (const [name, patch, level, missingEvidence] of cases) {
    const result = deriveCertificationStatus({ ...certification, ...patch });
    assert.equal(result.level, level, name);
    assert.deepEqual(result.missingEvidence, missingEvidence, name);
  }
});

test('certification rejects traffic and raw lead volume as outcome proof', () => {
  const trafficOnlyInput: CertificationInput & {
    readonly traffic: number;
    readonly rankings: number;
    readonly impressions: number;
    readonly rawLeadVolume: number;
  } = {
    ...certification,
    datedCohort: '2026-02-30',
    approvedProofRecord: false,
    traffic: 100000,
    rankings: 1,
    impressions: 1000000,
    rawLeadVolume: 10000,
  };
  const result = deriveCertificationStatus(trafficOnlyInput);
  assert.deepEqual(result, {
    level: 'pilot_certified',
    reasonCodes: ['outcome_proof_incomplete'],
    missingEvidence: ['dated_cohort', 'approved_proof_record'],
  });
});
