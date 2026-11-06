import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const routePath = path.join(process.cwd(), 'src/app/api/site-bot/re-audit/route.ts');
const auditId = '123e4567-e89b-42d3-a456-426614174000';
const auditPath = `/synthetic-root/data/audits/${auditId}.json`;
const baseline = { auditId, query: { businessName: 'Synthetic Shop', phone: '000' }, place: { displayName: 'Synthetic Shop', userRatingCount: 2 } };
const place = { placeId: 'synthetic-place', displayName: 'Synthetic Shop', userRatingCount: 3 };
const report = { auditId, scoreDelta: 1 };
const success = { status: 200, body: { success: true, driftReport: report } };

function routeHarness({ secret = 'synthetic-secret', exists = true, raw = JSON.stringify(baseline),
  placesKey = false, candidates = [place], throwAt = null } = {}) {
  const calls = [];
  const errors = [];
  const unexpected = [];
  const saved = [];
  const deny = label => { unexpected.push(label); throw new Error(`unexpected ${label}`); };
  const fail = step => { if (throwAt === step) throw new Error(`synthetic ${step} error`); };
  const imports = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    fs: new Proxy({
      existsSync: file => { calls.push('exists'); assert.equal(file, auditPath); fail('exists'); return exists; },
      readFileSync: (file, encoding) => {
        calls.push('read'); assert.equal(file, auditPath); assert.equal(encoding, 'utf8'); fail('read'); return raw;
      },
    }, { get: (target, name) => name === '__esModule' ? false : Object.hasOwn(target, name) ? target[name] : deny(`filesystem operation: ${String(name)}`) }),
    path: { join: (...parts) => {
      calls.push('join');
      const result = path.posix.join(...parts);
      assert.ok(result === '/synthetic-root/data/audits' || result === auditPath, `unexpected path: ${result}`);
      return result;
    } },
    '@/lib/places/client': {
      hasPlacesKey: () => { calls.push('key'); fail('key'); return placesKey; },
      searchPlacesByName: async query => {
        calls.push('search');
        assert.deepEqual(JSON.parse(JSON.stringify(query)), { name: 'Synthetic Shop', phone: '000' });
        fail('search'); return candidates;
      },
    },
    '@/lib/gbp/auditScore': { scoreAudit: scoredPlace => {
      calls.push('score');
      assert.ok(scoredPlace && typeof scoredPlace === 'object');
      fail('score'); return { passed: 3 };
    } },
    '@/lib/site-bot/driftMonitor': {
      calculateAuditDrift: (base, current) => {
        calls.push('drift');
        assert.deepEqual(JSON.parse(JSON.stringify(base)), JSON.parse(raw));
        assert.equal(current.auditId, auditId);
        fail('drift'); return report;
      },
      saveDriftReport: (id, value) => {
        calls.push('save'); assert.equal(id, auditId); assert.equal(value, report);
        fail('save'); saved.push({ id, value }); return true;
      },
    },
  };
  const code = ts.transpileModule(fs.readFileSync(routePath, 'utf8'), {
    fileName: routePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => Object.hasOwn(imports, name) ? imports[name] : deny(`import: ${name}`),
    process: { cwd: () => '/synthetic-root', env: { CRON_SECRET: secret, NODE_ENV: 'production' } },
    Date,
    fetch: () => deny('network access'),
    console: { error: (...args) => errors.push(args) },
  }, { filename: routePath });
  assert.deepEqual(calls, ['join']);
  calls.length = 0;

  async function post({ body = { auditId }, token = secret, malformed = false } = {}) {
    const req = {
      headers: { get: name => {
        calls.push(`header:${name}`);
        assert.equal(name, 'authorization');
        return token === null ? null : `Bearer ${token}`;
      } },
      json: async () => { calls.push('json'); if (malformed) throw new SyntaxError('synthetic malformed JSON'); return body; },
    };
    const response = await exports.POST(req);
    assert.deepEqual(unexpected, []);
    assert.equal(response.headers.get('cache-control'), 'private, no-store', `POST ${response.status}`);
    return { status: response.status, body: await response.json() };
  }
  return { post, calls, errors, saved };
}

const parsed = ['header:authorization', 'json'];
const loaded = [...parsed, 'join', 'exists', 'read'];

function expectError(h, step) {
  assert.equal(h.errors.length, 1);
  assert.equal(h.errors[0][0], 're-audit error:');
  assert.equal(h.errors[0][1].message, `synthetic ${step} error`);
}

function expectSuccess(h, expectedCalls) {
  assert.deepEqual(h.calls, expectedCalls);
  assert.deepEqual(h.saved, [{ id: auditId, value: report }]);
  assert.deepEqual(h.errors, []);
}

test('re-audit rejects missing or wrong authorization before parsing or filesystem access', async () => {
  for (const secret of ['', 'synthetic-secret']) {
    const h = routeHarness({ secret });
    assert.deepEqual(await h.post({ token: null }), { status: 401, body: { error: 'Unauthorized' } });
    assert.deepEqual(h.calls, secret ? ['header:authorization'] : []);
    assert.deepEqual(h.saved, []); assert.deepEqual(h.errors, []);
  }
  const h = routeHarness();
  assert.deepEqual(await h.post({ token: 'wrong' }), { status: 401, body: { error: 'Unauthorized' } });
  assert.deepEqual(h.calls, ['header:authorization']);
});

