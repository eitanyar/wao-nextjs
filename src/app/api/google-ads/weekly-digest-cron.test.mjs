import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.join(baseDir, 'weekly-digest-cron/route.ts');
const routeCode = fs.readFileSync(routePath, 'utf8');

test('weekly-digest-cron route retains the Bearer CRON_SECRET authorization gate', () => {
  assert.match(routeCode, /authorization/);
  assert.match(routeCode, /Bearer/);
  assert.match(routeCode, /CRON_SECRET/);
});

test('weekly-digest-cron route no longer uses the old x-cron-secret header convention', () => {
  assert.doesNotMatch(routeCode, /x-cron-secret/);
});

test('weekly-digest-cron route returns the explicit disabled no-send contract', () => {
  assert.match(routeCode, /success:\s*true/);
  assert.match(routeCode, /status:\s*'disabled'/);
  assert.match(routeCode, /delivery:\s*'not_sent'/);
  assert.match(routeCode, /reason:\s*'weekly_resend_digest_disabled'/);
  assert.match(routeCode, /Unauthorized/);
  assert.match(routeCode, /status:\s*401/);
});

test('weekly-digest-cron route has no digest, sender, provider, or delivery-result path', () => {
  assert.doesNotMatch(routeCode, /buildAllClientDigests/);
  assert.doesNotMatch(routeCode, /sendGoogleAdsWeeklyDigestEmail/);
  assert.doesNotMatch(routeCode, /fetch\s*\(/);
  assert.doesNotMatch(routeCode, /email_failed/);
  assert.doesNotMatch(routeCode, /status:\s*['"]sent['"]/);
});
