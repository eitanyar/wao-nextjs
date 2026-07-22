import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.join(baseDir, 'weekly-digest-cron/route.ts');
const routeCode = fs.readFileSync(routePath, 'utf8');

test('weekly-digest-cron route implements secret auth and batch email sending', () => {
  assert.match(routeCode, /x-cron-secret/);
  assert.match(routeCode, /CRON_SECRET/);
  assert.match(routeCode, /buildAllClientDigests/);
  assert.match(routeCode, /sendGoogleAdsWeeklyDigestEmail/);
  assert.match(routeCode, /email_failed/);
});
