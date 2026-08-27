import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  writeAuditRecord,
  readAuditRecord,
  type AuditLocationBinding,
} from './auditStore';
import { appendEntry, readLog, makeEntryId, type ApprovalEntry } from './fixLog';
import { connectAuditGbpLocation, promoteApprovedPendingEntries } from './gbpConnect';

test('gbpConnectFlow transitions audit and approved fixLog entries upon successful connection', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gbpConnectFlow-test-'));
  const auditId = 'abcdef01-2345-4678-89ab-cdef01234567';
  const logDir = path.join(process.cwd(), 'data', 'audit-logs', auditId);

  try {
    // 1. Seed audit record
    const auditData = {
      auditId,
      query: { businessName: 'Plumbing Pro' },
      fetchedAt: new Date().toISOString(),
      candidates: [{ placeId: 'ChIJxyz', displayName: 'Plumbing Pro' }],
    };
    const written = await writeAuditRecord(auditId, auditData, tmpDir);
    assert.equal(written, true);

    // 2. Seed pending approval entries in fixLog
    const itemId1 = 'categories-fix';
    const itemId2 = 'location-fix';

    const entry1: ApprovalEntry = {
      entryId: makeEntryId(auditId),
      clientId: auditId,
      actionId: itemId1,
      actionType: 'mixed',
      targetUrl: `site-bot/fix/${auditId}`,
      contentSnippet: itemId1,
      tier: 'managed',
      approvedBy: 'owner-self-serve',
      approvedAt: new Date().toISOString(),
      verificationResult: 'pending',
      verificationNote: 'approved_pending_connection',
      fixAttempts: 0,
    };

    const entry2: ApprovalEntry = {
      entryId: makeEntryId(auditId),
      clientId: auditId,
      actionId: itemId2,
      actionType: 'mixed',
      targetUrl: `site-bot/fix/${auditId}`,
      contentSnippet: itemId2,
      tier: 'managed',
      approvedBy: 'owner-self-serve',
      approvedAt: new Date().toISOString(),
      verificationResult: 'pending',
      verificationNote: 'approved_pending_connection',
      fixAttempts: 0,
    };

    appendEntry(entry1);
    appendEntry(entry2);

    // Verify initial log state
    const initialLogs = readLog(auditId);
    assert.equal(initialLogs.length, 2);
    assert.equal(initialLogs[0].verificationNote, 'approved_pending_connection');
    assert.equal(initialLogs[1].verificationNote, 'approved_pending_connection');

    // 3. Perform GBP connection
    const binding: AuditLocationBinding = {
      gbpAccountId: 'accounts/123456789',
      gbpLocationId: 'locations/987654321',
      connectedAt: new Date().toISOString(),
      connectionMethod: 'oauth_direct',
    };

    const result = await connectAuditGbpLocation(auditId, binding, tmpDir);
    assert.equal(result.success, true);
    assert.equal(result.queuedItemsCount, 2);

    // 4. Verify audit record is bound
    const updatedAudit = await readAuditRecord(auditId, tmpDir);
    assert.ok(updatedAudit);
    assert.equal(updatedAudit.gbpAccountId, 'accounts/123456789');
    assert.equal(updatedAudit.gbpLocationId, 'locations/987654321');

    // 5. Verify fix log items are transitioned to ready_to_execute
    const updatedLogs = readLog(auditId);
    assert.equal(updatedLogs.length, 4); // 2 initial + 2 updates

    const latestStatuses = updatedLogs.slice(-2);
    assert.equal((latestStatuses[0] as unknown as { status: string }).status, 'ready_to_execute');
    assert.equal((latestStatuses[1] as unknown as { status: string }).status, 'ready_to_execute');
    assert.equal(latestStatuses[0].verificationNote, 'gbp_connected');
    assert.equal(latestStatuses[1].verificationNote, 'gbp_connected');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
  }
});
