import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { appendEntry, readLog, makeEntryId, type ApprovalEntry } from './fixLog';

test('fixLog round-trip and persistence in data/audit-logs', () => {
  const auditId = `test-audit-${Date.now()}`;
  const dir = path.join(process.cwd(), 'data', 'audit-logs', auditId);

  try {
    const entryId = makeEntryId(auditId);
    const entry: ApprovalEntry = {
      entryId,
      clientId: auditId,
      actionId: 'categories-fix',
      actionType: 'mixed',
      targetUrl: `site-bot/fix/${auditId}`,
      contentSnippet: 'categories-fix',
      tier: 'managed',
      approvedBy: 'owner-self-serve',
      approvedAt: new Date().toISOString(),
      verificationResult: 'pending',
      verificationNote: 'approved_pending_connection',
      fixAttempts: 0,
    };

    appendEntry(entry);

    const entries = readLog(auditId);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].entryId, entryId);
    assert.equal(entries[0].clientId, auditId);
    assert.equal(entries[0].actionId, 'categories-fix');
    assert.equal(entries[0].verificationNote, 'approved_pending_connection');
    assert.equal(entries[0].approvedBy, 'owner-self-serve');

    const logFile = path.join(dir, 'log.jsonl');
    assert.equal(fs.existsSync(logFile), true);
  } finally {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});
