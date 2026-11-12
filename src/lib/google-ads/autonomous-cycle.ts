import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { clientsDir } from '../dataRoots';
import { buildWeeklyDigest, deriveCplCeilingIls, loadCampaignConfigBySlug, loadClientGoogleAdsIndex, type CampaignConfig, type WeeklyDigest } from '../crm/intelligence';
import { collectHybridSnapshot, runHybridShadowPlan as runHybridShadowPlanInternal } from '../hybrid/planner';
import type { HybridPlanResult } from '../hybrid/types';
import { syncFraudBlockerHealthForClient, type FraudBlockerHealthResult } from '../fraud-blocker/health';
import { evaluateCampaignAge } from './campaignAge';
import { cplGateConversions, enumerateEnabledCampaigns, type EnumeratedCampaign } from './campaign-enumeration';
import { patchLead, readLeads } from '../crm/leadsStore';
import { leadMatchesClientIndex } from '../crm/ownership.js';
import { retryLeadConversionUploads, selectLeadsForUploadRetry } from '../crm/leadConversionUploads.js';
import { executeGoogleAdsOperatorTask, type ExecutionResult } from './executor';
import { buildGoogleAdsOperatorTasks, type GoogleAdsOperatorTask } from './operator';
import {
  appendAutonomousActionEvent,
  evaluateAutonomousAction,
  readAutonomyPolicy,
  readAutonomousActionEvents,
  type AutonomousActionKind,
  type AutonomyDecisionReason,
  type GoogleAdsAutonomyPolicy,
} from './autonomy';

const EXECUTABLE_KINDS: ReadonlySet<string> = new Set(['budget_tune', 'search_term_cleanup', 'search_term_harvest']);

export interface AutonomousCycleDependencies {
  now?: () => Date;
  listClientIds?: () => string[];
  loadClient?: (clientId: string) => { customerId: string; campaign: CampaignConfig; campaignId?: string } | null;
  enumerateCampaigns?: (params: { clientId: string; customerId: string; campaign: CampaignConfig }) => Promise<EnumeratedCampaign[]>;
  buildDigest?: (params: { campaign: CampaignConfig; enumerated: EnumeratedCampaign; now: Date }) => WeeklyDigest;
  deriveTasks?: (clientId: string, digest: WeeklyDigest, campaign: CampaignConfig, enumerated: EnumeratedCampaign) => GoogleAdsOperatorTask[];
  execute?: (params: { clientId: string; task: GoogleAdsOperatorTask; campaign: CampaignConfig; campaignId: string }) => Promise<ExecutionResult & { details?: unknown }>;
  runHybridShadowPlan?: (params: { clientId: string; campaign: CampaignConfig; campaignId: string; digest: WeeklyDigest; now: Date; baseDir?: string; fraudBlocker?: FraudBlockerHealthResult['summary'] }) => Promise<HybridPlanResult>;
  syncFraudBlockerHealth?: (params: { clientId: string; baseDir?: string; now: Date }) => Promise<FraudBlockerHealthResult>;
  /** ads-bot-phase2 spec §3 0e — retries this client's failed offline-conversion uploads. */
  retryLeadUploads?: (params: { clientId: string; now: Date }) => Promise<LeadUploadRetrySummary>;
}

export interface LeadUploadRetrySummary {
  attempted: number;
  ok: number;
  failed: number;
  persistErrors: number;
  leads: Array<{ leadId: number; types: string[]; statuses: string[] }>;
}

const EMPTY_RETRY_SUMMARY: LeadUploadRetrySummary = { attempted: 0, ok: 0, failed: 0, persistErrors: 0, leads: [] };

export interface AutonomousCycleOptions {
  baseDir?: string;
  runtimeDir?: string;
  dependencies?: AutonomousCycleDependencies;
}

export interface AutonomousActionSummary {
  actionId: string;
  campaignId?: string;
  kind: GoogleAdsOperatorTask['kind'];
  status: 'proposed' | 'blocked' | 'executed' | 'failed';
  reason: string;
  error?: string;
}

