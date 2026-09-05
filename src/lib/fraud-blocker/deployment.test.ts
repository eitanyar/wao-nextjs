import assert from 'node:assert/strict';
import test from 'node:test';

import { provisionFraudBlockerDomain, recordFraudBlockerTrackerInstallation, type FraudBlockerDeploymentState } from './deployment';

const now = () => '2026-09-04T00:00:00.000Z';
const base = (): FraudBlockerDeploymentState => ({ clientId: 'fixture', domain: 'fixture.wao.co.il', sid: '', provisionedAt: now(), trackerInstalledAt: null, lastHealthCheckAt: null, lastSyncedAt: null, monitoringOnly: true, status: 'provisioning_failed', lastError: 'previous failure' });

test('provisioning confirms the vendor domain and preserves a matching installed tracker timestamp', async () => {
  const writes: FraudBlockerDeploymentState[] = [];
  const state: FraudBlockerDeploymentState = { ...base(), sid: 'sid_old', trackerInstalledAt: '2026-09-03T00:00:00.000Z', status: 'tracker_installed', lastError: null };
  const result = await provisionFraudBlockerDomain({ clientId: 'fixture', domain: 'fixture.wao.co.il', client: { listDomains: async () => [{ sid: 'sid_old', domain: 'fixture.wao.co.il' }], createDomain: async () => null, deleteDomain: async () => undefined, listIps: async () => [], getClickReport: async () => [] }, readState: () => state, writeState: item => { writes.push(item); return true; }, now });
  assert.equal(result, 'sid_old');
  assert.equal(writes[0]?.trackerInstalledAt, state.trackerInstalledAt);
  assert.equal(writes[0]?.status, 'tracker_installed');
});

test('tracker installation state is written only after every HTML page verifies', () => {
  const writes: FraudBlockerDeploymentState[] = [];
  const state: FraudBlockerDeploymentState = { ...base(), sid: 'sid_fixture_1', status: 'provisioned', lastError: null };
  const validPages = { 'index.html': '<html><head><script async src="https://monitor.fraudblocker.com/fbt.js?sid=sid_fixture_1"></script><noscript><img src="https://monitor.fraudblocker.com/fbt.gif?sid=sid_fixture_1" alt="" /></noscript></head></html>', 'sitemap.xml': '<urlset/>' };
  assert.equal(recordFraudBlockerTrackerInstallation({ state, pages: validPages, writeState: item => { writes.push(item); return true; }, now }), true);
  assert.equal(writes[0]?.status, 'tracker_installed');
  assert.equal(writes[0]?.trackerInstalledAt, now());
  assert.equal(recordFraudBlockerTrackerInstallation({ state, pages: { ...validPages, 'privacy.html': '<html><head></head></html>' }, writeState: () => true, now }), false);
});
