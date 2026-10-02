import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runAdvisorPanel, ADVISOR_MARKETS } from './seo-advisor-panel';
import type { OpenSeoClient, OpenSeoToolResult, OpenSeoTransport } from './expired-domain-research/openSeoMcp';

function fake(failure = '') {
  const calls: { name: string; arguments: Record<string, unknown> }[] = [];
  const client: OpenSeoClient = {
    async connect() {}, async close() {},
    async listTools() { return { tools: ['research_keywords', 'get_domain_overview', 'get_domain_keyword_suggestions', 'get_backlinks_overview', 'get_backlinks_profile', 'get_ranked_keywords'].map(name => ({ name })) }; },
    async callTool(input): Promise<OpenSeoToolResult> {
      calls.push(input);
      if (input.name === failure) throw new Error('provider error');
      const data = input.name === 'list_projects' ? { projects: [{ id: '46b14fdf-859c-40e4-be3c-b161a481e1e6' }] }
        : input.name === 'whoami' ? { scopes: [], creditsRemaining: 2000 }
        : input.name === 'get_domain_overview' ? { data: { organicKeywords: 10, organicTraffic: 55, secret: 'private' } }
        : input.name === 'get_ranked_keywords' ? { data: { items: [{ keyword: 'term', url: 'https://one.test/page', position: 7, searchVolume: 100, accountEmail: 'secret@example.test' }] } }
        : { data: { referringDomains: 2, accountEmail: 'secret@example.test' } };
      return { content: [], structuredContent: data };
    },
  };
  const transport = { async start() {}, async send() {}, async close() {} } as OpenSeoTransport;
  return { calls, client, transport };
}
const input = { domain: 'one.test', locationCode: 2840, languageCode: 'en', approvedCap: 1000 };

test('market choices mirror allowed pairs and include project default', () => {
  assert.deepEqual(ADVISOR_MARKETS.map(market => market.locationCode), [null, 2840, 2376]);
  assert.deepEqual(ADVISOR_MARKETS.map(market => market.languages.map(language => language.code)), [[null], ['en', 'es'], ['he', 'ar']]);
});
test('US/en reaches three domain tools; only normalized result fields leave the mapper', async () => {
  const dependency = fake(); const result = await runAdvisorPanel(input, dependency);
  assert.equal(result.status, 'complete'); assert.equal(result.observedCredits, 980);
  for (const name of ['get_domain_overview', 'get_domain_keyword_suggestions', 'get_ranked_keywords']) {
    const call = dependency.calls.find(item => item.name === name);
    assert.equal(call?.arguments.locationCode, 2840); assert.equal(call?.arguments.languageCode, 'en');
  }
  assert.deepEqual(Object.keys(result).sort(), ['actions', 'observedCredits', 'plannedTools', 'status']);
  assert.equal(JSON.stringify(result).includes('secret@example.test'), false);
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(result.actions[0].rank, 1);
});
test('project default and location-only send only the selected market keys', async () => {
  for (const [locationCode, languageCode] of [[null, null], [2840, null]] as const) {
    const dependency = fake();
    await runAdvisorPanel({ ...input, locationCode, languageCode }, dependency);
    for (const call of dependency.calls.filter(item => item.name.startsWith('get_'))) {
      if (['get_domain_overview', 'get_domain_keyword_suggestions', 'get_ranked_keywords'].includes(call.name)) {
        assert.equal(Object.hasOwn(call.arguments, 'locationCode'), locationCode !== null);
        assert.equal(Object.hasOwn(call.arguments, 'languageCode'), false);
      }
    }
  }
});
test('unsupported market, invalid domain, and invalid caps make zero transport calls', async () => {
  for (const candidate of [
    { ...input, locationCode: 9999 }, { ...input, languageCode: 'he' },
    { ...input, locationCode: null },
  ]) { const dependency = fake(); assert.equal((await runAdvisorPanel(candidate, dependency)).status, 'unsupported_market'); assert.equal(dependency.calls.length, 0); }
  for (const cap of [0, 2001, '400', 1.5]) {
    const dependency = fake(); assert.equal((await runAdvisorPanel({ ...input, approvedCap: cap as number }, dependency)).status, 'invalid_arguments'); assert.equal(dependency.calls.length, 0);
  }
  const dependency = fake(); assert.equal((await runAdvisorPanel({ ...input, domain: '127.0.0.1' }, dependency)).status, 'invalid_arguments'); assert.equal(dependency.calls.length, 0);
});
test('partial research retains observed credits without raw provider fields', async () => {
  const dependency = fake('get_ranked_keywords'); const result = await runAdvisorPanel(input, dependency);
  assert.equal(result.status, 'partial'); assert.equal(result.observedCredits, 300);
  assert.deepEqual(Object.keys(result).sort(), ['actions', 'observedCredits', 'plannedTools', 'status']);
});
test('route checks admin cookie before parsing or invoking metered runner', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/seo-advisor/run/route.ts'), 'utf8');
  assert.ok(source.indexOf('verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)') < source.indexOf('request.json()'));
  assert.ok(source.indexOf('verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)') < source.indexOf('await runAdvisorPanel('));
  assert.match(source, /status: 401/u);
});
