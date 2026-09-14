import crypto from 'crypto';
import { validateCandidateHostname } from './validation';

const ARCHIVE = 'https://web.archive.org';
const MAX_CANDIDATES = 50;
const MAX_CDX_ROWS = 20;
const MAX_REPLAYS = 3;
const MAX_BODY_BYTES = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_DELAY_MS = 1_000;
const nextRequestAt = new WeakMap<WaybackDependencies, number>();

export interface WaybackFetchResponse {
  status: number;
  headers?: { get(name: string): string | null };
  text(): Promise<string>;
}

export type WaybackFetch = (url: string, init: { signal: AbortSignal; redirect?: 'manual' }) => Promise<WaybackFetchResponse>;

export interface WaybackDependencies {
  fetch: WaybackFetch;
  now?: () => Date;
  delay?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
  delayMs?: number;
}

export interface WaybackResearchUrl {
  originalInput: string;
  decodedInput: string;
  kind: 'keyword' | 'original';
  keyword: string | null;
  hostname: string | null;
  originalUrl: string | null;
}

export interface WaybackEvidence {
  id: string;
  sourceEndpoint: string;
  sourceUrl: string;
  retrievedAt: string;
  snapshotTimestamp: string | null;
  responseDigest: string;
  documented: boolean;
  status: 'ok' | 'partial' | 'unavailable' | 'provider_schema_changed' | 'rejected';
}

export interface WaybackCandidate {
  hostname: string;
  name: string;
  snippet: string;
  firstCaptured: string;
  lastCaptured: string;
  capture: string;
  evidenceId: string;
}

export interface WaybackSearchResult {
  status: 'ok' | 'provider_schema_changed' | 'partial' | 'unavailable';
  candidates: WaybackCandidate[];
  evidence: WaybackEvidence[];
}

export interface WaybackCapture {
  timestamp: string;
  original: string;
  statuscode: string;
  mimetype: string;
  digest: string;
  redirect: string;
  evidenceId: string;
}

export interface WaybackCaptureIndexResult {
  status: 'ok' | 'partial' | 'unavailable' | 'provider_schema_changed';
  captures: WaybackCapture[];
  evidence: WaybackEvidence[];
}

export interface HistoricalClaim {
  kind: 'title' | 'meta_description' | 'heading' | 'visible_text_keyword' | 'canonical_target' | 'redirect_target' | 'language_hint' | 'topic_pivot' | 'capture_gap' | 'redirect_chain' | 'parked_signal' | 'abuse_signal';
  value: string;
  evidenceIds: string[];
}

export interface HistoricalEvidenceSummary {
  status: 'ok' | 'partial' | 'unavailable';
  claims: HistoricalClaim[];
  evidence: WaybackEvidence[];
  riskSignals: Array<{ code: string; evidenceIds: string[] }>;
}

function sha(value: string): string { return crypto.createHash('sha256').update(value).digest('hex'); }
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function evidenceId(prefix: string, index: number, body: string): string { return `${prefix}-${index}-${sha(body).slice(0, 12)}`; }
function retryAfter(value: string | null, now: Date): number | null { if (!value) return null; const seconds = Number(value); if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000; const date = Date.parse(value); return Number.isFinite(date) ? Math.max(0, date - now.getTime()) : null; }
function safeRedirect(location: string): boolean { try { const url = new URL(location); return (url.protocol === 'http:' || url.protocol === 'https:') && validateCandidateHostname(url.hostname); } catch { return false; } }
function decodeOnce(value: string): string { try { return decodeURIComponent(value.replace(/\+/gu, '%20')); } catch { return value; } }

