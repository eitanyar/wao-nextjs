import { validateCandidateHostname } from './validation';
import type { MozAuthorityEvidence } from './types';

const ENDPOINT = 'https://api.moz.com/jsonrpc';
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_000;
const MAX_RETRY_AFTER_MS = 60_000;

type JsonRecord = Record<string, unknown>;

export interface MozResponse {
  status: number;
  headers?: { get(name: string): string | null };
  text(): Promise<string>;
}

export type MozFetch = (url: string, init: { method: 'POST'; headers: { 'content-type': 'application/json'; 'x-moz-token': string }; body: string; signal: AbortSignal }) => Promise<MozResponse>;

export interface MozMetricsDependencies {
  fetch: MozFetch;
  now: () => Date;
  requestId: () => string;
  delay: (milliseconds: number) => Promise<void>;
  digest: (value: string) => string;
  token: string | undefined;
  signal?: AbortSignal;
}

export interface MozProvenance {
  query: string | null;
  page: string | null;
  rootDomain: string | null;
  lastCrawled: string | null;
  httpCode: number | null;
  externalEquityLinks: number | null;
  rootDomainsToPage: number | null;
}

export interface MozAuthorityResult {
  status: 'ok' | 'unavailable';
  reason?: string;
  reasons: string[];
  evidence?: MozAuthorityEvidence;
  provenance?: MozProvenance;
  operations: number;
  httpAttempts: number;
}

export interface MozBatchResult {
  status: 'complete' | 'partial' | 'approval_required' | 'invalid_input';
  results: Array<{ hostname: string; result: MozAuthorityResult }>;
  skipped: Array<{ hostname: string; reason: string }>;
  operations: number;
  httpAttempts: number;
}

function record(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finiteMetric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

function finiteCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function safeText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function unavailable(reason: string, httpAttempts: number, operations = 1): MozAuthorityResult {
  return { status: 'unavailable', reason, reasons: [reason], operations, httpAttempts };
}

function retryAfterMilliseconds(response: MozResponse): number {
  const value = response.headers?.get('retry-after')?.trim() ?? '';
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 && seconds * 1_000 <= MAX_RETRY_AFTER_MS ? seconds * 1_000 : RETRY_DELAY_MS;
}

function metric(value: unknown, invalidReason: string, absentReason?: string): { value: number | null; reason: string | null } {
  if (absentReason && value === -1) return { value: null, reason: absentReason };
  const mapped = finiteMetric(value);
  return mapped === null ? { value: null, reason: invalidReason } : { value: mapped, reason: null };
}

function combineSignals(caller: AbortSignal | undefined): { signal: AbortSignal; clear: () => void; timedOut: () => boolean } {
  const controller = new AbortController();
  let timeout = false;
  const abortCaller = () => controller.abort();
  if (caller?.aborted) controller.abort();
  else caller?.addEventListener('abort', abortCaller, { once: true });
  const timer = setTimeout(() => { timeout = true; controller.abort(); }, TIMEOUT_MS);
  return { signal: controller.signal, clear: () => { clearTimeout(timer); caller?.removeEventListener('abort', abortCaller); }, timedOut: () => timeout };
}

export function buildMozSiteMetricsRequest(hostname: string, requestId: string): { jsonrpc: '2.0'; id: string; method: 'data.site.metrics.fetch'; params: { data: { site_query: { query: string; scope: 'domain' } } } } {
  if (!validateCandidateHostname(hostname)) throw new Error('Invalid Moz hostname');
  if (typeof requestId !== 'string' || requestId.trim().length === 0) throw new Error('Invalid Moz request ID');
  const canonicalHostname = hostname.toLowerCase();
  return { jsonrpc: '2.0', id: requestId, method: 'data.site.metrics.fetch', params: { data: { site_query: { query: `https://${canonicalHostname}/`, scope: 'domain' } } } };
}

export async function fetchMozAuthorityMetrics(hostname: string, dependencies: MozMetricsDependencies): Promise<MozAuthorityResult> {
  let request: ReturnType<typeof buildMozSiteMetricsRequest>;
  try {
    request = buildMozSiteMetricsRequest(hostname, dependencies.requestId());
  } catch {
    return unavailable('moz_invalid_input', 0);
  }
  if (typeof dependencies.token !== 'string' || dependencies.token.trim().length === 0) return unavailable('moz_credentials_missing', 0);
  if (dependencies.signal?.aborted) return unavailable('moz_aborted', 0);

  const body = JSON.stringify(request);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const combined = combineSignals(dependencies.signal);
    try {
      if (combined.signal.aborted) return unavailable('moz_aborted', attempt - 1);
      const response = await dependencies.fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json', 'x-moz-token': dependencies.token }, body, signal: combined.signal });
      if (response.status === 429 || response.status >= 500) {
        if (attempt === MAX_ATTEMPTS) return unavailable(response.status === 429 ? 'moz_rate_limited' : 'moz_provider_unavailable', attempt);
        await dependencies.delay(retryAfterMilliseconds(response));
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        const reason = response.status === 401 || response.status === 403 ? 'moz_auth_unavailable' : response.status === 402 ? 'moz_quota_unavailable' : 'moz_http_unavailable';
        return unavailable(reason, attempt);
      }
      let responseText: string;
      let parsed: unknown;
      try {
        responseText = await response.text();
        parsed = JSON.parse(responseText);
      } catch { return unavailable('moz_response_malformed', attempt); }
      if (!record(parsed) || parsed.jsonrpc !== '2.0') return unavailable('moz_response_malformed', attempt);
      if (parsed.id !== request.id) return unavailable('moz_response_id_mismatch', attempt);
      if ('error' in parsed) return unavailable('moz_jsonrpc_error', attempt);
      if (!record(parsed.result) || !record(parsed.result.site_query) || !record(parsed.result.site_metrics)) return unavailable('moz_response_malformed', attempt);

      const siteQuery = parsed.result.site_query;
      const siteMetrics = parsed.result.site_metrics;
      const domainAuthority = metric(siteMetrics.domain_authority, 'moz_domain_authority_out_of_range');
      const pageAuthority = metric(siteMetrics.page_authority, 'moz_page_authority_invalid');
      const spamScore = metric(siteMetrics.spam_score, 'moz_spam_score_invalid', 'moz_spam_score_absent');
      const reasons = [domainAuthority.reason, pageAuthority.reason, spamScore.reason].filter((reason): reason is string => reason !== null);
      const retrievedAt = dependencies.now().toISOString();
      const populated = [domainAuthority.value, pageAuthority.value, spamScore.value].filter(value => value !== null).length;
      const evidence: MozAuthorityEvidence = {
        id: `moz:${request.id}`,
        sourceUrl: ENDPOINT,
        provider: 'moz-data-api-v3',
        tool: 'data.site.metrics.fetch',
        method: 'json-rpc',
        retrievedAt,
        freshnessHours: 168,
        confidence: Math.round((populated / 3) * 100),
        rawResponseDigest: dependencies.digest(responseText),
        pageAuthority: pageAuthority.value,
        domainAuthority: domainAuthority.value,
        spamScore: spamScore.value,
      };
      return {
        status: 'ok',
        reasons,
        evidence,
        provenance: {
          query: safeText(siteQuery.query),
          page: safeText(siteMetrics.page),
          rootDomain: safeText(siteMetrics.root_domain),
          lastCrawled: safeText(siteMetrics.last_crawled),
          httpCode: finiteCount(siteMetrics.http_code),
          externalEquityLinks: finiteCount(siteMetrics.external_equity_links),
          rootDomainsToPage: finiteCount(siteMetrics.root_domains_to_page),
        },
        operations: 1,
        httpAttempts: attempt,
      };
    } catch {
      if (dependencies.signal?.aborted) return unavailable('moz_aborted', attempt);
      if (combined.timedOut()) return unavailable('moz_timeout', attempt);
      return unavailable('moz_provider_unavailable', attempt);
    } finally {
      combined.clear();
    }
  }
  return unavailable('moz_provider_unavailable', MAX_ATTEMPTS);
}

