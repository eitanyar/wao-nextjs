import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('audit page excludes grid, paid, outbound, and mutation reachability', () => {
  const source = read('src/app/(app)/site-bot/audit/page.tsx');
  for (const forbidden of ['grid-scan', 'GeoGridVisualizer', 'ScorecardShareSection', '/site-bot/start', '/site-bot/pay', '/site-bot/generate', '/site-bot/deploy', 'phoneInput', 'handleShare', 'CTA_SHARE']) {
    assert.equal(source.includes(forbidden), false, `unexpected audit-page seam: ${forbidden}`);
  }
  assert.match(source, /AUDIT_DISCLOSURE/);
  assert.match(source, /href="\/privacy"/);
  assert.match(source, /href="\/contact#contact-form"/);
});

test('cookie banner suppresses the audit conversion route', () => {
  const source = read('src/components/CookieBanner.tsx');
  assert.match(source, /"\/site-bot\/audit"/);
});

test('lookup minimizes provider records, rejects phone input, and logs bounded codes', () => {
  const source = read('src/app/api/site-bot/audit-lookup/route.ts');
  for (const forbidden of ['normalizePhone', 'persistAudit', 'nationalPhoneNumber:', 'websiteUri:', 'editorialSummary:', 'location:', 'console.error(\'audit-lookup error:\'']) {
    assert.equal(source.includes(forbidden), false, `unexpected lookup seam: ${forbidden}`);
  }
  assert.match(source, /body\?\.phone/);
  assert.match(source, /AUDIT_LOOKUP_FAILED/);
  assert.match(source, /writeAuditRecord/);
});

test('result route redacts full provider records and uses the audit store', () => {
  const source = read('src/app/api/site-bot/audit-result/route.ts');
  for (const forbidden of ['withPlace', 'googleMapsUri', 'primaryCategory', 'nationalPhoneNumber', 'internationalPhoneNumber', 'fs.readFileSync', 'path.join']) {
    assert.equal(source.includes(forbidden), false, `unexpected result seam: ${forbidden}`);
  }
  assert.match(source, /readAuditRecord/);
  assert.match(source, /AUDIT_RESULT_FAILED/);
});

test('audit store stays within UUID JSON records and enforces expiry', () => {
  const source = read('src/lib/site-bot/auditStore.ts');
  for (const required of ['isAuditExpired', 'deleteAuditRecord', 'purgeExpiredAuditRecords', 'AUDIT_RETENTION_MS', 'fs.lstatSync']) {
    assert.match(source, new RegExp(required));
  }
  assert.equal(source.includes('data/clients'), false);
});
