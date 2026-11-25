// Site Bot step 2a: the pre-payment interview session, end to end on a REAL launch store (temp SQLite) with an injected
// clock: start / resume / cookie capability, the step order, the work-location exit, research once per session, the 72 h
// expiry, the one 24 h reminder, the signed resume link and the owner gates keyed by the interview session.
// HEBREW-SAFETY: zero Hebrew bytes; Hebrew strings are read from the generated copy module / taxonomy at runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { CollectedData } from '../bot/prompts';
import { getCategoryById } from '../gbp/categoryTaxonomy';
import type { AuditCandidateSnapshot, AuditRecord } from './auditStore';
import type { OutgoingEmail } from './clientMessageEmail';
import { claimInterviewStart, type OfferDeps } from './offerState';
import { capSnapshot, hasInterviewSpot, listWaitlist, openLaunchStore, type LaunchStore } from './launchStore';
import { interviewStep, redeemResumeLink, startInterview, type InterviewDeps } from './interviewFlow';
import { interviewCategoryOf, interviewCategoryOfNiche } from './interviewDeps';
import { interviewGates } from './interviewGates';
import { startInterviewResearch } from './interviewResearch';
import { buildInterviewReminder, sweepInterviewSessionsOn } from './interviewReminder';
import {
  cookieFromHeader, interviewSetCookie, parseInterviewCookie, parseSpotTtlMs, readInterviewSession, sessionFromCookie,
  signResumeToken, verifyResumeToken,
} from './interviewSession';
import { recordOwnerResearchGates } from './research/ownerGates';
import { deriveOpenResearchGates } from './research/gates';
import { writeResearchDossierAtomic } from './research/researchStore';
import type { SiteResearchDossier } from './research/types';
import { SITE_BOT_STEP2A_COPY } from './step2aCopy.generated';
import { WORK_LOCATION_OPTIONS } from './workLocation';

const HOUR = 60 * 60 * 1000;
const T0 = Date.parse('2026-12-01T08:00:00.000Z'); // a Tuesday: one Israeli week for the whole test
const auditId = '123e4567-e89b-42d3-a456-426614174000';
const otherAuditId = '223e4567-e89b-42d3-a456-426614174000';
const PLUMBER = 'ChIJ-plumber-0001';
const TUTOR = 'ChIJ-tutor-00001';
const PHOTO = 'ChIJ-photo-00001';
const ENV = { CLIENT_PORTAL_SECRET: 'synthetic-test-secret', NODE_ENV: 'test', NEXT_PUBLIC_BASE_URL: 'https://www.example.test' };

const candidate = (placeId: string, over: Partial<AuditCandidateSnapshot> = {}): AuditCandidateSnapshot => ({
  placeId, displayName: 'Synthetic Business', formattedAddress: 'Synthetic Address', types: ['plumber'], primaryType: 'plumber',
  businessStatus: 'OPERATIONAL', hasRegularOpeningHours: true, hasSpecialOpeningHours: false, hasPhone: true, hasWebsite: false,
  photosFetched: true, photoCount: 3, hasRating: true, userRatingCount: 9, hasEditorialSummary: false, ...over,
});
const CANDIDATES = [
  candidate(PLUMBER),
  // Recorded tutors come back as educational_institution (fixtures/places-trade-scope-2026-11-25.json).
  candidate(TUTOR, { primaryType: 'educational_institution', types: ['educational_institution', 'point_of_interest'] }),
  // Recorded photographers come back as the generic 'service': the trade comes from the confirmed card niche.
  candidate(PHOTO, { primaryType: 'service', types: ['point_of_interest', 'service'] }),
];

function collected(niche: string, over: Partial<CollectedData> = {}): CollectedData {
  return {
    businessName: 'Synthetic Business', businessNiche: niche, primaryService: niche, targetLocation: 'Haifa', specificCities: 'Haifa',
    travelBoundary: 'Haifa', priorityServices: ['service-a'], secondaryServices: 'service-a',
    ownerContact: { mobile: '0521234567', email: 'owner@example.com' }, ...over,
  };
}

