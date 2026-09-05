import fs from 'fs';
import path from 'path';

const CLIENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const STATUS_VALUES = new Set(['provisioned', 'tracker_installed', 'healthy', 'error', 'archived', 'provisioning_failed', 'external_install_required']);

export type FraudBlockerStatus = 'provisioned' | 'tracker_installed' | 'healthy' | 'error' | 'archived' | 'provisioning_failed' | 'external_install_required';

export interface FraudBlockerState {
  clientId: string;
  domain: string;
  sid: string;
  provisionedAt: string;
  trackerInstalledAt: string | null;
  lastHealthCheckAt: string | null;
  lastSyncedAt: string | null;
  monitoringOnly: boolean;
  status: FraudBlockerStatus;
  lastError: string | null;
}

function clientsBaseDir(baseDir?: string): string {
  return path.resolve(baseDir ?? path.join(process.cwd(), 'data', 'clients'));
}

function statePath(clientId: string, baseDir?: string): string | null {
  if (!CLIENT_ID_PATTERN.test(clientId)) return null;
  const root = clientsBaseDir(baseDir);
  const directory = path.resolve(root, clientId);
  if (!directory.startsWith(`${root}${path.sep}`)) return null;
  return path.join(directory, 'fraud-blocker.json');
}

function sanitizeError(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7e]/g, '?').trim().slice(0, 240);
}

function validTimestamp(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && Number.isFinite(new Date(value).getTime()));
}

function isState(value: unknown): value is FraudBlockerState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Partial<FraudBlockerState>;
  return typeof state.clientId === 'string'
    && CLIENT_ID_PATTERN.test(state.clientId)
    && typeof state.domain === 'string'
    && typeof state.sid === 'string'
    && typeof state.provisionedAt === 'string'
    && Number.isFinite(new Date(state.provisionedAt).getTime())
    && validTimestamp(state.trackerInstalledAt)
    && validTimestamp(state.lastHealthCheckAt)
    && validTimestamp(state.lastSyncedAt)
    && typeof state.monitoringOnly === 'boolean'
    && typeof state.status === 'string'
    && STATUS_VALUES.has(state.status)
    && (state.lastError === null || typeof state.lastError === 'string');
}

export function readFraudBlockerState(clientId: string, baseDir?: string): FraudBlockerState | null {
  const filePath = statePath(clientId, baseDir);
  if (!filePath) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!isState(parsed) || parsed.clientId !== clientId) return null;
    return { ...parsed, lastError: parsed.lastError === null ? null : sanitizeError(parsed.lastError) };
  } catch {
    return null;
  }
}

export function writeFraudBlockerState(state: FraudBlockerState, baseDir?: string): boolean {
  const filePath = statePath(state.clientId, baseDir);
  if (!filePath || !isState(state)) return false;
  try {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
    const sanitized = { ...state, lastError: state.lastError === null ? null : sanitizeError(state.lastError) };
    const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    fs.writeFileSync(temporaryPath, `${JSON.stringify(sanitized, null, 2)}\n`, 'utf8');
    fs.renameSync(temporaryPath, filePath);
    return true;
  } catch {
    return false;
  }
}
