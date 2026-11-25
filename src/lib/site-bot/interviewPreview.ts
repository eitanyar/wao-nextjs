/**
 * Site Bot step 2c: the request-level logic of the home-page preview (POST /api/site-bot/interview-preview), its
 * background run, the "your home page is ready" email, the staff alert on failure, the staff re-trigger, and the
 * post-payment generation of the remaining pages.
 *
 *   { action: 'status' }   the preview state of the cookie's session; starts the due round when none runs (idempotent)
 *   { action: 'fix' }      PREVIEW_FIX_LINK: the one fix round (back to the facts screen; FACTS_DONE regenerates once)
 *
 * Bounded (2c constraints): at most PREVIEW_MAX_ROUNDS rounds per session (the first preview + one regeneration after the
 * fix round), PREVIEW_MAX_ATTEMPTS attempts per round, a per-attempt timeout (PREVIEW_ATTEMPT_TIMEOUT_MS, aborts every model
 * call), the route's per-IP rate limit, and every call's cost in the dossier's providerUsage. Every start is a conditional
 * UPDATE on the session (interviewSession.ts claimPreviewRound / claimPreviewAttempt), so a reload, a double poll or a
 * second process never runs a round twice. An attempt whose claim is older than PREVIEW_STALE_MS with no run in this
 * process (the process stopped) counts as failed and the next attempt is claimed.
 *
 * Failure: two failed attempts -> preview_status 'failed', PREVIEW_FAILED on the page, one staff email (the same path as
 * waitlistAlert / paidQueueAlert), the spot stays held (nothing here touches the spot). Staff re-trigger:
 * POST /api/admin/site-bot/interview-preview-retry (admin cookie) -> staffRetryPreview -> a fresh attempt.
 *
 * Email: when the preview is ready and the round took longer than PREVIEW_EMAIL_AFTER_MS, or the page stopped polling
 * (PREVIEW_AWAY_MS), the owner gets GENERATING_EMAIL_* once per round, with {previewUrl} = the signed resume link (2a's
 * mechanism; it restores the cookie and lands on /site-bot/start, which shows the preview). Plain text: the URL alone on
 * the last line.
 *
 * Server-only. HEBREW-SAFETY: this module contains ZERO Hebrew bytes (the strings are the generated waocopy module).
 */
import { siteBaseUrl } from '../siteBaseUrl';
import { sitesDir } from '../dataRoots';
import { defaultMailTransport, escapeHtml, israelTime, staffAlertAddress, supportFromAddress, type MailTransport, type OutgoingEmail } from './clientMessageEmail';
import { fillCopy } from './lifecycleEmail';
import type { InterviewDeps } from './interviewFlow';
import { openSessionFromCookie, sessionResumePath } from './interviewFlow';
import {
  beginPreviewFix, claimPreviewAttempt, claimPreviewEmail, claimPreviewRound, claimSiteGeneration, interviewPhase, PREVIEW_MAX_ATTEMPTS,
  previewReady, previewRoundDue, readInterviewSession, releaseSiteGeneration, settlePreviewAttempt, staffRetryPreview, touchPreviewPoll,
  type InterviewSession,
} from './interviewSession';
import {
  appendProviderUsage, generatePreviewHomepage, generateRemainingPages, readPreviewRecord,
  type PreviewGenerationInput, type PreviewGenerationOutcome, type RemainingPagesOutcome, type PreviewHomeRecord,
} from './previewGeneration';
import { readResearchDossier, writeResearchDossierAtomic } from './research/researchStore';
import { defaultInterviewDeps } from './interviewDeps';
import { isInterviewFactSet } from './interviewFacts';
import { answerTexts } from './interviewQuestions';
import { SITE_BOT_STEP2C_COPY as COPY } from './step2cCopy.generated';

/**
 * Per attempt: Tamar + Noa + up to two repairs at thinking HIGH, plus the identity call on the first round. Measured
 * 2026-11-25 on one synthetic plumber (live Gemini): 374 s for 4 calls with no repair, so the cap leaves room for repairs.
 */
export const PREVIEW_ATTEMPT_TIMEOUT_MS = 12 * 60 * 1000;
/** A claim this old with no run in this process: the process stopped mid-run. */
export const PREVIEW_STALE_MS = PREVIEW_ATTEMPT_TIMEOUT_MS + 2 * 60 * 1000;
/** "If he leaves (or generation passes ~60 s), send one email when it is ready." */
export const PREVIEW_EMAIL_AFTER_MS = 60 * 1000;
/** The page polls every few seconds; no poll for this long = he left. */
export const PREVIEW_AWAY_MS = 20 * 1000;
/** The remaining pages after payment: one attempt per claim, each page bounded by the generator's own repair limit. */
export const SITE_GENERATION_TIMEOUT_MS = 45 * 60 * 1000;