export async function fetchMozAuthorityBatch(hostnames: string[], dependencies: MozMetricsDependencies & { approvedMozCalls: number }): Promise<MozBatchResult> {
  if (!Number.isInteger(dependencies.approvedMozCalls) || dependencies.approvedMozCalls < 1 || dependencies.approvedMozCalls > 10) return { status: 'approval_required', results: [], skipped: [], operations: 0, httpAttempts: 0 };
  if (!Array.isArray(hostnames) || hostnames.length < 1 || hostnames.length > 10 || hostnames.some(hostname => !validateCandidateHostname(hostname)) || new Set(hostnames.map(hostname => hostname.toLowerCase())).size !== hostnames.length) return { status: 'invalid_input', results: [], skipped: [], operations: 0, httpAttempts: 0 };

  const results: MozBatchResult['results'] = [];
  const skipped: MozBatchResult['skipped'] = [];
  let operations = 0;
  let httpAttempts = 0;
  for (let index = 0; index < hostnames.length; index += 1) {
    const hostname = hostnames[index].toLowerCase();
    if (operations >= dependencies.approvedMozCalls) {
      skipped.push(...hostnames.slice(index).map(remaining => ({ hostname: remaining.toLowerCase(), reason: 'approval_cap_reached' })));
      return { status: 'partial', results, skipped, operations, httpAttempts };
    }
    const result = await fetchMozAuthorityMetrics(hostname, dependencies);
    results.push({ hostname, result });
    operations += result.operations;
    httpAttempts += result.httpAttempts;
    if (result.reason === 'moz_auth_unavailable' || result.reason === 'moz_quota_unavailable') {
      skipped.push(...hostnames.slice(index + 1).map(remaining => ({ hostname: remaining.toLowerCase(), reason: result.reason! })));
      return { status: 'partial', results, skipped, operations, httpAttempts };
    }
  }
  return { status: results.some(item => item.result.status !== 'ok') ? 'partial' : 'complete', results, skipped, operations, httpAttempts };
}
