import fs from 'node:fs';
import path from 'node:path';
import {
  createOpenSeoMcpClient, estimateOpenSeoPlan,
  preflightOpenSeo, resolveAdvisorMarket, runOpenSeoResearch,
  type OpenSeoClient, type OpenSeoTransport,
} from './expired-domain-research/openSeoMcp';

const PROJECT_ID = '46b14fdf-859c-40e4-be3c-b161a481e1e6';
export const ADVISOR_MARKETS = [
  { locationCode: null, locationLabel: 'Project default (Israel/Hebrew)', languages: [{ code: null, label: 'Default' }] },
  { locationCode: 2840, locationLabel: 'United States', languages: [{ code: 'en', label: 'English' }, { code: 'es', label: 'Spanish' }] },
  { locationCode: 2376, locationLabel: 'Israel', languages: [{ code: 'he', label: 'Hebrew' }, { code: 'ar', label: 'Arabic' }] },
] as const;

export interface AdvisorPanelResult {
  status: 'complete' | 'partial' | 'unsupported_market' | 'insufficient_budget' | 'unavailable' | 'invalid_arguments';
  reason?: string;
  observedCredits?: number;
  actions: { rank: number; action: string; evidence: Record<string, unknown> }[];
  plannedTools: string[];
}
export interface AdvisorPanelInput { domain: string; locationCode: number | null; languageCode: string | null; approvedCap: number; }
type PanelDependencies = { client?: OpenSeoClient; transport?: OpenSeoTransport; offlineFixture?: boolean };
const empty = (status: AdvisorPanelResult['status'], reason: string): AdvisorPanelResult => ({ status, reason, actions: [], plannedTools: [] });

function fixtureClient(): OpenSeoClient {
  const root = path.resolve(process.cwd(), 'fixtures/expired-domain-research/openseo');
  const load = (name: string): Record<string, unknown> => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')) as Record<string, unknown>;
  const tools = load('tool-list.json');
  const whoami = load('whoami.json');
  const projects = load('projects.json');
  const responses = load('research-responses.json');
  return {
    async connect() {}, async close() {},
    async listTools() { return { tools: [...(tools.tools as { name: string }[]), { name: 'get_ranked_keywords' }] }; },
    async callTool({ name }) {
      const data = name === 'whoami' ? whoami : name === 'list_projects'
        ? { ...projects, projects: [{ ...(projects.projects as Record<string, unknown>[])[0], id: PROJECT_ID }] }
        : name === 'get_ranked_keywords' ? { items: [] } : (responses[name] as Record<string, unknown> ?? {});
      return { content: [], structuredContent: data };
    },
  };
}

export async function runAdvisorPanel(input: AdvisorPanelInput, dependencies: PanelDependencies = {}): Promise<AdvisorPanelResult> {
  if (!input || typeof input.domain !== 'string' || !Number.isInteger(input.approvedCap) || input.approvedCap < 1 || input.approvedCap > 2000 ||
    (input.locationCode !== null && !Number.isSafeInteger(input.locationCode)) ||
    (input.languageCode !== null && typeof input.languageCode !== 'string')) return empty('invalid_arguments', 'Invalid domain, market, or credit cap.');
  const market = resolveAdvisorMarket({ ...(input.locationCode === null ? {} : { locationCode: input.locationCode }), ...(input.languageCode === null ? {} : { languageCode: input.languageCode }) });
  if (market.status !== 'ok') return empty('unsupported_market', market.reason ?? 'Unsupported market.');
  // The adapter filters invalid candidate domains. Require a real planned domain call before connecting.
  const plan = estimateOpenSeoPlan({ projectId: PROJECT_ID, candidates: [input.domain], approvedCap: input.approvedCap, locationCode: market.locationCode, languageCode: market.languageCode });
  if (plan.status === 'insufficient_budget') return empty('insufficient_budget', 'Credit cap cannot cover the first planned call.');
  if (!plan.calls.some(call => call.tool === 'get_domain_overview')) return empty('invalid_arguments', 'Enter a valid domain and enough credits for an overview.');
  const plannedTools = plan.calls.map(call => call.tool);
  if (dependencies.offlineFixture && process.env.NODE_ENV === 'production') return empty('unavailable', 'Offline fixture is unavailable in production.');
  const fixture = dependencies.offlineFixture ? { client: fixtureClient(), transport: { async start() {}, async send() {}, async close() {} } as OpenSeoTransport } : {};
  const injected = { ...fixture, ...dependencies };
  let handle: Awaited<ReturnType<typeof createOpenSeoMcpClient>> | null = null;
  try {
    const preflight = await preflightOpenSeo({ projectId: PROJECT_ID, client: injected.client, transport: injected.transport });
    if (preflight.status !== 'ok') return { ...empty('unavailable', `OpenSEO preflight: ${preflight.status}`), plannedTools };
    handle = await createOpenSeoMcpClient({ client: injected.client, transport: injected.transport });
    const result = await runOpenSeoResearch({ client: handle.client, projectId: PROJECT_ID, candidates: [input.domain], approvedCap: input.approvedCap, locationCode: market.locationCode, languageCode: market.languageCode });
    const ranked = result.evidence.find(item => item.tool === 'get_ranked_keywords');
    const overview = result.evidence.find(item => item.tool === 'get_domain_overview');
    const backlinks = result.evidence.find(item => item.tool === 'get_backlinks_overview');
    const rows = Array.isArray(ranked?.rankedKeywordRows) ? ranked.rankedKeywordRows as Record<string, unknown>[] : [];
    const actions: AdvisorPanelResult['actions'] = [];
    for (const row of rows.filter(row => typeof row.position === 'number' && row.position >= 4 && row.position <= 20 && typeof row.url === 'string' && typeof row.keyword === 'string').sort((a, b) => (a.position as number) - (b.position as number)).slice(0, 5)) {
      actions.push({ rank: actions.length + 1, action: `striking distance: optimize ${row.url} for ${row.keyword}`, evidence: { tool: 'get_ranked_keywords', keyword: row.keyword, url: row.url, position: row.position, bestPosition: ranked?.bestPosition, rawResponseDigest: ranked?.rawResponseDigest } });
    }
    if (typeof overview?.organicKeywords === 'number' && overview.organicKeywords > 0 && rows.length === 0) actions.push({ rank: actions.length + 1, action: 'pull ranked-keyword detail', evidence: { tool: 'get_domain_overview', organicKeywords: overview.organicKeywords, rankedKeywordRows: 0 } });
    if (typeof backlinks?.referringDomains === 'number' && backlinks.referringDomains < 10) actions.push({ rank: actions.length + 1, action: 'authority gap: backlinks are the constraint', evidence: { tool: 'get_backlinks_overview', referringDomains: backlinks.referringDomains } });
    if (!actions.length) actions.push({ rank: 1, action: 'collect baseline: rerun after changes, evidence cached 12h', evidence: { organicTraffic: overview?.organicTraffic ?? null, organicKeywords: overview?.organicKeywords ?? null, rankedKeywordRows: rows.length } });
    return { status: result.status === 'complete' ? 'complete' : result.status === 'partial' ? 'partial' : 'insufficient_budget', observedCredits: dependencies.offlineFixture ? 0 : result.observedCredits, actions, plannedTools };
  } catch {
    return { ...empty('unavailable', 'OpenSEO unavailable.'), plannedTools };
  } finally { if (handle) await handle.transport.close?.(); }
}
