import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';

import { readFraudBlockerState, writeFraudBlockerState, type FraudBlockerState } from './store';

function state(): FraudBlockerState {
  return {
    clientId: 'client_1',
    domain: 'example.com',
    sid: 'sid_1',
    provisionedAt: '2026-09-03T00:00:00.000Z',
    trackerInstalledAt: null,
    lastHealthCheckAt: null,
    lastSyncedAt: null,
    monitoringOnly: true,
    status: 'provisioned',
    lastError: null,
  };
}

test('fraud blocker store atomically persists only in the supplied temporary base directory', () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fraud-blocker-store-'));
  const item = { ...state(), lastError: 'provider\nerror\twith control chars' };

  assert.equal(writeFraudBlockerState(item, baseDir), true);
  assert.deepEqual(readFraudBlockerState(item.clientId, baseDir), { ...item, lastError: 'provider error with control chars' });
  assert.equal(fs.existsSync(path.join(baseDir, item.clientId, 'fraud-blocker.json')), true);
  assert.equal(fs.existsSync(path.join(process.cwd(), 'data', 'clients', item.clientId, 'fraud-blocker.json')), false);
  assert.deepEqual(fs.readdirSync(path.join(baseDir, item.clientId)).filter(name => name.includes('.tmp')), []);
});

test('fraud blocker store rejects unsafe client ids and invalid state', () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fraud-blocker-store-'));
  assert.equal(writeFraudBlockerState({ ...state(), clientId: '../escape' }, baseDir), false);
  assert.equal(readFraudBlockerState('../escape', baseDir), null);
  assert.equal(writeFraudBlockerState({ ...state(), status: 'unknown' as FraudBlockerState['status'] }, baseDir), false);
});
