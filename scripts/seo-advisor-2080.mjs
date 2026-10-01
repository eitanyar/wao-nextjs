// Compile first with: ./node_modules/.bin/tsc -p tsconfig.test.json
import fs from 'node:fs';
import path from 'node:path';
import { isIP } from 'node:net';
import { createOpenSeoMcpClient, closeOpenSeoMcpClient, estimateOpenSeoPlan, preflightOpenSeo, runOpenSeoResearch } from '../dist/lib/expired-domain-research/openSeoMcp.js';

const defaultProject = '46b14fdf-859c-40e4-be3c-b161a481e1e6';
const host = value => typeof value === 'string' && isIP(value) === 0 && value.length <= 253 && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/iu.test(value);
const args = process.argv.slice(2);
const parsed = { domain: null, projectId: defaultProject, cap: 1000, offline: false };
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--offline-fixture') parsed.offline = true;
  else if (['--domain', '--project', '--cap'].includes(arg) && i + 1 < args.length) {
    const value = args[++i];
    if (arg === '--domain') parsed.domain = value;
    if (arg === '--project') parsed.projectId = value;
    if (arg === '--cap') parsed.cap = Number(value);
  } else throw new Error('invalid_arguments');
}
if (!host(parsed.domain) || !parsed.projectId || !Number.isSafeInteger(parsed.cap) || parsed.cap < 0) throw new Error('invalid_arguments');

function report(status, observedCredits, skipped, actions) {
  console.log(JSON.stringify({ status, projectId: parsed.projectId, domain: parsed.domain, observedCredits, skipped, actions }, null, 2));
  console.log(`SEO advisor: ${status}; ${actions.length} actions; observedCredits ${observedCredits}.`);
  for (const item of actions.slice(0, 5)) console.log(`${item.rank}. ${item.action}`);
  console.log('program ceiling $20 (owner-tracked)');
}

if (parsed.cap > 2000) {
  report('budget_confirmation_required', 0, [], []);
  process.exitCode = 1;
} else {
  const fixtureClient = () => {
    const root = path.resolve(process.cwd(), 'fixtures/expired-domain-research/openseo');
    const load = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
    const tools = load('tool-list.json'); const whoami = load('whoami.json'); const projects = load('projects.json'); const research = load('research-responses.json');
    const ranked = { items: [
      { keyword: 'sample term', url: `https://${parsed.domain}/page`, position: 7, searchVolume: 120, cpc: 2, intent: 'commercial' },
      { keyword: 'sample topic', url: `https://${parsed.domain}/other`, position: 12, searchVolume: 80, cpc: 1, intent: 'informational' },
    ] };
    return {
      async connect() {}, async close() {},
      async listTools() { return { tools: [...tools.tools, { name: 'get_ranked_keywords' }] }; },
      async callTool({ name }) {
        if (name === 'whoami') return { content: [], structuredContent: whoami };
        if (name === 'list_projects') return { content: [], structuredContent: { ...projects, projects: [{ ...projects.projects[0], id: parsed.projectId }] } };
        return { content: [], structuredContent: name === 'get_ranked_keywords' ? ranked : (research[name] ?? {}) };
      },
    };
  };
  const fakeTransport = { async start() {}, async send() {}, async close() {} };
  const connection = parsed.offline ? { client: fixtureClient(), transport: fakeTransport } : { mode: 'local', url: process.env.OPENSEO_MCP_URL ?? 'http://127.0.0.1:3001/mcp' };
  try {
    const preflight = await preflightOpenSeo({ ...connection, projectId: parsed.projectId });
    if (preflight.status !== 'ok') {
      report(preflight.status, 0, [], []); process.exitCode = 1;
    } else {
      const plan = estimateOpenSeoPlan({ projectId: parsed.projectId, candidates: [parsed.domain], approvedCap: parsed.cap });
      if (plan.status !== 'ready') {
        report(plan.status, 0, plan.omitted, []); process.exitCode = 1;
      } else {
        const handle = parsed.offline ? { client: fixtureClient(), transport: fakeTransport, mode: 'local', origin: 'http://127.0.0.1:3001' } : await createOpenSeoMcpClient(connection);
        let result;
        try { result = await runOpenSeoResearch({ client: handle.client, projectId: parsed.projectId, candidates: [parsed.domain], approvedCap: parsed.cap }); }
        finally { await closeOpenSeoMcpClient(handle); }
        const ranked = result.evidence.find(item => item.tool === 'get_ranked_keywords');
        const overview = result.evidence.find(item => item.tool === 'get_domain_overview');
        const backlinks = result.evidence.find(item => item.tool === 'get_backlinks_overview');
        const actions = [];
        const rows = Array.isArray(ranked?.rankedKeywordRows) ? ranked.rankedKeywordRows : [];
        for (const row of rows.filter(row => row && Number.isFinite(row.position) && row.position >= 4 && row.position <= 20 && typeof row.url === 'string' && typeof row.keyword === 'string').sort((a, b) => a.position - b.position).slice(0, 5)) {
          actions.push({ action: `striking distance: optimize ${row.url} for ${row.keyword}`, evidence: { tool: 'get_ranked_keywords', keyword: row.keyword, url: row.url, position: row.position, bestPosition: ranked.bestPosition, rawResponseDigest: ranked.rawResponseDigest } });
        }
        if (overview?.organicKeywords > 0 && rows.length === 0) actions.push({ action: 'pull ranked-keyword detail', evidence: { tool: 'get_domain_overview', organicKeywords: overview.organicKeywords, rankedKeywordRows: 0 } });
        if (backlinks?.referringDomains < 10) actions.push({ action: 'authority gap: backlinks are the constraint', evidence: { tool: 'get_backlinks_overview', referringDomains: backlinks.referringDomains } });
        if (actions.length === 0) actions.push({ action: 'collect baseline: rerun after changes, evidence cached 12h', evidence: { organicTraffic: overview?.organicTraffic ?? null, organicKeywords: overview?.organicKeywords ?? null, rankedKeywordRows: rows.length } });
        report(result.status, parsed.offline ? 0 : result.observedCredits, result.skipped, actions.map((item, index) => ({ rank: index + 1, ...item })));
        if (result.skipped.some(item => item.reason === 'provider_failure')) process.exitCode = 1;
      }
    }
  } catch (error) {
    report('unavailable', 0, [], []);
    console.error(`advisor_error: ${error instanceof Error ? error.message.replace(/https?:\/\/[^\s]+/gu, '[endpoint]') : 'unknown'}`);
    process.exitCode = 1;
  }
}
