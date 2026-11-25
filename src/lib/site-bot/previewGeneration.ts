/**
 * Site Bot step 2c: the home-page preview generation (before payment) and the generation of the remaining pages (after
 * payment). docs/missions/site-bot-step2-interview-preview-2026-11-25.md, 2c items 1-3 and 7.
 *
 * Preview (generatePreviewHomepage): the existing researched generation path, limited to the homepage:
 *   research dossier (must be copy_ready-able: researchToSite.generationReadiness) -> owner gate answers
 *   (gateAnsweredCollectedData) -> the interview facts and the work-location framing (interviewGeneration.ts) -> the
 *   copy_ready plan (persisted once; the post-pay run reuses it) -> buildPageBriefs (homepage brief with the facts and the
 *   first-screen constraint) -> generateResearchPageCopy (Tamar -> Noa -> gates, unchanged) -> the first-screen
 *   resolution (firstScreenFact.ts). Nothing is written to the sites dir and nothing deploys: the generation record lives
 *   next to the dossier (<research>/<id>/preview-home.json) and only the cookie-gated preview route reads it.
 *
 * Remaining pages (generateRemainingPages, from the paid checkout callback): the same plan and the same generation data
 * as the preview; buildResearchedSiteGeneration with the preview's homepage as a reused page (never regenerated), so
 * only the other pages reach the model. The record goes through persistResearchedSiteRecordAtomic, which clears any
 * approvedCopyReviewPacket: deploy/route.ts refuses a researched record without an admin-approved review packet whose hash
 * matches the record bytes (copy_review_approval_required). There is no other deploy path from here.
 *
 * Cost: every model call of a run is metered (recordingSiteCopyCaller) and appended to the dossier's providerUsage
 * (operation site_bot_preview_copy / site_bot_site_copy). Fixture mode for dev rehearsals and tests:
 * SITE_BOT_PREVIEW_MODEL=fixture (ignored in production) writes the copy from the owner's own data and facts, no network.
 *
 * Server-only. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import { callGeminiJSON } from '../ai/gemini-fast';
import { callQwenJSON } from '../ai/qwen-fast';
import { selectLlmProvider } from '../ai/llmProvider';
import type { SiteCopy } from '../lp/lpCopyPrompt';
import { CTA_LABEL_SETS } from '../lp/generationData';
import {
  assertBoundedGeneratedSiteCopy, codeBuiltTrustBar, generateResearchPageCopy, GeneratedCopyValidationError, shapeOptions, withSystemFields,
  type QwenJsonCaller,
} from '../lp/researchPageCopy';
import { pageNameWithCity, renderResearchedSitePages, researchedServiceAreas, type ResearchedSitePage } from '../lp/researchedSite';
import { flashCostUsd } from './factExtraction';
import {
  anchorExclusions, firstScreenCandidates, resolveFirstScreen, trustBarNumbers, usableFacts,
  type CredentialTrustItem, type FirstScreenOutcome, type UsableFact,
} from './firstScreenFact';
import { interviewGenerationData, writerFacts } from './interviewGeneration';
import { isInterviewFactSet, type InterviewFactSet } from './interviewFacts';
import { ISRAELI_LOCALITIES } from './israeliLocalities';
import { gateAnsweredCollectedData } from './research/gateAnswers';
import type { PageBrief } from './research/pageBrief';
import { getResearchPath, readResearchDossier, writeResearchDossierAtomic } from './research/researchStore';
import type { ProviderUsage, SiteResearchDossier } from './research/types';
import {
  buildGraphEdges, buildPageBriefs, generationReadiness, isPlannedDossier, planCopyReadyDossier, researchedRenderInputs, serviceNamesFor,
} from './researchToSite';
import {
  buildResearchedSiteGeneration, persistResearchedSiteRecordAtomic, preflightResearchedSiteTarget, researchedPageFromCopy,
  siteGenerationContext, type ResearchedSiteGenerationContext, type ResearchedSiteGenerationRecord,
} from './researchedSiteGeneration';
import { createPlaceIdChecker, type PlaceIdChecker } from './placeIdRefresh';
import { resolveSiteIdentity, siteIdentityInput, type SiteIdentityModelCall } from './siteIdentity';
import { deriveSiteSlug, isSafeSiteSlug } from './siteSlug';
import type { WorkLocation } from './workLocation';

export const PREVIEW_RECORD_FILE = 'preview-home.json';
export const PREVIEW_USAGE_OPERATION = 'site_bot_preview_copy';
export const SITE_USAGE_OPERATION = 'site_bot_site_copy';
const MAX_PREVIEW_RECORD_BYTES = 4 * 1024 * 1024;
const GEMINI_TIMEOUT_MS = 180_000;
const GEMINI_ATTEMPTS = 3;
/** Qwen token-plan list price (scripts/site-bot-research-to-site.mjs), US$ per token. */
const QWEN_PRICE_IN = 2 / 1e6;
const QWEN_PRICE_OUT = 6 / 1e6;

