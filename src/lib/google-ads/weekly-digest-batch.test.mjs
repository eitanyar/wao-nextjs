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

test('campaign-enumeration.ts: the enumeration (reporting) query pulls all_conversions; only the verified-lead query reads metrics.conversions (§8.4, ads-bot-phase2 §3 0f)', () => {
  assert.match(enumerationCode, /metrics\.all_conversions/);
  const selectBlocks = [...enumerationCode.matchAll(/SELECT[\s\S]*?FROM campaign[\s\S]*?`/g)].map((m) => m[0]);
  // §8.4 — the ENABLED-campaign enumeration query (spend + reporting conversions) selects
  // all_conversions and never the plain `metrics.conversions` field.
  const enumerationQuery = selectBlocks.find((q) => /campaign\.status = 'ENABLED'/.test(q)) ?? '';
  assert.ok(enumerationQuery, 'enumeration query not found');
  assert.doesNotMatch(enumerationQuery, /metrics\.conversions\b(?!\w)/);
  assert.match(enumerationQuery, /metrics\.all_conversions/);
  // 0f — the one query allowed to select `metrics.conversions` is the verified-lead count, and
  // it is always filtered to the single verified-lead conversion action.
  const conversionsQueries = selectBlocks.filter((q) => /metrics\.conversions\b(?!\w)/.test(q.split('FROM')[0]));
  assert.equal(conversionsQueries.length, 1);
  assert.match(conversionsQueries[0], /WHERE segments\.conversion_action = '\$\{verifiedLeadConversionResourceName\}'/);
  assert.doesNotMatch(conversionsQueries[0], /all_conversions/);
});

test('weekly-digest-batch.ts: per-campaign digests count verified leads via cplGateConversions (0g); the blended roll-up stays all_conversions (display)', () => {
  assert.match(batchCode, /verifiedLeadConversionResourceName: campaign\.verifiedLeadConversionResourceName/);
  assert.match(batchCode, /cplGateConversions\(c\)/);
  assert.doesNotMatch(batchCode, /conversions: c\.conversions/);
  assert.match(batchCode, /blended: computeBlendedCplDisplay\(enumerated\)/);
});

test('whatsapp-digest.ts provides composeWeeklyDigestWhatsAppMessage and buildWeeklyDigestWhatsAppLink', () => {
  assert.match(whatsappCode, /export function composeWeeklyDigestWhatsAppMessage/);
  assert.match(whatsappCode, /export function buildWeeklyDigestWhatsAppLink/);
  assert.match(whatsappCode, /buildWaLink/);
});
