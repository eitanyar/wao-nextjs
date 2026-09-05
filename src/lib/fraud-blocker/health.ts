import { createFraudBlockerClient, FraudBlockerApiError } from './client';
import { readFraudBlockerState, writeFraudBlockerState, type FraudBlockerState } from './store';
import { readAutonomyPolicy, updateAutonomyClickProtection, type ClickProtectionStatus, type GoogleAdsAutonomyPolicy } from '../google-ads/autonomy';

export interface FraudBlockerHealthAdapter {
  getIps(): Promise<unknown>;
  getClickReport(): Promise<unknown>;
}

export interface FraudBlockerSummary {
  fraudScore?: number;
  totalAdClicks?: number;
  invalidAdClicks?: number;
  estimatedSavings?: number;
  channelCounts: Record<string, number>;
  deviceCounts: Record<string, number>;
  fraudTypeCounts: Record<string, number>;
  reportWindow?: { start: string; end: string };
  sourceTimestamp?: string;
}

export interface FraudBlockerHealthResult {
  status: ClickProtectionStatus;
  verifiedAt: string | null;
  syncedAt: string | null;
  summary?: FraudBlockerSummary;
}

export interface EvaluateFraudBlockerHealthInput {
  state: FraudBlockerState | null;
  policy: GoogleAdsAutonomyPolicy | null;
  adapter: FraudBlockerHealthAdapter;
  now?: Date;
}

export interface SyncFraudBlockerHealthInput {
  clientId: string;
  baseDir?: string;
  adapter?: FraudBlockerHealthAdapter;
  now?: Date;
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function timestamp(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime()) ? value : null;
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function records(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(records);
  const item = object(value);
  if (!item) return [];
  return [item, ...Object.values(item).flatMap(child => Array.isArray(child) || object(child) ? records(child) : [])];
}

function matchingIps(value: unknown, state: FraudBlockerState): Record<string, unknown> | null {
  const candidates = records(value).filter(item => 'synced_at' in item || 'monitoring_only' in item);
  if (!candidates.length) return null;
  return candidates.find(item => item.sid === state.sid && item.domain === state.domain) ?? null;
}

function failureStatus(error: unknown): ClickProtectionStatus {
  if (error instanceof FraudBlockerApiError) {
    if (error.status === 401) return 'unauthorized';
    if (error.status === 404) return 'not_found';
    if (error.status === 429) return 'rate_limited';
    if (error.code === 'invalid_response') return 'invalid_response';
  }
  return 'provider_error';
}

function increment(target: Record<string, number>, key: string | undefined): void {
  if (key) target[key] = (target[key] ?? 0) + 1;
}

function aggregateReport(value: unknown): FraudBlockerSummary | undefined {
  const rows = records(value);
  if (!rows.length) return undefined;
  const summary: FraudBlockerSummary = { channelCounts: {}, deviceCounts: {}, fraudTypeCounts: {} };
  const timestamps: string[] = [];
  for (const row of rows) {
    summary.fraudScore ??= number(row.fraud_score);
    summary.totalAdClicks ??= number(row.total_ad_clicks);
    summary.invalidAdClicks ??= number(row.invalid_ad_clicks);
    summary.estimatedSavings ??= number(row.estimated_savings);
    increment(summary.channelCounts, string(row.channel));
    increment(summary.deviceCounts, string(row.device));
    increment(summary.fraudTypeCounts, string(row.fraud_type));
    const at = timestamp(row.timestamp) ?? timestamp(row.source_timestamp) ?? timestamp(row.created_at);
    if (at) timestamps.push(at);
  }
  if (timestamps.length) {
    timestamps.sort();
    summary.reportWindow = { start: timestamps[0], end: timestamps.at(-1)! };
    summary.sourceTimestamp = timestamps.at(-1);
  }
  return summary;
}

export async function evaluateFraudBlockerHealth(input: EvaluateFraudBlockerHealthInput): Promise<FraudBlockerHealthResult> {
  const now = input.now ?? new Date();
  if (!input.policy || input.policy.clickProtection.provider !== 'fraudblocker') return { status: 'unprotected', verifiedAt: null, syncedAt: null };
  if (!input.state?.trackerInstalledAt) return { status: 'tracker_not_installed', verifiedAt: null, syncedAt: null };
  let ips: unknown;
  try {
    ips = await input.adapter.getIps();
  } catch (error) {
    return { status: failureStatus(error), verifiedAt: null, syncedAt: null };
  }
  const match = matchingIps(ips, input.state);
  if (!match) {
    const candidates = records(ips).filter(item => 'synced_at' in item || 'monitoring_only' in item);
    return { status: candidates.length ? 'domain_or_sid_mismatch' : 'invalid_response', verifiedAt: null, syncedAt: null };
  }
  const syncedAt = timestamp(match.synced_at);
  if (match.monitoring_only === true) return { status: 'monitoring_only', verifiedAt: null, syncedAt };
  if (match.monitoring_only !== false) return { status: 'invalid_response', verifiedAt: null, syncedAt };
  if (!syncedAt) return { status: 'awaiting_ads_connection', verifiedAt: null, syncedAt: null };
  const ageDays = (now.getTime() - new Date(syncedAt).getTime()) / 86_400_000;
  if (ageDays < 0 || ageDays > input.policy.clickProtection.maxAgeDays) return { status: 'stale', verifiedAt: null, syncedAt };
  let summary: FraudBlockerSummary | undefined;
  try {
    summary = aggregateReport(await input.adapter.getClickReport());
  } catch {
    summary = undefined;
  }
  return { status: 'protected', verifiedAt: now.toISOString(), syncedAt, ...(summary ? { summary } : {}) };
}

function defaultAdapter(): FraudBlockerHealthAdapter {
  const client = createFraudBlockerClient();
  return { getIps: () => client.getIpsHealth!(), getClickReport: () => client.getClickReport() };
}

export async function syncFraudBlockerHealthForClient(input: SyncFraudBlockerHealthInput): Promise<FraudBlockerHealthResult> {
  const state = readFraudBlockerState(input.clientId, input.baseDir);
  const policy = readAutonomyPolicy(input.clientId, input.baseDir);
  const result = await evaluateFraudBlockerHealth({ state, policy, adapter: input.adapter ?? defaultAdapter(), now: input.now });
  if (policy) updateAutonomyClickProtection(input.clientId, { status: result.status, verifiedAt: result.verifiedAt }, input.baseDir);
  if (state) {
    writeFraudBlockerState({
      ...state,
      lastHealthCheckAt: (input.now ?? new Date()).toISOString(),
      lastSyncedAt: result.syncedAt,
      monitoringOnly: result.status === 'monitoring_only',
      status: result.status === 'protected' ? 'healthy' : 'error',
      lastError: result.status === 'protected' ? null : result.status,
    }, input.baseDir);
  }
  return result;
}
