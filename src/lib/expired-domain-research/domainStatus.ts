import crypto from 'node:crypto';
import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';

const IANA_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';
const BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 128 * 1024;
const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'NS', 'MX', 'SOA'] as const;
type RecordType = (typeof RECORD_TYPES)[number];

export interface StatusHeaders { get(name: string): string | null; }
export interface StatusResponse { status: number; headers?: StatusHeaders; text(): Promise<string>; }
export type StatusFetch = (url: string, init: { method?: 'HEAD' | 'GET'; headers?: Record<string, string>; redirect?: 'manual'; signal: AbortSignal }) => Promise<StatusResponse>;
export interface DnsResolver {
  resolve4(hostname: string): Promise<string[]>;
  resolve6(hostname: string): Promise<string[]>;
  resolveCname(hostname: string): Promise<string[]>;
  resolveNs(hostname: string): Promise<string[]>;
  resolveMx(hostname: string): Promise<Array<{ exchange: string; priority: number }>>;
  resolveSoa(hostname: string): Promise<unknown>;
  lookup(hostname: string, options: { all: true; verbatim: true }): Promise<Array<{ address: string; family: number }>>;
}
export interface DomainStatusDependencies { fetch: StatusFetch; dns: DnsResolver; now: () => Date; delay: (milliseconds: number) => Promise<void>; }
export interface RdapBootstrap { version: string; publication: string; services: ReadonlyArray<readonly [readonly string[], readonly string[]]>; }
export interface BootstrapEvidence { status: 'available' | 'unavailable'; bootstrap: RdapBootstrap | null; retrievedAt: string; freshnessHours: number; evidenceId: string; }
export interface RdapProbe {
  status: 'registered' | 'not_found' | 'unavailable' | 'unsupported'; statusCode: number | null; retrievedAt: string; freshnessHours: number; eventDates: ReadonlyArray<{ action: string; date: string }>; registrarName: string | null; redactedEntityCount: number; noticesDigest: string | null; responseDigest: string | null; provenance: string; evidenceId: string;
}
export interface DnsProbe { status: 'records_present' | 'nxdomain' | 'nodata' | 'timeout' | 'servfail' | 'unavailable'; retrievedAt: string; freshnessHours: number; records: Readonly<Partial<Record<RecordType, number>>>; outcomes: Readonly<Partial<Record<RecordType, string>>>; provenance: string; evidenceId: string; }
export interface HttpProbe { status: 'reachable' | 'unreachable' | 'blocked_private_address' | 'unsafe_redirect' | 'timeout'; statusCode: number | null; retrievedAt: string; freshnessHours: number; title: string | null; finalUrl: string | null; redirects: ReadonlyArray<string>; parkingSignature: boolean; responseDigest: string | null; provenance: string; evidenceId: string; }
export interface DomainStatusAssessment { hostname: string; availability: 'registered_active' | 'registered_parked' | 'registered_inactive' | 'unregistered_signal' | 'unknown'; purchaseCertainty: 'not_determined'; riskGates: ReadonlyArray<{ id: 'registrar_check_required'; status: 'hold'; reason: string; evidenceIds: string[] }>; retrieval: { rdap: string; dns: string; http: string }; freshnessHours: { rdap: number; dns: number; http: number }; contradictions: string[]; reasons: string[]; evidenceIds: string[]; rdap: RdapProbe; dns: DnsProbe; http: HttpProbe; }

const bootstrapCache = new WeakMap<StatusFetch, { evidence: BootstrapEvidence; expiresAt: number }>();
const digest = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const stamp = (deps: DomainStatusDependencies): string => deps.now().toISOString();
const evidenceId = (kind: string, value: string): string => `${kind}:${digest(value).slice(0, 24)}`;
const emptyRdap = (status: RdapProbe['status'], retrievedAt: string, provenance: string): RdapProbe => ({ status, statusCode: null, retrievedAt, freshnessHours: 24, eventDates: [], registrarName: null, redactedEntityCount: 0, noticesDigest: null, responseDigest: null, provenance, evidenceId: evidenceId('rdap', `${status}:${retrievedAt}`) });
const emptyHttp = (status: HttpProbe['status'], retrievedAt: string, provenance: string): HttpProbe => ({ status, statusCode: null, retrievedAt, freshnessHours: 24, title: null, finalUrl: null, redirects: [], parkingSignature: false, responseDigest: null, provenance, evidenceId: evidenceId('http', `${status}:${retrievedAt}`) });