export { previewView, PREVIEW_FRAME_PATH, type PreviewState, type PreviewView } from './interviewPreviewView';
import { previewView } from './interviewPreviewView';

export interface PreviewDeps extends Pick<InterviewDeps, 'withStore' | 'now' | 'findCandidate'> {
  generate: (input: PreviewGenerationInput, signal: AbortSignal) => Promise<PreviewGenerationOutcome>;
  generateSite: (preview: PreviewHomeRecord, signal: AbortSignal) => Promise<RemainingPagesOutcome>;
  researchBaseDir?: string;
  mail: MailTransport;
  timeoutMs: number;
  staleMs: number;
  env: Record<string, string | undefined>;
  log: (line: string) => void;
}

export function defaultPreviewDeps(base: Pick<InterviewDeps, 'withStore' | 'now' | 'findCandidate'>): PreviewDeps {
  return {
    ...base,
    generate: (input, signal) => generatePreviewHomepage(input, { now: base.now, signal }),
    generateSite: (preview, signal) => generateRemainingPages(preview, { now: base.now, signal, sitesRoot: sitesDir() }),
    mail: defaultMailTransport,
    timeoutMs: PREVIEW_ATTEMPT_TIMEOUT_MS,
    staleMs: PREVIEW_STALE_MS,
    env: process.env,
    log: line => console.error(line),
  };
}

/** The run of THIS process per session id (settles, never rejects). Tests await it. */
const inFlight = new Map<string, Promise<void>>();
const siteInFlight = new Map<string, Promise<void>>();

export function inFlightPreview(sessionId: string): Promise<void> | undefined {
  return inFlight.get(sessionId);
}

export function inFlightSiteGeneration(sessionId: string): Promise<void> | undefined {
  return siteInFlight.get(sessionId);
}

// ---------------------------------------------------------------------------------------------------------------------
// Emails

const RTL = 'dir="rtl" style="direction:rtl;text-align:right"';
const ONE_LINE = /[\r\n\t\u0000-\u001f\u007f\u200E\u200F\u202A-\u202E\u2066-\u2069]+/g;
const oneLine = (value: string | null | undefined, max = 120) => (value ?? '').replace(ONE_LINE, ' ').trim().slice(0, max) || '-';

export function buildPreviewReadyEmail(session: InterviewSession, env: Record<string, string | undefined> = process.env): OutgoingEmail {
  if (!session.ownerEmail) throw new Error('no owner email');
  const previewUrl = `${siteBaseUrl(env)}${sessionResumePath(session, env)}`;
  const businessName = (session.businessName ?? '').replace(/[\r\n\t\u0000-\u001f\u007f]+/g, ' ').trim();
  const name = `<bdi style="unicode-bidi:isolate">${escapeHtml(businessName)}</bdi>`;
  const url = escapeHtml(previewUrl);
  const paragraphs = COPY.GENERATING_EMAIL_BODY.split('\n').map(line => {
    if (line.trim() === '{previewUrl}') {
      return `<p ${RTL}><a href="${url}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none">${escapeHtml(COPY.GENERATING_EMAIL_CTA)}</a></p>`
        + `<p dir="ltr" style="direction:ltr;text-align:left;font-size:12px;color:#666"><a href="${url}">${url}</a></p>`;
    }
    return `<p ${RTL}>${line.split('{businessName}').map(escapeHtml).join(name)}</p>`;
  }).join('');
  return {
    to: session.ownerEmail,
    from: supportFromAddress(env),
    subject: fillCopy(COPY.GENERATING_EMAIL_SUBJECT, { businessName }),
    text: fillCopy(COPY.GENERATING_EMAIL_BODY, { businessName, previewUrl }),
    html: `<div lang="he" ${RTL}>${paragraphs}</div>`,
    tag: 'interview_preview_ready',
    refIds: [session.id],
  };
}

export interface PreviewFailureAlert {
  stage: 'preview' | 'site';
  session: InterviewSession;
  round: number;
  reason: string;
  at: string;
}

