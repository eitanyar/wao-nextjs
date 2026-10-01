import crypto from 'node:crypto';
import { isIP } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

const LOCAL_URL = 'http://127.0.0.1:3001/mcp';
const HOSTED_URL = 'https://app.openseo.so/mcp';
const METERED_TOOLS = ['research_keywords', 'get_domain_overview', 'get_domain_keyword_suggestions', 'get_backlinks_overview', 'get_backlinks_profile', 'get_ranked_keywords'] as const;
const ALLOWED_TOOLS = ['whoami', 'list_projects', ...METERED_TOOLS] as const;
const COSTS = { research_keywords: 100, get_domain_overview: 300, get_domain_keyword_suggestions: 300, get_backlinks_overview: 50, get_backlinks_profile: 30, get_ranked_keywords: 300 } as const;

type MeteredTool = (typeof METERED_TOOLS)[number];
export type OpenSeoTool = (typeof ALLOWED_TOOLS)[number];
export type OpenSeoMode = 'local' | 'hosted';
export interface OpenSeoToolDefinition { name: string; }
export type OpenSeoToolResult = Awaited<ReturnType<Client['callTool']>>;
type OpenSeoOrdinaryToolResult = OpenSeoToolResult & { content: Array<{ type: string; text?: string }> };
export interface OpenSeoClient { connect(transport: Transport): Promise<void>; listTools(): Promise<{ tools: OpenSeoToolDefinition[] }>; callTool(input: { name: string; arguments: Record<string, unknown> }): Promise<OpenSeoToolResult>; close?(): Promise<void>; }
export type OpenSeoTransport = Transport;
export interface OpenSeoClientOptions { mode?: OpenSeoMode; url?: string; apiKey?: string; client?: OpenSeoClient; transport?: OpenSeoTransport; clientFactory?: () => OpenSeoClient; transportFactory?: (url: URL, options: { requestInit: RequestInit; fetch?: typeof fetch }) => OpenSeoTransport; fetch?: typeof fetch; }
export interface OpenSeoClientHandle { client: OpenSeoClient; transport: OpenSeoTransport; mode: OpenSeoMode; origin: string; }
export interface OpenSeoPreflightOptions extends OpenSeoClientOptions { projectId: string; now?: () => Date; }
export interface OpenSeoPreflightResult { status: 'ok' | 'capability_missing' | 'project_missing' | 'unavailable'; mode: OpenSeoMode; scopes: string[]; projectMarket: string | null; creditsRemaining: number | null; toolNames: string[]; serverOrigin: string; retrievedAt: string; networkCalls: number; meteredCalls: number; }
export interface OpenSeoPlanCall { tool: MeteredTool; arguments: Record<string, unknown>; cost: number; }
export interface OpenSeoPlan { status: 'ready' | 'budget_confirmation_required' | 'insufficient_budget'; totalCredits: number; approvedCap: number; calls: OpenSeoPlanCall[]; omitted: Array<{ tool: MeteredTool; reason: string }>; }
export interface OpenSeoPlanOptions { projectId: string; seed?: string; candidates?: string[]; approvedCap?: number; explicitPlanCredits?: number; }
export interface OpenSeoResearchOptions { client: OpenSeoClient; projectId: string; seed?: string; candidates?: string[]; approvedCap: number; remainingCredits?: number; now?: () => Date; }
export interface OpenSeoResearchResult { status: 'complete' | 'partial' | 'budget_confirmation_required' | 'insufficient_budget'; plan: OpenSeoPlan; observedCredits: number; evidence: Array<Record<string, unknown>>; skipped: Array<{ tool: MeteredTool; reason: string }>; }

