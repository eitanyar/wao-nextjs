import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const batchPath = path.join(baseDir, 'weekly-digest-batch.ts');
const batchCode = fs.readFileSync(batchPath, 'utf8');

const enumerationPath = path.join(baseDir, 'campaign-enumeration.ts');
const enumerationCode = fs.readFileSync(enumerationPath, 'utf8');

const whatsappPath = path.join(baseDir, 'whatsapp-digest.ts');
const whatsappCode = fs.existsSync(whatsappPath) ? fs.readFileSync(whatsappPath, 'utf8') : '';

test('weekly-digest-batch.ts provides listGoogleAdsBoundClientIds and buildAllClientDigests, enumerating per §8.3', () => {
  assert.match(batchCode, /export function listGoogleAdsBoundClientIds/);
  assert.match(batchCode, /export async function buildAllClientDigests/);
  assert.match(batchCode, /loadClientGoogleAdsIndex/);
  assert.match(batchCode, /loadCampaignConfigBySlug/);
  assert.match(batchCode, /buildWeeklyDigest/);
  // §8.3 — must enumerate every enabled campaign under the client's live customerId, not read
  // a single `index.primaryCampaignId`.
  assert.match(batchCode, /enumerateEnabledCampaigns/);
  assert.match(batchCode, /index\.primaryCustomerId/);
  // §8.3 point 3 — one digest per campaign, plus a labeled roll-up, not one blended digest.
  assert.match(batchCode, /digests:\s*CampaignDigest\[\]/);
  // §8.5 — the blended figure must be display-only; computed via the dedicated helper rather
  // than inline math, so it can never accidentally be threaded into a gate.
  assert.match(batchCode, /computeBlendedCplDisplay/);
});

test('campaign-enumeration.ts pulls metrics.all_conversions, not metrics.conversions (§8.4)', () => {
  assert.match(enumerationCode, /metrics\.all_conversions/);
  // The GAQL SELECT clause itself must never select the plain `metrics.conversions` field
  // (a doc comment is allowed to name it for contrast, e.g. "not `metrics.conversions`" —
  // that's documentation, not a live field selection, so this checks the SELECT block only).
  const selectBlock = enumerationCode.match(/SELECT[\s\S]*?FROM campaign/)?.[0] ?? '';
  assert.doesNotMatch(selectBlock, /metrics\.conversions\b(?!\w)/);
  assert.match(selectBlock, /metrics\.all_conversions/);
  assert.match(enumerationCode, /campaign\.status = 'ENABLED'/);
});

test('whatsapp-digest.ts provides composeWeeklyDigestWhatsAppMessage and buildWeeklyDigestWhatsAppLink', () => {
  assert.match(whatsappCode, /export function composeWeeklyDigestWhatsAppMessage/);
  assert.match(whatsappCode, /export function buildWeeklyDigestWhatsAppLink/);
  assert.match(whatsappCode, /buildWaLink/);
});
