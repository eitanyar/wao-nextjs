import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { resolveGeoActionViewAccess } from './action-access';

const actionId = 'action-123';
const actionPath = `/geo/action/${actionId}`;
const ownerId = 'client-owner';
const otherId = 'client-other';

test('resolveGeoActionViewAccess applies the closed authorization matrix', () => {
  const rows = [
    { name: 'admin without client session', input: { actionExists: true, adminAuthenticated: true, sessionClientId: null, actionClientId: ownerId, actionPath }, expected: { kind: 'render' } },
    { name: 'admin with mismatched client session', input: { actionExists: true, adminAuthenticated: true, sessionClientId: otherId, actionClientId: ownerId, actionPath }, expected: { kind: 'render' } },
    { name: 'matching owner client', input: { actionExists: true, adminAuthenticated: false, sessionClientId: ownerId, actionClientId: ownerId, actionPath }, expected: { kind: 'render' } },
    { name: 'cross-client client', input: { actionExists: true, adminAuthenticated: false, sessionClientId: otherId, actionClientId: ownerId, actionPath }, expected: { kind: 'not-found' } },
    { name: 'missing client session', input: { actionExists: true, adminAuthenticated: false, sessionClientId: null, actionClientId: ownerId, actionPath }, expected: { kind: 'login', nextPath: actionPath } },
    { name: 'missing action', input: { actionExists: false, adminAuthenticated: false, sessionClientId: ownerId, actionClientId: null, actionPath }, expected: { kind: 'not-found' } },
  ] as const;

  for (const row of rows) {
    const decision = resolveGeoActionViewAccess(row.input);
    assert.deepEqual(decision, row.expected, row.name);
    if (row.name === 'cross-client client') {
      assert.equal(JSON.stringify(decision).includes(actionId), false, row.name);
      assert.equal(JSON.stringify(decision).includes('/admin/'), false, row.name);
    }
  }
});

test('GEO action source boundaries retain client ownership enforcement', () => {
  const root = process.cwd();
  const pagePath = path.join(root, 'src/app/(product)/geo/action/[actionId]/page.tsx');
  const pageSource = fs.readFileSync(pagePath, 'utf8');
  assert.match(pageSource, /resolveGeoActionViewAccess/);
  assert.doesNotMatch(pageSource, /\/admin\/login\?next=\/geo\/action/);

  const mutationPaths = [
    'src/app/api/geo/action/[id]/route.ts',
    'src/app/api/geo/action/[id]/done/route.ts',
    'src/app/api/geo/action/[id]/undone/route.ts',
    'src/app/api/geo/action/[id]/mode/route.ts',
  ];

  for (const mutationPath of mutationPaths) {
    const source = fs.readFileSync(path.join(root, mutationPath), 'utf8');
    assert.match(source, /verifySessionToken/);
    assert.match(source, /sessionClientId !== action\.clientId/);
    assert.doesNotMatch(source, /verifyAdminToken|ADMIN_COOKIE_NAME|wao-admin/);
  }
});