export function buildPreviewFailureAlert(alert: PreviewFailureAlert, env: Record<string, string | undefined> = process.env): OutgoingEmail {
  const business = oneLine(alert.session.businessName);
  const stage = alert.stage === 'preview' ? 'home-page preview (before payment; the spot stays held)' : 'remaining pages (after payment)';
  return {
    to: staffAlertAddress(env),
    from: supportFromAddress(env),
    subject: `Site Bot ${alert.stage === 'preview' ? 'preview' : 'site'} generation failed \u2014 ${business}`,
    text: [
      `The Site Bot ${stage} failed${alert.stage === 'preview' ? ' twice; the owner sees the "we are on it" screen' : ''}.`,
      '',
      `Business: ${business}`,
      `Stage: ${alert.stage}`,
      `Round: ${alert.round}`,
      `Reason: ${oneLine(alert.reason, 200)}`,
      `When: ${israelTime(alert.at)} (Israel time)`,
      `Interview session: ${alert.session.id}`,
      `Research: ${oneLine(alert.session.researchId, 64)}`,
      `Place: ${oneLine(alert.session.placeId, 256)}`,
      '',
      `Re-trigger (admin cookie): POST ${siteBaseUrl(env)}/api/admin/site-bot/interview-preview-retry {"sessionId":"${alert.session.id}","stage":"${alert.stage}"}`,
    ].join('\n'),
    tag: 'interview_preview_failed',
    refIds: [alert.session.id],
  };
}

async function sendSafely(email: () => OutgoingEmail, deps: Pick<PreviewDeps, 'mail' | 'log'>, label: string): Promise<boolean> {
  try {
    await deps.mail(email());
    return true;
  } catch {
    deps.log(`[site-bot preview] ${label} email failed`);
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The run

function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), ms);
  return run(controller.signal).finally(() => clearTimeout(timer));
}

async function maybeEmailReady(sessionId: string, round: number, deps: PreviewDeps): Promise<void> {
  const session = deps.withStore(store => readInterviewSession(store, sessionId), null);
  if (!session || !session.ownerEmail || session.status !== 'open') return;
  const now = deps.now().getTime();
  const started = session.previewRoundStartedAt ? Date.parse(session.previewRoundStartedAt) : now;
  const polled = session.previewPolledAt ? Date.parse(session.previewPolledAt) : 0;
  const slow = now - started >= PREVIEW_EMAIL_AFTER_MS;
  const away = !polled || now - polled >= PREVIEW_AWAY_MS;
  if (!slow && !away) return;
  if (!deps.withStore(store => claimPreviewEmail(store, sessionId, round), false)) return;
  await sendSafely(() => buildPreviewReadyEmail(session, deps.env), deps, 'ready');
}

/** Runs the claimed attempt `attempts` of `round`, then (on failure) the next one, up to PREVIEW_MAX_ATTEMPTS. */
function startRun(session: InterviewSession, round: number, firstAttempt: number, deps: PreviewDeps): void {
  if (inFlight.has(session.id) || !session.researchId || !session.collectedData) return;
  const researchId = session.researchId;
  const run = (async () => {
    const candidate = await deps.findCandidate(session.auditId, session.placeId).catch(() => null);
    let attempts = firstAttempt;
    let lastReason = 'unknown';
    while (true) {
      const fresh = deps.withStore(store => readInterviewSession(store, session.id), null) ?? session;
      const outcome = await withTimeout(signal => deps.generate({
        sessionId: session.id, researchId, round, answersVersion: fresh.answersVersion, collectedData: fresh.collectedData ?? session.collectedData!,
        workLocation: fresh.workLocation, publishedAddress: candidate?.formattedAddress ?? null,
        answers: fresh.interviewState ? answerTexts(fresh.interviewState) : null,
      }, signal), deps.timeoutMs).catch((): PreviewGenerationOutcome => ({ ok: false, reason: 'generation_error', usage: [] }));
      if (!await appendProviderUsage(researchId, outcome.usage, deps.now(), deps.researchBaseDir)) {
        if (outcome.usage.length) deps.log(`[site-bot preview] usage not recorded session=${session.id} round=${round}`);
      }
      if (outcome.ok) {
        if (deps.withStore(store => settlePreviewAttempt(store, session.id, round, attempts, 'ready'), false)) await maybeEmailReady(session.id, round, deps);
        return;
      }
      lastReason = outcome.reason;
      if (attempts < PREVIEW_MAX_ATTEMPTS && deps.withStore(store => claimPreviewAttempt(store, session.id, round, attempts), false)) {
        attempts += 1;
        continue;
      }
      break;
    }
    if (deps.withStore(store => settlePreviewAttempt(store, session.id, round, attempts, 'failed'), false)) {
      const failed = deps.withStore(store => readInterviewSession(store, session.id), null) ?? session;
      await sendSafely(() => buildPreviewFailureAlert({ stage: 'preview', session: failed, round, reason: lastReason, at: deps.now().toISOString() }, deps.env), deps, 'staff alert');
    }
  })()
    .catch(() => deps.log(`[site-bot preview] run crashed session=${session.id} round=${round}`))
    .finally(() => inFlight.delete(session.id));
  inFlight.set(session.id, run);
}

