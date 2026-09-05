import { ensureFraudBlockerDomain, type FraudBlockerClient } from './client';
import { verifyFraudBlockerRenderedPages } from './renderIntegration';
import { readFraudBlockerState, writeFraudBlockerState, type FraudBlockerState } from './store';

export type FraudBlockerDeploymentState = FraudBlockerState;

type StateReader = (clientId: string) => FraudBlockerState | null;
type StateWriter = (state: FraudBlockerState) => boolean;

export interface ProvisionFraudBlockerDomainParams {
  clientId: string;
  domain: string;
  client: FraudBlockerClient;
  readState?: StateReader;
  writeState?: StateWriter;
  now?: () => string;
}

export async function provisionFraudBlockerDomain(params: ProvisionFraudBlockerDomainParams): Promise<string> {
  const sid = await ensureFraudBlockerDomain(params.client, params.domain);
  const existing = (params.readState ?? readFraudBlockerState)(params.clientId);
  const timestamp = (params.now ?? (() => new Date().toISOString()))();
  const trackerInstalledAt = existing?.sid === sid ? existing.trackerInstalledAt : null;
  const state: FraudBlockerState = {
    clientId: params.clientId,
    domain: params.domain,
    sid,
    provisionedAt: existing?.sid === sid ? existing.provisionedAt : timestamp,
    trackerInstalledAt,
    lastHealthCheckAt: existing?.lastHealthCheckAt ?? null,
    lastSyncedAt: timestamp,
    monitoringOnly: existing?.monitoringOnly ?? true,
    status: trackerInstalledAt ? 'tracker_installed' : 'provisioned',
    lastError: null,
  };
  if (!(params.writeState ?? writeFraudBlockerState)(state)) throw new Error('Unable to persist Fraud Blocker provisioning state.');
  return sid;
}

export interface RecordFraudBlockerTrackerInstallationParams {
  state: FraudBlockerState;
  pages: Record<string, string>;
  writeState?: StateWriter;
  now?: () => string;
}

export function recordFraudBlockerTrackerInstallation(params: RecordFraudBlockerTrackerInstallationParams): boolean {
  if (!verifyFraudBlockerRenderedPages(params.pages, params.state.sid).valid) return false;
  const timestamp = (params.now ?? (() => new Date().toISOString()))();
  return (params.writeState ?? writeFraudBlockerState)({
    ...params.state,
    trackerInstalledAt: timestamp,
    lastSyncedAt: timestamp,
    status: 'tracker_installed',
    lastError: null,
  });
}

export function fraudBlockerFailureState(clientId: string, domain: string, error: unknown, existing: FraudBlockerState | null = readFraudBlockerState(clientId)): FraudBlockerState {
  const timestamp = new Date().toISOString();
  return {
    clientId,
    domain,
    sid: existing?.sid ?? '',
    provisionedAt: existing?.provisionedAt ?? timestamp,
    trackerInstalledAt: existing?.trackerInstalledAt ?? null,
    lastHealthCheckAt: existing?.lastHealthCheckAt ?? null,
    lastSyncedAt: timestamp,
    monitoringOnly: existing?.monitoringOnly ?? true,
    status: 'provisioning_failed',
    lastError: error instanceof Error ? error.message : 'Fraud Blocker provisioning failed.',
  };
}
