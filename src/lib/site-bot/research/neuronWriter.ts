/**
 * Bounded NeuronWriter adapter for shortlisted service and intent clusters.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 *
 * Content depth (2026-11-10): parsed against one real Hebrew /get-query response
 * (testdata/neuronwriter-get-query-he.json) and the NeuronWriter API docs. The real shape:
 * - host app.neuronwriter.com (api.neuronwriter.com does not resolve);
 * - /new-query takes { project, keyword, engine, language, competitors_mode } and returns { query: "<id>", ... };
 * - /get-query returns the query fields at the root: { status, query: "<id>", metrics: { word_count: { median, target } },
 *   terms: { title, desc, h1, h2, content_basic, content_extended, entities } with items { t, usage_pc, sugg_usage: [min, max] },
 *   ideas: { suggest_questions, people_also_ask, content_questions: [{ q }], topic_matrix: { "<question>": { importance } } },
 *   competitors: [{ rank, url, title, desc, headers, content_score, word_count }] };
 * - projects are listed by POST /list-projects: [{ project, name, language, engine }].
 */

export const NEURON_WRITER_BASE_URL = 'https://app.neuronwriter.com/neuron-api/0.5/writer';
const REQUIRED_SEARCH_ENGINE = 'google.co.il';
const REQUIRED_LANGUAGE = 'Hebrew';
const REQUIRED_COMPETITORS_MODE = 'top-intent';
const defaultQueryIds = new Map<string, string>();

export interface NeuronWriterOptions {
  apiKey?: string;
  projectId?: string;
  fetch?: typeof globalThis.fetch;
  queryIds?: Map<string, string>;
}

export interface ServiceQueryInput {
  serviceKeyword: string;
  intentCluster: string;
  pageClass: 'service' | string;
}

export interface NeuronProject {
  id: string;
  name?: string;
  searchEngine?: string;
  language?: string;
}

/** One content term with NeuronWriter's suggested usage range on the page (sugg_usage [min, max]). */
export interface NeuronTermUsage {
  t: string;
  min: number;
  max: number;
  /** Share of competitors that use the term (usage_pc), when given. */
  usagePc?: number;
  tier: 'basic' | 'extended';
}

export interface NeuronServiceQuery {
  id: string;
  status: 'waiting' | 'ready';
  serviceKeyword: string;
  intentCluster: string;
  /** Flat numbers plus nested metrics flattened as "<metric>.<key>" (e.g. "word_count.target"). */
  metrics: Record<string, number>;
  /** metrics.word_count.target (competitor-derived visible word target), when given. */
  wordTarget?: number;
  /** metrics.word_count.median, when given. */
  wordMedian?: number;
  titleTerms: string[];
  metaTerms: string[];
  h1Terms: string[];
  h2Terms: string[];
  /** Term texts of content_basic then content_extended (bodyTermUsage carries the ranges). */
  bodyTerms: string[];
  /** Always set by the parser; optional so hand-built test doubles stay valid. */
  bodyTermUsage?: NeuronTermUsage[];
  entities: string[];
  suggestedQuestions: string[];
  paaQuestions: string[];
  contentQuestions: string[];
  /** ideas.topic_matrix questions, most important first (undocumented; present in the real response). */
  topicQuestions?: string[];
  competitors: Array<{ url?: string; title?: string; score?: number }>;
}

export interface ContentEvaluation {
  score?: number;
  metrics: Record<string, number>;
  terms: string[];
  entities: string[];
  questions: string[];
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function itemText(item: unknown): string | undefined {
  const direct = asString(item);
  if (direct) return direct;
  const record = asRecord(item);
  // Real items are { t } (terms) and { q } (questions); the other keys are tolerated older guesses.
  return asString(record.t) ?? asString(record.q) ?? asString(record.text) ?? asString(record.term) ?? asString(record.keyword)
    ?? asString(record.question) ?? asString(record.name);
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const text = itemText(item);
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

/** Flat numbers, plus one level of nested numbers as "<key>.<inner>" (metrics.word_count.{median,target} is nested). */
function numberRecord(value: unknown): Record<string, number> {
  return Object.fromEntries(Object.entries(asRecord(value)).flatMap(([key, entry]) => {
    const number = asNumber(entry);
    if (number !== undefined) return [[key, number]];
    return Object.entries(asRecord(entry)).flatMap(([inner, nested]) => {
      const value = asNumber(nested);
      return value === undefined ? [] : [[`${key}.${inner}`, value]];
    });
  }));
}

function termUsage(value: unknown, tier: NeuronTermUsage['tier']): NeuronTermUsage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const record = asRecord(item);
    const t = asString(record.t) ?? asString(item);
    if (!t) return [];
    const range = Array.isArray(record.sugg_usage) ? record.sugg_usage.map(asNumber) : [];
    const min = range[0];
    const max = range[1] ?? range[0];
    if (min === undefined || max === undefined || min < 0 || max < min) return [];
    const usagePc = asNumber(record.usage_pc);
    return [{ t, min, max, ...(usagePc === undefined ? {} : { usagePc }), tier }];
  });
}