export type EnsureOutcome = 'none' | 'started' | 'running' | 'ready' | 'failed';

/**
 * Starts the round the session is due, once. A generating round with no run in this process whose claim is stale is
 * taken over (as its next attempt, or failed when it was the last one).
 */
export function ensurePreview(session: InterviewSession, deps: PreviewDeps): EnsureOutcome {
  const due = previewRoundDue(session);
  if (!due) return 'none';
  if (session.previewRound < due) {
    if (!deps.withStore(store => claimPreviewRound(store, session.id, due), false)) return 'running';
    startRun(session, due, 1, deps);
    return 'started';
  }
  if (session.previewStatus === 'ready') return 'ready';
  if (session.previewStatus === 'failed') return 'failed';
  if (inFlight.has(session.id)) return 'running';
  const claimed = session.previewClaimedAt ? Date.parse(session.previewClaimedAt) : 0;
  if (deps.now().getTime() - claimed < deps.staleMs) return 'running';
  if (deps.withStore(store => claimPreviewAttempt(store, session.id, session.previewRound, session.previewAttempts), false)) {
    startRun(session, session.previewRound, session.previewAttempts + 1, deps);
    return 'started';
  }
  if (session.previewAttempts >= PREVIEW_MAX_ATTEMPTS
    && deps.withStore(store => settlePreviewAttempt(store, session.id, session.previewRound, session.previewAttempts, 'failed'), false)) {
    void sendSafely(() => buildPreviewFailureAlert({ stage: 'preview', session, round: session.previewRound, reason: 'stale', at: deps.now().toISOString() }, deps.env), deps, 'staff alert');
    return 'failed';
  }
  return 'running';
}

// ---------------------------------------------------------------------------------------------------------------------
// The route

