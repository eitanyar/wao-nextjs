/**
 * Site Bot pilot (29.11.2026): the staff review pre-flight of one generated researched site
 * (docs/reviews/site-bot-mvp-audit-review-fable52-2026-11-24.md sections 2 P1-4, 3 P1-A, 5 and 6).
 *
 * Pure and read-only: the caller (scripts/site-bot/review-preflight.mjs) loads the site record, its dossier, the same-trade
 * peer records and any stored copy events, and writes the returned Markdown sheet. No model or paid API call happens here;
 * the stored gate results are surfaced, never re-run. Every check reuses the generator's own helpers (word counts, n-gram
 * similarity, foreign-script pattern, renderer, copy-review packet).
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. Hebrew reaches the sheet only as quoted record content.
 */

import { createHash } from 'node:crypto';
import type { CollectedData } from '../bot/prompts';
import { FOREIGN_SCRIPT_PATTERN, pageVisibleWords } from '../lp/copyGates';
import { DEPTH_BLOCKS, ngramJaccard, normalizedWords, prefixForms } from '../lp/depthBlocks';
import { SYSTEM_PRICE_FACT_ID } from '../lp/qaCodeOwned';
import { CODE_OWNED_FACT_FIELDS } from '../lp/researchPageCopy';
import { renderResearchedSitePages, researchedRenderedFieldsFor, type ResearchedSiteGraphEdge, type ResearchedSitePage } from '../lp/researchedSite';
import { VERTICAL_ASSETS } from '../lp/verticalAssets';
import { detectVertical } from '../lp/verticalDetect';
import { VERTICAL_THEMES } from '../lp/verticalThemes';
import { buildResearchedCopyReviewPacket } from './research/copyReviewPacket';
import { DEPTH_WORD_FLOOR, lengthBandFor } from './research/pageBrief';
import type { SiteResearchDossier } from './research/types';

export type PreflightStatus = 'PASS' | 'WARN' | 'FAIL';

export interface PreflightCheck {
  id: string;
  title: string;
  status: PreflightStatus;
  details: string[];
}

type Loose = Record<string, unknown>;

/** The fields of a stored researched site record the pre-flight reads (validated loosely: records come from disk). */
export interface PreflightSiteRecord {
  slug: string;
  researchId: string;
  approvedPageId?: string;
  collectedData: CollectedData;
  copy?: unknown;
  researchedPages: ResearchedSitePage[];
  researchedGraphEdges?: ResearchedSiteGraphEdge[];
  createdAt?: string;
}

/** One stored copy event (researchToSite onCopyEvent; persisted only by eval runs today). */
export interface PreflightCopyEvent {
  page?: string;
  stage?: string;
  kind?: string;
  violations?: Array<{ field?: string; rule?: string; limit?: number; actual?: unknown }>;
}

export interface PreflightAuditCandidate {
  placeId?: string;
  hasWebsite?: boolean;
  auditPath?: string;
}

export interface PreflightPeer {
  record: PreflightSiteRecord;
  dossier: SiteResearchDossier | null;
  recordPath: string;
}

export interface PreflightInput {
  record: PreflightSiteRecord;
  recordBytes: Uint8Array;
  recordPath: string;
  dossier: SiteResearchDossier | null;
  dossierPath: string | null;
  peers: PreflightPeer[];
  events: PreflightCopyEvent[] | null;
  eventsPath: string | null;
  auditCandidates: PreflightAuditCandidate[];
  /** YYYY-MM-DD of the sheet. */
  date: string;
}

export interface PeerSimilarity {
  slug: string;
  recordPath: string;
  jaccard: number;
  longestRun: number;
  run: string;
  status: PreflightStatus;
}

export interface PreflightResult {
  slug: string;
  status: PreflightStatus;
  checks: PreflightCheck[];
  similarity: { status: PreflightStatus; trade: string; peerCount: number; top: PeerSimilarity[] };
  sheet: string;
}

// ---------------------------------------------------------------------------
// Thresholds (Fable 5.2 review section 6, G4 swap test; N1 word floor)
// ---------------------------------------------------------------------------

export const SIMILARITY_WARN_JACCARD = 0.15;
export const SIMILARITY_FAIL_JACCARD = 0.25;
export const SHARED_RUN_WARN_WORDS = 8;
/** Pages that are noindex by design: the legal pages, the 404 page and the contact fallback (no trade -> noindex,follow). */
export const INTENDED_NOINDEX_FILES: readonly string[] = ['contact.html', 'privacy.html', 'accessibility.html', '404.html'];
export const REVIEW_TIME_TARGET_MINUTES = 25;

const BIDI_REGRESSION = /<bdi dir="ltr">\([^)<]*<\/bdi>/g;
const ROBOTS_NOINDEX = /<meta name="robots" content="[^"]*noindex/;

const worst = (statuses: readonly PreflightStatus[]): PreflightStatus =>
  statuses.includes('FAIL') ? 'FAIL' : statuses.includes('WARN') ? 'WARN' : 'PASS';

const isPlain = (value: unknown): value is Loose => value !== null && typeof value === 'object' && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const normalizeSpace = (value: string): string => value.normalize('NFC').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
// Model-written text (cross-client similarity input)
// ---------------------------------------------------------------------------

