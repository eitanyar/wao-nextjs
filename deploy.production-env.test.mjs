import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const deployScript = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'deploy.sh'), 'utf8');

test('loads server-local production environment and rejects missing deployment secrets', () => {
  assert.match(deployScript, /source \.env\.production/);
  assert.match(deployScript, /CLIENT_PORTAL_SECRET must be set/);
  assert.match(deployScript, /NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be set/);
  // Payment-token encryption (src/lib/payments/crypto.ts): without it the checkout callback 500s at activation.
  assert.match(deployScript, /\[\[ -n "\$\{TOKEN_ENCRYPTION_KEY:-\}" \]\] \|\| fail 'TOKEN_ENCRYPTION_KEY must be set\.'/);
  // ...and it is checked right after .env.production is sourced, before any git checkout or build.
  assert.ok(deployScript.indexOf('TOKEN_ENCRYPTION_KEY must be set') > deployScript.indexOf('source .env.production'));
  assert.ok(deployScript.indexOf('TOKEN_ENCRYPTION_KEY must be set') < deployScript.indexOf('git fetch --all --tags'));
  assert.match(deployScript, /validate_server_actions_key/);
  assert.match(deployScript, /NEXT_DEPLOYMENT_ID/);
  assert.match(deployScript, /pm2 stop wao/);
  assert.match(deployScript, /pm2 start .*--name wao --update-env/);
  assert.doesNotMatch(deployScript, /pm2 restart wao-app/);
});
