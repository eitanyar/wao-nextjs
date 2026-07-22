import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const batchPath = path.join(baseDir, 'weekly-digest-batch.ts');
const batchCode = fs.readFileSync(batchPath, 'utf8');

const whatsappPath = path.join(baseDir, 'whatsapp-digest.ts');
const whatsappCode = fs.existsSync(whatsappPath) ? fs.readFileSync(whatsappPath, 'utf8') : '';

test('weekly-digest-batch.ts provides listGoogleAdsBoundClientIds and buildAllClientDigests', () => {
  assert.match(batchCode, /export function listGoogleAdsBoundClientIds/);
  assert.match(batchCode, /export function buildAllClientDigests/);
  assert.match(batchCode, /loadClientGoogleAdsIndex/);
  assert.match(batchCode, /loadCampaignConfigBySlug/);
  assert.match(batchCode, /buildWeeklyDigest/);
});

test('whatsapp-digest.ts provides composeWeeklyDigestWhatsAppMessage and buildWeeklyDigestWhatsAppLink', () => {
  assert.match(whatsappCode, /export function composeWeeklyDigestWhatsAppMessage/);
  assert.match(whatsappCode, /export function buildWeeklyDigestWhatsAppLink/);
  assert.match(whatsappCode, /buildWaLink/);
});