function hostname(value: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 253 || /[\u0000-\u001f\u007f-\u009f]/u.test(value) || value.includes('/') || value.includes('\\') || value.includes('@') || value.includes(':') || value.endsWith('.')) throw new Error('Invalid domain hostname');
  const normalized = domainToASCII(value.trim().toLowerCase());
  if (!normalized || normalized.length > 253 || !normalized.includes('.') || normalized === 'localhost' || normalized.endsWith('.localhost') || isIP(normalized) !== 0) throw new Error('Invalid domain hostname');
  if (!normalized.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label))) throw new Error('Invalid domain hostname');
  return normalized;
}
function parseBootstrap(value: unknown): RdapBootstrap {
  if (!record(value) || typeof value.version !== 'string' || !value.version || typeof value.publication !== 'string' || !Number.isFinite(Date.parse(value.publication)) || !Array.isArray(value.services)) throw new Error('Invalid IANA RDAP bootstrap');
  const services = value.services.map(item => {
    if (!Array.isArray(item) || item.length !== 2 || !Array.isArray(item[0]) || !Array.isArray(item[1]) || item[0].length === 0 || item[1].length === 0 || !item[0].every(tld => typeof tld === 'string' && /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/iu.test(tld)) || !item[1].every(url => typeof url === 'string' && validRdapUrl(url))) throw new Error('Invalid IANA RDAP bootstrap services');
    return [item[0].map(tld => tld.toLowerCase()), item[1] as string[]] as const;
  });
  if (!services.length) throw new Error('Invalid IANA RDAP bootstrap services');
  return { version: value.version, publication: value.publication, services };
}
function validRdapUrl(value: string): boolean { try { return new URL(value).protocol === 'https:'; } catch { return false; } }
function errorKind(error: unknown): 'nxdomain' | 'timeout' | 'servfail' | 'unavailable' {
  const code = record(error) && typeof error.code === 'string' ? error.code : '';
  if (code === 'ENOTFOUND' || code === 'ENODATA') return 'nxdomain';
  if (code === 'ETIMEOUT' || code === 'ETIMEDOUT') return 'timeout';
  if (code === 'ESERVFAIL') return 'servfail';
  return 'unavailable';
}
async function request(url: string, deps: DomainStatusDependencies, init: Omit<Parameters<StatusFetch>[1], 'signal'>, retry: boolean): Promise<StatusResponse | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await deps.fetch(url, { ...init, signal: controller.signal });
      if (!retry || (response.status !== 429 && response.status < 500) || attempt === 2) return response;
      const retryAfter = response.headers?.get('retry-after')?.trim();
      const seconds = retryAfter && /^\d+(?:\.\d+)?$/u.test(retryAfter) ? Number(retryAfter) : Number.NaN;
      await deps.delay(Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 1000);
    } catch {
      return null;
    } finally { clearTimeout(timer); }
  }
  return null;
}

