import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { CampaignConfig, WeeklyDigest } from '../crm/intelligence';
import { evaluateCampaignAge } from '../google-ads/campaignAge';
import { appendHybridDecision, appendHybridSnapshot, readHybridSnapshots } from './snapshotStore';
import type { HybridDecision, HybridPlanResult, HybridSnapshot } from './types';
import type { FraudBlockerSummary } from '../fraud-blocker/health';

const MAX_GSC_AGE_DAYS = 35;

function dateMs(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function isGscStale(snapshot: HybridSnapshot, now: Date): boolean {
  const generatedAt = dateMs(snapshot.gsc?.generatedAt ?? snapshot.sourceTimestamps.gsc);
  return generatedAt === null || now.getTime() - generatedAt > MAX_GSC_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function topThreeQueries(snapshot: HybridSnapshot): Set<string> {
  return new Set((snapshot.gsc?.overlapRows ?? [])
    .filter((row) => row.position >= 1 && row.position <= 3)
    .map((row) => row.query));
}

function paidOverlap(snapshot: HybridSnapshot): string[] {
  const paid = new Set(snapshot.ads.paidQueryIds ?? []);
  return [...topThreeQueries(snapshot)].filter((query) => paid.has(query));
}

function comparable(previous: HybridSnapshot, current: HybridSnapshot): boolean {
  return previous.clientId === current.clientId
    && previous.campaignId === current.campaignId
    && previous.window.days === current.window.days
    && previous.window.days > 0;
}

function stableOrganicOverlap(snapshot: HybridSnapshot, history: HybridSnapshot[]): boolean {
  const currentQueries = new Set(paidOverlap(snapshot));
  return history.some((previous) => comparable(previous, snapshot)
    && [...currentQueries].some((query) => topThreeQueries(previous).has(query)));
}

function evidenceProblems(snapshot: HybridSnapshot, now: Date): string[] {
  const reasons = [...snapshot.missingEvidenceReasons];
  if (snapshot.ads.spendIls === undefined || snapshot.ads.conversions === undefined || snapshot.ads.cpl === undefined) reasons.push('paid_performance_missing');
  if (!snapshot.attribution?.reliable) reasons.push('attribution_unreliable');
  if (!snapshot.gsc) reasons.push('gsc_overlap_missing');
  if (isGscStale(snapshot, now)) reasons.push('gsc_stale');
  return [...new Set(reasons)];
}

function decisionId(snapshot: HybridSnapshot, kind: HybridDecision['kind']): string {
  return createHash('sha256').update(JSON.stringify({ snapshotId: snapshot.id, kind }), 'utf8').digest('hex');
}

interface StoredOverlapData {
  generatedAt?: string;
  opportunities?: Array<{ query?: string; position?: number; impressions?: number; clicks?: number }>;
}

export function collectHybridSnapshot(params: {
  clientId: string;
  campaignId: string;
  campaign: CampaignConfig;
  digest: WeeklyDigest;
  now: Date;
  baseDir?: string;
  fraudBlocker?: FraudBlockerSummary;
}): HybridSnapshot {
  const clientsRoot = path.resolve(params.baseDir ?? path.join(process.cwd(), 'data', 'clients'));
  const overlapPath = path.join(clientsRoot, params.clientId, 'ads-overlap.json');
  let overlap: StoredOverlapData | undefined;
  try {
    overlap = JSON.parse(fs.readFileSync(overlapPath, 'utf8')) as StoredOverlapData;
  } catch {
    overlap = undefined;
  }
  const gscRows = (overlap?.opportunities ?? [])
    .filter((row) => typeof row.query === 'string' && typeof row.position === 'number')
    .map((row) => ({ query: row.query!, position: row.position!, impressions: row.impressions, clicks: row.clicks }));
  const missingEvidenceReasons = overlap?.generatedAt
    ? ['paid_query_overlap_missing', 'attribution_summary_missing']
    : ['gsc_overlap_missing', 'paid_query_overlap_missing', 'attribution_summary_missing'];
  const campaignAge = evaluateCampaignAge({ startDate: params.campaign.createdAt, referenceDate: params.now });
  const sourceTimestamps: Record<string, string> = { ads: params.digest.windowEnd, crm: params.digest.windowEnd };
  if (overlap?.generatedAt) sourceTimestamps.gsc = overlap.generatedAt;
  const snapshotBasis = { clientId: params.clientId, campaignId: params.campaignId, window: params.digest.windowEnd, spend: params.digest.totals.spendIls, conversions: params.digest.totals.verifiedLeads, gsc: overlap?.generatedAt };
  return {
    id: createHash('sha256').update(JSON.stringify(snapshotBasis), 'utf8').digest('hex'),
    createdAt: params.now.toISOString(),
    clientId: params.clientId,
    campaignId: params.campaignId,
    window: { start: params.digest.windowStart, end: params.digest.windowEnd, days: params.digest.windowDays },
    campaignAge: { ageDays: campaignAge.ageDays, phase: campaignAge.phase },
    ads: { spendIls: params.digest.totals.spendIls, conversions: params.digest.totals.verifiedLeads, cpl: params.digest.totals.cpl },
    crm: { leads: params.digest.totals.leads, qualified: params.digest.totals.verifiedLeads, closed: params.digest.totals.closedDeals, revenue: params.digest.totals.revenue },
    gsc: overlap?.generatedAt ? { generatedAt: overlap.generatedAt, overlapRows: gscRows } : undefined,
    fraudBlocker: params.fraudBlocker,
    sourceTimestamps,
    missingEvidenceReasons,
  };
}

export function decideHybridDemand(params: {
  snapshot: HybridSnapshot;
  history: HybridSnapshot[];
  now: Date;
  cplCeilingIls?: number;
  minIncrementalityConversions?: number;
  cleanupTaskRef?: string;
  siteBotBacklogRef?: string;
}): Omit<HybridDecision, 'id' | 'createdAt' | 'clientId' | 'campaignId' | 'snapshotId'> {
  const problems = evidenceProblems(params.snapshot, params.now);
  const evidenceIds = [params.snapshot.id, ...Object.entries(params.snapshot.sourceTimestamps).map(([source, at]) => `${source}:${at}`)];
  if (problems.length) {
    return { kind: 'hold_insufficient_evidence', evidenceIds, confidence: 'low', uncertaintyReasons: problems, execution: 'shadow_only' };
  }

  const cpl = params.snapshot.ads.cpl!;
  const conversions = params.snapshot.ads.conversions!;
  const cplCeiling = params.cplCeilingIls;
  if (cplCeiling !== undefined && cpl > cplCeiling) {
    return {
      kind: 'repair_paid_efficiency',
      evidenceIds,
      confidence: 'medium',
      uncertaintyReasons: ['paid_efficiency_requires_existing_cleanup_review'],
      execution: 'shadow_only',
      ...(params.cleanupTaskRef ? { cleanupTaskRef: params.cleanupTaskRef } : {}),
    };
  }

  const overlap = paidOverlap(params.snapshot);
  const minimumConversions = params.minIncrementalityConversions ?? 10;
  if (overlap.length && conversions >= minimumConversions && stableOrganicOverlap(params.snapshot, params.history)) {
    return {
      kind: 'candidate_incrementality_test',
      evidenceIds,
      confidence: 'high',
      uncertaintyReasons: ['observational_overlap_is_not_incrementality_proof'],
      execution: 'shadow_only',
    };
  }

  if (overlap.length) {
    return {
      kind: 'maintain_profitable_paid',
      evidenceIds,
      confidence: cplCeiling === undefined ? 'medium' : 'high',
      uncertaintyReasons: cplCeiling === undefined ? ['cpl_ceiling_unavailable'] : [],
      execution: 'shadow_only',
    };
  }

  if ((params.snapshot.gsc?.overlapRows.length ?? 0) === 0 && (params.snapshot.ads.paidQueryIds?.length ?? 0) > 0) {
    return { kind: 'maintain_paid_gap', evidenceIds, confidence: 'medium', uncertaintyReasons: [], execution: 'shadow_only' };
  }

  return {
    kind: 'organic_growth_priority',
    evidenceIds,
    confidence: 'medium',
    uncertaintyReasons: ['content_generation_or_publication_is_not_authorized'],
    execution: 'shadow_only',
    ...(params.siteBotBacklogRef ? { siteBotBacklogRef: params.siteBotBacklogRef } : {}),
  };
}

export async function runHybridShadowPlan(params: {
  clientId: string;
  now?: Date;
  baseDir?: string;
  collectSnapshot: () => HybridSnapshot | Promise<HybridSnapshot>;
  cplCeilingIls?: number;
  minIncrementalityConversions?: number;
  cleanupTaskRef?: string;
  siteBotBacklogRef?: string;
}): Promise<HybridPlanResult> {
  try {
    const now = params.now ?? new Date();
    const snapshot = await params.collectSnapshot();
    if (snapshot.clientId !== params.clientId) throw new Error('snapshot_client_mismatch');
    const history = readHybridSnapshots(params.clientId, params.baseDir);
    const chosen = decideHybridDemand({ snapshot, history, now, cplCeilingIls: params.cplCeilingIls, minIncrementalityConversions: params.minIncrementalityConversions, cleanupTaskRef: params.cleanupTaskRef, siteBotBacklogRef: params.siteBotBacklogRef });
    const decision: HybridDecision = {
      ...chosen,
      id: decisionId(snapshot, chosen.kind),
      createdAt: now.toISOString(),
      clientId: snapshot.clientId,
      campaignId: snapshot.campaignId,
      snapshotId: snapshot.id,
    };
    if (!appendHybridSnapshot(snapshot, params.baseDir) || !appendHybridDecision(decision, params.baseDir)) throw new Error('hybrid_snapshot_persistence_failed');
    return { status: 'ok', snapshot, decision };
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : String(error) };
  }
}