/** Rendered fields that are never the model's: system, owner or code-built strings (plus the code-owned fact fields). */
const NON_MODEL_FIELDS: ReadonlySet<string> = new Set([
  ...CODE_OWNED_FACT_FIELDS, 'heroCta', 'faqItems', 'reviewFeatured', 'servicesHeadline', 'serviceItems',
]);
/** Keys inside a rendered field that are labels, references or pool wording, not model prose. */
const NON_MODEL_KEYS: ReadonlySet<string> = new Set(['factIds', 'questionId', 'q', 'name']);
const QA_ITEMS = DEPTH_BLOCKS.find(block => block.id === 'qa')!.items as string;

/**
 * A Q&A item built in code (qaCodeOwned.ts planQa): one cited fact, the price fact or an owner proof fact. A heuristic: a
 * model item citing exactly one proof fact is excluded too (it errs towards a lower similarity score, never a higher one).
 */
export function isCodeBuiltQaItem(item: unknown): boolean {
  if (!isPlain(item) || !Array.isArray(item.factIds) || item.factIds.length !== 1) return false;
  const id = str(item.factIds[0]);
  return id === SYSTEM_PRICE_FACT_ID || id === 'constraint-pricingNotes' || id.startsWith('proof-');
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') { if (value.trim()) out.push(value); return; }
  if (Array.isArray(value)) { for (const item of value) collectStrings(item, out); return; }
  if (isPlain(value)) for (const [key, inner] of Object.entries(value)) if (!NON_MODEL_KEYS.has(key)) collectStrings(inner, out);
}

/** The model-written strings of one page, in rendered-field order (hero, service blocks, Q&A answers, about, story, depth). */
export function modelWrittenStrings(page: Pick<ResearchedSitePage, 'classification' | 'copy'>): string[] {
  const copy = (isPlain(page.copy) ? page.copy : {}) as Loose;
  const out: string[] = [];
  for (const field of researchedRenderedFieldsFor(page.classification)) {
    if (NON_MODEL_FIELDS.has(field) || !(field in copy)) continue;
    const value = field === QA_ITEMS && Array.isArray(copy[field])
      ? (copy[field] as unknown[]).filter(item => !isCodeBuiltQaItem(item))
      : copy[field];
    collectStrings(value, out);
  }
  return out;
}

/** The words to mask before comparing two clients: NAP, service labels and place names (their normalised words). */
export function maskTermsFor(record: PreflightSiteRecord, dossier: SiteResearchDossier | null): string[] {
  const data = (record.collectedData ?? {}) as CollectedData & Loose;
  const terms: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === 'string') terms.push(...value.split(/[,;\n]/));
    else if (Array.isArray(value)) value.forEach(add);
  };
  add(data.businessName); add(data.ownerName); add(data.phone); add(data.whatsappNumber); add(data.streetAddress);
  add(data.targetLocation); add(data.specificCities); add(data.primaryService); add(data.secondaryServices);
  add(data.servedAreaChoice);
  const identity = dossier?.siteIdentity;
  if (identity) {
    add(identity.trade); add(identity.baseCity); add(identity.serviceArea);
    for (const service of identity.services ?? []) { add(service.label); add(service.source); }
  }
  for (const page of record.researchedPages ?? []) {
    const seo = (page as unknown as Loose).seo;
    if (isPlain(seo)) { add(seo.name); add(seo.city); add(seo.serviceArea); }
    const copy = isPlain(page.copy) ? (page.copy as unknown as Loose) : {};
    add(copy.serviceItems);
    if (Array.isArray(copy.serviceDetails)) for (const item of copy.serviceDetails) if (isPlain(item)) add(item.name);
  }
  return terms.map(term => term.trim()).filter(Boolean);
}

/** The words of a text with every masked word removed (a word matches a mask word in any of its prefix forms). */
export function maskedWords(text: string, maskTerms: readonly string[]): string[] {
  const mask = new Set(maskTerms.flatMap(term => normalizedWords(term)));
  return normalizedWords(text).filter(word => !prefixForms(word).some(form => mask.has(form)));
}

/** The masked model-written segments of a site (one per string; runs never cross a field boundary). */
export function siteSegments(record: PreflightSiteRecord, dossier: SiteResearchDossier | null): string[][] {
  const mask = maskTermsFor(record, dossier);
  return (record.researchedPages ?? [])
    .flatMap(page => modelWrittenStrings(page))
    .map(text => maskedWords(text, mask))
    .filter(words => words.length > 0);
}

/** The longest run of consecutive words two segment lists share (word arrays; dynamic programming per segment pair). */
export function longestSharedRun(left: readonly string[][], right: readonly string[][]): { length: number; words: string[] } {
  let best: { length: number; words: string[] } = { length: 0, words: [] };
  for (const a of left) {
    for (const b of right) {
      let previous = new Array<number>(b.length + 1).fill(0);
      for (let i = 1; i <= a.length; i++) {
        const current = new Array<number>(b.length + 1).fill(0);
        for (let j = 1; j <= b.length; j++) {
          if (a[i - 1] !== b[j - 1]) continue;
          current[j] = previous[j - 1] + 1;
          if (current[j] > best.length) best = { length: current[j], words: a.slice(i - current[j], i) };
        }
        previous = current;
      }
    }
  }
  return best;
}

export function similarityStatus(jaccard: number, longestRun: number): PreflightStatus {
  if (jaccard > SIMILARITY_FAIL_JACCARD) return 'FAIL';
  if (jaccard > SIMILARITY_WARN_JACCARD || longestRun >= SHARED_RUN_WARN_WORDS) return 'WARN';
  return 'PASS';
}

