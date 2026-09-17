import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(apiDir, '..', '..', '..', '..');
const routePath = path.join(root, 'src/app/api/site-bot/deploy/route.ts');

function readRoute() {
  return fs.readFileSync(routePath, 'utf8');
}

function assertFirstTimeClientAuthBridge(source) {
  const provision = "const auth = await provisionClientAuth(slug, bootstrapPin, undefined, { mustChangePin: true });";
  const token = "const token = await createSessionToken(slug, { sessionVersion: auth.sessionVersion, scope: 'change-pin' });";

  assert.match(source, /import \{ randomInt \} from 'node:crypto';/, 'imports randomInt for bootstrap PIN generation');
  assert.match(source, /import \{ provisionClientAuth \} from '@\/lib\/client-auth-store';/, 'imports the client-auth provisioner');
  assert.match(source, /import \{ createSessionToken, COOKIE_NAME \} from '@\/lib\/client-auth';/, 'imports the session-token helper');

  const firstTimeBlock = source.match(/if \(isFirstTimeRecord\) \{([\s\S]*?)\n\s*\}/);
  assert.ok(firstTimeBlock, 'retains a first-time client-record branch');
  const block = firstTimeBlock[1];

  assert.match(block, /const bootstrapPin = String\(randomInt\(100000, 1_000_000\)\);/, 'creates a six-digit bootstrap PIN with randomInt');
  assert.ok(block.includes(provision), 'provisions mandatory PIN-change authentication');
  assert.ok(block.includes(token), 'mints only a current-version change-pin token');
  assert.ok(block.indexOf(provision) < block.indexOf(token), 'provisions authentication before minting the token');
  assert.doesNotMatch(source, /createSessionToken\(\s*slug\s*\)/, 'rejects every obsolete one-argument token call');
}

test('first Site Bot deployment provisions scoped client authentication', () => {
  const source = readRoute();
  const provision = "const auth = await provisionClientAuth(slug, bootstrapPin, undefined, { mustChangePin: true });";
  const token = "const token = await createSessionToken(slug, { sessionVersion: auth.sessionVersion, scope: 'change-pin' });";

  assertFirstTimeClientAuthBridge(source);

  const mutations = [
    source.replace("import { randomInt } from 'node:crypto';\n", ''),
    source.replace("import { provisionClientAuth } from '@/lib/client-auth-store';\n", ''),
    source.replace('randomInt(100000, 1_000_000)', 'randomInt(10000, 100000)'),
    source.replace(provision, 'const auth = await provisionClientAuth(slug, bootstrapPin);'),
    source.replace(token, 'const token = await createSessionToken(slug);'),
    source.replace('auth.sessionVersion', '1'),
    source.replace("scope: 'change-pin'", "scope: 'full'"),
    source.replace(provision, '__PROVISION__').replace(token, `${token}\n        ${provision}`).replace('__PROVISION__\n        ', ''),
  ];
  for (const mutation of mutations) assert.throws(() => assertFirstTimeClientAuthBridge(mutation));
});
