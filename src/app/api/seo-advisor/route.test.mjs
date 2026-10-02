import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/seo-advisor/route.ts'), 'utf8');

function jsonArguments(source) {
  const regions = [];
  const marker = 'NextResponse.json(';
  let position = 0;
  while ((position = source.indexOf(marker, position)) !== -1) {
    let depth = 1;
    let index = position + marker.length;
    const start = index;
    for (; index < source.length && depth; index += 1) {
      if (source[index] === '(') depth += 1;
      if (source[index] === ')') depth -= 1;
    }
    assert.equal(depth, 0, 'JSON response call must be balanced');
    regions.push(source.slice(start, index - 1));
    position = index;
  }
  return regions;
}

test('route exposes only dynamic node GET and POST handlers', () => {
  assert.match(route, /export const runtime = 'nodejs'/);
  assert.match(route, /export const dynamic = 'force-dynamic'/);
  assert.match(route, /export async function GET\(request: Request\)/);
  assert.match(route, /export async function POST\(request: Request\)/);
});

test('seven env keys only and ARMED precedes all work', () => {
  const keys = [...new Set(route.match(/WAO_PUBLIC_SEO_[A-Z_]+/g) ?? [])].sort();
  assert.deepEqual(keys, [
    'WAO_PUBLIC_SEO_ARMED', 'WAO_PUBLIC_SEO_DAILY_CEILING', 'WAO_PUBLIC_SEO_DB_PATH',
    'WAO_PUBLIC_SEO_EXECUTOR', 'WAO_PUBLIC_SEO_OPENSEO_ORIGIN',
    'WAO_PUBLIC_SEO_PROJECT_ID', 'WAO_PUBLIC_SEO_SECRET',
  ]);
  const armed = route.indexOf("process.env.WAO_PUBLIC_SEO_ARMED !== '1'");
  assert.ok(armed >= 0);
  for (const invocation of ['checkRateLimit(', 'handlePublicSeoEvent(', 'startPublicSeoSession(', 'openPublicSeoBudgetStore(']) {
    assert.ok(armed < route.indexOf(invocation), `${invocation} must follow ARMED check`);
  }
  for (const handler of ['GET', 'POST']) {
    assert.match(route, new RegExp(`export async function ${handler}\\(request: Request\\) \\{\\s*const config = readConfig\\(\\);\\s*if \\(!config\\) return NextResponse.json\\(\\{ error: 'unavailable' \\}, \\{ status: 503 \\}\\);`));
  }
  assert.match(route, /Number\.isSafeInteger\(dailyCeiling\).*dailyCeiling < 300/);
  assert.match(route, /dbPath\?\.startsWith\('\/'\)/);
});

