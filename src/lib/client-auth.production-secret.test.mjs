import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'client-auth.ts'), 'utf8');

test('refuses the development fallback secret in production', () => {
  assert.match(source, /process\.env\.NODE_ENV === 'production'/);
  assert.match(source, /CLIENT_PORTAL_SECRET must be configured in production/);
});
