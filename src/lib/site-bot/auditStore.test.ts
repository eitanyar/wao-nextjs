import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  bindAuditLocation,
  readAuditRecord,
  writeAuditRecord,
  type AuditLocationBinding,
} from './auditStore';

test('bindAuditLocation attaches location binding and preserves existing data', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auditStore-test-'));
  const auditId = '12345678-1234-4234-8234-123456789abc';

  try {
    const initialData = {
      auditId,
      query: { businessName: 'Test Business' },
      fetchedAt: '2026-08-25T10:00:00Z',
      candidates: [
        {
          placeId: 'ChIJ123',
          displayName: 'Test Business',
        },
      ],
    };

    const written = await writeAuditRecord(auditId, initialData, tmpDir);
    assert.equal(written, true);

    const binding: AuditLocationBinding = {
      gbpAccountId: 'accounts/123456',
      gbpLocationId: 'locations/789012',
      connectedAt: '2026-08-25T11:00:00Z',
      connectedByEmail: 'owner@example.com',
      connectionMethod: 'oauth_direct',
    };

    const success = await bindAuditLocation(auditId, binding, tmpDir);
    assert.equal(success, true);

    const record = await readAuditRecord(auditId, tmpDir);
    assert.ok(record);
    assert.equal(record.auditId, auditId);
    assert.equal(record.gbpAccountId, 'accounts/123456');
    assert.equal(record.gbpLocationId, 'locations/789012');
    assert.deepEqual(record.query, { businessName: 'Test Business' });
    assert.equal(Array.isArray(record.candidates), true);

    const conn = record.connection as AuditLocationBinding;
    assert.ok(conn);
    assert.equal(conn.gbpAccountId, 'accounts/123456');
    assert.equal(conn.gbpLocationId, 'locations/789012');
    assert.equal(conn.connectedAt, '2026-08-25T11:00:00Z');
    assert.equal(conn.connectedByEmail, 'owner@example.com');
    assert.equal(conn.connectionMethod, 'oauth_direct');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('bindAuditLocation returns false for non-existent audit or invalid UUID', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auditStore-test-'));

  try {
    const binding: AuditLocationBinding = {
      gbpAccountId: 'accounts/123',
      gbpLocationId: 'locations/456',
      connectedAt: '2026-08-25T11:00:00Z',
      connectionMethod: 'manager_invite',
    };

    const invalidUuidResult = await bindAuditLocation('invalid-uuid', binding, tmpDir);
    assert.equal(invalidUuidResult, false);

    const nonExistentUuid = '99999999-9999-4999-8999-999999999999';
    const nonExistentResult = await bindAuditLocation(nonExistentUuid, binding, tmpDir);
    assert.equal(nonExistentResult, false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
