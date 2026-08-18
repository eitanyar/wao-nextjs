/**
 * Website fact extractor — fetch client pages, LLM-extract candidate facts,
 * keep only facts whose sourceQuote is a verbatim substring of the page text.
 *
 * Hebrew fact values move only as runtime data copied from fetched pages.
 * This module contains no Hebrew literals.
 *
 *   extractFactsFromPages(urls, opts) -> { facts, harvested, passed, dropped }
 *   normalize(s) — deterministic gate normalizer (exported for unit checks)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FETCH_TIMEOUT_MS = 10_000;
const LLM_TIMEOUT_MS = 180_000;
const LLM_ATTEMPTS = 3;
const DEFAULT_MODEL = 'qwen3.7-plus';
const MAX_CHARS_PER_CALL = 80_000;
const CATEGORIES = new Set([
  'person',
  'credential',
  'certifying_body',
  'program',
  'number',
  'pricing',
  'outcome',
]);

const SYSTEM_PROMPT = [
  'Extract only concrete, checkable facts (people + roles, credentials,',
  'certifying/accrediting/funding bodies, program specifics, prices, and',
  'hard numbers/outcomes) that appear in the provided page text. For each',
  'fact return an object with: category (one of',
  'person|credential|certifying_body|program|number|pricing|outcome),',
  'value (the fact stated concisely IN THE ORIGINAL HEBREW as it appears',
  'on the page), and sourceQuote (an EXACT verbatim substring copied from',
  'the page text that contains this fact). Never paraphrase the sourceQuote.',
  'Never invent facts not present in the text. Return JSON: { facts: [...] }.',
].join(' ');

let envCache = null;

function loadEnv() {
  if (envCache) return envCache;
  const env = {};
  const envFile = path.resolve(__dirname, '../../.env.local');
  fs.readFileSync(envFile, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
  envCache = env;
  return envCache;
}

function envVal(name) {
  return Object.prototype.hasOwnProperty.call(process.env, name)
    ? process.env[name]
    : loadEnv()[name];
}

function stripHtml(html) {
  return html
    .replace(/<(script|style|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalize(s) {
  return String(s ?? '')
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[\u05F4\u201C\u201D\u0022]/g, '\u0022')
    .replace(/[\u05F3\u2018\u2019\u0027]/g, '\u0027')
    .replace(/[\s\u00A0]+/g, ' ')
    .trim();
}

function shortHash(input) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 8);
}

function makeId(category, value) {
  return `${category}-${shortHash(normalize(value))}`;
}

function parseJsonObject(raw) {
  const text = String(raw ?? '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error('malformed LLM JSON');
  }
}

async function fetchPageText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WAO-GEO-Bot/1.0)' },
    });
    const html = await res.text();
    return stripHtml(html);
  } finally {
    clearTimeout(timer);
  }
}

function chunkPages(pages) {
  const groups = [];
  let current = [];
  let currentLen = 0;
  for (const page of pages) {
    if (current.length && currentLen + page.text.length > MAX_CHARS_PER_CALL) {
      groups.push(current);
      current = [];
      currentLen = 0;
    }
    current.push(page);
    currentLen += page.text.length;
  }
  if (current.length) groups.push(current);
  return groups;
}

function buildUserMessage(pages) {
  return pages
    .map((page, i) => `PAGE ${i + 1}\nURL: ${page.url}\nTEXT:\n${page.text}`)
    .join('\n\n');
}

async function callQwenOnce(systemPrompt, userMessage, model) {
  const apiKey = envVal('QWEN_API_KEY');
  const baseUrl = envVal('QWEN_BASE_URL');
  if (!apiKey || !baseUrl) throw new Error('Qwen not configured');

  const url = `${baseUrl}/chat/completions`;
  const payload = {
    model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  };
  // Thinking stays ON: omit enable_thinking (DashScope default).

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Qwen error ${res.status}: ${JSON.stringify(data)}`);
  const raw = data?.choices?.[0]?.message?.content ?? '{}';
  return parseJsonObject(raw);
}

async function callQwen(systemPrompt, userMessage, model) {
  let lastErr;
  for (let i = 0; i < LLM_ATTEMPTS; i++) {
    try {
      return await callQwenOnce(systemPrompt, userMessage, model);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function findSourcePage(quote, pages) {
  const needle = normalize(quote);
  if (!needle) return null;
  for (const page of pages) {
    if (normalize(page.text).includes(needle)) return page;
  }
  return null;
}

function stampFact(raw, page) {
  const category = String(raw.category || '').trim().toLowerCase();
  const value = typeof raw.value === 'string' ? raw.value.trim() : '';
  const sourceQuote = typeof raw.sourceQuote === 'string' ? raw.sourceQuote : '';
  if (!CATEGORIES.has(category) || !value || !sourceQuote) return null;
  return {
    id: makeId(category, value),
    category,
    value,
    sourceQuote,
    sourceUrl: page.url,
    source: 'website:auto',
    confirmed: false,
  };
}

async function extractCandidates(pages, model) {
  if (!pages.length) return [];
  const parsed = await callQwen(SYSTEM_PROMPT, buildUserMessage(pages), model);
  return Array.isArray(parsed?.facts) ? parsed.facts : [];
}

export async function extractFactsFromPages(urls, opts = {}) {
  const model = opts.model || DEFAULT_MODEL;
  const pages = [];

  for (const url of urls) {
    try {
      const text = await fetchPageText(url);
      if (text) pages.push({ url, text });
    } catch (err) {
      console.error(`fetch failed: ${url} (${err.message})`);
    }
  }

  const harvested = [];
  for (const group of chunkPages(pages)) {
    const batch = await extractCandidates(group, model);
    harvested.push(...batch);
  }

  const seen = new Set();
  const facts = [];
  let dropped = 0;

  for (const raw of harvested) {
    const page = findSourcePage(raw?.sourceQuote, pages);
    const fact = page ? stampFact(raw, page) : null;
    if (!fact) {
      dropped += 1;
      continue;
    }
    const key = normalize(fact.value);
    if (!key || seen.has(key)) {
      dropped += 1;
      continue;
    }
    seen.add(key);
    facts.push(fact);
  }

  return {
    facts,
    harvested: harvested.length,
    passed: facts.length,
    dropped,
  };
}
