import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  callAllowedOpenSeoTool, closeOpenSeoMcpClient, createOpenSeoMcpClient,
} from './expired-domain-research/openSeoMcp';
import type {
  OpenSeoClient, OpenSeoClientOptions, OpenSeoToolResult, OpenSeoTransport,
} from './expired-domain-research/openSeoMcp';
import type { PublicSeoOverviewFinding } from './seo-advisor-public-budget';
import type { PublicSeoExecutor } from './seo-advisor-public-orchestrator';

interface PublicSeoOpenSeoOptions {
  projectId: string;
  origin?: string;
  client?: OpenSeoClient;
  transport?: OpenSeoTransport;
  clientFactory?: OpenSeoClientOptions['clientFactory'];
  transportFactory?: OpenSeoClientOptions['transportFactory'];
  fetch?: typeof fetch;
}

function record(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}

function overview(result: OpenSeoToolResult): PublicSeoOverviewFinding {
  if (!('content' in result) || !Array.isArray(result.content)) {
    throw new Error('Unsupported OpenSEO result');
  }
  let data: unknown = result.structuredContent;
  if (!record(data)) {
    const text = result.content.find((item): item is { type: 'text'; text: string } =>
      record(item) && item.type === 'text' && typeof item.text === 'string')?.text;
    if (!text) throw new Error('Missing OpenSEO result');
    data = JSON.parse(text);
  }
  if (!record(data)) throw new Error('Invalid OpenSEO result');
  const source = record(data.data) ? data.data : data;
  const numberOrNull = (key: string): number | null => {
    const value = source[key];
    if (value === null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error('Invalid OpenSEO metric');
    }
    return value;
  };
  const organicTraffic = numberOrNull('organicTraffic');
  const organicKeywords = numberOrNull('organicKeywords');
  return { organicTraffic, organicKeywords, retrievedAt: new Date().toISOString() };
}

export function createPublicSeoOpenSeoExecutor(options: PublicSeoOpenSeoOptions): PublicSeoExecutor {
  if (typeof options?.projectId !== 'string' || !options.projectId.trim()) {
    throw new Error('Invalid OpenSEO projectId');
  }
  const origin = options.origin ?? 'http://127.0.0.1:3001';
  let endpoint: URL;
  try {
    endpoint = new URL(origin);
    if (endpoint.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname) ||
      endpoint.username || endpoint.password || endpoint.pathname !== '/' ||
      endpoint.search || endpoint.hash) throw new Error('Invalid OpenSEO origin');
  } catch { throw new Error('Invalid OpenSEO origin'); }
  const mcpUrl = new URL('/mcp', endpoint);

  return async ({ projectId, domain, locationCode, languageCode }) => {
    if (projectId !== options.projectId) throw new Error('public_seo_executor_unavailable');
    try {
      const client = options.client ?? options.clientFactory?.() ??
        new Client({ name: 'wao-public-seo-advisor', version: '1.0.0' });
      let transport: OpenSeoTransport;
      try {
        transport = options.transport ?? options.transportFactory?.(mcpUrl, {
          requestInit: {}, fetch: options.fetch,
        }) ?? new StreamableHTTPClientTransport(mcpUrl, { requestInit: {}, fetch: options.fetch });
      } catch (error) {
        await client.close?.();
        throw error;
      }
      const handle = { client, transport, mode: 'local' as const, origin: endpoint.origin };
      try {
        await createOpenSeoMcpClient({ mode: 'local', client, transport });
        const result = await callAllowedOpenSeoTool(client, 'get_domain_overview', {
          projectId, domain, locationCode, languageCode,
        });
        return overview(result);
      } finally {
        await closeOpenSeoMcpClient(handle);
      }
    } catch {
      throw new Error('public_seo_executor_unavailable');
    }
  };
}
