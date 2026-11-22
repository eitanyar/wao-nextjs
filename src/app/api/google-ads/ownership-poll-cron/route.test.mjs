import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Ownership poll cron (mission item 4): CRON_SECRET bearer auth, DISABLED unless GOOGLE_ADS_OWNERSHIP_POLL_ENABLED is
// exactly 'true' (no import of the poll module, no Google call); enabled = one poll per ownership client.

const file = path.join(process.cwd(), 'src/app/api/google-ads/ownership-poll-cron/route.ts');

function load(env, polled) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    process: { env },
    require: name => {
      if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === '@/lib/google-ads/ownership') {
        polled.imported = true;
        return {
          listOwnershipClientIds: () => ['pilot-a', 'pilot-b'],
          pollClientOwnership: async id => { polled.ids.push(id); return id === 'pilot-a' ? { ok: true, errors: {} } : { ok: true, errors: { billing: 'x' } }; },
        };
      }
      throw new Error(`unexpected import ${name}`);
    },
  }, { filename: file });
  return exports;
}

async function post(env, auth) {
  const polled = { imported: false, ids: [] };
  const res = await load(env, polled).POST(new Request('https://example.invalid/cron', { method: 'POST', headers: auth ? { authorization: auth } : {} }));
  return { status: res.status, body: await res.json(), polled };
}

test('no CRON_SECRET or a wrong bearer -> 401', async () => {
  assert.equal((await post({}, 'Bearer x')).status, 401);
  assert.equal((await post({ CRON_SECRET: 's3cret' }, 'Bearer nope')).status, 401);
  assert.equal((await post({ CRON_SECRET: 's3cret' })).status, 401);
});

test('disabled by default: authorized but no flag -> status disabled, the poll module is never loaded', async () => {
  for (const env of [{ CRON_SECRET: 's3cret' }, { CRON_SECRET: 's3cret', GOOGLE_ADS_OWNERSHIP_POLL_ENABLED: '1' }, { CRON_SECRET: 's3cret', GOOGLE_ADS_OWNERSHIP_POLL_ENABLED: 'false' }]) {
    const res = await post(env, 'Bearer s3cret');
    assert.deepEqual({ status: res.status, body: res.body }, { status: 200, body: { success: true, status: 'disabled', reason: 'ownership_poll_disabled' } });
    assert.equal(res.polled.imported, false);
  }
});

test('enabled: polls every ownership client once and reports per-client errors', async () => {
  const res = await post({ CRON_SECRET: 's3cret', GOOGLE_ADS_OWNERSHIP_POLL_ENABLED: 'true' }, 'Bearer s3cret');
  assert.equal(res.status, 200);
  assert.deepEqual(res.polled.ids, ['pilot-a', 'pilot-b']);
  assert.deepEqual(res.body, {
    success: true, status: 'ran', polled: 2,
    results: [{ clientId: 'pilot-a', ok: true, errors: [] }, { clientId: 'pilot-b', ok: true, errors: ['billing'] }],
  });
});