export interface AutonomousClientCycleSummary {
  clientId: string;
  status: 'ok' | 'locked' | 'unbound' | 'error';
  error?: string;
  actions: AutonomousActionSummary[];
  hybrid?: HybridPlanResult;
  fraudBlockerHealth?: FraudBlockerHealthResult;
  /** Offline-conversion upload retries run this cycle (0e). */
  uploadRetry?: LeadUploadRetrySummary | { error: string };
  /** Campaigns whose gates were skipped this cycle, e.g. the verified-lead read failed (0g). */
  skippedCampaigns?: Array<{ campaignId: string; reason: 'verified_conversions_unavailable' }>;
}

export interface AutonomousBatchCycleSummary {
  ranAt: string;
  clients: AutonomousClientCycleSummary[];
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]));
  }
  return value;
}

function defaultRuntimeDir(): string {
  const preferred = '/home/wao/wao-runtime-data';
  try {
    fs.mkdirSync(preferred, { recursive: true });
    fs.accessSync(preferred, fs.constants.W_OK);
    return preferred;
  } catch {
    const fallback = path.join(process.env.TMPDIR || os.tmpdir(), 'wao-runtime-data');
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function actionId(clientId: string, task: GoogleAdsOperatorTask, digest: WeeklyDigest): string {
  const payload = {
    clientId,
    campaignId: task.campaignId ?? null,
    kind: task.kind,
    evidenceWindow: { start: digest.windowStart, end: digest.windowEnd, days: digest.windowDays },
    payload: { recommendedAction: task.recommendedAction, whyNeeded: task.whyNeeded },
  };
  return createHash('sha256').update(JSON.stringify(canonicalize(payload)), 'utf8').digest('hex');
}

/**
 * ads-bot-phase2 spec §3 0g — the 30-day digest that feeds the CPL-ceiling / `budget_tune` gate.
 * Its conversion count is the verified-lead count (0f) for accounts that have a WAO
 * verified-lead action, never `all_conversions`. Callers must skip the campaign when
 * `cplGateConversions()` is undefined (the 0f read failed).
 */
export function buildCycleDigest(params: { campaign: CampaignConfig; enumerated: EnumeratedCampaign; now: Date; leads?: Parameters<typeof buildWeeklyDigest>[0]['leads'] }): WeeklyDigest {
  const { campaign, enumerated, now, leads } = params;
  return buildWeeklyDigest({
    campaign,
    now,
    leads,
    windowDays: 30,
    performance: { spendMicros: Math.round(enumerated.spendIls * 1_000_000), conversions: cplGateConversions(enumerated) },
  });
}

function defaultDependencies(): Required<AutonomousCycleDependencies> {
  return {
    now: () => new Date(),
    listClientIds: () => {
      const base = clientsDir();
      try {
        return fs.readdirSync(base).filter(clientId => fs.existsSync(path.join(base, clientId, 'google-ads.json')));
      } catch {
        return [];
      }
    },
    loadClient: clientId => {
      const index = loadClientGoogleAdsIndex(clientId);
      if (!index?.primaryCustomerId || !index.primarySlug) return null;
      const campaign = loadCampaignConfigBySlug(index.primarySlug);
      return campaign ? { customerId: index.primaryCustomerId, campaign, campaignId: index.primaryCampaignId } : null;
    },
    enumerateCampaigns: params => enumerateEnabledCampaigns({
      clientId: params.clientId,
      customerId: params.customerId,
      mode: params.campaign.mode === 'live' ? 'live' : 'test',
      verifiedLeadConversionResourceName: params.campaign.verifiedLeadConversionResourceName,
    }),
    buildDigest: ({ campaign, enumerated, now }) => buildCycleDigest({ campaign, enumerated, now }),
    deriveTasks: (clientId, digest, campaign, enumerated) => buildGoogleAdsOperatorTasks({ clientId, digest, campaignConfig: campaign, campaignAge: evaluateCampaignAge({ startDate: campaign.createdAt }), campaignId: enumerated.campaignId, campaignName: enumerated.campaignName }),
    execute: ({ task, campaign, campaignId }) => executeGoogleAdsOperatorTask({ task, campaignConfig: campaign, campaignId }),
    runHybridShadowPlan: async ({ clientId, campaign, campaignId, digest, now, baseDir, fraudBlocker }) => runHybridShadowPlanInternal({
      clientId,
      now,
      baseDir,
      cplCeilingIls: campaign.cplCeilingIls ?? deriveCplCeilingIls(campaign),
      collectSnapshot: () => collectHybridSnapshot({ clientId, campaignId, campaign, digest, now, baseDir, fraudBlocker }),
    }),
    syncFraudBlockerHealth: ({ clientId, baseDir, now }) => syncFraudBlockerHealthForClient({ clientId, baseDir, now }),
    retryLeadUploads: async ({ clientId, now }) => {
      const index = loadClientGoogleAdsIndex(clientId);
      const leads = (await readLeads()).filter(lead => leadMatchesClientIndex(lead, index));
      if (!selectLeadsForUploadRetry(leads, now).length) return EMPTY_RETRY_SUMMARY;
      // Loaded lazily: the upload module pulls in the Data Manager client only when there is work.
      const { uploadLeadConversion } = await import('./conversion-upload');
      return retryLeadConversionUploads({ leads, now, uploadLeadConversion, patchLead });
    },
  };
}

function resolveDependencies(overrides?: AutonomousCycleDependencies): Required<AutonomousCycleDependencies> {
  return { ...defaultDependencies(), ...overrides };
}

function acquireClientLock(runtimeDir: string, clientId: string): (() => void) | null {
  fs.mkdirSync(runtimeDir, { recursive: true });
  const lockPath = path.join(runtimeDir, `${clientId}.lock`);
  try {
    const fd = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(fd, `${process.pid}\n`, 'utf8');
    return () => {
      fs.closeSync(fd);
      fs.rmSync(lockPath, { force: true });
    };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return null;
    throw error;
  }
}

function requestedBudget(task: GoogleAdsOperatorTask, campaign: CampaignConfig): { requestedDailyBudgetIls?: number; budgetChangePct?: number } {
  if (task.kind !== 'budget_tune') return {};
  const current = campaign.targetDailyBudget || 100;
  return { requestedDailyBudgetIls: Math.round(current * 1.15), budgetChangePct: 15 };
}

function policyDigest(policy: GoogleAdsAutonomyPolicy): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(policy)), 'utf8').digest('hex');
}