test('route has no direct provider, network, or metered tool coupling', () => {
  for (const forbidden of [
    'openSeoMcp', 'createOpenSeoMcpClient', '@modelcontextprotocol', 'runOpenSeoResearch',
    'runAdvisorPanel', 'DATAFORSEO', 'await fetch(', 'http://', 'https://',
    'get_domain_overview', 'callAllowedOpenSeoTool',
  ]) assert.equal(route.includes(forbidden), false, forbidden);
  assert.match(route, /const disabledExecutor: PublicSeoExecutor = async \(\) => \{\s*throw new Error\('public_seo_executor_not_wired'\)/);
  assert.match(route, /: disabledExecutor/);
  assert.equal((route.match(/executor:/g) ?? []).length, 1);
});

test('JSON response arguments expose only whitelisted fields', () => {
  assert.equal(route.includes('result.session'), false);
  assert.equal(route.includes('JSON.stringify(session'), false);
  const regions = jsonArguments(route);
  assert.ok(regions.length > 0);
  for (const region of regions) {
    assert.doesNotMatch(region, /\bsecret\b/);
    const firstObject = region.match(/^\s*\{([^{}]*)\}/s);
    assert.ok(firstObject, 'response must start with an explicit object literal');
    for (const field of firstObject[1].split(',').map(item => item.trim().split(':')[0].trim())) {
      assert.ok(['token', 'utterances', 'error', 'retryAfterMs'].includes(field), `unexpected JSON field: ${field}`);
    }
  }
});

test('client IP, rate-limit header, and result statuses are explicit', () => {
  assert.match(route, /request\.headers\.get\('x-forwarded-for'\)\?\.split\(','\)\[0\]\?\.trim\(\) \?\? 'unknown'/);
  assert.match(route, /checkRateLimit\(`public-seo:\$\{clientKey\(request\)\}`, PUBLIC_SEO_RATE_LIMIT\)/);
  assert.match(route, /'Retry-After': String\(Math\.ceil\(retryAfterMs \/ 1000\)\)/);
  for (const [status, code] of [['ok', 200], ['invalid_token', 400], ['unavailable', 503]]) {
    assert.match(route, new RegExp(`case '${status}':[\\s\\S]*?status: ${code}`));
  }
  assert.match(route, /case 'rate_limited':\s*return rateLimited\(result\.retryAfterMs\)/);
  assert.match(route, /status: 429/);
  assert.match(route, /rateLimited\(limit\.retryAfterMs\)/);
  assert.match(route, /rateLimited\(result\.retryAfterMs\)/);
  assert.match(route, /!body \|\| typeof body !== 'object' \|\| Array\.isArray\(body\)/);
});

test('budget store is closed in finally after the service call', () => {
  assert.match(route, /const store = openPublicSeoBudgetStore\(\{ dbPath: config\.dbPath \}\)/);
  assert.match(route, /const result = await handlePublicSeoEvent\(/);
  assert.match(route, /\} finally \{\s*closePublicSeoBudgetStore\(store\)/);
});

test('route imports exactly the sanctioned modules', () => {
  const imports = [...route.matchAll(/import(?:\s+type)?\s+[^;]+?\s+from\s+['"]([^'"]+)['"]/g)].map(match => match[1]).sort();
  assert.deepEqual(imports, [
    '@/lib/payments/rate-limit', '@/lib/seo-advisor-public-budget',
    '@/lib/seo-advisor-public-orchestrator', '@/lib/seo-advisor-public-executor', '@/lib/seo-advisor-public-service',
    '@/lib/seo-advisor-public-session', 'next/server',
  ].sort());
  assert.match(route, /import type \{ PublicSeoExecutor \} from '@\/lib\/seo-advisor-public-orchestrator'/);
});

function loadedRoute(env) {
  const calls = { factory: 0, handled: 0 };
  const exports = {};
  const output = ts.transpileModule(route, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options.status }) } },
    '@/lib/seo-advisor-public-service': { PUBLIC_SEO_RATE_LIMIT: { maxRequests: 12, windowMs: 60000 },
      handlePublicSeoEvent: async ({ executor }) => {
        calls.handled += 1;
        calls.executor = executor;
        return { status: 'unavailable' };
      } },
    '@/lib/seo-advisor-public-session': { startPublicSeoSession: () => { throw Error('unexpected session'); } },
    '@/lib/seo-advisor-public-budget': { openPublicSeoBudgetStore: () => ({}), closePublicSeoBudgetStore: () => {} },
    '@/lib/seo-advisor-public-executor': { createPublicSeoOpenSeoExecutor: options => {
      calls.factory += 1;
      calls.options = options;
      return async () => ({ organicTraffic: null, organicKeywords: null, retrievedAt: new Date().toISOString() });
    } },
    '@/lib/payments/rate-limit': { checkRateLimit: () => ({ allowed: true }) },
  };
  vm.runInNewContext(output, { exports, process: { env }, URL, require: name => {
    assert.ok(Object.hasOwn(dependencies, name), `unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return { route: exports, calls };
}

const configured = { WAO_PUBLIC_SEO_ARMED: '1', WAO_PUBLIC_SEO_SECRET: 'test-secret',
  WAO_PUBLIC_SEO_DAILY_CEILING: '300', WAO_PUBLIC_SEO_PROJECT_ID: 'project-test',
  WAO_PUBLIC_SEO_DB_PATH: '/offline/test.db' };
const request = () => ({ json: async () => ({ token: 'test', event: { type: 'run' } }), headers: { get: () => null } });

test('absent executor flag retains throwing disabled executor on POST', async () => {
  const instance = loadedRoute(configured);
  assert.ok(instance.route.readConfig());
  assert.equal((await instance.route.POST(request())).status, 503);
  assert.equal(instance.calls.factory, 0);
  assert.equal(instance.calls.handled, 1);
  await assert.rejects(instance.calls.executor({}), { message: 'public_seo_executor_not_wired' });
});

test('openseo with loopback origin selects the real executor only on POST', async () => {
  for (const origin of ['http://127.0.0.1:3001', 'http://localhost:3001', 'http://[::1]:3001']) {
    const instance = loadedRoute({ ...configured, WAO_PUBLIC_SEO_EXECUTOR: 'openseo',
      WAO_PUBLIC_SEO_OPENSEO_ORIGIN: origin });
    assert.ok(instance.route.readConfig());
    assert.equal(instance.calls.factory, 0);
    assert.equal((await instance.route.POST(request())).status, 503);
    assert.equal(instance.calls.factory, 1);
    assert.equal(instance.calls.options.projectId, 'project-test');
    assert.equal(instance.calls.options.origin, origin);
  }
});

test('missing, unsafe or malformed origins fail closed before constructing executor', async () => {
  for (const origin of [undefined, 'https://127.0.0.1:3001', 'http://example.com', 'bad-url',
    'http://user@127.0.0.1:3001', 'http://127.0.0.1:3001/evil']) {
    const instance = loadedRoute({ ...configured, WAO_PUBLIC_SEO_EXECUTOR: 'openseo',
      WAO_PUBLIC_SEO_OPENSEO_ORIGIN: origin });
    assert.equal(instance.route.readConfig(), null);
    assert.deepEqual(JSON.parse(JSON.stringify(await instance.route.POST(request()))),
      { body: { error: 'unavailable' }, status: 503 });
    assert.equal(instance.calls.factory, 0);
  }
});

test('ARMED-off returns unavailable regardless of executor flag', async () => {
  const instance = loadedRoute({ ...configured, WAO_PUBLIC_SEO_ARMED: '0',
    WAO_PUBLIC_SEO_EXECUTOR: 'openseo', WAO_PUBLIC_SEO_OPENSEO_ORIGIN: 'http://127.0.0.1:3001' });
  assert.equal(instance.route.readConfig(), null);
  assert.equal((await instance.route.POST(request())).status, 503);
  assert.equal((await instance.route.GET(request())).status, 503);
  assert.equal(instance.calls.factory, 0);
});
