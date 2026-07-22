import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const deployScript = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'deploy.sh'), 'utf8');

test('loads server-local production environment and refuses a missing portal secret', () => {
  assert.match(deployScript, /source \.env\.production/);
  assert.match(deployScript, /CLIENT_PORTAL_SECRET must be set in \.env\.production/);
  assert.match(deployScript, /WAO_RUNTIME_DATA_DIR/);
  assert.match(deployScript, /ln -s "\$WAO_RUNTIME_DATA_DIR" \.next\/standalone\/data/);
  assert.match(deployScript, /pm2 restart wao-app --update-env/);
});