/** Two segment lists compared: 5-gram Jaccard (depthBlocks ngramJaccard on the masked texts) and the longest shared run. */
export function compareSegments(left: readonly string[][], right: readonly string[][]): { jaccard: number; longestRun: number; run: string; status: PreflightStatus } {
  const jaccard = ngramJaccard(left.map(words => words.join(' ')).join('\n'), right.map(words => words.join(' ')).join('\n'));
  const run = longestSharedRun(left, right);
  return { jaccard, longestRun: run.length, run: run.words.join(' '), status: similarityStatus(jaccard, run.length) };
}

/** The trade key peers are grouped by: the dossier's site identity trade, else the business niche. */
export function tradeKey(record: PreflightSiteRecord, dossier: SiteResearchDossier | null): string {
  const trade = normalizeSpace(str(dossier?.siteIdentity?.trade));
  if (trade) return trade;
  return `niche:${normalizeSpace(str(record.collectedData?.businessNiche)).toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Rendered-HTML checks
// ---------------------------------------------------------------------------

const htmlFiles = (files: Readonly<Record<string, string>>): string[] => Object.keys(files).filter(file => file.endsWith('.html')).sort();

/** Visible text of a page: scripts, styles and tags removed, entities decoded for the common cases, whitespace collapsed. */
export function visibleText(html: string): string {
  return normalizeSpace(html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'));
}

/** Israeli phone number in national format digits (0XXXXXXXXX), or null. */
export function nationalPhone(value: string): string | null {
  let digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('+972')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('972') && digits.length >= 11) digits = `0${digits.slice(3)}`;
  digits = digits.replace(/\D/g, '');
  return /^0\d{8,9}$/.test(digits) ? digits : null;
}

const PHONE_IN_TEXT = /(?:\+972[-\s]?|\b0)(?:[23489]|5\d|7\d)[-\s]?\d{3}[-\s]?\d{4}\b/g;

function jsonLdObjects(html: string): Loose[] {
  const out: Loose[] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (!isPlain(value)) return;
    out.push(value);
    for (const inner of Object.values(value)) walk(inner);
  };
  for (const match of html.matchAll(/<script\b[^>]*type=(['"])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    try { walk(JSON.parse(match[2])); } catch { out.push({ __invalidJsonLd: true }); }
  }
  return out;
}

export interface NapProfile {
  businessName: string;
  phone: string;
  whatsapp?: string;
  streetAddress?: string;
}

/**
 * NAP equality between the rendered pages and the intake / profile record: the business name on every page, every phone
 * number (tel:, wa.me, visible text, schema telephone) one of the record's numbers, the schema business name and street
 * address equal to the record's.
 */
export function napCheck(files: Readonly<Record<string, string>>, profile: NapProfile): PreflightCheck {
  const details: string[] = [];
  const statuses: PreflightStatus[] = [];
  const name = normalizeSpace(profile.businessName);
  const allowed = new Set([profile.phone, profile.whatsapp ?? ''].map(value => nationalPhone(value)).filter((value): value is string => !!value));
  const street = normalizeSpace(profile.streetAddress ?? '');
  if (!name) { statuses.push('FAIL'); details.push('Record has no business name.'); }
  if (!allowed.size) { statuses.push('FAIL'); details.push('Record has no valid Israeli phone number.'); }
  let streetSeen = false;
  for (const file of htmlFiles(files)) {
    if (file === '404.html') continue;
    const html = files[file];
    const text = visibleText(html);
    if (name && !text.includes(name)) { statuses.push('FAIL'); details.push(`${file}: business name "${name}" not in the visible text.`); }
    const found = new Map<string, string>();
    for (const match of html.matchAll(/href=(['"])(tel:[^'"]*|https:\/\/wa\.me\/[^'"]*)\1/gi)) {
      const phone = nationalPhone(match[2].replace(/^tel:/i, '').replace(/^https:\/\/wa\.me\//i, '+'));
      found.set(phone ?? match[2], match[2]);
    }
    for (const match of text.matchAll(PHONE_IN_TEXT)) { const phone = nationalPhone(match[0]); if (phone) found.set(phone, match[0]); }
    const schema = jsonLdObjects(html);
    if (schema.some(item => item.__invalidJsonLd)) { statuses.push('FAIL'); details.push(`${file}: a JSON-LD block does not parse.`); }
    for (const item of schema) {
      if (typeof item.telephone === 'string') {
        const phone = nationalPhone(item.telephone);
        found.set(phone ?? item.telephone, `schema telephone ${item.telephone}`);
        if (typeof item.name === 'string' && name && normalizeSpace(item.name) !== name) {
          statuses.push('FAIL'); details.push(`${file}: schema business name "${item.name}" differs from the record's "${name}".`);
        }
      }
      if (isPlain(item.address) && typeof item.address.streetAddress === 'string') {
        const schemaStreet = normalizeSpace(item.address.streetAddress);
        if (!street) { statuses.push('FAIL'); details.push(`${file}: schema street address "${schemaStreet}" but the record has none.`); }
        else if (schemaStreet !== street) { statuses.push('FAIL'); details.push(`${file}: schema street address "${schemaStreet}" differs from the record's "${street}".`); }
        else streetSeen = true;
      }
    }
    if (street && text.includes(street)) streetSeen = true;
    for (const [phone, raw] of found) {
      if (!allowed.has(phone)) { statuses.push('FAIL'); details.push(`${file}: phone "${raw}" is not the record's number.`); }
    }
    const legal = file === 'privacy.html' || file === 'accessibility.html';
    if (!legal && allowed.size && ![...found.keys()].some(phone => allowed.has(phone))) {
      statuses.push('WARN'); details.push(`${file}: the record's phone does not appear on the page.`);
    }
  }
  if (street && !streetSeen) { statuses.push('WARN'); details.push(`Record street address "${street}" appears on no page (text or schema).`); }
  if (!details.length) details.push(`Name${street ? ', phone and street address' : ' and phone'} match the record on every page.${street ? '' : ' Record has no street address (field-service business).'}`);
  return { id: 'nap', title: 'NAP equality (rendered pages vs intake record)', status: worst(statuses), details };
}