export function parseWaybackResearchUrl(input: string): WaybackResearchUrl {
  const originalInput = input;
  const match = input.match(/^https?:\/\/web\.archive\.org\/web\/[^/]+\/(.+)$/iu);
  const payload = match ? match[1] : input;
  const decodedInput = decodeOnce(payload).trim();
  const asUrl = (() => { try { return new URL(decodedInput.includes('://') ? decodedInput : `https://${decodedInput}`); } catch { return null; } })();
  const hostOnly = /^[A-Za-z0-9.-]+$/u.test(decodedInput);
  const hostname = asUrl && validateCandidateHostname(asUrl.hostname) && (hostOnly || decodedInput.includes('://')) ? asUrl.hostname.toLowerCase() : null;
  return hostname
    ? { originalInput, decodedInput, kind: 'original', keyword: null, hostname, originalUrl: asUrl!.toString() }
    : { originalInput, decodedInput, kind: 'keyword', keyword: decodedInput, hostname: null, originalUrl: null };
}

async function request(url: string, deps: WaybackDependencies, redirect?: 'manual', allowRedirect = false): Promise<{ response: WaybackFetchResponse | null; status: 'ok' | 'partial' | 'unavailable'; body: string }> {
  const now = deps.now ?? (() => new Date());
  const delay = deps.delay ?? (async () => {});
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const delayMs = deps.delayMs ?? DEFAULT_DELAY_MS;
  let last: 'partial' | 'unavailable' = 'unavailable';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = now().getTime();
    const rateDelay = Math.max(0, (nextRequestAt.get(deps) ?? current) - current);
    if (rateDelay > 0) await delay(rateDelay);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await deps.fetch(url, { signal: controller.signal, ...(redirect ? { redirect } : {}) });
      const body = await response.text();
      nextRequestAt.set(deps, now().getTime() + delayMs);
      if (response.status === 200 || allowRedirect && response.status >= 300 && response.status < 400) return { response, status: 'ok', body };
      last = response.status === 429 || response.status >= 500 ? 'partial' : 'unavailable';
      if (last === 'unavailable' || attempt === 2) return { response, status: last, body };
      const retryDelay = retryAfter(response.headers?.get('retry-after') ?? null, now()) ?? delayMs;
      await delay(Math.max(retryDelay, Math.max(0, (nextRequestAt.get(deps) ?? 0) - now().getTime())));
      nextRequestAt.set(deps, now().getTime());
    } catch {
      last = 'unavailable';
      if (attempt === 2) return { response: null, status: last, body: '' };
      await delay(delayMs);
    } finally { clearTimeout(timer); }
  }
  return { response: null, status: last, body: '' };
}

export async function searchWaybackCandidates(input: string | WaybackResearchUrl, deps: WaybackDependencies): Promise<WaybackSearchResult> {
  const parsed = typeof input === 'string' ? parseWaybackResearchUrl(input) : input;
  if (parsed.kind !== 'keyword' || !parsed.keyword) return { status: 'ok', candidates: [], evidence: [] };
  const url = `${ARCHIVE}/__wb/search/anchor?q=${encodeURIComponent(parsed.keyword)}`;
  const result = await request(url, deps);
  const retrievedAt = (deps.now ?? (() => new Date()))().toISOString();
  const responseEvidence: WaybackEvidence = { id: evidenceId('anchor', 0, result.body), sourceEndpoint: '/__wb/search/anchor', sourceUrl: url, retrievedAt, snapshotTimestamp: null, responseDigest: sha(result.body), documented: false, status: result.status };
  const evidence: WaybackEvidence[] = [responseEvidence];
  if (result.status !== 'ok') return { status: result.status, candidates: [], evidence };
  let rows: unknown;
  try { rows = JSON.parse(result.body); } catch { return { status: 'provider_schema_changed', candidates: [], evidence: [{ ...responseEvidence, status: 'provider_schema_changed' }] }; }
  if (!Array.isArray(rows)) return { status: 'provider_schema_changed', candidates: [], evidence: [{ ...responseEvidence, status: 'provider_schema_changed' }] };
  const candidates = rows.slice(0, MAX_CANDIDATES).flatMap((row, index) => {
    if (!record(row) || !text(row.name) || !text(row.link) || !text(row.snippet) || !text(row.first_captured) || !text(row.last_captured) || !text(row.capture)) return [];
    const hostname = (() => { try { return new URL(row.link).hostname.toLowerCase(); } catch { return ''; } })();
    if (!validateCandidateHostname(hostname)) return [];
    const rowBody = JSON.stringify(row);
    const id = evidenceId('anchor-row', index, rowBody);
    evidence.push({ id, sourceEndpoint: '/__wb/search/anchor', sourceUrl: url, retrievedAt, snapshotTimestamp: row.capture.trim(), responseDigest: sha(rowBody), documented: false, status: 'ok' });
    return [{ hostname, name: row.name.trim(), snippet: row.snippet.trim(), firstCaptured: row.first_captured.trim(), lastCaptured: row.last_captured.trim(), capture: row.capture.trim(), evidenceId: id }];
  });
  return candidates.length ? { status: 'ok', candidates, evidence } : { status: 'provider_schema_changed', candidates: [], evidence: [{ ...responseEvidence, status: 'provider_schema_changed' }] };
}