export async function loadRdapBootstrap(deps: DomainStatusDependencies): Promise<BootstrapEvidence> {
  const retrievedAt = stamp(deps); const now = deps.now().getTime();
  const cached = bootstrapCache.get(deps.fetch);
  if (cached && cached.expiresAt > now) return cached.evidence;
  try {
    const response = await request(IANA_BOOTSTRAP_URL, deps, { method: 'GET', headers: { Accept: 'application/json' }, redirect: 'manual' }, false);
    if (!response || response.status !== 200) throw new Error('unavailable');
    const body = await response.text(); const bootstrap = parseBootstrap(JSON.parse(body));
    const evidence: BootstrapEvidence = { status: 'available', bootstrap, retrievedAt, freshnessHours: 24, evidenceId: evidenceId('iana-rdap-bootstrap', body) };
    bootstrapCache.set(deps.fetch, { evidence, expiresAt: now + BOOTSTRAP_TTL_MS }); return evidence;
  } catch { return { status: 'unavailable', bootstrap: null, retrievedAt, freshnessHours: 0, evidenceId: evidenceId('iana-rdap-bootstrap', `unavailable:${retrievedAt}`) }; }
}
export function resolveRdapBaseUrl(candidate: string, bootstrap: RdapBootstrap): string | null {
  const value = hostname(candidate); let match: { suffix: string; url: string } | null = null;
  for (const [tlds, urls] of bootstrap.services) for (const tld of tlds) if ((value === tld || value.endsWith(`.${tld}`)) && (!match || tld.length > match.suffix.length)) { const url = urls.find(validRdapUrl); if (url) match = { suffix: tld, url }; }
  return match?.url ?? null;
}
function publicRdap(body: string): Pick<RdapProbe, 'eventDates' | 'registrarName' | 'redactedEntityCount' | 'noticesDigest'> {
  try {
    const value: unknown = JSON.parse(body); if (!record(value)) throw new Error('invalid');
    const eventDates = Array.isArray(value.events) ? value.events.flatMap(item => record(item) && typeof item.eventAction === 'string' && typeof item.eventDate === 'string' && Number.isFinite(Date.parse(item.eventDate)) ? [{ action: item.eventAction, date: item.eventDate }] : []) : [];
    const entities = Array.isArray(value.entities) ? value.entities : [];
    const registrar = entities.find(item => record(item) && Array.isArray(item.roles) && item.roles.includes('registrar'));
    const rows = record(registrar) && Array.isArray(registrar.vcardArray) && Array.isArray(registrar.vcardArray[1]) ? registrar.vcardArray[1] : [];
    const name = Array.isArray(rows) ? rows.flatMap(row => Array.isArray(row) && row[0] === 'fn' && typeof row[3] === 'string' ? [row[3]] : [])[0] ?? null : null;
    const notices = Array.isArray(value.notices) ? value.notices.flatMap(item => record(item) && typeof item.title === 'string' ? [item.title] : []).join('|') : '';
    return { eventDates, registrarName: name, redactedEntityCount: entities.length, noticesDigest: notices ? digest(notices) : null };
  } catch { return { eventDates: [], registrarName: null, redactedEntityCount: 0, noticesDigest: null }; }
}
export async function probeRdap(candidate: string, deps: DomainStatusDependencies): Promise<RdapProbe> {
  const value = hostname(candidate); const retrievedAt = stamp(deps); const bootstrap = await loadRdapBootstrap(deps);
  if (bootstrap.status !== 'available' || !bootstrap.bootstrap) return emptyRdap('unavailable', retrievedAt, bootstrap.evidenceId);
  const base = resolveRdapBaseUrl(value, bootstrap.bootstrap); if (!base) return emptyRdap('unsupported', retrievedAt, bootstrap.evidenceId);
  const origin = new URL(base).origin; let url = new URL(`domain/${value}`, base.endsWith('/') ? base : `${base}/`);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (url.origin !== origin) return emptyRdap('unavailable', retrievedAt, url.toString());
    const response = await request(url.toString(), deps, { method: 'GET', headers: { Accept: 'application/rdap+json' }, redirect: 'manual' }, true);
    if (!response) return emptyRdap('unavailable', retrievedAt, url.toString());
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers?.get('location');
      if (!location || redirects === MAX_REDIRECTS) return emptyRdap('unavailable', retrievedAt, url.toString());
      try { url = new URL(location, url); } catch { return emptyRdap('unavailable', retrievedAt, url.toString()); }
      continue;
    }
    const body = await response.text(); const status: RdapProbe['status'] = response.status >= 200 && response.status < 300 ? 'registered' : response.status === 404 ? 'not_found' : 'unavailable';
    return { status, statusCode: response.status, retrievedAt, freshnessHours: 24, ...publicRdap(body), responseDigest: digest(body), provenance: url.toString(), evidenceId: evidenceId('rdap', `${url}:${response.status}:${digest(body)}`) };
  }
  return emptyRdap('unavailable', retrievedAt, url.toString());
}
export async function probeDns(candidate: string, deps: DomainStatusDependencies): Promise<DnsProbe> {
  const value = hostname(candidate); const retrievedAt = stamp(deps);
  const work: ReadonlyArray<readonly [RecordType, () => Promise<unknown>]> = [['A', () => deps.dns.resolve4(value)], ['AAAA', () => deps.dns.resolve6(value)], ['CNAME', () => deps.dns.resolveCname(value)], ['NS', () => deps.dns.resolveNs(value)], ['MX', () => deps.dns.resolveMx(value)], ['SOA', () => deps.dns.resolveSoa(value)]];
  const settled = await Promise.all(work.map(async ([type, resolve]) => { try { const result = await resolve(); return [type, Array.isArray(result) ? result.length : result ? 1 : 0, 'ok'] as const; } catch (error) { return [type, 0, errorKind(error)] as const; } }));
  const records: Partial<Record<RecordType, number>> = {}; const outcomes: Partial<Record<RecordType, string>> = {};
  for (const [type, count, outcome] of settled) { outcomes[type] = outcome; if (count) records[type] = count; }
  const states = settled.map(item => item[2]); const status: DnsProbe['status'] = Object.keys(records).length ? 'records_present' : states.includes('servfail') ? 'servfail' : states.includes('timeout') ? 'timeout' : states.every(state => state === 'nxdomain') ? 'nxdomain' : states.every(state => state === 'ok' || state === 'nxdomain') ? 'nodata' : 'unavailable';
  return { status, retrievedAt, freshnessHours: 24, records, outcomes, provenance: 'injected-dns', evidenceId: evidenceId('dns', JSON.stringify({ value, records, outcomes })) };
}
function publicIp(address: string): boolean {
  if (isIP(address) === 4) { const [a, b, c] = address.split('.').map(Number); return !(a === 0 || a === 10 || a === 100 && b >= 64 && b <= 127 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 0 && c === 0 || a === 192 && b === 0 && c === 2 || a === 192 && b === 88 && c === 99 || a === 192 && b === 168 || a === 198 && (b === 18 || b === 19) || a === 198 && b === 51 && c === 100 || a === 203 && b === 0 && c === 113 || a >= 224); }
  if (isIP(address) === 6) { const lower = address.toLowerCase(); return !(lower === '::' || lower === '::1' || lower.startsWith('::ffff:') || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb') || lower.startsWith('ff') || lower.startsWith('100:') || lower.startsWith('2001:db8:')); }
  return false;
}
function allowedUrl(url: URL): boolean { return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password && (url.port === '' || url.port === '80' || url.port === '443'); }
const siteTitle = (body: string): string | null => /<title[^>]*>([\s\S]{0,512}?)<\/title>/iu.exec(body)?.[1]?.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ').trim() || null;
const parked = (body: string): boolean => /domain for sale|buy this domain|this domain is parked|parking page/iu.test(body);
export async function probeHttp(candidate: string, deps: DomainStatusDependencies): Promise<HttpProbe> {
  const value = hostname(candidate); const retrievedAt = stamp(deps); let current = new URL(`https://${value}`); const redirects: string[] = [];
  for (let count = 0; count <= MAX_REDIRECTS; count += 1) {
    if (!allowedUrl(current)) return { ...emptyHttp('unsafe_redirect', retrievedAt, current.toString()), redirects };
    let answers: Array<{ address: string; family: number }>;
    try { answers = await deps.dns.lookup(current.hostname, { all: true, verbatim: true }); } catch (error) { return emptyHttp(errorKind(error) === 'timeout' ? 'timeout' : 'unreachable', retrievedAt, 'injected-dns'); }
    if (!answers.length || answers.some(answer => !publicIp(answer.address))) return emptyHttp('blocked_private_address', retrievedAt, 'injected-dns');
    const head = await request(current.toString(), deps, { method: 'HEAD', redirect: 'manual' }, false); if (!head) return emptyHttp('timeout', retrievedAt, current.toString());
    const response = head.status === 405 || head.status === 501 ? await request(current.toString(), deps, { method: 'GET', redirect: 'manual' }, false) : head; if (!response) return emptyHttp('timeout', retrievedAt, current.toString());
    if (response.status >= 300 && response.status < 400) { const location = response.headers?.get('location'); if (!location || count === MAX_REDIRECTS) return { ...emptyHttp('unsafe_redirect', retrievedAt, current.toString()), statusCode: response.status, redirects }; try { current = new URL(location, current); redirects.push(current.toString()); } catch { return { ...emptyHttp('unsafe_redirect', retrievedAt, 'invalid-location'), statusCode: response.status, redirects }; } continue; }
    const body = response === head ? '' : (await response.text()).slice(0, MAX_BODY_BYTES);
    return { status: response.status >= 200 && response.status < 500 ? 'reachable' : 'unreachable', statusCode: response.status, retrievedAt, freshnessHours: 24, title: siteTitle(body), finalUrl: current.toString(), redirects, parkingSignature: parked(body), responseDigest: response === head ? null : digest(body), provenance: current.toString(), evidenceId: evidenceId('http', `${current}:${response.status}:${response === head ? '' : digest(body)}`) };
  }
  return emptyHttp('unsafe_redirect', retrievedAt, 'redirect-limit');
}
export async function assessDomainStatus(candidate: string, deps: DomainStatusDependencies): Promise<DomainStatusAssessment> {
  const value = hostname(candidate); const [rdap, dns, http] = await Promise.all([probeRdap(value, deps), probeDns(value, deps), probeHttp(value, deps)]);
  const contradictions = [rdap.status === 'not_found' && dns.status === 'records_present' ? 'rdap_not_found_with_dns_records' : '', rdap.status === 'not_found' && http.status === 'reachable' ? 'rdap_not_found_with_reachable_http' : '', rdap.status === 'registered' && dns.status === 'nxdomain' ? 'registered_with_dns_absence' : ''].filter(Boolean).sort();
  const blocked = contradictions.length > 0 || rdap.status === 'unavailable' || rdap.status === 'unsupported' || dns.status === 'timeout' || dns.status === 'servfail' || dns.status === 'unavailable' || ['blocked_private_address', 'unsafe_redirect', 'timeout'].includes(http.status);
  const availability: DomainStatusAssessment['availability'] = blocked ? 'unknown' : rdap.status === 'registered' && http.status === 'reachable' && http.parkingSignature ? 'registered_parked' : rdap.status === 'registered' && http.status === 'reachable' ? 'registered_active' : rdap.status === 'registered' ? 'registered_inactive' : rdap.status === 'not_found' && (dns.status === 'nxdomain' || dns.status === 'nodata') && http.status === 'unreachable' ? 'unregistered_signal' : 'unknown';
  const reasons = [`rdap_${rdap.status}`, `dns_${dns.status}`, `http_${http.status}`, ...contradictions].sort(); const ids = [rdap.evidenceId, dns.evidenceId, http.evidenceId].sort();
  return { hostname: value, availability, purchaseCertainty: 'not_determined', riskGates: [{ id: 'registrar_check_required', status: 'hold', reason: 'Point-in-time signals require independent registrar confirmation.', evidenceIds: ids }], retrieval: { rdap: rdap.retrievedAt, dns: dns.retrievedAt, http: http.retrievedAt }, freshnessHours: { rdap: rdap.freshnessHours, dns: dns.freshnessHours, http: http.freshnessHours }, contradictions, reasons, evidenceIds: ids, rdap, dns, http };
}