export function foreignScriptCheck(files: Readonly<Record<string, string>>): PreflightCheck {
  const details: string[] = [];
  const global = new RegExp(FOREIGN_SCRIPT_PATTERN.source, 'gu');
  for (const file of Object.keys(files).sort()) {
    const chars = [...new Set(files[file].match(global) ?? [])];
    if (chars.length) details.push(`${file}: ${chars.slice(0, 12).map(char => `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')} "${char}"`).join(', ')}`);
  }
  return { id: 'foreign_script', title: 'Foreign script (CJK / Cyrillic / Arabic) in served files', status: details.length ? 'FAIL' : 'PASS', details: details.length ? details : ['None.'] };
}

export function bidiCheck(files: Readonly<Record<string, string>>): PreflightCheck {
  const details: string[] = [];
  let total = 0;
  for (const file of htmlFiles(files)) {
    const count = files[file].match(BIDI_REGRESSION)?.length ?? 0;
    total += count;
    if (count) details.push(`${file}: ${count} bracket(s) inside <bdi dir="ltr">.`);
  }
  return { id: 'bidi', title: 'Bidi regression grep (CLAUDE.md) = 0', status: total ? 'FAIL' : 'PASS', details: details.length ? details : ['0 matches.'] };
}

const FAIL_LEFTOVERS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: '__HE_TODO_ placeholder', pattern: /__HE_TODO_/ },
  { label: 'fixture- id', pattern: /fixture-/ },
  { label: 'lorem ipsum', pattern: /lorem ipsum/i },
  { label: '"placeholder" text', pattern: /\bplaceholder\b/i },
  { label: 'TODO / FIXME / TBD', pattern: /\b(?:TODO|FIXME|TBD)\b/ },
  { label: 'example.com / .invalid host', pattern: /\bexample\.(?:com|org|net)\b|\.invalid\b/i },
  { label: '"demo" text', pattern: /\bdemo\b/i },
];
const WARN_LEFTOVERS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: '"test" text (test business?)', pattern: /\btest\b/i },
  { label: 'dummy phone digits (0000000 / 1234567)', pattern: /0000000|1234567/ },
];

export function leftoverCheck(files: Readonly<Record<string, string>>, data: CollectedData): PreflightCheck {
  const details: string[] = [];
  const statuses: PreflightStatus[] = [];
  for (const file of htmlFiles(files)) {
    const html = files[file];
    if (ROBOTS_NOINDEX.test(html)) {
      if (INTENDED_NOINDEX_FILES.includes(file)) {
        if (file === 'contact.html') details.push('contact.html: noindex (the intended contact fallback: no trade on the homepage).');
      } else { statuses.push('FAIL'); details.push(`${file}: unexpected noindex.`); }
    }
    const text = visibleText(html);
    for (const { label, pattern } of FAIL_LEFTOVERS) {
      const where = label === 'fixture- id' || label === '__HE_TODO_ placeholder' ? html : text;
      if (pattern.test(where)) { statuses.push('FAIL'); details.push(`${file}: ${label}.`); }
    }
    for (const { label, pattern } of WARN_LEFTOVERS) if (pattern.test(text)) { statuses.push('WARN'); details.push(`${file}: ${label}.`); }
  }
  if (typeof data.placeId === 'string' && data.placeId.startsWith('fixture-')) {
    statuses.push('WARN'); details.push('Record placeId is a fixture- id (the renderer drops the profile link and sameAs).');
  }
  if (data.placeIdNeedsRematch) { statuses.push('WARN'); details.push('Record placeIdNeedsRematch = true: staff must re-match the Google profile.'); }
  if (!statuses.length && !details.length) details.push('No leftover noindex, fixture ids, __HE_TODO_ or demo / placeholder strings.');
  return { id: 'leftovers', title: 'Leftovers: noindex, fixture- ids, __HE_TODO_, demo / placeholder strings', status: worst(statuses), details };
}

/** The rendered file a site-internal path serves ('/' -> index.html, '/a/b' -> a/b.html or a/b/index.html). */
export function fileForPath(pathname: string, files: Readonly<Record<string, string>>): string | null {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  const candidates = clean === '' ? ['index.html'] : [clean, `${clean}.html`, `${clean}/index.html`];
  return candidates.find(candidate => candidate in files) ?? null;
}