export interface PreviewReply {
  status: number;
  body: Record<string, unknown>;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** The fix round reopens the confirmed fact set (FACTS_DONE stamps it again). */
async function reopenFactSet(session: InterviewSession, deps: Pick<PreviewDeps, 'researchBaseDir' | 'now'>): Promise<boolean> {
  if (!session.researchId) return false;
  const dossier = await readResearchDossier(session.researchId, deps.researchBaseDir, { bounded: true });
  if (!dossier) return false;
  const set = dossier.interviewFacts;
  if (!isInterviewFactSet(set) || !set.confirmedAt) return true;
  const { confirmedAt: _confirmed, ...rest } = set;
  void _confirmed;
  dossier.interviewFacts = rest;
  dossier.updatedAt = deps.now().toISOString();
  return writeResearchDossierAtomic(session.researchId, dossier, deps.researchBaseDir);
}

export async function interviewPreview(cookieValue: unknown, body: unknown, deps: PreviewDeps): Promise<PreviewReply> {
  if (!plainObject(body) || (body.action !== 'status' && body.action !== 'fix')) return { status: 400, body: { error: 'invalid_input' } };
  // The capability is the cookie alone: anything naming a session or a research is refused outright.
  if ('researchId' in body || 'sessionId' in body) return { status: 400, body: { error: 'invalid_input' } };
  const session = openSessionFromCookie(cookieValue, deps);
  if (!session) return { status: 401, body: { error: 'no_session' } };
  const phase = interviewPhase(session);
  if (phase !== 'facts_confirmed') return { status: 409, body: { error: 'out_of_order', phase } };

  if (body.action === 'fix') {
    const view = previewView(session);
    if (!view.fixAvailable) return { status: 409, body: { error: 'fix_unavailable', preview: view } };
    const reopened = deps.withStore(store => beginPreviewFix(store, session.id), null);
    if (!reopened) return { status: 409, body: { error: 'fix_unavailable', preview: view } };
    if (!await reopenFactSet(reopened, deps)) deps.log(`[site-bot preview] fact set not reopened session=${session.id}`);
    return { status: 200, body: { phase: interviewPhase(reopened) } };
  }

  deps.withStore(store => { touchPreviewPoll(store, session.id); return true; }, false);
  ensurePreview(session, deps);
  const current = deps.withStore(store => readInterviewSession(store, session.id), null) ?? session;
  return { status: 200, body: { phase: interviewPhase(current), preview: previewView(current) } };
}

/** FACTS_DONE (interviewFactsFlow.ts): start the due round right away, so a closed tab still gets its email. */
export function startPreviewAfterFacts(session: InterviewSession, deps: PreviewDeps): void {
  try {
    ensurePreview(session, deps);
  } catch {
    deps.log(`[site-bot preview] start after facts failed session=${session.id}`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The preview frame

export type FrameOutcome = { kind: 'ok'; record: PreviewHomeRecord } | { kind: 'no_session' } | { kind: 'not_found' };

/** The session's own ready preview record, or nothing. No request field names a session or a research. */
export function previewForFrame(cookieValue: unknown, deps: Pick<PreviewDeps, 'withStore' | 'researchBaseDir'>): FrameOutcome {
  const session = openSessionFromCookie(cookieValue, deps);
  if (!session) return { kind: 'no_session' };
  if (!previewReady(session) || !session.researchId) return { kind: 'not_found' };
  const record = readPreviewRecord(session.researchId, deps.researchBaseDir);
  return record && record.round === session.previewRound ? { kind: 'ok', record } : { kind: 'not_found' };
}

// ---------------------------------------------------------------------------------------------------------------------
// Staff re-trigger and the post-payment run

export type StaffRetryOutcome = 'started' | 'not_failed' | 'not_found' | 'already';

/** Admin endpoint: a failed preview round gets a fresh attempt; a failed remaining-pages run is claimed again. */
export function staffRetry(sessionId: string, stage: 'preview' | 'site', deps: PreviewDeps): StaffRetryOutcome {
  const session = deps.withStore(store => readInterviewSession(store, sessionId), null);
  if (!session) return 'not_found';
  if (stage === 'site') return startSiteGeneration(session, deps) === 'started' ? 'started' : 'already';
  const retried = deps.withStore(store => staffRetryPreview(store, sessionId), null);
  if (!retried) return 'not_failed';
  startRun(retried, retried.previewRound, 1, deps);
  return 'started';
}

export type SiteGenerationStart = 'started' | 'already' | 'not_ready';

/**
 * The checkout callback (after the charge): generate every page but the homepage, once. The preview record is the one the
 * checkout was opened on (round recorded in the pending file); a failed run releases its claim and alerts staff.
 */
export function startSiteGeneration(session: InterviewSession, deps: PreviewDeps, expectedRound?: number): SiteGenerationStart {
  if (session.status !== 'paid' || !session.researchId) return 'not_ready';
  const preview = readPreviewRecord(session.researchId, deps.researchBaseDir);
  if (!preview || (expectedRound !== undefined && preview.round !== expectedRound)) return 'not_ready';
  if (siteInFlight.has(session.id) || !deps.withStore(store => claimSiteGeneration(store, session.id), false)) return 'already';
  const researchId = session.researchId;
  const run = (async () => {
    const outcome = await withTimeout(signal => deps.generateSite(preview, signal), SITE_GENERATION_TIMEOUT_MS)
      .catch((): RemainingPagesOutcome => ({ ok: false, reason: 'generation_error', usage: [] }));
    if (!await appendProviderUsage(researchId, outcome.usage, deps.now(), deps.researchBaseDir) && outcome.usage.length) {
      deps.log(`[site-bot site] usage not recorded session=${session.id}`);
    }
    if (outcome.ok) {
      deps.log(`[site-bot site] remaining pages generated session=${session.id} slug=${outcome.slug} pages=${outcome.pages.length} generated=${outcome.generatedPageIds.length}`);
      return;
    }
    deps.withStore(store => { releaseSiteGeneration(store, session.id); return true; }, false);
    await sendSafely(() => buildPreviewFailureAlert({ stage: 'site', session, round: preview.round, reason: outcome.reason, at: deps.now().toISOString() }, deps.env), deps, 'staff alert');
  })()
    .catch(() => deps.log(`[site-bot site] run crashed session=${session.id}`))
    .finally(() => siteInFlight.delete(session.id));
  siteInFlight.set(session.id, run);
  return 'started';
}

/** The checkout callback's entry: the paid interview session (production deps) generates its remaining pages once. */
export function startPaidSiteGeneration(interviewSessionId: string, round: number): SiteGenerationStart {
  const base = defaultInterviewDeps();
  const session = base.withStore(store => readInterviewSession(store, interviewSessionId), null);
  return session ? startSiteGeneration(session, defaultPreviewDeps(base), round) : 'not_ready';
}