export type PreviewModelMode = 'live' | 'fixture';

/** SITE_BOT_PREVIEW_MODEL=fixture selects the zero-network fixture outside production; anything else is the live model. */
export function previewModelMode(env: Record<string, string | undefined> = process.env): PreviewModelMode {
  if (env.SITE_BOT_PREVIEW_MODEL !== 'fixture') return 'live';
  if (env.NODE_ENV === 'production') {
    console.error('[site-bot preview] SITE_BOT_PREVIEW_MODEL=fixture IGNORED in production; using the live model');
    return 'live';
  }
  return 'fixture';
}

// ---------------------------------------------------------------------------------------------------------------------
// The generation record

export interface PreviewHomeRecord {
  version: 1;
  researchId: string;
  round: number;
  slug: string;
  createdAt: string;
  /** The answer set and the FACTS_DONE the facts came from. */
  answersVersion: number;
  factsConfirmedAt: string | null;
  workLocation: WorkLocation | null;
  /** The generation data (gate answers, framing, facts applied); the post-pay run generates from the same data. */
  collectedData: CollectedData;
  page: ResearchedSitePage;
  /** Rule (a): the fact the first screen carries (subheadline, else a credential trust-bar item). */
  firstScreen: FirstScreenOutcome;
  /** The interview facts the brief handed to the writer (the input side of step 3's ledger). */
  usedFactIds: string[];
  generation: { model: PreviewModelMode; ms: number; calls: number; costUsd: number };
}

export function previewRecordPath(researchId: string, baseDir?: string): string | null {
  const dossierPath = getResearchPath(researchId, baseDir);
  return dossierPath ? path.join(path.dirname(dossierPath), PREVIEW_RECORD_FILE) : null;
}

function isPreviewRecord(value: unknown, researchId: string): value is PreviewHomeRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Partial<PreviewHomeRecord>;
  return record.version === 1 && record.researchId === researchId && Number.isInteger(record.round) && typeof record.slug === 'string'
    && Boolean(record.page) && record.page?.classification === 'homepage' && Boolean(record.collectedData) && Boolean(record.firstScreen);
}

export function readPreviewRecord(researchId: string, baseDir?: string): PreviewHomeRecord | null {
  const file = previewRecordPath(researchId, baseDir);
  if (!file) return null;
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.size > MAX_PREVIEW_RECORD_BYTES) return null;
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    return isPreviewRecord(parsed, researchId) ? parsed : null;
  } catch {
    return null;
  }
}

