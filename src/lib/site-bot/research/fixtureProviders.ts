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
import fs from 'node:fs';
import { createServiceQuery, getServiceQuery, NEURON_WRITER_BASE_URL } from './neuronWriter';
import type { ResearchProviders } from './runResearch';

const DATAFORSEO_PREFIX = 'https://api.dataforseo.com/v3';
const NEURON_PREFIX = NEURON_WRITER_BASE_URL;
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

/**
 * Rerun-3 bug 2: optional question text per NeuronWriter keyword, one per ideas group. The synthetic default
 * (`<keyword> paa question?` ...) names no code-owned fact topic, so a fixture run can never build a code-built Q&A item
 * (copy v2 slice 6) and every Q&A item is model-written. An eval supplies realistic pool questions here (a JSON file named by
 * SITE_BOT_FIXTURE_QUESTIONS_FILE, keyed by the exact keyword). A group missing from an entry keeps its synthetic default.
 */
export interface FixtureQuestionSet {
  paa?: string;
  suggested?: string;
  topic?: string;
  content?: string;
}
export type FixtureQuestions = Readonly<Record<string, FixtureQuestionSet>>;
const QUESTION_GROUPS: readonly (keyof FixtureQuestionSet)[] = ['paa', 'suggested', 'topic', 'content'];

/** Validate a fixture question file's parsed JSON; throws on anything but { keyword: { group: non-empty string } }. */
export function parseFixtureQuestions(value: unknown): FixtureQuestions {
  const isRecord = (item: unknown): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item);
  if (!isRecord(value)) throw new Error('fixture questions: expected an object keyed by keyword');
  const out: Record<string, FixtureQuestionSet> = {};
  for (const [keyword, entry] of Object.entries(value)) {
    if (!isRecord(entry)) throw new Error(`fixture questions: entry for ${JSON.stringify(keyword)} is not an object`);
    const set: FixtureQuestionSet = {};
    for (const [group, question] of Object.entries(entry)) {
      if (!QUESTION_GROUPS.includes(group as keyof FixtureQuestionSet)) throw new Error(`fixture questions: unknown group ${JSON.stringify(group)}`);
      if (typeof question !== 'string' || !question.trim()) throw new Error(`fixture questions: ${JSON.stringify(group)} for ${JSON.stringify(keyword)} must be a non-empty string`);
      set[group as keyof FixtureQuestionSet] = question;
    }
    out[keyword] = set;
  }
  return out;
}

/** The fixture questions named by SITE_BOT_FIXTURE_QUESTIONS_FILE (unset = none). Fails closed on an unreadable or bad file. */
export function fixtureQuestionsFromEnv(env: { SITE_BOT_FIXTURE_QUESTIONS_FILE?: string } = process.env): FixtureQuestions | undefined {
  const file = env.SITE_BOT_FIXTURE_QUESTIONS_FILE;
  if (!file) return undefined;
  return parseFixtureQuestions(JSON.parse(fs.readFileSync(file, 'utf8')));
}

/**
 * A ready /get-query payload in the real response shape (testdata/neuronwriter-get-query-he.json), with synthetic Latin
 * terms built from the keyword: word-count target, content terms with sugg_usage ranges, H2 terms, and questions in every
 * ideas group (PAA, suggested, topic matrix, content).
 */
export function fixtureNeuronReadyPayload(queryId: string, keyword: string, questions?: FixtureQuestions): Json {
  const set: FixtureQuestionSet = (questions && Object.prototype.hasOwnProperty.call(questions, keyword) ? questions[keyword] : undefined) ?? {};
  return {
    status: 'ready',
    query: queryId,
    keyword,
    language: 'Hebrew',
    engine: 'google.co.il',
    metrics: { word_count: { median: 380, target: 420 }, readability: { median: 60, target: 60 } },
    terms: {
      title: [{ t: keyword, usage_pc: 90 }],
      desc: [{ t: keyword, usage_pc: 80 }],
      h1: [{ t: keyword, usage_pc: 70 }],
      h2: [{ t: `${keyword} steps`, usage_pc: 40 }, { t: `${keyword} questions`, usage_pc: 30 }],
      content_basic: [
        { t: keyword, usage_pc: 100, sugg_usage: [2, 5] },
        { t: `${keyword} method`, usage_pc: 60, sugg_usage: [1, 2] },
      ],
      content_extended: [{ t: `${keyword} detail`, usage_pc: 30, sugg_usage: [1, 1] }],
      entities: [{ t: `${keyword} entity`, importance: 5, relevance: 0.5, confidence: 0.5, links: [] }],
    },
    ideas: {
      suggest_questions: [{ q: set.suggested ?? `${keyword} suggested question?` }],
      people_also_ask: [{ q: set.paa ?? `${keyword} paa question?` }],
      topic_matrix: { [set.topic ?? `${keyword} topic question?`]: { importance: 8 } },
      content_questions: [{ q: set.content ?? `${keyword} content question?` }],
    },
    competitors: [{ rank: 1, url: 'https://fixture-local-1.example/', title: 'Fixture Local Business 1', desc: 'fixture', headers: [], content_score: 50, word_count: 420 }],
  };
}

function neuronResponse(endpoint: string, body: unknown, keywords: Map<string, string>, questions?: FixtureQuestions): Json | Json[] | null {
  const record = body && typeof body === 'object' && !Array.isArray(body) ? body as Json : {};
  switch (endpoint) {
    case '/list-projects':
      return [{ project: FIXTURE_NEURON_PROJECT_ID, name: 'fixture', engine: 'google.co.il', language: 'Hebrew' }];
    case '/new-query': {
      // The real /new-query answers with the new query ID only; the analysis is read back through /get-query.
      const keyword = typeof record.keyword === 'string' ? record.keyword : '';
      const id = `fixture-neuron-${hash(keyword)}`;
      keywords.set(id, keyword);
      return { query: id, query_url: `https://fixture-neuron.example/analysis/view/${id}` };
    }
    case '/get-query': {
      const id = typeof record.query === 'string' ? record.query : '';
      const keyword = keywords.get(id);
      return keyword === undefined ? { status: 'not found' } : fixtureNeuronReadyPayload(id, keyword, questions);
    }
    default:
      return null;
  }
}

export interface FixtureFetchCall {
  url: string;
  method: string;
}

/** A fetch stand-in that answers only from fixtures. `calls` records every request it served. */
export function createFixtureFetch(calls: FixtureFetchCall[] = [], questions?: FixtureQuestions): typeof globalThis.fetch {
  const neuronKeywords = new Map<string, string>();
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? 'GET';
    calls.push({ url, method });
    const body = bodyOf(init);
    const payload = url.startsWith(`${DATAFORSEO_PREFIX}/`)
      ? dataForSeoResponse(url.slice(DATAFORSEO_PREFIX.length), body)
      : url.startsWith(`${NEURON_PREFIX}/`)
        ? neuronResponse(url.slice(NEURON_PREFIX.length), body, neuronKeywords, questions)
        : null;
    if (!payload) throw new Error(`fixture transport has no recording for ${method} ${url}`);
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof globalThis.fetch;
}

/** Real adapters on the fixture transport. Fresh caches per call so runs are independent. */
export function fixtureResearchProviders(calls: FixtureFetchCall[] = [], questions?: FixtureQuestions): ResearchProviders {
  const fetch = createFixtureFetch(calls, questions);
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
