import type { CampaignLifecyclePhase } from '../google-ads/campaignAge';
import type { FraudBlockerSummary } from '../fraud-blocker/health';

export type HybridDecisionKind =
  | 'hold_insufficient_evidence'
  | 'maintain_paid_gap'
  | 'maintain_profitable_paid'
  | 'repair_paid_efficiency'
  | 'candidate_incrementality_test'
  | 'organic_growth_priority';

export interface HybridOverlapRow {
  query: string;
  position: number;
  impressions?: number;
  clicks?: number;
}

export interface HybridSnapshot {
  id: string;
  createdAt: string;
  clientId: string;
  campaignId: string;
  window: { start: string; end: string; days: number };
  campaignAge: { ageDays: number | null; phase: CampaignLifecyclePhase };
  ads: {
    spendIls?: number;
    conversions?: number;
    cpl?: number;
    paidQueryIds?: string[];
  };
  crm?: {
    leads?: number;
    qualified?: number;
    booked?: number;
    closed?: number;
    revenue?: number;
  };
  attribution?: {
    channelCounts: Record<string, number>;
    confidenceCounts: Record<string, number>;
    reliable: boolean;
  };
  gsc?: {
    generatedAt: string;
    overlapRows: HybridOverlapRow[];
  };
  gbpGrid?: Record<string, unknown>;
  fraudBlocker?: FraudBlockerSummary;
  sourceTimestamps: Record<string, string>;
  missingEvidenceReasons: string[];
}

export interface HybridDecision {
  id: string;
  createdAt: string;
  clientId: string;
  campaignId: string;
  snapshotId: string;
  kind: HybridDecisionKind;
  evidenceIds: string[];
  confidence: 'low' | 'medium' | 'high';
  uncertaintyReasons: string[];
  execution: 'shadow_only';
  cleanupTaskRef?: string;
  siteBotBacklogRef?: string;
}

export interface HybridPlanResult {
  status: 'ok' | 'error';
  snapshot?: HybridSnapshot;
  decision?: HybridDecision;
  error?: string;
}