test('re-audit rejects malformed JSON and invalid or missing UUID before filesystem access', async () => {
  for (const input of [null, {}, { auditId: 123 }, { auditId: '../escape' }, { auditId: 'invalid' }]) {
    const h = routeHarness();
    assert.deepEqual(await h.post({ body: input }), { status: 400, body: { error: 'invalid_input' } });
    assert.deepEqual(h.calls, parsed); assert.deepEqual(h.saved, []); assert.deepEqual(h.errors, []);
  }
  const malformed = routeHarness();
  assert.deepEqual(await malformed.post({ malformed: true }), { status: 400, body: { error: 'invalid_input' } });
  assert.deepEqual(malformed.calls, parsed);
  const trimmed = routeHarness({ exists: false });
  assert.deepEqual(await trimmed.post({ body: { auditId: ` ${auditId} ` } }), { status: 404, body: { error: 'not_found' } });
  assert.deepEqual(trimmed.calls, [...parsed, 'join', 'exists']);
});

test('re-audit missing, unreadable or malformed baseline returns not_found without Places or drift', async () => {
  for (const [options, expected] of [
    [{ exists: false }, [...parsed, 'join', 'exists']],
    [{ throwAt: 'read' }, loaded],
    [{ raw: '{broken' }, loaded],
  ]) {
    const h = routeHarness(options);
    assert.deepEqual(await h.post(), { status: 404, body: { error: 'not_found' } });
    assert.deepEqual(h.calls, expected); assert.deepEqual(h.saved, []); assert.deepEqual(h.errors, []);
  }
});

test('re-audit Places branch rejects missing business name before search and no candidates after search', async () => {
  const noName = routeHarness({ placesKey: true, raw: JSON.stringify({ auditId }) });
  assert.deepEqual(await noName.post(), { status: 400, body: { error: 'cannot_determine_business_name' } });
  assert.deepEqual(noName.calls, [...loaded, 'key']); assert.deepEqual(noName.saved, []);
  const noCandidates = routeHarness({ placesKey: true, candidates: [] });
  assert.deepEqual(await noCandidates.post(), { status: 404, body: { error: 'place_not_found' } });
  assert.deepEqual(noCandidates.calls, [...loaded, 'key', 'search']); assert.deepEqual(noCandidates.saved, []);
});

test('re-audit without Places key or explicit mock returns 503 without score or persistence', async () => {
  const h = routeHarness();
  assert.deepEqual(await h.post(), { status: 503, body: { error: 'places_not_configured' } });
  assert.deepEqual(h.calls, [...loaded, 'key']); assert.deepEqual(h.saved, []);
});

test('re-audit currentAudit takes precedence over currentPlace and Places, then persists drift', async () => {
  const h = routeHarness({ placesKey: true });
  assert.deepEqual(await h.post({ body: { auditId, currentAudit: { score: 8 }, currentPlace: place } }), success);
  expectSuccess(h, [...loaded, 'drift', 'save']);
});

test('re-audit currentPlace scores without checking Places key and saves after drift calculation', async () => {
  const h = routeHarness({ placesKey: true });
  assert.deepEqual(await h.post({ body: { auditId, currentPlace: place } }), success);
  expectSuccess(h, [...loaded, 'score', 'drift', 'save']);
});

test('re-audit explicit mock uses baseline place offline when no Places key', async () => {
  const h = routeHarness();
  assert.deepEqual(await h.post({ body: { auditId, mock: true } }), success);
  expectSuccess(h, [...loaded, 'key', 'score', 'drift', 'save']);
});

test('re-audit Places candidate is scored and persisted before success, even with mock requested', async () => {
  const h = routeHarness({ placesKey: true });
  assert.deepEqual(await h.post({ body: { auditId, mock: true } }), success);
  expectSuccess(h, [...loaded, 'key', 'search', 'score', 'drift', 'save']);
});

test('re-audit caught adapter failures log and return 500 without later side effects', async () => {
  for (const [throwAt, expected] of [
    ['exists', [...parsed, 'join', 'exists']],
    ['key', [...loaded, 'key']],
    ['search', [...loaded, 'key', 'search']],
    ['score', [...loaded, 'score']],
    ['drift', [...loaded, 'score', 'drift']],
    ['save', [...loaded, 'score', 'drift', 'save']],
  ]) {
    const h = routeHarness({ throwAt, placesKey: throwAt === 'search' });
    const body = ['score', 'drift', 'save'].includes(throwAt) ? { auditId, currentPlace: place } : { auditId };
    assert.deepEqual(await h.post({ body }), { status: 500, body: { error: 'server_error' } });
    assert.deepEqual(h.calls, expected); assert.deepEqual(h.saved, []); expectError(h, throwAt);
  }
});
