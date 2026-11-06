#!/usr/bin/env node
// Seeds ONE obviously synthetic confirmed audit record that POST /api/site-bot/help-request
// accepts, or removes it again with --cleanup. Never touches any other audit record.
//   node scripts/sitebot-help-synthetic.mjs            -> seed, prints auditId/placeId JSON
//   node scripts/sitebot-help-synthetic.mjs --cleanup  -> delete the seeded record only
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const auditsDir = path.join(repo, 'data', 'audits'); // same location auditStore.readAuditRecord uses (cwd = repo)
const marker = path.join(os.tmpdir(), `wao-sitebot-help-synthetic-${process.getuid()}.json`);
const DISPLAY_NAME = 'SYNTHETIC QA Business';
const PLACE_ID = 'synthetic-qa-place-not-real';

function seed() {
  if (fs.existsSync(marker)) throw new Error(`marker exists (${marker}); run --cleanup first`);
  const auditId = randomUUID();
  const now = Date.now();
  const record = {
    auditId,
    query: { businessName: DISPLAY_NAME },
    fetchedAt: new Date(now - 60_000).toISOString(),
    expiresAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    candidates: [{ placeId: PLACE_ID, displayName: DISPLAY_NAME, formattedAddress: 'SYNTHETIC QA address', types: ['synthetic'],
      hasRegularOpeningHours: false, hasSpecialOpeningHours: false, hasPhone: false, hasWebsite: false, photosFetched: false,
      photoCount: 0, hasRating: false, hasEditorialSummary: false }],
    synthetic: true,
  };
  fs.mkdirSync(auditsDir, { recursive: true });
  fs.writeFileSync(path.join(auditsDir, `${auditId}.json`), JSON.stringify(record, null, 2), { flag: 'wx', mode: 0o600 });
  fs.writeFileSync(marker, JSON.stringify({ auditId, placeId: PLACE_ID }), { flag: 'wx', mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ auditId, placeId: PLACE_ID, displayName: DISPLAY_NAME })}\n`);
}

function cleanup() {
  if (!fs.existsSync(marker)) { process.stdout.write('nothing to clean\n'); return; }
  const { auditId } = JSON.parse(fs.readFileSync(marker, 'utf8'));
  if (!/^[0-9a-f-]{36}$/.test(auditId)) throw new Error('invalid marker');
  const file = path.join(auditsDir, `${auditId}.json`);
  if (fs.existsSync(file)) {
    const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Refuse to delete anything that is not our synthetic record.
    if (record.synthetic !== true || record.candidates?.[0]?.displayName !== DISPLAY_NAME || record.candidates?.[0]?.placeId !== PLACE_ID) throw new Error('refusing to delete non-synthetic record');
    fs.unlinkSync(file);
  }
  fs.unlinkSync(marker);
  process.stdout.write(`${JSON.stringify({ removed: auditId })}\n`);
}

if (process.argv.includes('--cleanup')) cleanup(); else seed();