function record(params: { clientId: string; actionId: string; task: GoogleAdsOperatorTask; digest: WeeklyDigest; policy: GoogleAdsAutonomyPolicy; reason: AutonomyDecisionReason; status: 'proposed' | 'blocked' | 'executing' | 'executed' | 'failed'; attempt: number; now: Date; after?: unknown; baseDir?: string }): void {
  appendAutonomousActionEvent(params.clientId, {
    actionId: params.actionId,
    sourceTaskId: params.task.taskId,
    evidenceIds: [`${params.digest.windowStart}:${params.digest.windowEnd}`],
    policyVersion: params.policy.version,
    policyDigest: policyDigest(params.policy),
    before: { taskId: params.task.taskId, campaignId: params.task.campaignId ?? null },
    after: params.after ?? null,
    decisionReason: params.reason,
    attempt: params.attempt,
    createdAt: params.now.toISOString(),
    updatedAt: params.now.toISOString(),
    ...(params.status === 'executed' ? { executedAt: params.now.toISOString() } : {}),
    status: params.status,
  }, params.baseDir);
}

export async function runAutonomousClientCycle(clientId: string, options: AutonomousCycleOptions = {}): Promise<AutonomousClientCycleSummary> {
  const dependencies = resolveDependencies(options.dependencies);
  const now = dependencies.now();
  const runtimeDir = options.runtimeDir ?? defaultRuntimeDir();
  const release = acquireClientLock(runtimeDir, clientId);
  if (!release) return { clientId, status: 'locked', actions: [] };

  try {
    const bound = dependencies.loadClient(clientId);
    if (!bound) return { clientId, status: 'unbound', error: 'bound_campaign_missing', actions: [] };
    // 0e: offline-upload retries are not an account change (they re-send the owner's own marks),
    // so they run for every bound client regardless of autonomy mode, and never break the cycle.
    let uploadRetry: AutonomousClientCycleSummary['uploadRetry'];
    try {
      uploadRetry = await dependencies.retryLeadUploads({ clientId, now });
    } catch (error) {
      uploadRetry = { error: error instanceof Error ? error.message : String(error) };
    }
    let policy = readAutonomyPolicy(clientId, options.baseDir);
    if (!policy) return { clientId, status: 'unbound', error: 'policy_missing', actions: [], uploadRetry };
    let fraudBlockerHealth: FraudBlockerHealthResult | undefined;
    try {
      fraudBlockerHealth = await dependencies.syncFraudBlockerHealth({ clientId, baseDir: options.baseDir, now });
      const storedPolicy = readAutonomyPolicy(clientId, options.baseDir) ?? policy;
      policy = { ...storedPolicy, clickProtection: { ...storedPolicy.clickProtection, status: fraudBlockerHealth.status, verifiedAt: fraudBlockerHealth.verifiedAt } };
    } catch {
      fraudBlockerHealth = { status: 'provider_error', verifiedAt: null, syncedAt: null };
      policy = { ...policy, clickProtection: { ...policy.clickProtection, status: 'provider_error', verifiedAt: null } };
    }
    const campaigns = await dependencies.enumerateCampaigns({ clientId, customerId: bound.customerId, campaign: bound.campaign });
    const actions: AutonomousActionSummary[] = [];
    let actionsExecutedThisRun = 0;
    let hybridInput: { campaignId: string; digest: WeeklyDigest } | undefined;
    const skippedCampaigns: NonNullable<AutonomousClientCycleSummary['skippedCampaigns']> = [];

    for (const enumerated of campaigns) {
      // 0g: fail closed — no verified-lead count, no CPL gate, so no task for this campaign.
      if (cplGateConversions(enumerated) === undefined) {
        skippedCampaigns.push({ campaignId: enumerated.campaignId, reason: 'verified_conversions_unavailable' });
        continue;
      }
      const digest = dependencies.buildDigest({ campaign: bound.campaign, enumerated, now });
      hybridInput = { campaignId: enumerated.campaignId, digest };
      const tasks = dependencies.deriveTasks(clientId, digest, bound.campaign, enumerated);
      for (const task of tasks) {
        const id = actionId(clientId, task, digest);
        if (!EXECUTABLE_KINDS.has(task.kind)) {
          record({ clientId, actionId: id, task, digest, policy, reason: 'kind_not_allowed', status: 'blocked', attempt: 1, now, baseDir: options.baseDir });
          actions.push({ actionId: id, campaignId: task.campaignId, kind: task.kind, status: 'blocked', reason: 'non_executable_kind' });
          continue;
        }
        const kind = task.kind as AutonomousActionKind;
        const events = readAutonomousActionEvents(clientId, options.baseDir);
        const lastExecutedAt = events.filter(event => event.actionId === id && event.status === 'executed').at(-1)?.executedAt;
        if (policy.mode === 'shadow') {
          record({ clientId, actionId: id, task, digest, policy, reason: 'mode_not_autonomous', status: 'proposed', attempt: 1, now, baseDir: options.baseDir });
          actions.push({ actionId: id, campaignId: task.campaignId, kind: task.kind, status: 'proposed', reason: 'shadow_mode' });
          continue;
        }
        const decision = evaluateAutonomousAction({ clientId, policy, kind, reversible: true, ...requestedBudget(task, bound.campaign), actionsExecutedThisRun, lastExecutedAt, requireClickProtection: true, now });
        if (!decision.allowed) {
          record({ clientId, actionId: id, task, digest, policy, reason: decision.reason, status: 'blocked', attempt: 1, now, baseDir: options.baseDir });
          actions.push({ actionId: id, campaignId: task.campaignId, kind: task.kind, status: 'blocked', reason: decision.reason });
          continue;
        }
        const refreshedCampaign = (await dependencies.enumerateCampaigns({ clientId, customerId: bound.customerId, campaign: bound.campaign }))
          .find(candidate => candidate.campaignId === enumerated.campaignId && cplGateConversions(candidate) !== undefined);
        const refreshedDigest = refreshedCampaign ? dependencies.buildDigest({ campaign: bound.campaign, enumerated: refreshedCampaign, now: dependencies.now() }) : undefined;
        const refreshed = refreshedCampaign && refreshedDigest
          ? dependencies.deriveTasks(clientId, refreshedDigest, bound.campaign, refreshedCampaign).find(candidate => candidate.taskId === task.taskId)
          : undefined;
        if (!refreshed || !refreshed.campaignId) {
          record({ clientId, actionId: id, task, digest, policy, reason: 'kind_not_allowed', status: 'blocked', attempt: 1, now, baseDir: options.baseDir });
          actions.push({ actionId: id, campaignId: task.campaignId, kind: task.kind, status: 'blocked', reason: 'stale_or_missing_campaign' });
          continue;
        }
        record({ clientId, actionId: id, task: refreshed, digest: refreshedDigest!, policy, reason: decision.reason, status: 'executing', attempt: 1, now, baseDir: options.baseDir });
        try {
          const result = await dependencies.execute({ clientId, task: refreshed, campaign: bound.campaign, campaignId: refreshed.campaignId });
          const status = result.success ? 'executed' : 'failed';
          record({ clientId, actionId: id, task: refreshed, digest: refreshedDigest!, policy, reason: decision.reason, status, attempt: 1, now, after: { error: result.error, details: result.details }, baseDir: options.baseDir });
          actions.push({ actionId: id, campaignId: refreshed.campaignId, kind: refreshed.kind, status, reason: decision.reason, error: result.error });
          if (result.success) actionsExecutedThisRun += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          record({ clientId, actionId: id, task: refreshed, digest: refreshedDigest!, policy, reason: decision.reason, status: 'failed', attempt: 1, now, after: { error: message }, baseDir: options.baseDir });
          actions.push({ actionId: id, campaignId: refreshed.campaignId, kind: refreshed.kind, status: 'failed', reason: decision.reason, error: message });
        }
      }
    }
    const fallbackDigest = buildWeeklyDigest({ campaign: bound.campaign, now, windowDays: 30 });
    let hybrid: HybridPlanResult;
    try {
      hybrid = await dependencies.runHybridShadowPlan({
        clientId,
        campaign: bound.campaign,
        campaignId: hybridInput?.campaignId ?? bound.campaignId ?? 'primary_campaign_unknown',
        digest: hybridInput?.digest ?? fallbackDigest,
        now,
        baseDir: options.baseDir,
        fraudBlocker: fraudBlockerHealth?.summary,
      });
    } catch (error) {
      hybrid = { status: 'error', error: error instanceof Error ? error.message : String(error) };
    }
    return { clientId, status: 'ok', actions, hybrid, fraudBlockerHealth, uploadRetry, ...(skippedCampaigns.length ? { skippedCampaigns } : {}) };
  } catch (error) {
    return { clientId, status: 'error', error: error instanceof Error ? error.message : String(error), actions: [] };
  } finally {
    release();
  }
}

export async function runAllAutonomousClientCycles(options: AutonomousCycleOptions = {}): Promise<AutonomousBatchCycleSummary> {
  const dependencies = resolveDependencies(options.dependencies);
  const clients: AutonomousClientCycleSummary[] = [];
  for (const clientId of dependencies.listClientIds()) {
    clients.push(await runAutonomousClientCycle(clientId, { ...options, dependencies }));
  }
  return { ranAt: dependencies.now().toISOString(), clients };
}
