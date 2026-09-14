import test from 'node:test';
import assert from 'node:assert/strict';
import { RESEARCH_SCHEMA_VERSION } from './types';
import type { AvailabilityLabel, EvidenceProvider, EvidenceOutcomeStatus, OrchestrationStage, ResearchDisposition, ResearchStage } from './types';

test('domain research contracts expose the restricted lifecycle literals', () => {
  const disposition: ResearchDisposition = 'manual_due_diligence_required';
  const availability: AvailabilityLabel = 'unregistered_signal';
  const stage: ResearchStage = 'scored';
  assert.equal(RESEARCH_SCHEMA_VERSION, 1);
  assert.deepEqual([disposition, availability, stage], ['manual_due_diligence_required', 'unregistered_signal', 'scored']);
});

test('orchestration and provider literals retain schema-v1 boundaries', () => {
  const stages: ResearchStage[] = ['input_validated', 'evidence_collected', 'scored', 'stored'];
  const orchestration: OrchestrationStage[] = ['validated', 'discovered', 'status_checked', 'niche_enriched', 'authority_enriched', 'risk_gated', 'ranked', 'complete', 'held', 'failed'];
  const providers: EvidenceProvider[] = ['wayback', 'domain-status', 'open-seo', 'moz-data-api-v3'];
  const outcome: EvidenceOutcomeStatus = 'provider-schema-changed';
  assert.equal(stages.length, 4);
  assert.equal(orchestration.length, 10);
  assert.deepEqual(providers, ['wayback', 'domain-status', 'open-seo', 'moz-data-api-v3']);
  assert.equal(outcome, 'provider-schema-changed');
});
