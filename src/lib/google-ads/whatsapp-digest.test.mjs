import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const whatsappPath = path.join(baseDir, 'whatsapp-digest.ts');
const whatsappCode = fs.readFileSync(whatsappPath, 'utf8');

test('whatsapp-digest.ts provides composeWeeklyDigestWhatsAppMessage and buildWeeklyDigestWhatsAppLink', () => {
  assert.match(whatsappCode, /export function composeWeeklyDigestWhatsAppMessage/);
  assert.match(whatsappCode, /export function buildWeeklyDigestWhatsAppLink/);
});
