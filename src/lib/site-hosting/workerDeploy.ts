/**
 * Site Bot deploy, worker mode: R2 publish + pointer flip + `{slug}.wao.co.il CNAME sites.wao.co.il` (proxied).
 * Selected by SITE_HOSTING_MODE=worker in src/app/api/site-bot/deploy/route.ts; `pages` (default) keeps the
 * legacy one-Pages-project-per-client path unchanged.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import { createS3Store, publishTenantSite, type ObjectStore, type PublishResult } from './r2';
import { SITES_BUCKET, SITES_CNAME_TARGET, subdomainHost, type HostRole } from './tenant';

export type SiteHostingMode = 'pages' | 'worker';

/** `pages` when unset/blank; `worker` when set so; anything else is a configuration error (never a silent fallback). */
export function siteHostingMode(raw: string | undefined): SiteHostingMode | null {
  const value = (raw ?? '').trim().toLowerCase();
  if (value === '' || value === 'pages') return 'pages';
  if (value === 'worker') return 'worker';
  return null;
}

export interface WorkerHostingConfig {
  apiToken: string;
  zoneId: string;
  r2Endpoint: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  bucket: string;
}

/** The env each worker-mode deploy needs. Missing names are returned, never defaulted. */
export const WORKER_HOSTING_ENV = [
  'CLOUDFLARE_SITES_API_TOKEN',
  'CLOUDFLARE_ZONE_ID',
  'SITES_R2_ENDPOINT',
  'SITES_R2_ACCESS_KEY_ID',
  'SITES_R2_SECRET_ACCESS_KEY',
] as const;

export function workerHostingConfig(env: Record<string, string | undefined>):
  { ok: true; config: WorkerHostingConfig } | { ok: false; missing: string[] } {
  const missing = WORKER_HOSTING_ENV.filter(name => !env[name]?.trim());
  if (missing.length) return { ok: false, missing };
  const endpoint = env.SITES_R2_ENDPOINT!.trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+$/.test(endpoint)) return { ok: false, missing: ['SITES_R2_ENDPOINT (must be https://host)'] };
  return {
    ok: true,
    config: {
      apiToken: env.CLOUDFLARE_SITES_API_TOKEN!.trim(),
      zoneId: env.CLOUDFLARE_ZONE_ID!.trim(),
      r2Endpoint: endpoint,
      r2AccessKeyId: env.SITES_R2_ACCESS_KEY_ID!.trim(),
      r2SecretAccessKey: env.SITES_R2_SECRET_ACCESS_KEY!.trim(),
      bucket: env.SITES_R2_BUCKET?.trim() || SITES_BUCKET,
    },
  };
}

const CF_BASE = 'https://api.cloudflare.com/client/v4';

type FetchLike = (url: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

async function cf(fetchImpl: FetchLike, method: 'GET' | 'POST', path: string, apiToken: string, body?: unknown) {
  const res = await fetchImpl(`${CF_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: 'error',
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

interface DnsRecord { type?: unknown; name?: unknown; content?: unknown; proxied?: unknown; zone_id?: unknown }

function listedRecords(data: unknown): DnsRecord[] | null {
  if (!data || typeof data !== 'object' || (data as { success?: unknown }).success !== true) return null;
  const { result, result_info: info } = data as { result?: unknown; result_info?: { total_pages?: unknown } };
  if (!Array.isArray(result) || (info && info.total_pages !== undefined && Number(info.total_pages) > 1)) return null;
  return result as DnsRecord[];
}

export type DnsOutcome = 'exists' | 'created' | 'legacy-pages-target';

/**
 * Ensures `{slug}.wao.co.il CNAME sites.wao.co.il` (proxied), GET-first. A still-proxied CNAME to the tenant's
 * legacy `{slug}.pages.dev` is accepted (the zone route already sends its traffic to the Worker; repointing is
 * the explicit migration step). Anything else under that name fails closed: we never overwrite a record.
 */
export async function ensureTenantDns(fetchImpl: FetchLike, config: Pick<WorkerHostingConfig, 'apiToken' | 'zoneId'>, slug: string): Promise<DnsOutcome> {
  const name = subdomainHost(slug);
  const dnsPath = `/zones/${config.zoneId}/dns_records`;
  const lookup = `${dnsPath}?name.exact=${encodeURIComponent(name)}&per_page=2`;
  const classify = (records: DnsRecord[]): DnsOutcome | 'absent' | 'conflict' => {
    if (records.length === 0) return 'absent';
    if (records.length !== 1) return 'conflict';
    const [record] = records;
    if (record.type !== 'CNAME' || record.name !== name || record.proxied !== true) return 'conflict';
    if (record.zone_id !== undefined && record.zone_id !== config.zoneId) return 'conflict';
    if (record.content === SITES_CNAME_TARGET) return 'exists';
    if (record.content === `${slug}.pages.dev`) return 'legacy-pages-target';
    return 'conflict';
  };

  const before = await cf(fetchImpl, 'GET', lookup, config.apiToken);
  const records = before.ok ? listedRecords(before.data) : null;
  if (!records) throw new Error('DNS lookup unavailable');
  const state = classify(records);
  if (state === 'conflict') throw new Error('DNS conflict');
  if (state !== 'absent') return state;

  const created = await cf(fetchImpl, 'POST', dnsPath, config.apiToken, { type: 'CNAME', name, content: SITES_CNAME_TARGET, proxied: true, ttl: 1 });
  if (created.ok) {
    const result = (created.data as { success?: unknown; result?: DnsRecord } | null);
    if (result?.success !== true || !result.result || classify([result.result]) !== 'exists') throw new Error('unbound DNS');
    return 'created';
  }
  const errors = (created.data as { errors?: Array<{ code?: number }> } | null)?.errors;
  if (created.status !== 409 && !errors?.some(entry => entry.code === 81053)) throw new Error('DNS rejected');
  const after = await cf(fetchImpl, 'GET', lookup, config.apiToken);
  const again = after.ok ? listedRecords(after.data) : null;
  if (!again || classify(again) !== 'exists') throw new Error('DNS conflict');
  return 'exists';
}

export interface WorkerDeployInput {
  config: WorkerHostingConfig;
  slug: string;
  files: Record<string, string | Uint8Array>;
  canonicalOrigin: string;
  hosts: Array<{ host: string; role: HostRole }>;
  fetch?: FetchLike;
  /** Test seam: an already-built object store. */
  store?: ObjectStore;
}

export interface WorkerDeployResult {
  publish: PublishResult;
  dns: DnsOutcome;
}

export class WorkerDeployError extends Error {
  constructor(readonly stage: 'publish' | 'dns', cause: unknown) {
    super(`${stage}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'WorkerDeployError';
  }
}

export async function deployTenantToWorker(input: WorkerDeployInput): Promise<WorkerDeployResult> {
  const fetchImpl = input.fetch ?? (fetch as unknown as FetchLike);
  const store = input.store ?? createS3Store({
    endpoint: input.config.r2Endpoint,
    bucket: input.config.bucket,
    credentials: { accessKeyId: input.config.r2AccessKeyId, secretAccessKey: input.config.r2SecretAccessKey },
  });
  let publish: PublishResult;
  try {
    publish = await publishTenantSite({ store, slug: input.slug, files: input.files, canonicalOrigin: input.canonicalOrigin, hosts: input.hosts });
  } catch (error) {
    throw new WorkerDeployError('publish', error);
  }
  let dns: DnsOutcome;
  try {
    dns = await ensureTenantDns(fetchImpl, input.config, input.slug);
  } catch (error) {
    throw new WorkerDeployError('dns', error);
  }
  return { publish, dns };
}