export function writePreviewRecordAtomic(record: PreviewHomeRecord, baseDir?: string): boolean {
  const file = previewRecordPath(record.researchId, baseDir);
  if (!file) return false;
  const temporary = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(temporary, JSON.stringify(record, null, 2), { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporary, file);
    return true;
  } catch {
    fs.rmSync(temporary, { force: true });
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The metered model caller

/**
 * The site-copy JSON caller (LLM_PROVIDER_SITE_COPY, the same provider switch as callSiteCopyJSON) with every attempt's
 * tokens priced into `rows`. Gemini: Flash prices (factExtraction.flashCostUsd), `think: false` -> LOW, else HIGH, one
 * parse retry contract as workloadJson.ts. Qwen: the token-plan list price. `signal` aborts every pending call.
 */
export function recordingSiteCopyCaller(rows: ProviderUsage[], options: { now: () => Date; recordId: string; operation: string; signal?: AbortSignal }): QwenJsonCaller {
  let n = 0;
  const row = (provider: string, model: string, costUsd: number): ProviderUsage => {
    n += 1;
    const at = options.now();
    return {
      provider, operation: options.operation, units: 1, estimatedCostUsd: Number(costUsd.toFixed(6)),
      sourceKind: 'provider', providerRecordId: `${model}:${options.recordId}:call-${n}`, retrievedAt: at.toISOString(), confidence: 1, assertionStatus: 'verified',
    };
  };
  return async (system, user, opts = {}) => {
    const { provider } = selectLlmProvider('site_copy');
    if (provider !== 'gemini') {
      return callQwenJSON(system, user, {
        ...opts, workload: 'site_copy', ...(options.signal ? { signal: options.signal } : {}),
        onUsage: usage => rows.push(row('qwen', usage.model, usage.promptTokens * QWEN_PRICE_IN + usage.completionTokens * QWEN_PRICE_OUT)),
      });
    }
    let last: unknown;
    for (let attempt = 0; attempt < GEMINI_ATTEMPTS; attempt += 1) {
      if (options.signal?.aborted) throw options.signal.reason ?? new Error('aborted');
      try {
        const text = await callGeminiJSON(system, user, {
          thinkingLevel: opts.think === false ? 'LOW' : 'HIGH',
          timeoutMs: opts.timeoutMs ?? GEMINI_TIMEOUT_MS,
          ...(options.signal ? { signal: options.signal } : {}),
          usage: { workload: 'site_copy' },
          onUsage: (counts, model) => rows.push(row('gemini', model, flashCostUsd(counts, options.now()))),
        });
        JSON.parse(text);
        return text;
      } catch (error) {
        last = error;
        if (options.signal?.aborted || (error instanceof Error && error.message === 'Gemini not configured')) throw error;
      }
    }
    throw last instanceof Error ? last : new Error(String(last));
  };
}

/** The default page writer of the researched path (the same options runResearchToSite passes). */
export function researchedCopyWriter(callJson: QwenJsonCaller) {
  return (brief: PageBrief, data: CollectedData, site?: ResearchedSiteGenerationContext): Promise<SiteCopy> => generateResearchPageCopy(brief, data, {
    callJson,
    ...(site ? {
      priorHeroHeadlines: site.priorHeroHeadlines, priorAboutPageHeadlines: site.priorAboutPageHeadlines, priorAboutPageBodies: site.priorAboutPageBodies,
      ...(site.priorHeroSubheadlines ? { priorHeroSubheadlines: site.priorHeroSubheadlines } : {}), priorHeroFacts: site.priorHeroFacts,
      ...(site.siteTerms?.length ? { siteTerms: site.siteTerms } : {}), ...(site.priorMechanismKeys?.length ? { priorMechanismKeys: site.priorMechanismKeys } : {}),
    } : {}),
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// The dev fixture writer (moved strings only: the owner's own data and facts, the trade + city formula, data-file labels)

function clipWords(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const space = cut.lastIndexOf(' ');
  return (space > 0 ? cut.slice(0, space) : clean.slice(0, max)).trim();
}

/** A deterministic, zero-network homepage / service copy for rehearsals: never used in production (previewModelMode). */
export function fixtureCopyWriter(firstScreen: readonly UsableFact[], writer: readonly UsableFact[]) {
  return async (brief: PageBrief, data: CollectedData): Promise<SiteCopy> => {
    const site = brief.site;
    if (!site) throw new Error('fixture writer needs site facts');
    const lead = brief.page.pageClass === 'homepage' ? firstScreen[0]?.text : undefined;
    const sub = clipWords(lead ?? (typeof data.usp === 'string' && data.usp.trim() ? data.usp : site.businessName), 90);
    const body = clipWords([...writer.map(fact => fact.text), typeof data.usp === 'string' ? data.usp : ''].filter(Boolean).join('. ') || site.businessName, 380);
    const copy: Record<string, unknown> = {
      heroHeadline: clipWords(pageNameWithCity(site.pageName, site.city), 68),
      heroSubheadline: sub,
      heroCta: '',
      trustBarItems: [],
      aboutBlurb: '',
      servicesHeadline: '',
      serviceItems: [],
      faqHeadline: '',
      faqItems: [],
      guaranteeBlock: null,
      reviewFeatured: null,
      reviewContext: null,
      responseTimeBadge: null,
      scarcityLine: null,
      formHeadline: CTA_LABEL_SETS.formHeadlineFallback.slice(0, 35),
      stickyBarLine: '',
      aboutPageHeadline: clipWords(site.businessName, 50),
      aboutPageBody: body,
      serviceDetails: site.serviceLabels.slice(0, 6).map(name => ({ name, description: '' })),
      ...(brief.page.pageClass === 'homepage' ? { storyHeadline: null, storyBody: null, pitch: null } : {}),
    };
    const final = withSystemFields(copy, brief, data) as unknown as SiteCopy;
    assertBoundedGeneratedSiteCopy(final, shapeOptions(brief));
    return final;
  };
}

function fixtureDelay(value: string | undefined, signal?: AbortSignal): Promise<void> {
  const ms = /^\d{1,6}$/.test(value ?? '') ? Math.min(Number(value), 120_000) : 0;
  if (!ms) return Promise.resolve();
  return new Promise(resolve => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Shared preparation

function currentFactSet(dossier: SiteResearchDossier, answersVersion: number): InterviewFactSet | null {
  const set = dossier.interviewFacts;
  return isInterviewFactSet(set) && set.answersVersion === answersVersion ? set : null;
}

function priorityOrdered(candidates: readonly UsableFact[], writer: readonly UsableFact[]): UsableFact[] {
  const ids = new Set(candidates.map(fact => fact.id));
  return [...candidates, ...writer.filter(fact => !ids.has(fact.id))];
}

/** Appends usage rows to the dossier on a FRESH read (a concurrent writer is never overwritten). */
export async function appendProviderUsage(researchId: string, rows: readonly ProviderUsage[], now: Date, baseDir?: string): Promise<boolean> {
  if (!rows.length) return true;
  const dossier = await readResearchDossier(researchId, baseDir, { bounded: true });
  if (!dossier) return false;
  dossier.providerUsage = [...dossier.providerUsage, ...rows];
  dossier.updatedAt = now.toISOString();
  return writeResearchDossierAtomic(researchId, dossier, baseDir);
}

const CREDENTIAL_FIELD: Readonly<Record<string, keyof CollectedData>> = {
  'cred-years': 'yearsInField', 'cred-license': 'license', 'cred-guarantee': 'guarantee',
};

/** Each credential fact and the trust-bar item the code builds from its field (the item that disappears without it). */
function credentialTrustItems(brief: PageBrief, data: CollectedData, usable: readonly UsableFact[]): CredentialTrustItem[] {
  const full = codeBuiltTrustBar(brief, data);
  if (!full) return [];
  return ['cred-years', 'cred-license', 'cred-guarantee'].flatMap(id => {
    if (!usable.some(fact => fact.id === id && fact.type === 'credential')) return [];
    const field = CREDENTIAL_FIELD[id];
    if (!data[field]) return [{ factId: id, item: null }];
    const without = codeBuiltTrustBar(brief, { ...data, [field]: undefined }) ?? [];
    return [{ factId: id, item: full.find(item => !without.includes(item)) ?? null }];
  });
}

const htmlText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------------------------------------------------
// The preview

export interface PreviewGenerationInput {
  sessionId: string;
  researchId: string;
  round: number;
  answersVersion: number;
  collectedData: CollectedData;
  workLocation: WorkLocation | null;
  /** The business's published Google address (audit candidate formattedAddress), for the MIX framing. */
  publishedAddress: string | null;
}

export interface PreviewGenerationDeps {
  now: () => Date;
  researchBaseDir?: string;
  /** Test seam / live default: the page writer. */
  generateCopy?: (brief: PageBrief, data: CollectedData, site?: ResearchedSiteGenerationContext) => Promise<SiteCopy>;
  /** Test seam: the model caller (default: recordingSiteCopyCaller). */
  callJson?: QwenJsonCaller;
  mode?: PreviewModelMode;
  signal?: AbortSignal;
  log?: (line: string) => void;
}

export type PreviewGenerationOutcome =
  | { ok: true; record: PreviewHomeRecord; usage: ProviderUsage[] }
  | { ok: false; reason: string; usage: ProviderUsage[] };

/** The interview's facts, the generation data and the briefs of a planned dossier (shared by the preview and post-pay). */
export function interviewInputs(dossier: SiteResearchDossier, input: Pick<PreviewGenerationInput, 'answersVersion' | 'collectedData' | 'workLocation' | 'publishedAddress'>) {
  const set = currentFactSet(dossier, input.answersVersion);
  const usable = usableFacts(set);
  const removedIds = (set?.facts ?? []).filter(fact => fact.status === 'removed').map(fact => fact.id);
  const data = interviewGenerationData(gateAnsweredCollectedData(input.collectedData, dossier), {
    usable, removedIds, workLocation: input.workLocation, publishedAddress: input.publishedAddress,
  });
  return { set, usable, data, writer: writerFacts(usable) };
}

export async function generatePreviewHomepage(input: PreviewGenerationInput, deps: PreviewGenerationDeps): Promise<PreviewGenerationOutcome> {
  const usage: ProviderUsage[] = [];
  const started = Date.now();
  const log = deps.log ?? (line => console.error(line));
  const mode = deps.mode ?? previewModelMode();
  const baseDir = deps.researchBaseDir;
  const callJson = deps.callJson ?? recordingSiteCopyCaller(usage, {
    now: deps.now, recordId: `${input.researchId}:preview-r${input.round}`, operation: PREVIEW_USAGE_OPERATION, ...(deps.signal ? { signal: deps.signal } : {}),
  });
  const failed = (reason: string): PreviewGenerationOutcome => ({ ok: false, reason, usage });
  try {
    const dossier = await readResearchDossier(input.researchId, baseDir, { bounded: true });
    if (!dossier) return failed('research_missing');
    const readiness = generationReadiness(dossier);
    if (!readiness.ready) return failed(`held:${readiness.reasons.join(',')}`);
    const prepared = interviewInputs(dossier, input);
    const { data, usable, writer } = prepared;

    // The copy_ready plan, persisted once (the regeneration and the post-pay run reuse it).
    let planned = dossier;
    if (!(dossier.status === 'copy_ready' && isPlannedDossier(dossier))) {
      const call: SiteIdentityModelCall | null = mode === 'live' ? (system, user) => callJson(system, user, { think: false }) : null;
      const identity = await resolveSiteIdentity(siteIdentityInput(serviceNamesFor(dossier), data), call, deps.now);
      planned = planCopyReadyDossier(dossier, deps.now, identity);
      if (!await writeResearchDossierAtomic(input.researchId, planned, baseDir)) return failed('plan_not_persisted');
    }

    const plainHome = buildPageBriefs(planned, data).find(brief => brief.page.pageClass === 'homepage');
    if (!plainHome?.site) return failed('no_homepage');
    const context = {
      // The homepage covers every owner-confirmed service (interviewFactsFlow.dossierServices ids).
      homeServiceIds: planned.businessTruth.assertions.filter(assertion => assertion.id.startsWith('owner-service:')).map(assertion => assertion.id),
      serviceAreas: researchedServiceAreas({ seo: { name: plainHome.site.pageName, city: plainHome.site.city, serviceArea: plainHome.site.serviceArea } }),
      localities: ISRAELI_LOCALITIES,
      trustBarNumbers: trustBarNumbers(codeBuiltTrustBar(plainHome, data) ?? []),
    };
    const candidates = firstScreenCandidates(usable, context);
    const ordered = priorityOrdered(candidates, writer);
    const home = buildPageBriefs(planned, data, { facts: ordered, firstScreen: candidates, workLocation: input.workLocation })
      .find(brief => brief.page.pageClass === 'homepage')!;
    const usedFactIds = home.firstPartyProof.filter(item => item.id.startsWith('interview-')).map(item => item.id.slice('interview-'.length));

    const writeCopy = deps.generateCopy ?? (mode === 'fixture' ? fixtureCopyWriter(candidates, ordered) : researchedCopyWriter(callJson));
    // Rehearsals only (fixture mode never runs in production): SITE_BOT_PREVIEW_FIXTURE_DELAY_MS keeps the generating
    // screen up long enough to see and poll it (capped at 2 minutes).
    if (mode === 'fixture' && !deps.generateCopy) await fixtureDelay(process.env.SITE_BOT_PREVIEW_FIXTURE_DELAY_MS, deps.signal);
    const copy = await writeCopy(home, structuredClone(data), siteGenerationContext([], []));
    assertBoundedGeneratedSiteCopy(copy, shapeOptions(home));
    const page = researchedPageFromCopy(home, copy);

    const slug = deriveSiteSlug(data);
    if (!isSafeSiteSlug(slug)) return failed('slug_invalid');
    const html = renderResearchedSitePages({ ...researchedRenderInputs(data, slug), data, slug, pages: [page], graphEdges: [] })['index.html'];
    if (!html) return failed('render_failed');

    const rendered = (page.copy.trustBarItems ?? []).filter(item => html.includes(htmlText(item)));
    const firstScreen = resolveFirstScreen(page.copy.heroSubheadline, candidates, credentialTrustItems(home, data, usable), rendered,
      anchorExclusions(home.site!.pageName, home.site!.city, home.site!.businessName));
    // Rule (e): the preview still renders; step 3's gate reads this line.
    if (firstScreen.missing) log(`[site-bot preview] first_screen_fact_missing session=${input.sessionId} round=${input.round} candidates=${firstScreen.candidateIds.length}`);

    const record: PreviewHomeRecord = {
      version: 1, researchId: input.researchId, round: input.round, slug, createdAt: deps.now().toISOString(),
      answersVersion: input.answersVersion, factsConfirmedAt: prepared.set?.confirmedAt ?? null, workLocation: input.workLocation,
      collectedData: data, page, firstScreen, usedFactIds,
      generation: {
        model: mode, ms: Date.now() - started, calls: usage.length,
        costUsd: Number(usage.reduce((sum, row) => sum + (row.estimatedCostUsd ?? 0), 0).toFixed(6)),
      },
    };
    if (!writePreviewRecordAtomic(record, baseDir)) return failed('record_not_persisted');
    return { ok: true, record, usage };
  } catch (error) {
    const reason = error instanceof GeneratedCopyValidationError ? 'copy_validation_failed'
      : deps.signal?.aborted ? 'timeout' : 'generation_error';
    log(`[site-bot preview] generation failed session=${input.sessionId} round=${input.round} reason=${reason}`);
    return failed(reason);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// After payment: the remaining pages

export interface RemainingPagesDeps extends Omit<PreviewGenerationDeps, 'generateCopy'> {
  sitesRoot: string;
  generateCopy?: PreviewGenerationDeps['generateCopy'];
  /** Default: the live place-id checker; null = off. */
  checkPlaceId?: PlaceIdChecker | null;
}

export type RemainingPagesOutcome =
  | { ok: true; slug: string; pages: string[]; generatedPageIds: string[]; usage: ProviderUsage[] }
  | { ok: false; reason: string; usage: ProviderUsage[] };

/** The site record also carries what step 3's ledger reads: the first-screen fact and the facts the writer got. */
export interface InterviewFactUse {
  previewRound: number;
  firstScreenFactId: string | null;
  firstScreenSource: FirstScreenOutcome['source'];
  usedFactIds: string[];
}

function slugCandidates(base: string, researchId: string): string[] {
  const suffix = researchId.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8);
  const alternative = `${base.slice(0, 31).replace(/-+$/, '')}-${suffix}`;
  return [base, alternative].filter(isSafeSiteSlug);
}

export async function generateRemainingPages(preview: PreviewHomeRecord, deps: RemainingPagesDeps): Promise<RemainingPagesOutcome> {
  const usage: ProviderUsage[] = [];
  const mode = deps.mode ?? previewModelMode();
  const baseDir = deps.researchBaseDir;
  const callJson = deps.callJson ?? recordingSiteCopyCaller(usage, {
    now: deps.now, recordId: `${preview.researchId}:site`, operation: SITE_USAGE_OPERATION, ...(deps.signal ? { signal: deps.signal } : {}),
  });
  const failed = (reason: string): RemainingPagesOutcome => ({ ok: false, reason, usage });
  try {
    const dossier = await readResearchDossier(preview.researchId, baseDir, { bounded: true });
    if (!dossier) return failed('research_missing');
    if (!generationReadiness(dossier).ready || dossier.status !== 'copy_ready' || !isPlannedDossier(dossier)) return failed('plan_missing');
    const data = preview.collectedData;
    const set = currentFactSet(dossier, preview.answersVersion);
    const writer = writerFacts(usableFacts(set));
    const briefs = buildPageBriefs(dossier, data, { facts: writer, firstScreen: [], workLocation: preview.workLocation });
    const home = briefs.find(brief => brief.page.pageClass === 'homepage');
    if (!home || home.page.id !== preview.page.opportunityId) return failed('home_mismatch');
    const graphEdges = buildGraphEdges(briefs);

    let slug: string | null = null;
    for (const candidate of slugCandidates(preview.slug, preview.researchId)) {
      try {
        preflightResearchedSiteTarget(candidate, preview.researchId, { sitesRoot: deps.sitesRoot });
        slug = candidate;
        break;
      } catch {
        continue;
      }
    }
    if (!slug) return failed('slug_conflict');

    const generated: string[] = [];
    const writeCopy = deps.generateCopy ?? (mode === 'fixture' ? fixtureCopyWriter([], writer) : researchedCopyWriter(callJson));
    const record: ResearchedSiteGenerationRecord & { interviewFactUse?: InterviewFactUse } = await buildResearchedSiteGeneration(
      { slug, researchId: preview.researchId, collectedData: data, dossier, pageBriefs: briefs, graphEdges },
      {
        generateCopy: (brief, pageData, site) => { generated.push(brief.page.id); return writeCopy(brief, pageData, site); },
        renderInputs: researchedRenderInputs(data, slug),
        now: deps.now,
        reusedPages: { [home.page.id]: preview.page },
        ...(deps.checkPlaceId === null ? {} : { checkPlaceId: deps.checkPlaceId ?? createPlaceIdChecker() }),
      },
    );
    record.interviewFactUse = {
      previewRound: preview.round,
      firstScreenFactId: preview.firstScreen.firstScreenFactId,
      firstScreenSource: preview.firstScreen.source,
      usedFactIds: preview.usedFactIds,
    };
    await persistResearchedSiteRecordAtomic(record, {
      sitesRoot: deps.sitesRoot,
      dossier,
      writeDossier: updated => writeResearchDossierAtomic(updated.researchId, updated, baseDir),
    });
    return { ok: true, slug, pages: record.researchedPages.map(page => page.opportunityId), generatedPageIds: generated, usage };
  } catch (error) {
    const reason = error instanceof GeneratedCopyValidationError ? 'copy_validation_failed' : deps.signal?.aborted ? 'timeout' : 'generation_error';
    (deps.log ?? (line => console.error(line)))(`[site-bot site] remaining pages failed research=${preview.researchId} reason=${reason}`);
    return failed(reason);
  }
}