export async function fetchWaybackCaptureIndex(hostOrPattern: string, deps: WaybackDependencies): Promise<WaybackCaptureIndexResult> {
  const hostname = hostOrPattern.replace(/^\*\./u, '').toLowerCase();
  if (!validateCandidateHostname(hostname) || hostOrPattern.includes('*') && !hostOrPattern.startsWith('*.')) return { status: 'provider_schema_changed', captures: [], evidence: [] };
  const query = new URLSearchParams({ url: hostOrPattern, output: 'json', fl: 'timestamp,original,statuscode,mimetype,digest,redirect', filter: 'statuscode:200', collapse: 'digest', limit: String(MAX_CDX_ROWS) });
  const url = `${ARCHIVE}/cdx/search/cdx?${query.toString()}`;
  const result = await request(url, deps);
  const responseEvidence: WaybackEvidence = { id: evidenceId('cdx', 0, result.body), sourceEndpoint: '/cdx/search/cdx', sourceUrl: url, retrievedAt: (deps.now ?? (() => new Date()))().toISOString(), snapshotTimestamp: null, responseDigest: sha(result.body), documented: true, status: result.status };
  const evidence: WaybackEvidence[] = [responseEvidence];
  if (result.status !== 'ok') return { status: result.status, captures: [], evidence };
  let rows: unknown;
  try { rows = JSON.parse(result.body); } catch { return { status: 'provider_schema_changed', captures: [], evidence: [{ ...responseEvidence, status: 'provider_schema_changed' }] }; }
  if (!Array.isArray(rows)) return { status: 'provider_schema_changed', captures: [], evidence: [{ ...responseEvidence, status: 'provider_schema_changed' }] };
  const data = Array.isArray(rows[0]) ? rows.slice(1) : rows;
  const captures = data.slice(0, MAX_CDX_ROWS).flatMap((row, index) => {
    if (!Array.isArray(row) || row.length < 6 || !row.slice(0, 5).every(text) || typeof row[5] !== 'string') return [];
    const rowBody = JSON.stringify(row);
    const id = evidenceId('cdx-row', index, rowBody);
    evidence.push({ id, sourceEndpoint: '/cdx/search/cdx', sourceUrl: url, retrievedAt: responseEvidence.retrievedAt, snapshotTimestamp: row[0], responseDigest: sha(rowBody), documented: true, status: 'ok' });
    return [{ timestamp: row[0], original: row[1], statuscode: row[2], mimetype: row[3], digest: row[4], redirect: row[5], evidenceId: id }];
  });
  return { status: 'ok', captures, evidence };
}

function extract(html: string, expression: RegExp): string | null { return html.match(expression)?.[1]?.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim() || null; }

