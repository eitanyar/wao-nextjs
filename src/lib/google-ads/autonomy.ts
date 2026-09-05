import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

export type AutonomousActionKind = 'budget_tune' | 'search_term_cleanup' | 'search_term_harvest';
export type ClickProtectionStatus = 'protected' | 'unprotected' | 'unknown' | 'awaiting_ads_connection' | 'monitoring_only' | 'stale' | 'unauthorized' | 'not_found' | 'rate_limited' | 'domain_or_sid_mismatch' | 'tracker_not_installed' | 'provider_error' | 'invalid_response';

export interface GoogleAdsAutonomyPolicy {
  version: 1;
  clientId: string;
  mode: 'disabled' | 'shadow' | 'autonomous';
  authorizedAt: string;
  authorizedBy: string;
  termsVersion: string;
  allowedKinds: AutonomousActionKind[];
  maxDailyBudgetIls: number;
  maxBudgetChangePctPerRun: number;
  maxActionsPerRun: number;
  cooldownHours: number;
  killSwitch: boolean;
  clickProtection: {
    provider: 'fraudblocker' | 'none';
    status: ClickProtectionStatus;
    verifiedAt: string | null;
    maxAgeDays: number;
  };
}

export interface EvaluateAutonomousActionInput {
  clientId: string;
  policy: GoogleAdsAutonomyPolicy | null | undefined;
  kind: AutonomousActionKind;
  reversible: boolean;
  requestedDailyBudgetIls?: number;
  budgetChangePct?: number;
  actionsExecutedThisRun: number;
  lastExecutedAt?: string;
  requireClickProtection?: boolean;
  now?: Date;
}

export type AutonomyDecisionReason =
  | 'allowed'
  | 'policy_missing'
  | 'client_mismatch'
  | 'mode_not_autonomous'
  | 'authorization_missing'
  | 'kill_switch_enabled'
  | 'kind_not_allowed'
  | 'action_cap_exceeded'
  | 'cooldown_active'
  | 'daily_budget_cap_exceeded'
  | 'budget_change_cap_exceeded'
  | 'click_protection_unavailable'
  | 'click_protection_stale'
  | 'action_not_reversible';

export interface AutonomyDecision {
  allowed: boolean;
  reason: AutonomyDecisionReason;
  policyVersion?: 1;
  policyDigest?: string;
  input: EvaluateAutonomousActionInput;
}

export type AutonomousActionStatus = 'proposed' | 'blocked' | 'executing' | 'executed' | 'failed' | 'rolled_back';

export interface AutonomousActionEvent {
  actionId: string;
  sourceTaskId: string;
  evidenceIds: string[];
  policyVersion: 1;
  policyDigest: string;
  before: unknown;
  after: unknown;
  decisionReason: AutonomyDecisionReason;
  attempt: number;
  createdAt: string;
  updatedAt?: string;
  executedAt?: string;
  rolledBackAt?: string;
  status: AutonomousActionStatus;
}

const CLIENT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const ACTION_KINDS: ReadonlySet<string> = new Set(['budget_tune', 'search_term_cleanup', 'search_term_harvest']);

function clientsBaseDir(baseDir?: string): string {
  return path.resolve(baseDir ?? path.join(process.cwd(), 'data', 'clients'));
}

function clientDir(clientId: string, baseDir?: string): string | null {
  if (!CLIENT_ID_PATTERN.test(clientId)) return null;
  const root = clientsBaseDir(baseDir);
  const resolved = path.resolve(root, clientId);
  return resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

function policyPath(clientId: string, baseDir?: string): string | null {
  const directory = clientDir(clientId, baseDir);
  return directory ? path.join(directory, 'google-ads-autonomy.json') : null;
}

function eventsPath(clientId: string, baseDir?: string): string | null {
  const directory = clientDir(clientId, baseDir);
  return directory ? path.join(directory, 'tasks', 'google-ads', 'autonomous-actions.jsonl') : null;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }
  return value;
}

function policyDigest(policy: GoogleAdsAutonomyPolicy): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(policy)), 'utf8').digest('hex');
}

function isValidPolicy(value: unknown): value is GoogleAdsAutonomyPolicy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const policy = value as Partial<GoogleAdsAutonomyPolicy>;
  return policy.version === 1
    && typeof policy.clientId === 'string'
    && (policy.mode === 'disabled' || policy.mode === 'shadow' || policy.mode === 'autonomous')
    && typeof policy.authorizedAt === 'string'
    && typeof policy.authorizedBy === 'string'
    && typeof policy.termsVersion === 'string'
    && Array.isArray(policy.allowedKinds)
    && policy.allowedKinds.every(kind => ACTION_KINDS.has(kind))
    && typeof policy.maxDailyBudgetIls === 'number'
    && Number.isFinite(policy.maxDailyBudgetIls)
    && typeof policy.maxBudgetChangePctPerRun === 'number'
    && Number.isFinite(policy.maxBudgetChangePctPerRun)
    && typeof policy.maxActionsPerRun === 'number'
    && Number.isInteger(policy.maxActionsPerRun)
    && typeof policy.cooldownHours === 'number'
    && Number.isFinite(policy.cooldownHours)
    && typeof policy.killSwitch === 'boolean'
    && !!policy.clickProtection
    && (policy.clickProtection.provider === 'fraudblocker' || policy.clickProtection.provider === 'none')
    && ['protected', 'unprotected', 'unknown', 'awaiting_ads_connection', 'monitoring_only', 'stale', 'unauthorized', 'not_found', 'rate_limited', 'domain_or_sid_mismatch', 'tracker_not_installed', 'provider_error', 'invalid_response'].includes(policy.clickProtection.status)
    && (typeof policy.clickProtection.verifiedAt === 'string' || policy.clickProtection.verifiedAt === null)
    && typeof policy.clickProtection.maxAgeDays === 'number'
    && Number.isFinite(policy.clickProtection.maxAgeDays);
}