function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function digest(value: unknown): string { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function hostname(value: unknown): value is string { return typeof value === 'string' && isIP(value) === 0 && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/iu.test(value) && value.length <= 253; }
function isOrdinaryToolResult(result: OpenSeoToolResult): result is OpenSeoOrdinaryToolResult { return 'content' in result; }
function readStructured(result: OpenSeoOrdinaryToolResult): Record<string, unknown> { if (record(result.structuredContent)) return result.structuredContent; const text = result.content.find(item => item.type === 'text')?.text; if (!text) return {}; try { const parsed: unknown = JSON.parse(text); return record(parsed) ? parsed : {}; } catch { return {}; } }
function configuredUrl(options: OpenSeoClientOptions): { mode: OpenSeoMode; url: URL } {
  const mode = options.mode ?? (options.url ? 'hosted' : 'local');
  const value = options.url ?? (mode === 'local' ? LOCAL_URL : HOSTED_URL);
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash) throw new Error('Invalid OpenSEO MCP URL');
  if (mode === 'local') { if (url.toString() !== LOCAL_URL) throw new Error('Invalid local OpenSEO MCP URL'); }
  else if (url.toString() !== HOSTED_URL || !options.apiKey) throw new Error('Hosted OpenSEO requires explicit endpoint and bearer authorization');
  return { mode, url };
}
function validateInput(tool: OpenSeoTool, input: Record<string, unknown>): void {
  if ((tool === 'whoami' || tool === 'list_projects') && Object.keys(input).length === 0) return;
  if (typeof input.projectId !== 'string' || input.projectId.length === 0) throw new Error('Invalid OpenSEO tool input');
  if (tool === 'research_keywords' && typeof input.seed === 'string' && input.seed.length > 0 && input.seed.length <= 120 && input.clickstream === false) return;
  if ((tool === 'get_domain_overview' || tool === 'get_domain_keyword_suggestions') && hostname(input.domain)) return;
  if (tool === 'get_backlinks_overview' && hostname(input.target)) return;
  if (tool === 'get_backlinks_profile' && hostname(input.target) && input.page === 1) return;
  if (tool === 'get_ranked_keywords' && hostname(input.target) && Object.keys(input).every(key => ['projectId', 'target', 'scope', 'market', 'locationCode', 'languageCode', 'resultTypes', 'includeSubdomains', 'minSearchVolume', 'maxRank', 'excludeBrandTerms', 'sortBy', 'limit', 'offset'].includes(key)) &&
    (input.limit === undefined || (Number.isInteger(input.limit) && (input.limit as number) >= 1 && (input.limit as number) <= 200)) &&
    (input.maxRank === undefined || (Number.isInteger(input.maxRank) && (input.maxRank as number) >= 1 && (input.maxRank as number) <= 100)) &&
    (input.locationCode === undefined || (Number.isInteger(input.locationCode) && (input.locationCode as number) > 0)) &&
    (input.languageCode === undefined || (typeof input.languageCode === 'string' && /^[a-z]{2}$/iu.test(input.languageCode)))) return;
  throw new Error('Invalid OpenSEO tool input');
}

export async function createOpenSeoMcpClient(options: OpenSeoClientOptions = {}): Promise<OpenSeoClientHandle> {
  const configured = configuredUrl(options);
  const requestInit: RequestInit = configured.mode === 'hosted' ? { headers: { Authorization: `Bearer ${options.apiKey}` } } : {};
  const transport = options.transport ?? options.transportFactory?.(configured.url, { requestInit, fetch: options.fetch }) ?? new StreamableHTTPClientTransport(configured.url, { requestInit, fetch: options.fetch });
  const client = options.client ?? options.clientFactory?.() ?? new Client({ name: 'wao-expired-domain-research', version: '1.0.0' });
  await client.connect(transport);
  return { client, transport, mode: configured.mode, origin: configured.url.origin };
}

export async function callAllowedOpenSeoTool(client: OpenSeoClient, tool: OpenSeoTool, input: Record<string, unknown>): Promise<OpenSeoOrdinaryToolResult> {
  if (!ALLOWED_TOOLS.includes(tool)) throw new Error('OpenSEO tool is not allowed');
  validateInput(tool, input);
  const result = await client.callTool({ name: tool, arguments: input });
  if (!isOrdinaryToolResult(result)) throw new Error('OpenSEO tool result is unsupported');
  if (result.isError) throw new Error('OpenSEO tool failed');
  return result;
}