/** ideas.topic_matrix: an object keyed by question text, { importance }; most important first, then response order. */
function topicMatrixQuestions(value: unknown): string[] {
  return Object.entries(asRecord(value))
    .map(([question, entry], index) => ({ question: question.trim(), importance: asNumber(asRecord(entry).importance) ?? 0, index }))
    .filter(item => item.question)
    .sort((left, right) => right.importance - left.importance || left.index - right.index)
    .map(item => item.question);
}

function requireApiKey(options: NeuronWriterOptions): string {
  const apiKey = options.apiKey ?? process.env.NEURONWRITER_API_KEY;
  if (!apiKey) throw new Error('NEURONWRITER_API_KEY is required');
  return apiKey;
}

function requireProjectId(options: NeuronWriterOptions): string {
  const projectId = options.projectId ?? process.env.NEURONWRITER_PROJECT_ID;
  if (!projectId) throw new Error('NEURONWRITER_PROJECT_ID is required');
  return projectId;
}

function queryKey(projectId: string, input: ServiceQueryInput): string {
  return `${projectId}:${input.serviceKeyword.trim().toLowerCase()}:${input.intentCluster.trim().toLowerCase()}`;
}

function validateServiceInput(input: ServiceQueryInput): ServiceQueryInput {
  if (input.pageClass !== 'service') throw new Error('NeuronWriter only supports service page analyses');
  const serviceKeyword = input.serviceKeyword.trim();
  const intentCluster = input.intentCluster.trim();
  if (!serviceKeyword || !intentCluster) throw new Error('Service keyword and intent cluster are required');
  return { ...input, serviceKeyword, intentCluster };
}

async function request(path: string, init: RequestInit, options: NeuronWriterOptions): Promise<unknown> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const response = await fetchImpl(`${NEURON_WRITER_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': requireApiKey(options),
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`NeuronWriter HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw new Error('NeuronWriter returned malformed JSON');
  }
}

function responseItems(payload: unknown): UnknownRecord[] {
  // POST /list-projects returns a bare array.
  if (Array.isArray(payload)) return payload.map(asRecord);
  const record = asRecord(payload);
  const candidates = [record.projects, record.data, record.items, record.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(asRecord);
  }
  return [];
}

export async function listNeuronProjects(options: NeuronWriterOptions = {}): Promise<NeuronProject[]> {
  const payload = await request('/list-projects', { method: 'POST', body: '{}' }, options);
  return responseItems(payload).flatMap(project => {
    const id = asString(project.project) ?? asString(project.id) ?? asString(project.project_id);
    if (!id) return [];
    const normalized: NeuronProject = { id };
    const name = asString(project.name) ?? asString(project.project_name);
    const searchEngine = asString(project.engine) ?? asString(project.search_engine) ?? asString(project.searchEngine);
    const language = asString(project.language);
    if (name) normalized.name = name;
    if (searchEngine) normalized.searchEngine = searchEngine;
    if (language) normalized.language = language;
    return [normalized];
  });
}

function normalizeQuery(payload: unknown, input: Pick<ServiceQueryInput, 'serviceKeyword' | 'intentCluster'>): NeuronServiceQuery {
  const root = asRecord(payload);
  // Real responses carry the fields at the root and the ID as the string `query`; a nested `query` object is tolerated.
  const record = asRecord(root.query && typeof root.query === 'object' ? root.query : payload);
  const id = asString(record.id) ?? asString(record.query_id) ?? asString(root.query) ?? asString(root.id) ?? asString(root.query_id);
  if (!id) throw new Error('NeuronWriter query response missing query ID');
  // Real statuses: not found | waiting | in progress | ready.
  const rawStatus = (asString(record.status) ?? asString(root.status) ?? '').toLowerCase();
  const status = rawStatus === 'ready' || rawStatus === 'completed' ? 'ready' : 'waiting';
  const terms = asRecord(record.terms);
  const ideas = asRecord(record.ideas);
  const questions = asRecord(record.questions);
  const metrics = numberRecord(record.metrics);
  const bodyTermUsage = [...termUsage(terms.content_basic, 'basic'), ...termUsage(terms.content_extended, 'extended')];
  const legacyBody = strings(terms.body ?? record.body_terms);
  const competitorsRaw = Array.isArray(record.competitors) ? record.competitors : [];
  const competitors = competitorsRaw.map(asRecord).map(competitor => {
    const result: { url?: string; title?: string; score?: number } = {};
    const url = asString(competitor.url);
    const title = asString(competitor.title);
    const score = asNumber(competitor.score) ?? asNumber(competitor.content_score);
    if (url) result.url = url;
    if (title) result.title = title;
    if (score !== undefined) result.score = score;
    return result;
  });
  const wordTarget = metrics['word_count.target'];
  const wordMedian = metrics['word_count.median'];
  return {
    id,
    status,
    serviceKeyword: input.serviceKeyword,
    intentCluster: input.intentCluster,
    metrics,
    ...(wordTarget === undefined ? {} : { wordTarget }),
    ...(wordMedian === undefined ? {} : { wordMedian }),
    titleTerms: strings(terms.title ?? record.title_terms),
    metaTerms: strings(terms.desc ?? terms.meta ?? record.meta_terms),
    h1Terms: strings(terms.h1 ?? record.h1_terms),
    h2Terms: strings(terms.h2 ?? record.h2_terms),
    bodyTerms: bodyTermUsage.length ? [...new Set(bodyTermUsage.map(term => term.t))] : legacyBody,
    bodyTermUsage,
    entities: strings(terms.entities ?? record.entities),
    suggestedQuestions: strings(ideas.suggest_questions ?? questions.suggested ?? record.suggested_questions),
    paaQuestions: strings(ideas.people_also_ask ?? questions.paa ?? record.paa_questions),
    contentQuestions: strings(ideas.content_questions ?? questions.content ?? record.content_questions),
    topicQuestions: topicMatrixQuestions(ideas.topic_matrix),
    competitors,
  };
}