export function readAutonomyPolicy(clientId: string, baseDir?: string): GoogleAdsAutonomyPolicy | null {
  const filePath = policyPath(clientId, baseDir);
  if (!filePath) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return isValidPolicy(parsed) && parsed.clientId === clientId ? parsed : null;
  } catch {
    return null;
  }
}

export function writeAutonomyPolicy(policy: GoogleAdsAutonomyPolicy, baseDir?: string): boolean {
  const filePath = policyPath(policy.clientId, baseDir);
  if (!filePath || !isValidPolicy(policy)) return false;
  try {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
    const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    fs.writeFileSync(temporaryPath, `${JSON.stringify(canonicalize(policy), null, 2)}\n`, 'utf8');
    fs.renameSync(temporaryPath, filePath);
    return true;
  } catch {
    return false;
  }
}


export function updateAutonomyClickProtection(clientId: string, clickProtection: Pick<GoogleAdsAutonomyPolicy['clickProtection'], 'status' | 'verifiedAt'>, baseDir?: string): GoogleAdsAutonomyPolicy | null {
  const policy = readAutonomyPolicy(clientId, baseDir);
  if (!policy) return null;
  const updated: GoogleAdsAutonomyPolicy = { ...policy, clickProtection: { ...policy.clickProtection, ...clickProtection } };
  return writeAutonomyPolicy(updated, baseDir) ? updated : null;
}

function blocked(input: EvaluateAutonomousActionInput, reason: AutonomyDecisionReason, policy?: GoogleAdsAutonomyPolicy): AutonomyDecision {
  return {
    allowed: false,
    reason,
    ...(policy ? { policyVersion: policy.version, policyDigest: policyDigest(policy) } : {}),
    input,
  };
}

export function evaluateAutonomousAction(input: EvaluateAutonomousActionInput): AutonomyDecision {
  const policy = input.policy;
  if (!policy || !isValidPolicy(policy)) return blocked(input, 'policy_missing');
  if (policy.clientId !== input.clientId) return blocked(input, 'client_mismatch', policy);
  if (policy.mode !== 'autonomous') return blocked(input, 'mode_not_autonomous', policy);
  if (!policy.authorizedAt.trim() || !policy.authorizedBy.trim() || !policy.termsVersion.trim()) return blocked(input, 'authorization_missing', policy);
  if (policy.killSwitch) return blocked(input, 'kill_switch_enabled', policy);
  if (!policy.allowedKinds.includes(input.kind)) return blocked(input, 'kind_not_allowed', policy);
  if (!input.reversible) return blocked(input, 'action_not_reversible', policy);
  if (!Number.isFinite(input.actionsExecutedThisRun) || input.actionsExecutedThisRun >= policy.maxActionsPerRun) return blocked(input, 'action_cap_exceeded', policy);

  const now = input.now ?? new Date();
  if (input.lastExecutedAt) {
    const lastExecutedAt = new Date(input.lastExecutedAt);
    const elapsedHours = (now.getTime() - lastExecutedAt.getTime()) / (60 * 60 * 1000);
    if (!Number.isFinite(elapsedHours) || elapsedHours < policy.cooldownHours) return blocked(input, 'cooldown_active', policy);
  }
  if (input.requestedDailyBudgetIls !== undefined && (!Number.isFinite(input.requestedDailyBudgetIls) || input.requestedDailyBudgetIls > policy.maxDailyBudgetIls)) return blocked(input, 'daily_budget_cap_exceeded', policy);
  if (input.budgetChangePct !== undefined && (!Number.isFinite(input.budgetChangePct) || Math.abs(input.budgetChangePct) > policy.maxBudgetChangePctPerRun)) return blocked(input, 'budget_change_cap_exceeded', policy);

  if (input.requireClickProtection) {
    const protection = policy.clickProtection;
    if (protection.provider !== 'fraudblocker' || protection.status !== 'protected' || !protection.verifiedAt) return blocked(input, 'click_protection_unavailable', policy);
    const verifiedAt = new Date(protection.verifiedAt);
    const ageDays = (now.getTime() - verifiedAt.getTime()) / (24 * 60 * 60 * 1000);
    if (!Number.isFinite(ageDays) || ageDays > protection.maxAgeDays) return blocked(input, 'click_protection_stale', policy);
  }

  return { allowed: true, reason: 'allowed', policyVersion: policy.version, policyDigest: policyDigest(policy), input };
}

export function appendAutonomousActionEvent(clientId: string, event: AutonomousActionEvent, baseDir?: string): boolean {
  const filePath = eventsPath(clientId, baseDir);
  if (!filePath || !event.actionId || !event.sourceTaskId || !event.policyDigest || !Array.isArray(event.evidenceIds)) return false;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify(event)}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

export function readAutonomousActionEvents(clientId: string, baseDir?: string): AutonomousActionEvent[] {
  const filePath = eventsPath(clientId, baseDir);
  if (!filePath) return [];
  try {
    return fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .flatMap(line => {
        try {
          return [JSON.parse(line) as AutonomousActionEvent];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}
