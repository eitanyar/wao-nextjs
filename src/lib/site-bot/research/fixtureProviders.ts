/**
 * Zero-network research providers for rehearsals and tests (paid-journey v2 M0.5, B5).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 *
 * The real DataForSEO and NeuronWriter adapters run unchanged (request building,
 * response parsing, budget/usage ledger); only their transport is swapped for an
 * in-memory fetch that answers from synthetic, deterministic fixtures shaped like
 * the responses the adapters parse. Nothing here holds real business or SERP data:
 * keywords echo the caller's own seeds with fixed Latin suffixes, and every
 * domain is under the reserved `.example` TLD. Every task/query ID starts with
 * `fixture-`, so a fixture dossier is identifiable in its providerUsage ledger.
 *
 * The transport never calls the real fetch. An endpoint without a fixture throws.
 */

import {
  classifySearchIntent,
  expandServiceSeeds,
  fetchKeywordMetrics,
  fetchLocalSerpEvidence,
} from './dataForSeoResearch';
import { createServiceQuery, getServiceQuery } from './neuronWriter';
import type { ResearchProviders } from './runResearch';

const DATAFORSEO_PREFIX = 'https://api.dataforseo.com/v3';
const NEURON_PREFIX = 'https://api.neuronwriter.com/neuron-api/0.5/writer';
export const FIXTURE_CREDENTIAL = 'fixture-no-network';
export const FIXTURE_NEURON_PROJECT_ID = 'fixture-project';

type Json = Record<string, unknown>;

function hash(value: string): string {
  // FNV-1a: deterministic, dependency-free short IDs.
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

function task(operation: string, key: string, items: Json[]): Json {
  return { id: `fixture-${operation}-${hash(key)}`, cost: 0, status_code: 20000, status_message: 'Ok.', result: [{ items }] };
}

function bodyOf(init: RequestInit | undefined): unknown {
  if (typeof init?.body !== 'string') return null;
  try { return JSON.parse(init.body); } catch { return null; }
}

function list(value: unknown): Json[] {
  return Array.isArray(value) ? value.filter((item): item is Json => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function keywordOf(item: Json): string {
  return typeof item.keyword === 'string' ? item.keyword : '';
}

function dataForSeoResponse(endpoint: string, body: unknown): Json | null {
  const tasks = list(body);
  switch (endpoint) {
    case '/dataforseo_labs/google/related_keywords/live':
      return { tasks: tasks.map(item => {
        const seed = keywordOf(item);
        return task('related', seed, [
          { keyword_data: { keyword: `${seed} price` } },
          { keyword_data: { keyword: `${seed} near me` } },
        ]);
      }) };
    case '/keywords_data/google/search_volume/live':
      return { tasks: tasks.map(item => {
        const keywords = Array.isArray(item.keywords) ? item.keywords.filter((k): k is string => typeof k === 'string') : [];
        return task('volume', keywords.join('|'), keywords.map((keyword, index) => ({
          keyword,
          search_volume: 90 - (index % 9) * 10,
          cpc: 1.5,
          competition: 0.4,
          competition_level: 'MEDIUM',
          monthly_searches: [{ year: 2026, month: 10, search_volume: 90 - (index % 9) * 10 }],
        })));
      }) };
    case '/dataforseo_labs/google/search_intent/live':
      return { tasks: tasks.map((item, index) => {
        const keyword = keywordOf(item);
        return task('intent', keyword, [{ keyword, search_intent_info: { main_intent: index % 2 === 0 ? 'commercial' : 'transactional' } }]);
      }) };
    case '/serp/google/organic/live/advanced':
      return { tasks: tasks.map(item => {
        const keyword = keywordOf(item);
        const slug = hash(keyword);
        return task('serp', keyword, [1, 2, 3].map(rank => ({
          type: 'organic',
          rank_group: rank,
          rank_absolute: rank,
          domain: `fixture-local-${rank}.example`,
          url: `https://fixture-local-${rank}.example/services/${slug}`,
          title: `Fixture Local Business ${rank}`,
        })));
      }) };
    default:
      return null;
  }
}

function neuronResponse(endpoint: string, body: unknown): Json | null {
  const record = body && typeof body === 'object' && !Array.isArray(body) ? body as Json : {};
  const query = typeof record.query === 'string' ? record.query : '';
  switch (endpoint) {
    case '/projects':
      return { projects: [{ id: FIXTURE_NEURON_PROJECT_ID, name: 'fixture', search_engine: 'google.co.il', language: 'Hebrew' }] };
    case '/new-query':
      return { query: {
        id: `fixture-neuron-${hash(query)}`,
        status: 'ready',
        terms: { title: [query], h1: [query], body: [query] },
        questions: { suggested: [`${query}?`] },
        competitors: [{ url: 'https://fixture-local-1.example/', title: 'Fixture Local Business 1', score: 50 }],
      } };
    case '/get-query':
      return { id: query, status: 'ready' };
    default:
      return null;
  }
}

export interface FixtureFetchCall {
  url: string;
  method: string;
}

/** A fetch stand-in that answers only from fixtures. `calls` records every request it served. */
export function createFixtureFetch(calls: FixtureFetchCall[] = []): typeof globalThis.fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? 'GET';
    calls.push({ url, method });
    const body = bodyOf(init);
    const payload = url.startsWith(`${DATAFORSEO_PREFIX}/`)
      ? dataForSeoResponse(url.slice(DATAFORSEO_PREFIX.length), body)
      : url.startsWith(`${NEURON_PREFIX}/`)
        ? neuronResponse(url.slice(NEURON_PREFIX.length), body)
        : null;
    if (!payload) throw new Error(`fixture transport has no recording for ${method} ${url}`);
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof globalThis.fetch;
}

/** Real adapters on the fixture transport. Fresh caches per call so runs are independent. */
export function fixtureResearchProviders(calls: FixtureFetchCall[] = []): ResearchProviders {
  const fetch = createFixtureFetch(calls);
  const dataForSeo = { token: FIXTURE_CREDENTIAL, fetch, cache: new Map() };
  const neuron = { apiKey: FIXTURE_CREDENTIAL, projectId: FIXTURE_NEURON_PROJECT_ID, fetch, queryIds: new Map<string, string>() };
  return {
    dataForSeo: {
      expand: seeds => expandServiceSeeds(seeds, dataForSeo),
      metrics: keywords => fetchKeywordMetrics(keywords, dataForSeo),
      intent: keywords => classifySearchIntent(keywords, dataForSeo),
      serps: keywords => fetchLocalSerpEvidence(keywords, dataForSeo),
    },
    neuron: {
      create: input => createServiceQuery(input, neuron),
      get: (queryId, input) => getServiceQuery(queryId, input, neuron),
    },
  };
}