function harness({ weekly = 3 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-flow-'));
  let nowMs = T0;
  const store = openLaunchStore(path.join(dir, 'launch.sqlite'), () => new Date(nowMs));
  const withStore = <T>(fn: (s: LaunchStore) => T, fallback: T): T => { try { return fn(store); } catch { return fallback; } };
  const offerDeps: OfferDeps = {
    gateOpen: async () => true,
    withStore,
    limits: () => ({ total: 10, weekly }),
    readAudit: async (id: string): Promise<AuditRecord | null> => ([auditId, otherAuditId].includes(id)
      ? { auditId: id, query: { businessName: 'x' }, fetchedAt: '2026-12-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', candidates: CANDIDATES }
      : null),
  };
  const runs: string[] = [];
  const alerts: string[] = [];
  const deps: InterviewDeps = {
    withStore,
    claimSpot: (a, p) => claimInterviewStart(a, p, offerDeps),
    findCandidate: async (_a, p) => CANDIDATES.find(c => c.placeId === p) ?? null,
    categoryOf: interviewCategoryOf,
    categoryOfNiche: interviewCategoryOfNiche,
    normalizeCollected: data => data,
    startResearch: session => { startInterviewResearch(session, { withStore, run: async id => { runs.push(id); }, log: () => undefined }); },
    alertWaitlist: entry => { alerts.push(entry.reason); },
    ttlMs: parseSpotTtlMs({}),
    now: () => new Date(nowMs),
  };
  return {
    dir, store, deps, runs, alerts,
    advance: (ms: number) => { nowMs += ms; },
    close: () => { store.db.close(); fs.rmSync(dir, { recursive: true, force: true }); },
  };
}

type H = ReturnType<typeof harness>;

/** start -> contact -> domain for a place; returns the cookie. */
async function startThroughDomain(h: H, placeId: string, niche: string, audit = auditId): Promise<string> {
  const started = await startInterview({ auditId: audit, placeId, cookieValue: undefined }, h.deps);
  assert.equal(started.kind, 'session');
  const cookie = (started as Extract<typeof started, { kind: 'session' }>).cookie!;
  assert.ok(cookie);
  assert.equal((await interviewStep(cookie, { step: 'contact', collectedData: collected(niche) }, h.deps)).kind, 'ok');
  const domain = await interviewStep(cookie, { step: 'domain', owner: { domainChoice: 'no_domain' } }, h.deps);
  assert.equal(domain.kind, 'ok');
  return cookie;
}

test('spot TTL: 72 h by default (SITE_BOT_SPOT_TTL_HOURS), malformed values fall back', () => {
  assert.equal(parseSpotTtlMs({}), 72 * HOUR);
  assert.equal(parseSpotTtlMs({ SITE_BOT_SPOT_TTL_HOURS: '72' }), 72 * HOUR);
  assert.equal(parseSpotTtlMs({ SITE_BOT_SPOT_TTL_HOURS: '24' }), 24 * HOUR);
  for (const bad of ['0', '-1', 'abc', '72h', '9999']) assert.equal(parseSpotTtlMs({ SITE_BOT_SPOT_TTL_HOURS: bad }), 72 * HOUR, bad);
});

test('cookie: httpOnly, SameSite=Lax, Path=/api/site-bot, Secure only in production; header parsing is exact', () => {
  const value = `${auditId}.${'a'.repeat(43)}`;
  assert.equal(interviewSetCookie(value, 72 * HOUR, { NODE_ENV: 'development' }), `wao_sb_interview=${value}; Path=/api/site-bot; Max-Age=259200; HttpOnly; SameSite=Lax`);
  assert.match(interviewSetCookie(value, 72 * HOUR, { NODE_ENV: 'production' }), /; Secure$/);
  assert.equal(cookieFromHeader(`a=1; wao_sb_interview=${value}; b=2`), value);
  assert.equal(cookieFromHeader('xwao_sb_interview=zzz'), undefined);
  assert.equal(parseInterviewCookie(value)?.id, auditId);
  for (const bad of [undefined, '', 'x', `${auditId}.${'a'.repeat(42)}`, `${auditId}:${'a'.repeat(43)}`, `${auditId}.${'a'.repeat(42)}=`]) {
    assert.equal(parseInterviewCookie(bad), null, String(bad));
  }
});

test('start: a fresh session sets a cookie; a reload with it resumes the same session (no second spot, no new cookie)', async () => {
  const h = harness();
  try {
    const first = await startInterview({ auditId, placeId: PLUMBER, cookieValue: undefined }, h.deps);
    assert.equal(first.kind, 'session');
    if (first.kind !== 'session') return;
    assert.equal(first.status, 'started');
    assert.equal(first.view.phase, 'intake');
    assert.ok(first.cookie);
    const again = await startInterview({ auditId, placeId: PLUMBER, cookieValue: first.cookie }, h.deps);
    assert.equal(again.kind, 'session');
    if (again.kind !== 'session') return;
    assert.equal(again.status, 'resumed');
    assert.equal(again.cookie, null);
    assert.equal(capSnapshot(h.store, { total: 10, weekly: 3 }).weekStarts, 1);
    // The saved progress comes back while the owner is still in the intake.
    const progress = { v: 1, phase: 'chat', stepIndex: 1 };
    assert.equal((await interviewStep(first.cookie, { step: 'progress', progress }, h.deps)).kind, 'ok');
    const resumed = await startInterview({ auditId, placeId: PLUMBER, cookieValue: first.cookie }, h.deps);
    assert.deepEqual(resumed.kind === 'session' ? resumed.view.progress : null, progress);
  } finally { h.close(); }
});

test('cookie capability: a tampered, forged or other session\'s cookie never reads or advances this session', async () => {
  const h = harness();
  try {
    const plumberCookie = await startThroughDomain(h, PLUMBER, 'plumbing');
    const tutorStart = await startInterview({ auditId, placeId: TUTOR, cookieValue: undefined }, h.deps);
    const tutorCookie = tutorStart.kind === 'session' ? tutorStart.cookie! : '';
    const id = parseInterviewCookie(plumberCookie)!.id;
    const flipped = plumberCookie.slice(0, -1) + (plumberCookie.endsWith('A') ? 'B' : 'A');
    const forged = `${id}.${'Z'.repeat(43)}`;
    const swapped = `${parseInterviewCookie(tutorCookie)!.id}.${parseInterviewCookie(plumberCookie)!.secret}`;
    for (const bad of [flipped, forged, swapped, 'garbage', undefined]) {
      assert.equal(sessionFromCookie(h.store, bad), null, String(bad));
      assert.equal((await interviewStep(bad, { step: 'progress', progress: { v: 1 } }, h.deps)).kind, 'no_session');
      assert.equal((await interviewGates(bad, { action: 'list' }, h.deps)).status, 401);
    }
    // The tutor's real cookie only ever acts on the tutor's own session.
    const tutorView = await interviewStep(tutorCookie, { step: 'contact', collectedData: collected('tutoring') }, h.deps);
    assert.equal(tutorView.kind, 'ok');
    assert.equal(readInterviewSession(h.store, id)!.businessName, 'Synthetic Business');
    assert.equal(readInterviewSession(h.store, id)!.locationTrade, null);
    // A tampered cookie on interview-start for the plumber's place: the plumber's open session (contact given) refuses it.
    assert.equal((await startInterview({ auditId, placeId: PLUMBER, cookieValue: flipped }, h.deps)).kind, 'elsewhere');
  } finally { h.close(); }
});

test('a second browser before the contact step supersedes; after it, it is refused (resume from the email instead)', async () => {
  const h = harness();
  try {
    const a = await startInterview({ auditId, placeId: PLUMBER, cookieValue: undefined }, h.deps);
    const b = await startInterview({ auditId, placeId: PLUMBER, cookieValue: undefined }, h.deps);
    assert.ok(a.kind === 'session' && b.kind === 'session');
    if (a.kind !== 'session' || b.kind !== 'session') return;
    assert.equal(b.status, 'resumed', 'the spot was already held: no second start event');
    assert.equal(sessionFromCookie(h.store, a.cookie)!.status, 'superseded');
    assert.equal((await interviewStep(a.cookie, { step: 'progress', progress: { v: 1 } }, h.deps)).kind, 'closed');
    assert.equal((await interviewStep(b.cookie, { step: 'contact', collectedData: collected('plumbing') }, h.deps)).kind, 'ok');
    assert.equal((await startInterview({ auditId, placeId: PLUMBER, cookieValue: undefined }, h.deps)).kind, 'elsewhere');
    assert.equal(capSnapshot(h.store, { total: 10, weekly: 3 }).weekStarts, 1);
  } finally { h.close(); }
});

test('plumber: no location question; research starts at the contact step, once per session (reload / replay start nothing)', async () => {
  const h = harness();
  try {
    const started = await startInterview({ auditId, placeId: PLUMBER, cookieValue: undefined }, h.deps);
    const cookie = started.kind === 'session' ? started.cookie! : '';
    // Out of order: domain before contact.
    assert.equal((await interviewStep(cookie, { step: 'domain', owner: { domainChoice: 'no_domain' } }, h.deps)).kind, 'out_of_order');
    // Contact without a valid owner contact is refused (the server re-validates).
    assert.equal((await interviewStep(cookie, { step: 'contact', collectedData: collected('plumbing', { ownerContact: { mobile: '12', email: 'x' } }) }, h.deps)).kind, 'invalid_input');
    const contact = await interviewStep(cookie, { step: 'contact', collectedData: collected('plumbing') }, h.deps);
    assert.equal(contact.kind, 'ok');
    if (contact.kind !== 'ok') return;
    assert.equal(contact.view.locationTrade, null);
    assert.equal(contact.view.phase, 'domain');
    const id = parseInterviewCookie(cookie)!.id;
    assert.deepEqual(h.runs, [id], 'research id = interview session id');
    const domain = await interviewStep(cookie, { step: 'domain', owner: { domainChoice: 'has_domain', domain: 'example.co.il' } }, h.deps);
    assert.equal(domain.kind === 'ok' ? domain.view.phase : null, 'holding');
    assert.equal(readInterviewSession(h.store, id)!.collectedData?.ownerDomain, 'example.co.il');
    // The location step does not exist for a plumber; progress after the contact is refused; research never re-runs.
    assert.equal((await interviewStep(cookie, { step: 'location', workLocation: 'HOME' }, h.deps)).kind, 'out_of_order');
    assert.equal((await interviewStep(cookie, { step: 'progress', progress: { v: 1 } }, h.deps)).kind, 'out_of_order');
    const session = readInterviewSession(h.store, id)!;
    assert.equal(session.researchId, id);
    h.deps.startResearch(session);
    assert.equal(startInterviewResearch(session, { withStore: h.deps.withStore, run: async () => { h.runs.push('again'); }, log: () => undefined }), 'already');
    assert.deepEqual(h.runs, [id]);
  } finally { h.close(); }
});

test('tutor ONLINE: exits to the waiting list (reason location, his contact), frees the spot; replay is idempotent', async () => {
  const h = harness();
  try {
    const cookie = await startThroughDomain(h, TUTOR, 'tutoring');
    const id = parseInterviewCookie(cookie)!.id;
    const session = readInterviewSession(h.store, id)!;
    assert.equal(session.locationTrade, 'tutor');
    assert.deepEqual(h.runs, [], 'research waits for the location answer');
    assert.equal((await interviewStep(cookie, { step: 'location', workLocation: 'NOWHERE' }, h.deps)).kind, 'invalid_input');
    const weekBefore = capSnapshot(h.store, { total: 10, weekly: 3 }).weekStarts;
    const exit = await interviewStep(cookie, { step: 'location', workLocation: 'ONLINE' }, h.deps);
    assert.equal(exit.kind, 'exited');
    assert.equal(hasInterviewSpot(h.store, TUTOR), false, 'spot released');
    const cap = capSnapshot(h.store, { total: 10, weekly: 3 });
    assert.equal(cap.weekStarts, weekBefore, 'the weekly count keeps the start');
    assert.equal(cap.paidTotal, 0, 'the total cap never counted it');
    const waitlist = listWaitlist(h.store);
    assert.equal(waitlist.length, 1);
    assert.equal(waitlist[0].reason, 'location');
    assert.equal(waitlist[0].placeId, TUTOR);
    assert.equal(waitlist[0].phone, '+972521234567');
    assert.equal(waitlist[0].email, 'owner@example.com');
    assert.equal(waitlist[0].category, 'gcid:tutoring_service');
    assert.deepEqual(h.alerts, ['location']);
    assert.deepEqual(h.runs, [], 'no research for an exit');
    // Replay: the same answer again (double click / retry) -> exited again, no second entry, no second alert.
    assert.equal((await interviewStep(cookie, { step: 'location', workLocation: 'ONLINE' }, h.deps)).kind, 'exited');
    assert.equal(listWaitlist(h.store).length, 1);
    assert.deepEqual(h.alerts, ['location']);
    // Reload of the start page for the same check: the exit screen, no new spot claimed.
    const reload = await startInterview({ auditId, placeId: TUTOR, cookieValue: cookie }, h.deps);
    assert.equal(reload.kind === 'closed' ? reload.view.phase : reload.kind, 'exited');
    assert.equal(capSnapshot(h.store, { total: 10, weekly: 3 }).weekStarts, weekBefore);
  } finally { h.close(); }
});

test('tutor MIX / HOME continue and start the research; photographer: trade from the card niche, ONLINE is not an option', async () => {
  const h = harness();
  try {
    const tutor = await startThroughDomain(h, TUTOR, 'tutoring');
    const ok = await interviewStep(tutor, { step: 'location', workLocation: 'MIX' }, h.deps);
    assert.equal(ok.kind === 'ok' ? ok.view.phase : null, 'holding');
    assert.equal(readInterviewSession(h.store, parseInterviewCookie(tutor)!.id)!.workLocation, 'MIX');
    assert.equal(h.runs.length, 1);
    // The photographer's Places type is generic; the taxonomy name he confirmed on the card names the trade.
    const photoNiche = getCategoryById('gcid:photographer')!.heName;
    const photo = await startThroughDomain(h, PHOTO, photoNiche);
    const photoSession = readInterviewSession(h.store, parseInterviewCookie(photo)!.id)!;
    assert.equal(photoSession.locationTrade, 'photographer');
    assert.deepEqual([...WORK_LOCATION_OPTIONS.photographer], ['HOME', 'OWN_PLACE', 'MIX']);
    assert.equal((await interviewStep(photo, { step: 'location', workLocation: 'ONLINE' }, h.deps)).kind, 'invalid_input');
    assert.equal((await interviewStep(photo, { step: 'location', workLocation: 'OWN_PLACE' }, h.deps)).kind, 'exited');
    assert.equal(hasInterviewSpot(h.store, PHOTO), false);
  } finally { h.close(); }
});

test('72 h expiry (injected clock): spot freed, session closed; the expired screen shows for that check without a new claim', async () => {
  const h = harness();
  try {
    const cookie = await startThroughDomain(h, PLUMBER, 'plumbing');
    const transport = async () => 'stubbed' as const;
    h.advance(71 * HOUR);
    assert.equal((await sweepInterviewSessionsOn(h.store, transport, ENV)).expired, 0);
    assert.equal(hasInterviewSpot(h.store, PLUMBER), true);
    h.advance(1 * HOUR);
    // Lazy expiry on read, before the cron gets to it.
    assert.equal((await interviewStep(cookie, { step: 'progress', progress: { v: 1 } }, h.deps)).kind, 'closed');
    assert.equal(hasInterviewSpot(h.store, PLUMBER), false);
    assert.equal(readInterviewSession(h.store, parseInterviewCookie(cookie)!.id)!.status, 'expired');
    assert.equal((await sweepInterviewSessionsOn(h.store, transport, ENV)).expired, 0, 'already expired: a replay frees nothing twice');
    const weekStarts = capSnapshot(h.store, { total: 10, weekly: 3 }).weekStarts;
    const reload = await startInterview({ auditId, placeId: PLUMBER, cookieValue: cookie }, h.deps);
    assert.equal(reload.kind === 'closed' ? reload.view.phase : reload.kind, 'expired');
    assert.equal(capSnapshot(h.store, { total: 10, weekly: 3 }).weekStarts, weekStarts, 'no spot claimed by the expired screen');
    // A fresh check (new auditId) is free to start again and takes a fresh spot.
    const fresh = await startInterview({ auditId: otherAuditId, placeId: PLUMBER, cookieValue: cookie }, h.deps);
    assert.equal(fresh.kind === 'session' ? fresh.status : fresh.kind, 'started');
    assert.equal(hasInterviewSpot(h.store, PLUMBER), true);
  } finally { h.close(); }
});

test('the cron sweep expires an untouched session at 72 h and frees the spot for the next business', async () => {
  const h = harness({ weekly: 1 });
  try {
    await startThroughDomain(h, PLUMBER, 'plumbing');
    assert.equal((await startInterview({ auditId, placeId: TUTOR, cookieValue: undefined }, h.deps)).kind, 'blocked', 'weekly cap of 1 is full');
    h.advance(72 * HOUR);
    const summary = await sweepInterviewSessionsOn(h.store, async () => 'stubbed', ENV);
    assert.equal(summary.expired, 1);
    assert.equal(hasInterviewSpot(h.store, PLUMBER), false);
  } finally { h.close(); }
});

test('24 h reminder: once, only with an owner email, with a signed resume link; a failed send is retried next run', async () => {
  const h = harness();
  try {
    await startThroughDomain(h, PLUMBER, 'plumbing');
    // A session without a contact (no email) never gets a reminder.
    await startInterview({ auditId, placeId: TUTOR, cookieValue: undefined }, h.deps);
    const sent: OutgoingEmail[] = [];
    const transport = async (email: OutgoingEmail) => { sent.push(email); return 'stubbed' as const; };
    h.advance(23 * HOUR);
    assert.equal((await sweepInterviewSessionsOn(h.store, transport, ENV)).reminded, 0);
    h.advance(1 * HOUR);
    let failOnce = true;
    const flaky = async (email: OutgoingEmail) => { if (failOnce) { failOnce = false; throw new Error('resend down'); } return transport(email); };
    assert.deepEqual(await sweepInterviewSessionsOn(h.store, flaky, ENV), { expired: 0, reminded: 0, failed: 1 });
    assert.deepEqual(await sweepInterviewSessionsOn(h.store, transport, ENV), { expired: 0, reminded: 1, failed: 0 });
    assert.deepEqual(await sweepInterviewSessionsOn(h.store, transport, ENV), { expired: 0, reminded: 0, failed: 0 }, 'once');
    assert.equal(sent.length, 1);
    const email = sent[0];
    assert.equal(email.to, 'owner@example.com');
    assert.equal(email.subject, SITE_BOT_STEP2A_COPY.REMINDER_SUBJECT);
    assert.equal(email.tag, 'interview_reminder');
    const lines = email.text.split('\n');
    const url = lines[lines.length - 1];
    assert.match(url, /^https:\/\/www\.example\.test\/api\/site-bot\/interview-resume\?t=v1\.[0-9a-f-]{36}\.\d+\.[0-9a-f]{64}$/, 'the URL alone on the last line');
    assert.equal(lines[lines.length - 2], '');
    assert.ok(email.text.startsWith(SITE_BOT_STEP2A_COPY.REMINDER_BODY.replace('{businessName}', 'Synthetic Business')));
    assert.ok(email.html!.includes(SITE_BOT_STEP2A_COPY.REMINDER_CTA));
    assert.ok(email.html!.includes(`href="${url}"`));
    assert.doesNotMatch(email.text + email.html, /\{businessName\}|\{continueUrl\}/);
    // A paid or exited session gets none (only open sessions are due).
    const photoSession = readInterviewSession(h.store, parseInterviewCookie(await startThroughDomain(h, PHOTO, 'x'))!.id)!;
    assert.throws(() => buildInterviewReminder({ ...photoSession, ownerEmail: null }, ENV), /no owner email/);
  } finally { h.close(); }
});

test('resume link: authentic -> cookie restored (rotated: the old cookie stops); forged / expired / closed -> refused', async () => {
  const h = harness();
  try {
    const cookie = await startThroughDomain(h, PLUMBER, 'plumbing');
    const session = readInterviewSession(h.store, parseInterviewCookie(cookie)!.id)!;
    const expiry = Date.parse(session.expiresAt);
    const token = signResumeToken(session.id, expiry, ENV);
    assert.equal(verifyResumeToken(token, new Date(T0), ENV), session.id);
    const forgedSig = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
    const otherSecret = signResumeToken(session.id, expiry, { ...ENV, CLIENT_PORTAL_SECRET: 'another-secret' });
    const longer = signResumeToken(session.id, expiry, ENV).replace(`.${expiry}.`, `.${expiry + 10 * HOUR}.`);
    for (const bad of [forgedSig, otherSecret, longer, 'v1.x.y.z', '', undefined]) {
      assert.deepEqual(redeemResumeLink(bad, h.deps, ENV), { kind: 'refused' }, String(bad));
    }
    const redeemed = redeemResumeLink(token, h.deps, ENV);
    assert.equal(redeemed.kind, 'resumed');
    if (redeemed.kind !== 'resumed') return;
    assert.equal(redeemed.startPath, `/site-bot/start?auditId=${auditId}&placeId=${PLUMBER}`);
    assert.equal(sessionFromCookie(h.store, redeemed.cookie)!.id, session.id);
    assert.equal(sessionFromCookie(h.store, cookie), null, 'the old cookie no longer proves the session');
    // Expired link (the clock passed the spot expiry): refused, no cookie.
    h.advance(72 * HOUR);
    assert.equal(verifyResumeToken(token, new Date(T0 + 72 * HOUR), ENV), null);
    assert.deepEqual(redeemResumeLink(token, h.deps, ENV), { kind: 'refused' });
    // A still-valid signature for a session that is no longer open is refused too.
    const late = signResumeToken(session.id, T0 + 100 * HOUR, ENV);
    assert.deepEqual(redeemResumeLink(late, h.deps, ENV), { kind: 'refused' });
  } finally { h.close(); }
});

function dossier(researchId: string): SiteResearchDossier {
  const at = new Date(T0).toISOString();
  return {
    researchId, status: 'architecture_ready', createdAt: at, updatedAt: at,
    businessTruth: { businessName: 'Synthetic', assertions: [], status: 'verified' },
    evidence: [], evidenceEdges: [], keywordEvidence: [], serpObservations: [], pageOpportunities: [], internalLinkEdges: [], providerUsage: [],
    humanGates: [],
  } as unknown as SiteResearchDossier;
}

test('owner gates keyed by the interview session: own gates only, open gates only, no research id from the body', async () => {
  const h = harness();
  try {
    const researchBaseDir = path.join(h.dir, 'site-research');
    const gatesDeps = { ...h.deps, researchBaseDir };
    const a = await startThroughDomain(h, PLUMBER, 'plumbing');
    const b = await startThroughDomain(h, TUTOR, 'tutoring');
    await interviewStep(b, { step: 'location', workLocation: 'HOME' }, h.deps);
    const idA = parseInterviewCookie(a)!.id;
    const idB = parseInterviewCookie(b)!.id;
    for (const id of [idA, idB]) {
      assert.ok(await writeResearchDossierAtomic(id, dossier(id), researchBaseDir));
      const gates = deriveOpenResearchGates(id, { primaryService: 'x' });
      assert.ok((await recordOwnerResearchGates(id, gates, { baseDir: researchBaseDir, now: () => new Date(T0) })).length > 0);
    }
    const listA = await interviewGates(a, { action: 'list' }, gatesDeps);
    assert.equal(listA.status, 200);
    const gatesA = listA.body.gates as Array<{ id: string; type: string; evidenceDigest: string }>;
    assert.ok(gatesA.length > 0 && gatesA.every(gate => gate.id.startsWith(`${idA}:`)));
    const gateB = ((await interviewGates(b, { action: 'list' }, gatesDeps)).body.gates as typeof gatesA)[0];
    // A's cookie cannot answer B's gate (it looks only at A's research), nor name a research in the body.
    assert.equal((await interviewGates(a, { action: 'answer', gateId: gateB.id, evidenceDigest: gateB.evidenceDigest, answer: { services: ['s'] } }, gatesDeps)).status, 404);
    assert.equal((await interviewGates(a, { action: 'list', researchId: idB }, gatesDeps)).status, 400);
    // A answers its own boundary gate once; it is then closed and no longer listed.
    const boundary = gatesA.find(gate => gate.type === 'business_boundary')!;
    const answer = { action: 'answer', gateId: boundary.id, evidenceDigest: boundary.evidenceDigest, answer: { services: ['service-b'] } };
    assert.deepEqual(await interviewGates(a, answer, gatesDeps), { status: 200, body: { status: 'approved' } });
    assert.equal((await interviewGates(a, answer, gatesDeps)).status, 409);
    const after = (await interviewGates(a, { action: 'list' }, gatesDeps)).body.gates as typeof gatesA;
    assert.equal(after.some(gate => gate.id === boundary.id), false);
    // The answer was applied to A's server-held record, not to B's.
    assert.match(String(readInterviewSession(h.store, idA)!.collectedData?.secondaryServices), /service-b/);
    assert.doesNotMatch(String(readInterviewSession(h.store, idB)!.collectedData?.secondaryServices), /service-b/);
    // Once A's session closes (72 h), its cookie reaches nothing.
    h.advance(72 * HOUR);
    assert.equal((await interviewGates(a, { action: 'list' }, gatesDeps)).status, 401);
  } finally { h.close(); }
});

test('the launch store migration: an existing step-1 waiting-list table gains the location reason, rows kept', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'launch-migrate-'));
  const file = path.join(dir, 'launch.sqlite');
  try {
    const first = openLaunchStore(file);
    first.db.exec('DROP TABLE site_bot_waitlist');
    first.db.exec(`CREATE TABLE site_bot_waitlist (id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
      reason TEXT NOT NULL CHECK (reason IN ('preopen', 'full', 'trade')), audit_id TEXT NOT NULL, place_id TEXT NOT NULL,
      business_name TEXT NOT NULL, category TEXT, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, UNIQUE (place_id, phone))`);
    first.db.prepare("INSERT INTO site_bot_waitlist VALUES ('w1', '2026-11-25T00:00:00Z', 'trade', 'a', 'p', 'b', null, 'n', '+972500000000', null)").run();
    first.db.close();
    const second = openLaunchStore(file);
    assert.equal(listWaitlist(second).length, 1);
    second.db.prepare("INSERT INTO site_bot_waitlist VALUES ('w2', '2026-11-25T00:00:00Z', 'location', 'a', 'p2', 'b', null, '', '+972500000001', null)").run();
    assert.equal(listWaitlist(second).length, 2);
    second.db.close();
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