export async function summarizeHistoricalEvidence(captures: WaybackCapture[], keyword: string, deps: WaybackDependencies): Promise<HistoricalEvidenceSummary> {
  const evidence: WaybackEvidence[] = [];
  const claims: HistoricalClaim[] = [];
  const riskSignals: Array<{ code: string; evidenceIds: string[] }> = [];
  const topics: string[] = [];
  for (const capture of captures.slice(0, MAX_REPLAYS)) {
    const replay = `${ARCHIVE}/web/${capture.timestamp}id_/${capture.original}`;
    const result = await request(replay, deps, 'manual', true);
    const item: WaybackEvidence = { id: evidenceId('replay', evidence.length, result.body), sourceEndpoint: '/web/<timestamp>id_/', sourceUrl: replay, retrievedAt: (deps.now ?? (() => new Date()))().toISOString(), snapshotTimestamp: capture.timestamp, responseDigest: sha(result.body), documented: true, status: result.status };
    evidence.push(item);
    if (result.status !== 'ok') continue;
    const location = result.response?.headers?.get('location') ?? null;
    if (location) {
      if (!safeRedirect(location) || location === replay) { item.status = 'rejected'; riskSignals.push({ code: 'redirect_rejected', evidenceIds: [item.id] }); }
      else { claims.push({ kind: 'redirect_target', value: location, evidenceIds: [item.id] }); riskSignals.push({ code: 'redirect_chain', evidenceIds: [item.id] }); }
      continue;
    }
    if (Buffer.byteLength(result.body, 'utf8') > MAX_BODY_BYTES || !/^(text\/html|text\/plain)/iu.test(result.response?.headers?.get('content-type') ?? '')) { item.status = 'rejected'; continue; }
    const title = extract(result.body, /<title[^>]*>([\s\S]*?)<\/title>/iu);
    const description = extract(result.body, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/iu);
    const heading = extract(result.body, /<h1[^>]*>([\s\S]*?)<\/h1>/iu);
    const canonical = extract(result.body, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/iu);
    const visible = result.body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]*>/giu, ' ').replace(/\s+/gu, ' ').trim();
    const values: Array<[HistoricalClaim['kind'], string | null]> = [['title', title], ['meta_description', description], ['heading', heading], ['canonical_target', canonical]];
    for (const [kind, value] of values) if (value) claims.push({ kind, value, evidenceIds: [item.id] });
    if (keyword && visible.toLowerCase().includes(keyword.toLowerCase())) claims.push({ kind: 'visible_text_keyword', value: keyword, evidenceIds: [item.id] });
    const language = /<html[^>]+lang=["']([^"']+)/iu.exec(result.body)?.[1] ?? null;
    if (language) claims.push({ kind: 'language_hint', value: language, evidenceIds: [item.id] });
    const topic = `${title ?? ''} ${heading ?? ''}`.toLowerCase().trim();
    if (topic) topics.push(topic);
    if (/domain for sale|buy this domain|parking page/iu.test(visible)) riskSignals.push({ code: 'parked_or_for_sale', evidenceIds: [item.id] });
    if (/adult|casino|gambling|pharma|malware/iu.test(visible)) riskSignals.push({ code: 'abuse_lexicon', evidenceIds: [item.id] });
  }
  if (topics.length > 1 && topics[0] !== topics[topics.length - 1]) riskSignals.push({ code: 'topic_pivot', evidenceIds: evidence.map(item => item.id) });
  if (captures.length > 1 && Number(captures[captures.length - 1].timestamp.slice(0, 4)) - Number(captures[0].timestamp.slice(0, 4)) > 3) riskSignals.push({ code: 'capture_gap', evidenceIds: evidence.map(item => item.id) });
  for (const signal of riskSignals) claims.push({ kind: signal.code === 'topic_pivot' ? 'topic_pivot' : signal.code === 'capture_gap' ? 'capture_gap' : signal.code === 'parked_or_for_sale' ? 'parked_signal' : signal.code === 'abuse_lexicon' ? 'abuse_signal' : 'redirect_chain', value: signal.code, evidenceIds: signal.evidenceIds });
  return { status: evidence.some(item => item.status !== 'ok') ? 'partial' : 'ok', claims, evidence, riskSignals };
}
