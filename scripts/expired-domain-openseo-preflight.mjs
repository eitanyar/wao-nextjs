import fs from 'node:fs';
import path from 'node:path';
import { preflightOpenSeo } from '../dist/lib/expired-domain-research/openSeoMcp.js';

const root = path.resolve(process.cwd(), 'fixtures', 'expired-domain-research', 'openseo');
const load = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const mode = process.argv[2] ?? '--offline-fixture';
if (mode === '--live-readonly') {
  if (process.env.ALLOW_OPENSEO_PREFLIGHT !== '1') throw new Error('live_readonly_requires_allow_gate');
  throw new Error('live_readonly_not_executed_by_offline_cli');
}
if (mode !== '--offline-fixture') throw new Error('unknown_mode');
const tools = load('tool-list.json');
const whoami = load('whoami.json');
const projects = load('projects.json');
const research = load('research-responses.json');
const errors = load('error-responses.json');
let networkCalls = 0;
let meteredCalls = 0;
const transport = { async start() {}, async send() {}, async close() {} };
const client = {
  async connect() {},
  async listTools() { return tools; },
  async callTool(input) {
    if (['research_keywords', 'get_domain_overview', 'get_domain_keyword_suggestions', 'get_backlinks_overview', 'get_backlinks_profile'].includes(input.name)) meteredCalls += 1;
    if (input.name === 'whoami') return { content: [], structuredContent: whoami };
    if (input.name === 'list_projects') return { content: [], structuredContent: projects };
    return { content: [], structuredContent: research[input.name] ?? errors };
  },
  async close() {},
};
const result = await preflightOpenSeo({ projectId: 'project-1', client, transport, now: () => new Date('2026-01-01T00:00:00.000Z') });
if (result.status !== 'ok' || networkCalls !== 0 || meteredCalls !== 0) throw new Error('offline_preflight_contract_failed');
console.log(JSON.stringify({ status: 'PASS', mode: 'offline_fixture', toolNames: result.toolNames, networkCalls, meteredCalls, serverOrigin: result.serverOrigin }));
