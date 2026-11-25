/**
 * Site Bot step 2c: the home-page preview generation (before payment) and the generation of the remaining pages (after
 * payment). docs/missions/site-bot-step2-interview-preview-2026-11-25.md, 2c items 1-3 and 7.
 *
 * Preview (generatePreviewHomepage): the existing researched generation path, limited to the homepage:
 *   research dossier (must be copy_ready-able: researchToSite.generationReadiness) -> owner gate answers
 *   (gateAnsweredCollectedData) -> the interview facts and the work-location framing (interviewGeneration.ts) -> the
 *   copy_ready plan (persisted once; the post-pay run reuses it) -> buildPageBriefs (homepage brief with the facts and the
 *   first-screen constraint: a free USP subheadline) -> generateResearchPageCopy (Tamar -> Noa -> gates, unchanged) ->
 *   the subheadline person gate and the page-wide repeated-word lint -> the hero rating line (GBP manager access only,
 *   firstScreenFact.ts heroRatingLine; none before payment) and the about-section owner quote line, both chosen and built
 *   by code (selectOwnerQuote, rule v2 a-h as changed 2026-11-26), set on the page (page.heroRating, page.ownerQuote). The
 *   story section renders only when the owner confirmed a job fact (Fable 5.2 2026-11-26). Nothing is written to the sites dir and nothing deploys: the generation record lives
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
  assertBoundedGeneratedSiteCopy, briefGateContext, codeBuiltTrustBar, emDashText, firstScreenRule, generateResearchPageCopy, GeneratedCopyValidationError,
  REDUPLICATION_RULE, shapeOptions, SITE_COPY_STRING_LIMITS, TYPOGRAPHY_RULE, withSystemFields, type CopyRepairEvent, type QwenJsonCaller,
} from '../lp/researchPageCopy';
import { runCopyGates } from '../lp/copyGates';
import { pageNameWithCity, renderResearchedSitePages, type ResearchedSitePage } from '../lp/researchedSite';
import { flashCostUsd } from './factExtraction';
import {
  anchorExclusions, firstScreenMissingLine, firstScreenOutcome, heroRatingLine, ownerQuoteMissingLine, renderedFactIds, selectOwnerQuote,
  subheadlineCarriesFact, trustBarNumbers, usableFacts, type CredentialTrustItem, type FirstScreenAnswer, type FirstScreenOutcome,
  type GbpRatingSnapshot, type UsableFact,
} from './firstScreenFact';
import { SITE_BOT_OWNER_QUOTE_COPY } from './ownerQuoteCopy.generated';
import { gatePageRepeatWords, type PageRepeatResult } from './pageRepeatWords';
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
import { personExemptNames, subheadlinePersonHits } from './subheadlinePerson';
import type { WorkLocation } from './workLocation';

export const PREVIEW_RECORD_FILE = 'preview-home.json';
export const PREVIEW_USAGE_OPERATION = 'site_bot_preview_copy';
export const SITE_USAGE_OPERATION = 'site_bot_site_copy';
const MAX_PREVIEW_RECORD_BYTES = 4 * 1024 * 1024;
/**
 * Per-call Gemini timeout of the site-copy caller. 2026-11-26: 180 s -> 300 s. With Noa's round-2 rules the homepage Tamar
 * call (pitch-first, HIGH thinking) measured 183.6 s (24.8k thinking tokens) and every attempt of the live preview timed
 * out at 180 s. The preview attempt keeps its own 12-minute cap (interviewPreview.ts PREVIEW_ATTEMPT_TIMEOUT_MS).
 */
const GEMINI_TIMEOUT_MS = 300_000;
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
  /** First-screen rule 2026-11-26: the hero rating decision (source google_rating) and the about quote, with every candidate's reason. */
  firstScreen: FirstScreenOutcome;
  /** The interview facts that truly appear in the rendered homepage (firstScreenFact.ts renderedFactIds). */
  usedFactIds: string[];
  /** The interview facts the brief handed to the writer (the input side of step 3's ledger), rendered or not. */
  briefFactIds: string[];
  /** Rule (a) watch: facts the subheadline appears to carry (word overlap); it should be empty. */
  subheadlineFactIds: string[];
  /** Noa 2026-11-26: the page-wide repeated-word lint (pageRepeatWords.ts), field names and counts only. Absent on older records. */
  pageRepeatWords?: Pick<PageRepeatResult, 'outcome' | 'before' | 'after'>;
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