export function internalLinkCheck(files: Readonly<Record<string, string>>, siteUrl: string): PreflightCheck {
  const details: string[] = [];
  const origin = siteUrl.replace(/\/$/, '');
  let checked = 0;
  for (const file of htmlFiles(files)) {
    for (const match of files[file].matchAll(/<a\b[^>]*\shref=(['"])(.*?)\1/gi)) {
      let href = match[2].replace(/&amp;/g, '&');
      if (href.startsWith(origin)) href = href.slice(origin.length) || '/';
      if (!(href.startsWith('#') || (href.startsWith('/') && !href.startsWith('//')))) continue;
      checked++;
      const [pathPart, fragment] = href.split('#', 2) as [string, string | undefined];
      const target = pathPart === '' ? file : fileForPath(pathPart.split('?')[0], files);
      if (!target) { details.push(`${file}: ${match[2]} -> no rendered page.`); continue; }
      if (fragment && !new RegExp(`\\sid=(['"])${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`).test(files[target])) {
        details.push(`${file}: ${match[2]} -> ${target} has no id="${fragment}".`);
      }
    }
  }
  return {
    id: 'links', title: 'Internal links resolve', status: details.length ? 'FAIL' : 'PASS',
    details: details.length ? details : [`${checked} internal link(s) checked, all resolve.`],
  };
}

// ---------------------------------------------------------------------------
// Record checks
// ---------------------------------------------------------------------------

export interface PageWords { opportunityId: string; classification: string; targetPath: string; words: number }

/** Visible words of each researched page (the generator's own count: pageVisibleWords over the page type's rendered fields). */
export function pageWordCounts(pages: readonly ResearchedSitePage[]): PageWords[] {
  return pages.map(page => ({
    opportunityId: page.opportunityId,
    classification: page.classification,
    targetPath: page.targetPath,
    words: pageVisibleWords((isPlain(page.copy) ? page.copy : {}) as Loose, { phraseRepeatFields: researchedRenderedFieldsFor(page.classification) }),
  }));
}

export function wordCountCheck(counts: readonly PageWords[]): PreflightCheck {
  const details = counts.map(page => `${page.targetPath} (${page.classification}): ${page.words} words${page.words < DEPTH_WORD_FLOOR ? ` **UNDER ${DEPTH_WORD_FLOOR}**` : ''}`);
  return {
    id: 'word_count', title: `Visible words per page vs the ${DEPTH_WORD_FLOOR}-word floor`,
    status: counts.some(page => page.words < DEPTH_WORD_FLOOR) ? 'WARN' : 'PASS', details,
  };
}

/** The neuron word target of a page (dossier neuronQueries keyed by the page's keyword: the page name or the opportunity). */
function pageWordTarget(page: ResearchedSitePage, dossier: SiteResearchDossier | null): number | undefined {
  const queries = dossier?.neuronQueries ?? {};
  const seo = (page as unknown as Loose).seo;
  const opportunity = dossier?.pageOpportunities?.find(item => item.id === page.opportunityId);
  const keys = [isPlain(seo) ? str(seo.name) : '', str(opportunity?.opportunity)].filter(Boolean);
  for (const key of keys) if (queries[key]?.wordTarget !== undefined) return queries[key].wordTarget;
  return undefined;
}

/**
 * The fact gaps: researchPageCopy depthLengthNote emits `fact_gap` (under the floor) and `below_target` on service pages,
 * as copy events that production does not persist. Stored events win; without them the same note is recomputed from the
 * record (same word count, same band). Page flags (skipped questions) are listed as owner-question candidates.
 */
export function factGapCheck(pages: readonly ResearchedSitePage[], counts: readonly PageWords[], dossier: SiteResearchDossier | null, events: readonly PreflightCopyEvent[] | null): PreflightCheck {
  const details: string[] = [];
  let gaps = 0;
  if (events) {
    for (const event of events) {
      for (const violation of event.violations ?? []) {
        if (violation.rule !== 'fact_gap' && violation.rule !== 'below_target') continue;
        if (violation.rule === 'fact_gap') gaps++;
        details.push(`${event.page ?? '?'}: ${violation.rule} (${violation.actual} words, ${violation.rule === 'fact_gap' ? 'floor' : 'target'} ${violation.limit}) [stored event, stage ${event.stage ?? '?'}; counted at generation, before the record's final drops]`);
      }
    }
  } else {
    for (const page of pages) {
      if (page.classification !== 'money_service') continue;
      const words = counts.find(count => count.opportunityId === page.opportunityId)?.words ?? 0;
      const band = lengthBandFor(pageWordTarget(page, dossier));
      if (words < band.floor) { gaps++; details.push(`${page.opportunityId}: fact_gap (${words} words, floor ${band.floor}) [recomputed]`); }
      else if (words < band.target) details.push(`${page.opportunityId}: below_target (${words} words, target ${band.target}) [recomputed]`);
    }
    details.unshift('No stored copy events (production does not persist them): recomputed with the generator\'s word count and length band.');
  }
  for (const page of pages) {
    const flags = (page as unknown as Loose).flags;
    if (Array.isArray(flags)) for (const flag of flags) if (typeof flag === 'string') details.push(`${page.opportunityId}: owner-question candidate: ${flag}`);
  }
  return { id: 'fact_gap', title: 'fact_gap entries (pages short of owner facts)', status: gaps ? 'WARN' : 'PASS', details };
}

/** Stored gate results: the dossier pipeline checks, the depth items' fact citations, stored final-stage events, packet eligibility. */
export function storedGateCheck(record: PreflightSiteRecord, recordBytes: Uint8Array, dossier: SiteResearchDossier | null, events: readonly PreflightCopyEvent[] | null): PreflightCheck {
  const details: string[] = [];
  const statuses: PreflightStatus[] = [];
  if (!dossier) { statuses.push('FAIL'); details.push('No research dossier found: stored gate results cannot be read.'); }
  const checks = dossier?.pipelineChecks ?? {};
  if (dossier) {
    details.push(`Dossier status ${dossier.status}; pipeline checks: ${Object.entries(checks).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}.`);
    if (checks.copy !== 'pass') { statuses.push('FAIL'); details.push(`Copy gates did not pass at generation (copy=${checks.copy ?? 'unset'}).`); }
    if (checks.hebrewQa !== 'pass') { statuses.push('WARN'); details.push(`Hebrew QA is ${checks.hebrewQa ?? 'unset'} (set by hand after the human read).`); }
    if (dossier.approvedCopyReviewPacket) {
      const claims = dossier.approvedCopyReviewPacket.claimVerification;
      details.push(`Copy review packet already approved (sha256 ${dossier.approvedCopyReviewPacket.sha256.slice(0, 12)}...)${claims ? `; claim checks: ${JSON.stringify(claims)}` : '; no claim checks recorded (licence / free-text warranty claims are dropped on render)'}.`);
    } else {
      try {
        buildResearchedCopyReviewPacket(recordBytes, dossier);
        details.push('Record is eligible for the copy-review packet (bytes match the ready research opportunities).');
      } catch (error) {
        statuses.push('FAIL'); details.push(`Not eligible for the copy-review packet: ${(error as Error).message}`);
      }
    }
  }
  for (const page of record.researchedPages ?? []) {
    const copy = (isPlain(page.copy) ? page.copy : {}) as Loose;
    let items = 0;
    const missing: string[] = [];
    for (const block of DEPTH_BLOCKS) {
      const list = copy[block.items as string];
      if (!Array.isArray(list)) continue;
      list.forEach((item, index) => {
        items++;
        if (!isPlain(item) || !Array.isArray(item.factIds) || !item.factIds.some(id => typeof id === 'string' && id.trim())) missing.push(`${String(block.items)}[${index}]`);
      });
    }
    if (!items) continue;
    if (missing.length) { statuses.push('FAIL'); details.push(`${page.opportunityId}: depth items without a fact ID: ${missing.join(', ')}.`); }
    else details.push(`${page.opportunityId}: fact trace stored on all ${items} depth item(s).`);
  }
  if (events) {
    const byRule = new Map<string, number>();
    for (const event of events) {
      if (event.stage !== 'final') continue;
      for (const violation of event.violations ?? []) {
        const key = `${event.kind}:${violation.rule}`;
        byRule.set(key, (byRule.get(key) ?? 0) + 1);
        if (event.kind === 'violations') { statuses.push('FAIL'); details.push(`${event.page}: final-stage gate violation ${violation.rule} on ${violation.field}.`); }
      }
    }
    if (byRule.size) {
      statuses.push('WARN');
      details.push(`Stored final-stage events: ${[...byRule].map(([key, count]) => `${key} x${count}`).join(', ')}.`);
    } else details.push('Stored events: no final-stage warnings or violations.');
  } else details.push('Fact trace per sentence outside the depth blocks is not stored (the review notes say: depth blocks only).');
  return { id: 'stored_gates', title: 'Fact trace and gate results stored with the copy', status: worst(statuses), details };
}

/** Pilot policy: no-website businesses only (we never replace an existing site). */
export function existingWebsiteCheck(data: CollectedData, audits: readonly PreflightAuditCandidate[]): PreflightCheck {
  const details: string[] = [];
  const statuses: PreflightStatus[] = [];
  const website = str(data.websiteUri).trim();
  if (website) { statuses.push('FAIL'); details.push(`Intake record carries websiteUri "${website}". Pilot policy: no-website businesses only.`); }
  for (const candidate of audits) {
    if (candidate.hasWebsite) { statuses.push('FAIL'); details.push(`Audit ${candidate.auditPath ?? ''} reports hasWebsite=true for place ${candidate.placeId}. Pilot policy: no-website businesses only.`); }
  }
  if (data.domainChoice === 'has_domain' || str(data.ownerDomain).trim()) {
    statuses.push('WARN'); details.push(`Owner says he has a domain${data.ownerDomain ? ` (${data.ownerDomain})` : ''}: confirm no live site is on it before the pilot takes it.`);
  }
  if (data.domainChoice === 'not_sure') { statuses.push('WARN'); details.push('Owner is not sure whether he has a domain: staff follow-up.'); }
  if (!details.length) details.push(`No website on the intake record${audits.length ? ' or the matching audit record(s)' : ' (no audit record matched the placeId)'}.`);
  return { id: 'existing_website', title: 'Existing-website flag (pilot: no-website businesses only)', status: worst(statuses), details };
}

// ---------------------------------------------------------------------------
// Facts sheet
// ---------------------------------------------------------------------------

const CARD_FIELDS = new Set(['businessName', 'businessNiche', 'phone', 'streetAddress', 'targetLocation', 'businessHours', 'websiteUri', 'serviceModel', 'placeId', 'hasGoogleBusiness']);
const OWNER_ANSWER_FIELDS = new Set(['priorityServices', 'travelBoundary', 'usp', 'specificCities', 'servedAreaChoice']);
const REVIEW_FIELDS = new Set(['reviewQuote', 'starRating', 'reviewCount']);
const PRIVATE_FIELDS = new Set(['ownerContact']);

function factSource(key: string): string {
  if (CARD_FIELDS.has(key)) return 'intake card (GBP pre-fill when found, owner-confirmed)';
  if (OWNER_ANSWER_FIELDS.has(key)) return 'owner typed (intake question)';
  if (REVIEW_FIELDS.has(key)) return 'owner-provided review / rating (no Places review content)';
  if (key.startsWith('research')) return 'research gate answer';
  return 'intake record (owner-provided)';
}

const cell = (value: unknown): string => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return (text ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' / ').slice(0, 400);
};

function factsSheet(record: PreflightSiteRecord, dossier: SiteResearchDossier | null): string[] {
  const lines: string[] = [];
  const data = (record.collectedData ?? {}) as Loose;
  lines.push('### Intake record facts', '', '| Field | Value | Source |', '|---|---|---|');
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) continue;
    lines.push(`| ${key} | ${PRIVATE_FIELDS.has(key) ? '(private owner contact present; not copied into the sheet)' : cell(value)} | ${factSource(key)} |`);
  }
  lines.push('');
  const assertions = dossier?.businessTruth?.assertions ?? [];
  lines.push('### Research truth assertions (dossier)', '');
  if (assertions.length) {
    lines.push('| ID | Claim | Source kind | Provider record | Status | Confidence |', '|---|---|---|---|---|---|');
    for (const item of assertions) lines.push(`| ${cell(item.id)} | ${cell(item.claim)} | ${item.sourceKind} | ${cell(item.providerRecordId)} | ${item.assertionStatus} | ${item.confidence} |`);
  } else lines.push('None stored.');
  lines.push('');
  const gates = [
    ...(dossier?.ownerResearchGates ?? []).map(gate => `owner gate ${gate.id} (${gate.type}): ${gate.answer === undefined ? 'unanswered' : `${cell(gate.answer)} at ${gate.answeredAt}`}`),
    ...Object.entries(dossier?.staffResearchGateAnswers ?? {}).map(([id, gate]) => `staff answer ${id} (${gate.type}): ${cell(gate.answer)} at ${gate.answeredAt}`),
  ];
  lines.push('### Gate answers', '', ...(gates.length ? gates.map(item => `- ${item}`) : ['None stored.']), '');
  lines.push('### Fact IDs cited by the depth blocks', '');
  let cited = 0;
  for (const page of record.researchedPages ?? []) {
    const copy = (isPlain(page.copy) ? page.copy : {}) as Loose;
    const ids = new Set<string>();
    for (const block of DEPTH_BLOCKS) {
      const list = copy[block.items as string];
      if (Array.isArray(list)) for (const item of list) if (isPlain(item) && Array.isArray(item.factIds)) item.factIds.forEach(id => typeof id === 'string' && ids.add(id));
    }
    if (ids.size) { cited++; lines.push(`- ${page.opportunityId}: ${[...ids].join(', ')}`); }
  }
  if (!cited) lines.push('None (no depth blocks on this site).');
  lines.push('', 'The generator keeps the brief fact texts behind these IDs only in memory; the values above are their inputs.');
  return lines;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export function siteUrlFor(slug: string): string {
  return `https://${slug}.wao.co.il`;
}

/** Renders the site exactly as the deploy route's researched branch does (no tracking, no look photos, staff claim checks). */
export function renderForPreflight(record: PreflightSiteRecord, dossier: SiteResearchDossier | null): Record<string, string> {
  const vertical = detectVertical(record.collectedData.businessNiche || '');
  const assets = VERTICAL_ASSETS[vertical];
  return renderResearchedSitePages({
    theme: VERTICAL_THEMES[vertical],
    assets,
    data: structuredClone(record.collectedData),
    heroImageUrl: record.collectedData.trustAssetUrls?.[0] || record.collectedData.profilePhotoUrl || assets.heroImages[0].url,
    slug: record.slug,
    siteUrl: siteUrlFor(record.slug),
    pages: structuredClone(record.researchedPages),
    graphEdges: structuredClone(record.researchedGraphEdges ?? []),
    claimVerification: dossier?.approvedCopyReviewPacket?.claimVerification,
  });
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function similarityFor(input: PreflightInput): PreflightResult['similarity'] {
  const trade = tradeKey(input.record, input.dossier);
  const mine = siteSegments(input.record, input.dossier);
  const peers = input.peers.filter(peer => peer.record.slug !== input.record.slug && tradeKey(peer.record, peer.dossier) === trade);
  const scored: PeerSimilarity[] = peers.map(peer => {
    const result = compareSegments(mine, siteSegments(peer.record, peer.dossier));
    return { slug: peer.record.slug, recordPath: peer.recordPath, ...result };
  }).sort((a, b) => b.jaccard - a.jaccard || b.longestRun - a.longestRun);
  return { status: worst(scored.map(peer => peer.status)), trade, peerCount: peers.length, top: scored.slice(0, 3) };
}

export function runPreflight(input: PreflightInput): PreflightResult {
  const { record, dossier } = input;
  const checks: PreflightCheck[] = [];
  checks.push(storedGateCheck(record, input.recordBytes, dossier, input.events));
  const counts = pageWordCounts(record.researchedPages);
  checks.push(wordCountCheck(counts));
  checks.push(factGapCheck(record.researchedPages, counts, dossier, input.events));
  let files: Record<string, string> | null = null;
  try {
    files = renderForPreflight(record, dossier);
  } catch (error) {
    checks.push({ id: 'render', title: 'Render (deploy renderer)', status: 'FAIL', details: [`The deploy renderer refused the record: ${(error as Error).message}`, 'The rendered-page checks below could not run.'] });
  }
  if (files) {
    const data = record.collectedData;
    checks.push(napCheck(files, { businessName: data.businessName || data.businessNiche || '', phone: data.phone ?? '', whatsapp: data.whatsappNumber, streetAddress: data.streetAddress }));
    const profileName = normalizeSpace(str(dossier?.businessTruth?.businessName));
    if (profileName && profileName !== normalizeSpace(str(data.businessName))) {
      const nap = checks[checks.length - 1];
      nap.status = worst([nap.status, 'WARN']);
      nap.details.push(`Dossier business name "${profileName}" differs from the intake record's "${data.businessName}".`);
    }
    checks[checks.length - 1].details.push('Live Google profile values are not fetched (no API calls): compare them in the human checklist.');
    checks.push(foreignScriptCheck(files));
    checks.push(bidiCheck(files));
    checks.push(leftoverCheck(files, data));
    checks.push(internalLinkCheck(files, siteUrlFor(record.slug)));
  }
  checks.push(existingWebsiteCheck(record.collectedData, input.auditCandidates));
  const similarity = similarityFor(input);
  const status = worst([...checks.map(check => check.status), similarity.status]);
  const result: PreflightResult = { slug: record.slug, status, checks, similarity, sheet: '' };
  result.sheet = renderSheet(input, result, files);
  return result;
}

function renderSheet(input: PreflightInput, result: PreflightResult, files: Record<string, string> | null): string {
  const { record, dossier } = input;
  const data = record.collectedData;
  const sha = sha256Hex(input.recordBytes);
  const lines: string[] = [];
  lines.push(`# Site review pre-flight: ${record.slug} (${input.date})`, '');
  lines.push(`**Overall: ${result.status}**  `, `Review time target: ${REVIEW_TIME_TARGET_MINUTES} minutes (40 maximum). A FAIL cannot be approved.`, '');
  lines.push('## 1. Header', '');
  lines.push(`- Slug: \`${record.slug}\` (research ID \`${record.researchId}\`)`);
  lines.push(`- Business name: ${data.businessName ?? '(none)'}`);
  lines.push(`- Trade: ${dossier?.siteIdentity?.trade ?? '(no site identity)'} (niche \`${data.businessNiche ?? ''}\`, renderer vertical \`${detectVertical(data.businessNiche || '')}\`)`);
  lines.push(`- Base city: ${dossier?.siteIdentity?.baseCity ?? data.targetLocation ?? '(none)'}`);
  lines.push(`- Generated: ${record.createdAt ?? '(unknown)'}`);
  lines.push(`- Site record: \`${input.recordPath}\` (sha256 \`${sha}\`)`);
  lines.push(`- Dossier: ${input.dossierPath ? `\`${input.dossierPath}\`` : '(not found)'}`);
  lines.push(`- Copy events: ${input.eventsPath ? `\`${input.eventsPath}\`` : '(none stored)'}`);
  lines.push(`- Pages (${record.researchedPages.length}): ${record.researchedPages.map(page => `\`${page.targetPath}\` ${page.classification}`).join(', ')}`);
  if (files) lines.push(`- Rendered files: ${Object.keys(files).sort().join(', ')}`);
  lines.push('- Operator preview (localPreview.ts operator bundle; needs `dist/`, a hero image, and a dossier still eligible for copy review):', '');
  lines.push('```', 'npx tsc -p tsconfig.test.json', `node scripts/site-bot-operator-preview.mjs --record ${input.recordPath} --dossier ${input.dossierPath ?? '<dossier.json>'} --sha256 ${sha} --hero <hero.png|jpg|webp>`, '```', '');
  lines.push('## 2. Automated checks', '', '| Check | Status |', '|---|---|');
  for (const check of result.checks) lines.push(`| ${check.title} | **${check.status}** |`);
  lines.push('');
  for (const check of result.checks) {
    lines.push(`### ${check.status} ${check.title}`, '', ...check.details.map(detail => `- ${detail}`), '');
  }
  lines.push('## 3. Cross-client similarity', '');
  lines.push(`Model-written text only (hero, service blocks, Q&A answers, about, story, depth); NAP, service labels and place names masked; code-built fields excluded. 5-gram Jaccard (\`ngramJaccard\`): WARN above ${SIMILARITY_WARN_JACCARD} or a shared run of ${SHARED_RUN_WARN_WORDS}+ words, FAIL above ${SIMILARITY_FAIL_JACCARD}.`, '');
  lines.push(`Trade key \`${result.similarity.trade}\`: ${result.similarity.peerCount} same-trade peer(s). **${result.similarity.status}**`, '');
  if (result.similarity.top.length) {
    lines.push('| Peer | Jaccard | Longest shared run | Status |', '|---|---|---|---|');
    for (const peer of result.similarity.top) lines.push(`| \`${peer.slug}\` | ${peer.jaccard.toFixed(3)} | ${peer.longestRun} words | **${peer.status}** |`);
    lines.push('');
    for (const peer of result.similarity.top) if (peer.run) lines.push(`- \`${peer.slug}\` shared run (${peer.longestRun} words): "${peer.run}"`);
    lines.push('');
  } else lines.push('No same-trade peers in the peer directories.', '');
  lines.push('## 4. Facts sheet', '', ...factsSheet(record, dossier), '');
  lines.push('## 5. Human checklist', '');
  lines.push(
    '- [ ] Does it sound like him? (read home and about first, then the flagged pages)',
    '- [ ] Any risky or unprovable claim? (numbers, guarantees, licence, "always / never" promises)',
    '- [ ] Does each page deserve to exist, or should it fold into the hub? (see the word counts and fact gaps above)',
    '- [ ] Are the photos really his, and suitable?',
    '- [ ] Licence checked against the registry (name and date recorded with the copy-review approval)',
    '- [ ] Profile coherence: Google profile categories vs the service tree; name, phone, address and hours vs the live profile',
    '- Decision: [ ] approve  [ ] approve + owner question: ____________________  [ ] hold, because: ____________________',
    `- Time spent: ____ minutes (target ${REVIEW_TIME_TARGET_MINUTES})`,
    '- Reviewer: ____________________',
    '',
  );
  return `${lines.join('\n')}\n`;
}
