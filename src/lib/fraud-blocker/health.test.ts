import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { FraudBlockerApiError } from './client';
import {
  evaluateFraudBlockerHealth,
  syncFraudBlockerHealthForClient,
  type FraudBlockerHealthAdapter,
} from './health';
import { readFraudBlockerState, writeFraudBlockerState, type FraudBlockerState } from './store';
import { readAutonomyPolicy, writeAutonomyPolicy, type GoogleAdsAutonomyPolicy } from '../google-ads/autonomy';

const now = new Date('2026-09-04T00:00:00.000Z');

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fraud-blocker-health-test-'));
}

function policy(): GoogleAdsAutonomyPolicy {
  return {
    version: 1,
    clientId: 'client-a',
    mode: 'autonomous',
    authorizedAt: '2026-09-01T00:00:00.000Z',
    authorizedBy: 'owner',
    termsVersion: '2026-09',
    allowedKinds: ['budget_tune'],
    maxDailyBudgetIls: 500,
    maxBudgetChangePctPerRun: 10,
    maxActionsPerRun: 1,
    cooldownHours: 24,
    killSwitch: false,
    clickProtection: { provider: 'fraudblocker', status: 'unknown', verifiedAt: null, maxAgeDays: 7 },
  };
}

function state(overrides: Partial<FraudBlockerState> = {}): FraudBlockerState {
  return {
    clientId: 'client-a',
    domain: 'example.com',
    sid: 'sid-1',
    provisionedAt: '2026-09-01T00:00:00.000Z',
    trackerInstalledAt: '2026-09-02T00:00:00.000Z',
    lastHealthCheckAt: null,
    lastSyncedAt: null,
    monitoringOnly: true,
    status: 'tracker_installed',
    lastError: null,
    ...overrides,
  };
}

function adapter(ips: unknown = { sid: 'sid-1', domain: 'example.com', monitoring_only: false, synced_at: '2026-09-03T00:00:00.000Z' }, report: unknown = []): FraudBlockerHealthAdapter {
  return { getIps: async () => ips, getClickReport: async () => report };
}

test('health accepts only installed matching and fresh vendor-enforced protection', async () => {
  const result = await evaluateFraudBlockerHealth({ state: state(), policy: policy(), adapter: adapter(), now });
  assert.equal(result.status, 'protected');
  assert.equal(result.verifiedAt, now.toISOString());
});

test('health distinguishes never-synced monitoring-only stale rate-limited and mismatched enforcement', async () => {
  const fixtures: Array<[unknown, string]> = [
    [{ sid: 'sid-1', domain: 'example.com', monitoring_only: false, synced_at: null }, 'awaiting_ads_connection'],
    [{ sid: 'sid-1', domain: 'example.com', monitoring_only: true, synced_at: '2026-09-03T00:00:00.000Z' }, 'monitoring_only'],
    [{ sid: 'sid-1', domain: 'example.com', monitoring_only: false, synced_at: '2026-08-01T00:00:00.000Z' }, 'stale'],
    [{ sid: 'other', domain: 'example.com', monitoring_only: false, synced_at: '2026-09-03T00:00:00.000Z' }, 'domain_or_sid_mismatch'],
  ];
  for (const [ips, expected] of fixtures) {
    const result = await evaluateFraudBlockerHealth({ state: state(), policy: policy(), adapter: adapter(ips), now });
    assert.equal(result.status, expected);
  }
  const rateLimited = await evaluateFraudBlockerHealth({ state: state(), policy: policy(), adapter: { getIps: async () => { throw new FraudBlockerApiError('rate_limited', 429); }, getClickReport: async () => [] }, now });
  assert.equal(rateLimited.status, 'rate_limited');
});

test('health rejects missing tracker installation even when the vendor reports a fresh list', async () => {
  const result = await evaluateFraudBlockerHealth({ state: state({ trackerInstalledAt: null }), policy: policy(), adapter: adapter(), now });
  assert.equal(result.status, 'tracker_not_installed');
});

test('sync atomically preserves unrelated policy fields and stores aggregate-only report evidence', async () => {
  const baseDir = tempDir();
  const original = policy();
  writeAutonomyPolicy(original, baseDir);
  writeFraudBlockerState(state(), baseDir);
  const result = await syncFraudBlockerHealthForClient({
    clientId: 'client-a',
    baseDir,
    adapter: adapter(undefined, [{ fraud_score: 12, total_ad_clicks: 20, invalid_ad_clicks: 3, estimated_savings: 7, channel: 'google_ads', device: 'mobile', fraud_type: 'bot', timestamp: '2026-09-03T00:00:00.000Z', ip: '203.0.113.1', visitor_id: 'visitor-1' }]),
    now,
  });
  assert.equal(result.status, 'protected');
  const saved = readAutonomyPolicy('client-a', baseDir)!;
  assert.deepEqual({ ...saved, clickProtection: original.clickProtection }, original);
  assert.deepEqual(saved.clickProtection, { ...original.clickProtection, status: 'protected', verifiedAt: now.toISOString() });
  assert.deepEqual(result.summary, {
    fraudScore: 12,
    totalAdClicks: 20,
    invalidAdClicks: 3,
    estimatedSavings: 7,
    channelCounts: { google_ads: 1 },
    deviceCounts: { mobile: 1 },
    fraudTypeCounts: { bot: 1 },
    reportWindow: { start: '2026-09-03T00:00:00.000Z', end: '2026-09-03T00:00:00.000Z' },
    sourceTimestamp: '2026-09-03T00:00:00.000Z',
  });
  assert.equal(JSON.stringify(result.summary).includes('203.0.113.1'), false);
  assert.equal(JSON.stringify(result.summary).includes('visitor-1'), false);
  assert.equal(readFraudBlockerState('client-a', baseDir)?.lastSyncedAt, '2026-09-03T00:00:00.000Z');
});

test('one client health failure does not prevent another client synchronization', async () => {
  const baseDir = tempDir();
  writeAutonomyPolicy(policy(), baseDir);
  writeAutonomyPolicy({ ...policy(), clientId: 'client-b' }, baseDir);
  writeFraudBlockerState(state(), baseDir);
  writeFraudBlockerState({ ...state(), clientId: 'client-b' }, baseDir);
  const failing = await syncFraudBlockerHealthForClient({ clientId: 'client-a', baseDir, adapter: { getIps: async () => { throw new FraudBlockerApiError('unauthorized', 401); }, getClickReport: async () => [] }, now });
  const healthy = await syncFraudBlockerHealthForClient({ clientId: 'client-b', baseDir, adapter: adapter({ sid: 'sid-1', domain: 'example.com', monitoring_only: false, synced_at: '2026-09-03T00:00:00.000Z' }), now });
  assert.equal(failing.status, 'unauthorized');
  assert.equal(healthy.status, 'protected');
});
