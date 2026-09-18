import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  bindAuditLocation,
  deleteAuditRecord,
  purgeExpiredAuditRecords,
  readAuditRecord,
  writeAuditRecord,
  type AuditLocationBinding,
} from './auditStore';

const auditId = '12345678-1234-4234-8234-123456789abc';
const candidate = {
  placeId: 'fixture-place',
  displayName: 'Fixture Business',
  formattedAddress: '1 Test Street',
  types: ['plumber'],
  hasRegularOpeningHours: true,
  hasSpecialOpeningHours: true,
  hasPhone: true,
  hasWebsite: true,
  photosFetched: true,
  photoCount: 1,
  hasRating: true,
  userRatingCount: 10,
  hasEditorialSummary: true,
};

async function withTempStore(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auditStore-test-'));
  try {
    await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('writeAuditRecord assigns a 30-day expiry and readAuditRecord returns the minimized record', async () => {
  await withTempStore(async (dir) => {
    const now = new Date('2026-09-15T00:00:00Z');
    assert.equal(await writeAuditRecord(auditId, {
      query: { businessName: 'Fixture Business' }, fetchedAt: now.toISOString(), candidates: [candidate],
    }, dir, now), true);
    const record = await readAuditRecord(auditId, dir, now);
    assert.ok(record);
    assert.equal(record.expiresAt, '2026-10-15T00:00:00.000Z');
    assert.deepEqual(record.candidates, [candidate]);
  });
});

test('expired audit records fail closed and are removed on read', async () => {
  await withTempStore(async (dir) => {
    assert.equal(await writeAuditRecord(auditId, {
      query: { businessName: 'Fixture Business' }, fetchedAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-01-02T00:00:00Z', candidates: [candidate],
    }, dir), true);
    assert.equal(await readAuditRecord(auditId, dir, new Date('2026-01-02T00:00:00Z')), null);
    assert.equal(fs.existsSync(path.join(dir, `${auditId}.json`)), false);
  });
});

test('purge only removes expired UUID JSON records and ignores symlinks and non-audit files', async () => {
  await withTempStore(async (dir) => {
    const expiredId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const activeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    for (const [id, expiresAt] of [[expiredId, '2026-01-01T00:00:00Z'], [activeId, '2027-01-01T00:00:00Z']] as const) {
      assert.equal(await writeAuditRecord(id, {
        query: { businessName: 'Fixture Business' }, fetchedAt: '2025-12-01T00:00:00Z', expiresAt, candidates: [candidate],
      }, dir), true);
    }
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'keep');
    fs.symlinkSync(path.join(dir, `${activeId}.json`), path.join(dir, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc.json'));
    assert.equal(await purgeExpiredAuditRecords(dir, new Date('2026-02-01T00:00:00Z')), 1);
    assert.equal(fs.existsSync(path.join(dir, `${expiredId}.json`)), false);
    assert.equal(fs.existsSync(path.join(dir, `${activeId}.json`)), true);
    assert.equal(fs.existsSync(path.join(dir, 'notes.txt')), true);
    assert.equal(fs.lstatSync(path.join(dir, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc.json')).isSymbolicLink(), true);
  });
});

test('invalid, traversal, malformed, and symlinked records fail closed', async () => {
  await withTempStore(async (dir) => {
    assert.equal(await readAuditRecord('../outside', dir), null);
    fs.writeFileSync(path.join(dir, `${auditId}.json`), '{not-json');
    assert.equal(await readAuditRecord(auditId, dir), null);
    fs.unlinkSync(path.join(dir, `${auditId}.json`));
    fs.symlinkSync(path.join(dir, 'missing.json'), path.join(dir, `${auditId}.json`));
    assert.equal(await readAuditRecord(auditId, dir), null);
    assert.equal(await deleteAuditRecord(auditId, dir), false);
  });
});

test('bindAuditLocation attaches location binding and preserves existing data', async () => {
  await withTempStore(async (dir) => {
    assert.equal(await writeAuditRecord(auditId, {
      query: { businessName: 'Test Business' }, fetchedAt: '2026-08-25T10:00:00Z', candidates: [candidate],
    }, dir), true);
    const binding: AuditLocationBinding = {
      gbpAccountId: 'accounts/123456', gbpLocationId: 'locations/789012', connectedAt: '2026-08-25T11:00:00Z',
      connectedByEmail: 'owner@example.com', connectionMethod: 'oauth_direct',
    };
    assert.equal(await bindAuditLocation(auditId, binding, dir), true);
    const record = await readAuditRecord(auditId, dir);
    assert.ok(record);
    assert.equal(record.gbpAccountId, binding.gbpAccountId);
    assert.equal(record.connection?.connectionMethod, 'oauth_direct');
  });
});