export async function preflightOpenSeo(options: OpenSeoPreflightOptions): Promise<OpenSeoPreflightResult> {
  let handle: OpenSeoClientHandle | null = null;
  const now = options.now ?? (() => new Date());
  try {
    handle = await createOpenSeoMcpClient(options);
    const listed = await handle.client.listTools();
    const toolNames = listed.tools.map(tool => tool.name).sort();
    if (!METERED_TOOLS.every(tool => toolNames.includes(tool))) return { status: 'capability_missing', mode: handle.mode, scopes: [], projectMarket: null, creditsRemaining: null, toolNames, serverOrigin: handle.origin, retrievedAt: now().toISOString(), networkCalls: 0, meteredCalls: 0 };
    const whoami = readStructured(await callAllowedOpenSeoTool(handle.client, 'whoami', {}));
    const projects = readStructured(await callAllowedOpenSeoTool(handle.client, 'list_projects', {}));
    const projectRows = Array.isArray(projects.projects) ? projects.projects : [];
    const project = projectRows.find(item => record(item) && item.id === options.projectId);
    if (!record(project)) return { status: 'project_missing', mode: handle.mode, scopes: [], projectMarket: null, creditsRemaining: null, toolNames, serverOrigin: handle.origin, retrievedAt: now().toISOString(), networkCalls: 0, meteredCalls: 0 };
    const scopes = Array.isArray(whoami.scopes) ? whoami.scopes.filter((item): item is string => typeof item === 'string').sort() : [];
    return { status: 'ok', mode: handle.mode, scopes, projectMarket: typeof project.market === 'string' ? project.market : null, creditsRemaining: typeof whoami.creditsRemaining === 'number' ? whoami.creditsRemaining : null, toolNames, serverOrigin: handle.origin, retrievedAt: now().toISOString(), networkCalls: 0, meteredCalls: 0 };
  } catch {
    return { status: 'unavailable', mode: options.mode ?? 'local', scopes: [], projectMarket: null, creditsRemaining: null, toolNames: [], serverOrigin: 'unavailable', retrievedAt: now().toISOString(), networkCalls: 0, meteredCalls: 0 };
  } finally { if (handle) await closeOpenSeoMcpClient(handle); }
}

export function estimateOpenSeoPlan(options: OpenSeoPlanOptions): OpenSeoPlan {
  if (typeof options.projectId !== 'string' || options.projectId.length === 0) throw new Error('Invalid OpenSEO projectId');
  const seed = options.seed ?? 'research'; const candidates = (options.candidates ?? ['one.test', 'two.test', 'three.test']).filter(hostname).slice(0, 3);
  const projectId = options.projectId;
  const all: OpenSeoPlanCall[] = [
    ...(options.candidates && !options.seed ? [] : [{ tool: 'research_keywords' as const, arguments: { projectId, seed, clickstream: false }, cost: COSTS.research_keywords }]),
    ...candidates.map(domain => ({ tool: 'get_domain_overview' as const, arguments: { projectId, domain }, cost: COSTS.get_domain_overview })),
    ...candidates.map(target => ({ tool: 'get_ranked_keywords' as const, arguments: { projectId, target, locationCode: 2376, languageCode: 'he', limit: 50, maxRank: 20 }, cost: COSTS.get_ranked_keywords })),
    ...candidates.slice(0, 2).map(domain => ({ tool: 'get_domain_keyword_suggestions' as const, arguments: { projectId, domain }, cost: COSTS.get_domain_keyword_suggestions })),
    ...candidates.map(target => ({ tool: 'get_backlinks_overview' as const, arguments: { projectId, target }, cost: COSTS.get_backlinks_overview })),
    ...candidates.map(target => ({ tool: 'get_backlinks_profile' as const, arguments: { projectId, target, page: 1 }, cost: COSTS.get_backlinks_profile })),
  ];
  const totalCredits = all.reduce((total, call) => total + call.cost, 0); const approvedCap = options.approvedCap ?? totalCredits;
  if (approvedCap < (all[0]?.cost ?? 0)) return { status: 'insufficient_budget', totalCredits, approvedCap, calls: [], omitted: all.map(call => ({ tool: call.tool, reason: 'insufficient_budget' })) };
  if ((options.explicitPlanCredits !== undefined && (options.explicitPlanCredits > approvedCap || options.explicitPlanCredits > 2000)) || approvedCap > 2000) return { status: 'budget_confirmation_required', totalCredits, approvedCap, calls: [], omitted: all.map(call => ({ tool: call.tool, reason: 'budget_confirmation_required' })) };
  const calls: OpenSeoPlanCall[] = []; let used = 0;
  for (const call of all) { if (used + call.cost > approvedCap) break; calls.push(call); used += call.cost; }
  return { status: 'ready', totalCredits, approvedCap, calls, omitted: all.slice(calls.length).map(call => ({ tool: call.tool, reason: 'approved_cap_prefix' })) };
}