async function verifyProject(projectId: string, options: NeuronWriterOptions): Promise<void> {
  const project = (await listNeuronProjects(options)).find(candidate => candidate.id === projectId);
  if (!project) throw new Error('Configured NeuronWriter project was not found');
  if (project.searchEngine !== REQUIRED_SEARCH_ENGINE || project.language !== REQUIRED_LANGUAGE) {
    throw new Error('Configured NeuronWriter project must use google.co.il and Hebrew');
  }
}

export async function createServiceQuery(input: ServiceQueryInput, options: NeuronWriterOptions = {}): Promise<NeuronServiceQuery> {
  const validated = validateServiceInput(input);
  const projectId = requireProjectId(options);
  const cache = options.queryIds ?? defaultQueryIds;
  const key = queryKey(projectId, validated);
  const existingId = cache.get(key);
  if (existingId) return getServiceQuery(existingId, validated, options);

  await verifyProject(projectId, options);
  const payload = await request('/new-query', {
    method: 'POST',
    body: JSON.stringify({
      project: projectId,
      keyword: validated.serviceKeyword,
      engine: REQUIRED_SEARCH_ENGINE,
      language: REQUIRED_LANGUAGE,
      competitors_mode: REQUIRED_COMPETITORS_MODE,
    }),
  }, options);
  const normalized = normalizeQuery(payload, validated);
  cache.set(key, normalized.id);
  return normalized;
}

export async function getServiceQuery(queryId: string, input: Pick<ServiceQueryInput, 'serviceKeyword' | 'intentCluster'>, options: NeuronWriterOptions = {}): Promise<NeuronServiceQuery> {
  if (!queryId.trim()) throw new Error('NeuronWriter query ID is required');
  const payload = await request('/get-query', {
    method: 'POST',
    body: JSON.stringify({ query: queryId }),
  }, options);
  return normalizeQuery(payload, input);
}

export interface PollOptions {
  /** get-query attempts (default 6). */
  attempts?: number;
  /** Wait between attempts in ms (default 30000; analysis takes about 60 s to a few minutes). */
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Bounded wait for a query to become ready: get-query up to `attempts` times, sleeping between non-ready answers.
 * get-query does not start a new analysis (only /new-query spends quota). Returns the last answer, ready or not.
 */
export async function pollServiceQuery(
  queryId: string,
  input: Pick<ServiceQueryInput, 'serviceKeyword' | 'intentCluster'>,
  options: NeuronWriterOptions = {},
  poll: PollOptions = {},
): Promise<NeuronServiceQuery> {
  const attempts = Math.max(1, Math.min(20, Math.floor(poll.attempts ?? 6)));
  const sleep = poll.sleep ?? (ms => new Promise<void>(resolve => setTimeout(resolve, ms)));
  let last = await getServiceQuery(queryId, input, options);
  for (let attempt = 1; attempt < attempts && last.status !== 'ready'; attempt++) {
    await sleep(poll.intervalMs ?? 30_000);
    last = await getServiceQuery(queryId, input, options);
  }
  return last;
}

// TODO(content depth, Yonatan 2026-11-10): /evaluate-content scores cost quota. Never call it during generation and never
// regenerate to chase the score; a sampled, log-only evaluation job comes later.
export async function evaluateServiceContent(
  queryId: string,
  content: { html: string; title: string; description: string },
  options: NeuronWriterOptions = {}
): Promise<ContentEvaluation> {
  if (!queryId.trim() || !content.html.trim() || !content.title.trim() || !content.description.trim()) {
    throw new Error('Query, HTML, title, and description are required for NeuronWriter evaluation');
  }
  const payload = await request('/evaluate-content', {
    method: 'POST',
    body: JSON.stringify({ query: queryId, html: content.html, title: content.title, description: content.description }),
  }, options);
  const record = asRecord(payload);
  const evaluation = asRecord(record.evaluation && typeof record.evaluation === 'object' ? record.evaluation : payload);
  const score = asNumber(evaluation.score) ?? asNumber(evaluation.content_score);
  const result: ContentEvaluation = {
    metrics: numberRecord(evaluation.metrics),
    terms: strings(evaluation.terms),
    entities: strings(evaluation.entities),
    questions: strings(evaluation.questions),
  };
  if (score !== undefined) result.score = score;
  return result;
}
