export const FRAUD_BLOCKER_DEFAULT_BASE_URL = 'https://backend.fraudblocker.com/api';

const SID_PATTERN = /^[A-Za-z0-9._~-]+$/;
const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export type FraudBlockerErrorCode = 'configuration' | 'unauthorized' | 'plan_limit' | 'rate_limited' | 'provider_error' | 'invalid_response';

export class FraudBlockerApiError extends Error {
  constructor(
    public readonly code: FraudBlockerErrorCode,
    public readonly status?: number,
  ) {
    super(`Fraud Blocker API ${code}${status ? ` (${status})` : ''}`);
    this.name = 'FraudBlockerApiError';
  }
}

export interface FraudBlockerDomain {
  sid: string;
  domain: string;
  status?: string;
  archived?: boolean;
}

export interface FraudBlockerClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface FraudBlockerClient {
  listDomains(): Promise<FraudBlockerDomain[]>;
  createDomain(domain: string): Promise<FraudBlockerDomain | null>;
  deleteDomain(sid: string): Promise<void>;
  listIps(): Promise<unknown[]>;
  getIpsHealth?(): Promise<unknown>;
  getClickReport(): Promise<unknown[]>;
}

function responseError(status: number): FraudBlockerApiError {
  if (status === 401) return new FraudBlockerApiError('unauthorized', status);
  if (status === 402) return new FraudBlockerApiError('plan_limit', status);
  if (status === 429) return new FraudBlockerApiError('rate_limited', status);
  return new FraudBlockerApiError('provider_error', status);
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asArray(value: unknown, field: string): unknown[] {
  if (Array.isArray(value)) return value;
  const root = record(value);
  const direct = root?.[field];
  if (Array.isArray(direct)) return direct;
  const data = record(root?.data);
  return Array.isArray(data?.[field]) ? data[field] as unknown[] : [];
}

function asDomain(value: unknown): FraudBlockerDomain | null {
  const item = record(value);
  if (!item || typeof item.sid !== 'string' || !SID_PATTERN.test(item.sid) || typeof item.domain !== 'string') return null;
  return {
    sid: item.sid,
    domain: item.domain,
    ...(typeof item.status === 'string' ? { status: item.status } : {}),
    ...(typeof item.archived === 'boolean' ? { archived: item.archived } : {}),
  };
}

function createdDomain(value: unknown): FraudBlockerDomain | null {
  const direct = asDomain(value);
  if (direct) return direct;
  const root = record(value);
  return asDomain(root?.domain) ?? asDomain(record(root?.data)?.domain);
}

export function normalizeFraudBlockerDomain(value: string): string {
  const source = value.trim();
  if (!source || /[\r\n\t\s]/.test(source)) throw new Error('Invalid Fraud Blocker domain');

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(source) ? source : `https://${source}`);
  } catch {
    throw new Error('Invalid Fraud Blocker domain');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) throw new Error('Invalid Fraud Blocker domain');

  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith('www.')) hostname = hostname.slice(4);
  if (!hostname || hostname.length > 253 || !hostname.includes('.') || /^[0-9.]+$/.test(hostname)) throw new Error('Invalid Fraud Blocker domain');
  const labels = hostname.split('.');
  if (labels.some(label => !DOMAIN_LABEL_PATTERN.test(label))) throw new Error('Invalid Fraud Blocker domain');
  return hostname;
}

export function createFraudBlockerClient(options: FraudBlockerClientOptions = {}): FraudBlockerClient {
  const apiKey = options.apiKey ?? process.env.FRAUD_BLOCKER_API_KEY;
  const baseUrl = (options.baseUrl ?? FRAUD_BLOCKER_DEFAULT_BASE_URL).replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request(path: string, init: RequestInit = {}): Promise<unknown> {
    if (!apiKey) throw new FraudBlockerApiError('configuration');
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: { api_key: apiKey, ...(init.body ? { 'content-type': 'application/json' } : {}) },
    });
    if (!response.ok) throw responseError(response.status);
    if (response.status === 204) return null;
    try {
      return await response.json();
    } catch {
      throw new FraudBlockerApiError('invalid_response', response.status);
    }
  }

  return {
    async listDomains() {
      return asArray(await request('/domains'), 'domains').flatMap(value => {
        const domain = asDomain(value);
        return domain ? [domain] : [];
      });
    },
    async createDomain(domain) {
      return createdDomain(await request('/domains', { method: 'POST', body: JSON.stringify({ domain: normalizeFraudBlockerDomain(domain) }) }));
    },
    async deleteDomain(sid) {
      if (!SID_PATTERN.test(sid)) throw new Error('Invalid Fraud Blocker SID');
      await request(`/domains/${encodeURIComponent(sid)}`, { method: 'DELETE' });
    },
    async listIps() {
      return asArray(await request('/ips'), 'ips');
    },
    async getIpsHealth() {
      return request('/ips');
    },
    async getClickReport() {
      return asArray(await request('/bigquery/click-report'), 'rows');
    },
  };
}

function isArchived(domain: FraudBlockerDomain): boolean {
  return domain.archived === true || domain.status?.toLowerCase() === 'archived';
}

function matchingDomain(domains: FraudBlockerDomain[], domain: string): FraudBlockerDomain | null {
  return domains.find(item => {
    try {
      return normalizeFraudBlockerDomain(item.domain) === domain && !isArchived(item);
    } catch {
      return false;
    }
  }) ?? null;
}

export async function ensureFraudBlockerDomain(client: FraudBlockerClient, rawDomain: string): Promise<string> {
  const domain = normalizeFraudBlockerDomain(rawDomain);
  const existing = matchingDomain(await client.listDomains(), domain);
  if (existing) return existing.sid;

  let created: FraudBlockerDomain | null = null;
  try {
    created = await client.createDomain(domain);
  } catch (error) {
    if (!(error instanceof FraudBlockerApiError) || error.status !== 409) throw error;
  }

  const resolved = matchingDomain(await client.listDomains(), domain);
  if (resolved) return resolved.sid;
  if (created && !isArchived(created) && normalizeFraudBlockerDomain(created.domain) === domain) return created.sid;
  throw new FraudBlockerApiError('invalid_response');
}
