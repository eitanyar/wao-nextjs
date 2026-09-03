/**
 * Bounded NeuronWriter adapter for shortlisted service and intent clusters.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

const NEURON_WRITER_BASE_URL = 'https://api.neuronwriter.com/neuron-api/0.5/writer';
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

export interface NeuronServiceQuery {
  id: string;
  status: 'waiting' | 'ready';
  serviceKeyword: string;
  intentCluster: string;
  metrics: Record<string, number>;
  titleTerms: string[];
  metaTerms: string[];
  h1Terms: string[];
  h2Terms: string[];
  bodyTerms: string[];
  entities: string[];
  suggestedQuestions: string[];
  paaQuestions: string[];
  contentQuestions: string[];
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

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const direct = asString(item);
    if (direct) return [direct];
    const record = asRecord(item);
    return [asString(record.text), asString(record.term), asString(record.keyword), asString(record.question), asString(record.name)]
      .filter((entry): entry is string => Boolean(entry));
  });
}

function numberRecord(value: unknown): Record<string, number> {
  return Object.fromEntries(Object.entries(asRecord(value)).flatMap(([key, entry]) => {
    const number = asNumber(entry);
    return number === undefined ? [] : [[key, number]];
  }));
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
  const record = asRecord(payload);
  const candidates = [record.projects, record.data, record.items, record.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(asRecord);
  }
  return [];
}

export async function listNeuronProjects(options: NeuronWriterOptions = {}): Promise<NeuronProject[]> {
  const payload = await request('/projects', { method: 'GET' }, options);
  return responseItems(payload).flatMap(project => {
    const id = asString(project.id) ?? asString(project.project_id);
    if (!id) return [];
    const normalized: NeuronProject = { id };
    const name = asString(project.name) ?? asString(project.project_name);
    const searchEngine = asString(project.search_engine) ?? asString(project.searchEngine);
    const language = asString(project.language);
    if (name) normalized.name = name;
    if (searchEngine) normalized.searchEngine = searchEngine;
    if (language) normalized.language = language;
    return [normalized];
  });
}

function normalizeQuery(payload: unknown, input: Pick<ServiceQueryInput, 'serviceKeyword' | 'intentCluster'>): NeuronServiceQuery {
  const root = asRecord(payload);
  const record = asRecord(root.query && typeof root.query === 'object' ? root.query : payload);
  const id = asString(record.id) ?? asString(record.query_id) ?? asString(root.id) ?? asString(root.query_id);
  if (!id) throw new Error('NeuronWriter query response missing query ID');
  const rawStatus = (asString(record.status) ?? asString(root.status) ?? '').toLowerCase();
  const status = rawStatus === 'ready' || rawStatus === 'completed' ? 'ready' : 'waiting';
  const terms = asRecord(record.terms);
  const questions = asRecord(record.questions);
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
  return {
    id,
    status,
    serviceKeyword: input.serviceKeyword,
    intentCluster: input.intentCluster,
    metrics: numberRecord(record.metrics),
    titleTerms: strings(terms.title ?? record.title_terms),
    metaTerms: strings(terms.meta ?? record.meta_terms),
    h1Terms: strings(terms.h1 ?? record.h1_terms),
    h2Terms: strings(terms.h2 ?? record.h2_terms),
    bodyTerms: strings(terms.body ?? record.body_terms),
    entities: strings(record.entities),
    suggestedQuestions: strings(questions.suggested ?? record.suggested_questions),
    paaQuestions: strings(questions.paa ?? record.paa_questions),
    contentQuestions: strings(questions.content ?? record.content_questions),
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
      query: validated.serviceKeyword,
      search_engine: REQUIRED_SEARCH_ENGINE,
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