/**
 * The pipeline's diagnostic events as one log line each: stage, kind, attempt, field names and rule ids only (never copy
 * text), so a run's repairs can be traced afterwards (the 2026-11-25 live preview had a repair round and no record of it).
 */
export function copyEventLine(pageId: string, event: CopyRepairEvent): string {
  const rules = [...new Set((event.violations ?? []).map(violation => `${violation.field}:${violation.rule}`))].join(',');
  return `[site-bot copy] page=${pageId} stage=${event.stage} kind=${event.kind}${event.attempt ? ` attempt=${event.attempt}` : ''}`
    + `${event.fields?.length ? ` fields=${event.fields.join(',')}` : ''}${rules ? ` rules=${rules}` : ''}${event.fixes?.length ? ` fixes=${event.fixes.length}` : ''}`;
}

/** The default page writer of the researched path (the same options runResearchToSite passes). */
export function researchedCopyWriter(callJson: QwenJsonCaller, log: (line: string) => void = line => console.error(line)) {
  return (brief: PageBrief, data: CollectedData, site?: ResearchedSiteGenerationContext): Promise<SiteCopy> => generateResearchPageCopy(brief, data, {
    callJson,
    onEvent: event => log(copyEventLine(brief.page.id, event)),
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

/**
 * A deterministic, zero-network homepage / service copy for rehearsals: never used in production (previewModelMode).
 * First-screen fact v2 (a): the subheadline never carries an owner fact or his first-person usp; the fixture has no
 * model to write a third-person USP sentence, so it shows the business name.
 */
export function fixtureCopyWriter(writer: readonly UsableFact[]) {
  return async (brief: PageBrief, data: CollectedData): Promise<SiteCopy> => {
    const site = brief.site;
    if (!site) throw new Error('fixture writer needs site facts');
    const sub = clipWords(site.businessName, 90);
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
// First-screen fact v2 rule (a): the subheadline's person gate

/** The one-field repair's system prompt: no owner-voice rule (the shared prompts' "the owner speaks in the first person"). */
export const SUBHEADLINE_PERSON_REPAIR_SYSTEM = `You are Tamar, a Hebrew conversion copywriter. You are rewriting one field of a site-copy JSON object. Return only a JSON object with exactly the key heroSubheadline, with no prose or markdown.\n\n${TYPOGRAPHY_RULE} ${REDUPLICATION_RULE}`;

/** The one-field repair request (English; the Hebrew in it is the page's own copy and the forms the gate found). */
export function subheadlinePersonRepairPrompt(brief: PageBrief, copy: SiteCopy, found: readonly string[]): string {
  const rule = firstScreenRule(brief);
  return `heroSubheadline breaks the first-screen person rule: it uses first-person or second-person forms (found: ${JSON.stringify(found)}). Rewrite it.

RULES:
- Write it in the same grammatical person as heroHeadline: the third person about the business. No first-person and no second-person form anywhere: no pronoun, possessive, object form, verb form or suffix of "I", "we", "my", "our", "me", "us", "you" or "your".
${rule ? `${rule}\n` : ''}- Keep its meaning and its facts. Never add a claim, number, name, place, method or promise that is not already in the current value or in heroHeadline.
- At most ${SITE_COPY_STRING_LIMITS.heroSubheadline} characters (aim for 75), one sentence built on a verb, with no final period.

heroHeadline (never change it; match its grammatical person): ${JSON.stringify(copy.heroHeadline)}
Current heroSubheadline: ${JSON.stringify(copy.heroSubheadline)}`;
}

export type SubheadlinePersonOutcome = 'ok' | 'repaired' | 'dropped';

/**
 * Rule (a)'s code gate (Adam 2026-11-26, after the live preview shipped a first-person subheadline into the H2 line, the
 * meta description, og:description and the JSON-LD description): a subheadline with a first- or second-person form gets one
 * repair round (SUBHEADLINE_PERSON_REPAIR_SYSTEM; the fixture mode has no model and skips it). A repaired value must pass
 * this gate, the length limit and every copy gate on the field. Otherwise the subheadline is dropped: '' renders no
 * subheadline, the meta description falls back to the trade + city anchor alone, and `subheadline_person_fail` is logged.
 * Never a placeholder. Every surface that reads the subheadline (the hero line, the meta and og descriptions, the
 * Service JSON-LD description) reads the gated value, since the page is built from the returned copy.
 */
export async function gateSubheadlinePerson(
  copy: SiteCopy,
  brief: PageBrief,
  data: CollectedData,
  options: { callJson: QwenJsonCaller | null; log: (line: string) => void; sessionId: string; round: number },
): Promise<{ copy: SiteCopy; outcome: SubheadlinePersonOutcome }> {
  const exempt = personExemptNames(data.ownerName, brief.site?.businessName ?? data.businessName);
  const hits = subheadlinePersonHits(copy.heroSubheadline, exempt);
  if (!hits.length) return { copy, outcome: 'ok' };
  const where = `session=${options.sessionId} round=${options.round}`;
  if (options.callJson) {
    try {
      const raw = await options.callJson(SUBHEADLINE_PERSON_REPAIR_SYSTEM, subheadlinePersonRepairPrompt(brief, copy, hits.map(hit => hit.token)));
      const parsed: unknown = JSON.parse(raw);
      const value = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>).heroSubheadline : undefined;
      const next = typeof value === 'string' ? emDashText(value.replace(/\s+/gu, ' ').trim()).replace(/\.+$/u, '').trim() : '';
      const candidate: SiteCopy = { ...copy, heroSubheadline: next };
      if (next && next.length <= SITE_COPY_STRING_LIMITS.heroSubheadline && !subheadlinePersonHits(next, exempt).length
        && !runCopyGates(candidate as unknown as Record<string, unknown>, briefGateContext(brief, data)).some(hit => hit.field === 'heroSubheadline')) {
        options.log(`[site-bot preview] subheadline_person_repaired ${where} forms=${hits.length}`);
        return { copy: candidate, outcome: 'repaired' };
      }
    } catch {
      // A failed or unparseable repair call drops the subheadline like a failed repair.
    }
  }
  options.log(`[site-bot preview] subheadline_person_fail ${where} forms=${hits.length} persons=${[...new Set(hits.map(hit => hit.person))].join(',')}`);
  return { copy: { ...copy, heroSubheadline: '' }, outcome: 'dropped' };
}

// ---------------------------------------------------------------------------------------------------------------------
// Shared preparation

function currentFactSet(dossier: SiteResearchDossier, answersVersion: number): InterviewFactSet | null {
  const set = dossier.interviewFacts;
  return isInterviewFactSet(set) && set.answersVersion === answersVersion ? set : null;
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

/** The visible text of rendered pages (scripts, styles and tags dropped, the renderer's entities decoded). */
export function visibleText(html: string): string {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|\u00A0/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** The credential facts whose code-built trust-bar item is in the rendered html. */
function shownCredentials(items: readonly CredentialTrustItem[], html: string): string[] {
  return items.filter(entry => entry.item && html.includes(htmlText(entry.item))).map(entry => entry.factId);
}

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
  /** His answers (interviewQuestions.answerTexts), for the quote line's substring check; absent = no answer quote. */
  answers?: readonly FirstScreenAnswer[] | null;
  /**
   * First-screen rule (b): his own GBP rating through WAO's manager access (after his sign-in). Never Places data. No caller
   * has it before payment, so the pre-payment preview renders no hero proof line (first_screen_fact_missing no_gbp_rating).
   */
  gbpRating?: GbpRatingSnapshot | null;
}

/** With a hero rating line, the owner-entered rating leaves the generation data, so the trust bar never shows a second one. */
export function withoutOwnerRating(data: CollectedData): CollectedData {
  if (data.starRating === undefined && data.reviewCount === undefined) return data;
  const next: CollectedData = { ...data };
  delete next.starRating;
  delete next.reviewCount;
  return next;
}

/** Fable 5.2 2026-11-26: the story section renders only when it is built on a confirmed job fact; else it is omitted. */
export function withoutUnfoundedStory(copy: SiteCopy, usable: readonly UsableFact[]): SiteCopy {
  if (usable.some(fact => fact.type === 'job')) return copy;
  const loose = copy as unknown as Record<string, unknown>;
  if (!('storyBody' in loose) && !('storyHeadline' in loose)) return copy;
  return { ...copy, storyHeadline: null, storyBody: null } as unknown as SiteCopy;
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
    const { usable, writer } = prepared;
    // Rule (b): the hero rating line from his GBP via manager access only (none before payment).
    const rating = heroRatingLine(input.gbpRating ?? null, deps.now());
    const data = rating.line ? withoutOwnerRating(prepared.data) : prepared.data;

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
    const credentialItems = credentialTrustItems(plainHome, data, usable);
    // First-screen rule (b2-e): code picks the about quote line before the model runs; the model never sees or words it.
    const selected = selectOwnerQuote(prepared.set, {
      // The homepage covers every owner-confirmed service (interviewFactsFlow.dossierServices ids).
      homeServiceIds: planned.businessTruth.assertions.filter(assertion => assertion.id.startsWith('owner-service:')).map(assertion => assertion.id),
      localities: ISRAELI_LOCALITIES,
      trustBarNumbers: trustBarNumbers(codeBuiltTrustBar(plainHome, data) ?? []),
      trustBarCredentialIds: credentialItems.filter(entry => entry.item).map(entry => entry.factId),
      answers: input.answers ?? null,
    }, { ownerName: data.ownerName, copy: SITE_BOT_OWNER_QUOTE_COPY });
    const home = buildPageBriefs(planned, data, { facts: writer, firstScreen: true, workLocation: input.workLocation })
      .find(brief => brief.page.pageClass === 'homepage')!;
    const briefFactIds = home.firstPartyProof.filter(item => item.id.startsWith('interview-')).map(item => item.id.slice('interview-'.length));

    const writeCopy = deps.generateCopy ?? (mode === 'fixture' ? fixtureCopyWriter(writer) : researchedCopyWriter(callJson, log));
    // Rehearsals only (fixture mode never runs in production): SITE_BOT_PREVIEW_FIXTURE_DELAY_MS keeps the generating
    // screen up long enough to see and poll it (capped at 2 minutes).
    if (mode === 'fixture' && !deps.generateCopy) await fixtureDelay(process.env.SITE_BOT_PREVIEW_FIXTURE_DELAY_MS, deps.signal);
    const written = await writeCopy(home, structuredClone(data), siteGenerationContext([], []));
    assertBoundedGeneratedSiteCopy(written, shapeOptions(home));
    // Rule (a): the subheadline's person gate (one repair round, else no subheadline).
    const repairCall = mode === 'live' || deps.callJson ? callJson : null;
    const { copy: personGated } = await gateSubheadlinePerson(written, home, data, {
      callJson: repairCall, log, sessionId: input.sessionId, round: input.round,
    });
    // Noa 2026-11-26: the page-wide repeated-word lint (one repair round on the later fields, else logged and shipped).
    const repeat = await gatePageRepeatWords(personGated, home, data, {
      callJson: repairCall, log, sessionId: input.sessionId, round: input.round, localities: ISRAELI_LOCALITIES,
    });
    const copy = withoutUnfoundedStory(repeat.copy, usable);
    if (copy !== repeat.copy) log(`[site-bot preview] story_omitted_no_job_fact session=${input.sessionId} round=${input.round}`);
    let page: ResearchedSitePage = {
      ...researchedPageFromCopy(home, copy),
      ...(rating.line ? { heroRating: rating.line } : {}),
      ...(selected.quoteLine ? { ownerQuote: { ...selected.quoteLine } } : {}),
    };

    const slug = deriveSiteSlug(data);
    if (!isSafeSiteSlug(slug)) return failed('slug_invalid');
    const render = (value: ResearchedSitePage) => renderResearchedSitePages({ ...researchedRenderInputs(data, slug), data, slug, pages: [value], graphEdges: [] })['index.html'];
    let html = render(page);
    if (!html) return failed('render_failed');
    let quote = selected;
    // Rule (b2): the quote renders only inside the about section; a page without one shows no quote (never moved elsewhere).
    if (quote.quoteLine && !html.includes('data-section="owner-quote"')) {
      log(`[site-bot preview] owner_quote_not_rendered session=${input.sessionId} round=${input.round} fact=${quote.quoteFactId} reason=no_about_section`);
      const { ownerQuote: _dropped, ...rest } = page;
      void _dropped;
      page = rest;
      quote = { ...quote, quoteFactId: null, quoteLine: null };
      html = render(page);
      if (!html) return failed('render_failed');
    }
    const firstScreen = firstScreenOutcome(rating, quote);
    const shown = shownCredentials(credentialItems, html);
    // Rules (b) and (e): the preview still renders; step 3's gate reads these lines.
    if (firstScreen.missing) log(firstScreenMissingLine(input.sessionId, input.round, firstScreen));
    if (!firstScreen.quoteLine) log(ownerQuoteMissingLine(input.sessionId, input.round, firstScreen));
    const usedFactIds = renderedFactIds(usable, visibleText(html), firstScreen, shown);
    // Rule (a) watch: the subheadline should carry no owner fact (word overlap; anchors, places and time words never count).
    const exclude = anchorExclusions(home.site!.pageName, home.site!.city, home.site!.businessName);
    const subheadlineFactIds = writer.filter(fact => subheadlineCarriesFact(page.copy.heroSubheadline, fact, exclude, ISRAELI_LOCALITIES)).map(fact => fact.id);
    if (subheadlineFactIds.length) log(`[site-bot preview] first_screen_subheadline_carries_fact session=${input.sessionId} round=${input.round} facts=${subheadlineFactIds.join(',')}`);

    const record: PreviewHomeRecord = {
      version: 1, researchId: input.researchId, round: input.round, slug, createdAt: deps.now().toISOString(),
      answersVersion: input.answersVersion, factsConfirmedAt: prepared.set?.confirmedAt ?? null, workLocation: input.workLocation,
      collectedData: data, page, firstScreen, usedFactIds, briefFactIds, subheadlineFactIds,
      pageRepeatWords: { outcome: repeat.outcome, before: repeat.before, after: repeat.after },
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

/**
 * The site record also carries what step 3's ledger reads: the first-screen fact and the facts that truly appear in the
 * rendered site (every page, firstScreenFact.ts renderedFactIds), never merely the facts the briefs handed to the writer.
 */
export interface InterviewFactUse {
  previewRound: number;
  /** The hero proof line's source (google_rating), else null. */
  firstScreenSource: FirstScreenOutcome['source'];
  /** The about-section quote line's fact, else null. */
  quoteFactId: string | null;
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
    const usable = usableFacts(set);
    const writer = writerFacts(usable);
    const briefs = buildPageBriefs(dossier, data, { facts: writer, firstScreen: false, workLocation: preview.workLocation });
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
    const writeCopy = deps.generateCopy ?? (mode === 'fixture' ? fixtureCopyWriter(writer) : researchedCopyWriter(callJson));
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
    const rendered = Object.values(renderResearchedSitePages({ ...researchedRenderInputs(data, slug), data, slug, pages: record.researchedPages, graphEdges })).join('\n');
    const plainHome = buildPageBriefs(dossier, data).find(brief => brief.page.pageClass === 'homepage') ?? home;
    const shown = shownCredentials(credentialTrustItems(plainHome, data, usable), rendered);
    record.interviewFactUse = {
      previewRound: preview.round,
      firstScreenSource: preview.firstScreen.source ?? null,
      quoteFactId: preview.firstScreen.quoteFactId ?? null,
      usedFactIds: renderedFactIds(usable, visibleText(rendered), preview.firstScreen, shown),
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