function normalize(tool: MeteredTool, result: OpenSeoOrdinaryToolResult, retrievedAt: string): Record<string, unknown> {
  const data = readStructured(result); const source = record(data.data) ? data.data : data;
  const numeric = (name: string): number | null => typeof source[name] === 'number' && Number.isFinite(source[name]) ? source[name] : null;
  const evidence: Record<string, unknown> = { provider: 'open-seo', tool, retrievedAt, rawResponseDigest: digest(source) };
  if (tool === 'research_keywords') return { ...evidence, keywordDemand: numeric('volume'), intent: typeof source.intent === 'string' ? source.intent : null, cpc: numeric('cpc') };
  if (tool === 'get_domain_overview') return { ...evidence, organicTraffic: numeric('organicTraffic'), organicKeywords: numeric('organicKeywords'), domainRank: numeric('domainRank'), pageRank: numeric('pageRank'), targetSpamScore: numeric('targetSpamScore') };
  if (tool === 'get_domain_keyword_suggestions') return { ...evidence, rankedKeywords: numeric('rankedKeywords'), rankedUrls: numeric('rankedUrls'), dataForSeoRank: numeric('rank') };
  if (tool === 'get_ranked_keywords') {
    const rawRows = Array.isArray(source.keywords) ? source.keywords : Array.isArray(source.items) ? source.items : Array.isArray(source.rows) ? source.rows : [];
    const rankedKeywordRows = rawRows.filter(record).slice(0, 50).map(row => ({
      keyword: typeof row.keyword === 'string' ? row.keyword : null,
      url: typeof row.url === 'string' ? row.url : null,
      position: typeof row.position === 'number' && Number.isFinite(row.position) ? row.position : null,
      searchVolume: typeof row.searchVolume === 'number' && Number.isFinite(row.searchVolume) ? row.searchVolume : null,
      cpc: typeof row.cpc === 'number' && Number.isFinite(row.cpc) ? row.cpc : null,
      intent: typeof row.intent === 'string' ? row.intent : null,
    }));
    const positioned = rankedKeywordRows.filter(row => row.position !== null).sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
    return { ...evidence, rankedKeywordRows, topKeyword: positioned[0]?.keyword ?? null, bestPosition: positioned[0]?.position ?? null, rowCount: rankedKeywordRows.length };
  }
  return { ...evidence, backlinks: numeric('backlinks'), referringDomains: numeric('referringDomains'), targetSpamScore: numeric('targetSpamScore') };
}

export async function runOpenSeoResearch(options: OpenSeoResearchOptions): Promise<OpenSeoResearchResult> {
  const plan = estimateOpenSeoPlan({ projectId: options.projectId, seed: options.seed, candidates: options.candidates, approvedCap: options.approvedCap });
  if (plan.status !== 'ready') return { status: plan.status, plan, observedCredits: 0, evidence: [], skipped: plan.omitted };
  let remaining = options.remainingCredits ?? options.approvedCap; let observedCredits = 0; const evidence: Array<Record<string, unknown>> = []; const skipped = [...plan.omitted]; const now = options.now ?? (() => new Date());
  try {
    for (const call of plan.calls) {
      if (remaining < call.cost) { skipped.push({ tool: call.tool, reason: 'remaining_credits' }); continue; }
      try { const result = await callAllowedOpenSeoTool(options.client, call.tool, call.arguments); evidence.push(normalize(call.tool, result, now().toISOString())); observedCredits += call.cost; remaining -= call.cost; } catch { skipped.push({ tool: call.tool, reason: 'provider_failure' }); break; }
    }
    return { status: skipped.length ? 'partial' : 'complete', plan, observedCredits, evidence, skipped };
  } finally { await options.client.close?.(); }
}

export async function closeOpenSeoMcpClient(handle: OpenSeoClientHandle): Promise<void> { await handle.client.close?.(); await handle.transport.close?.(); }
