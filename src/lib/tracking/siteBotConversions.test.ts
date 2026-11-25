import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fireSiteBotEventOnce, SITE_BOT_EVENTS, trackCheckCompleted, trackInterviewStarted, trackPaidSignup, trackWaitlistJoined,
  type SiteBotTrackingContext,
} from './siteBotConversions';

function context(storage: Map<string, string> | null = new Map()) {
  const pushed: Array<Record<string, unknown>> = [];
  const ctx: SiteBotTrackingContext = {
    push: event => { pushed.push(event); },
    storage: storage ? { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); } } : null,
    fired: new Set(),
  };
  return { ctx, pushed, storage };
}
const subject = { auditId: '123e4567-e89b-42d3-a456-426614174000', placeId: 'ChIJ-synthetic-1' };

test('the four event names', () => {
  assert.deepEqual(SITE_BOT_EVENTS, {
    checkCompleted: 'site_bot_check_completed',
    waitlistJoined: 'site_bot_waitlist_joined',
    interviewStarted: 'site_bot_interview_started',
    paidSignup: 'site_bot_paid_signup',
  });
});

test('each event fires exactly once per subject, with its parameter and no identifiers', () => {
  const { ctx, pushed } = context();
  for (let i = 0; i < 3; i++) {
    trackCheckCompleted(ctx, { ...subject, offer: 'waitlist_preopen' });
    trackWaitlistJoined(ctx, { ...subject, reason: 'preopen' });
    trackInterviewStarted(ctx, subject);
    trackPaidSignup(ctx, { sessionId: 'session-1' });
  }
  assert.deepEqual(pushed, [
    { event: 'site_bot_check_completed', offer: 'waitlist_preopen' },
    { event: 'site_bot_waitlist_joined', reason: 'preopen' },
    { event: 'site_bot_interview_started' },
    { event: 'site_bot_paid_signup' },
  ]);
  assert.doesNotMatch(JSON.stringify(pushed), /ChIJ|123e4567|session-1/);
  // A different subject is a new event.
  assert.equal(trackCheckCompleted(ctx, { ...subject, placeId: 'ChIJ-synthetic-2', offer: 'eligible' }), true);
  assert.equal(trackPaidSignup(ctx, { sessionId: 'session-2' }), true);
});

test('a reload (new in-memory guard, same sessionStorage) does not fire again', () => {
  const first = context();
  assert.equal(trackCheckCompleted(first.ctx, { ...subject, offer: 'eligible' }), true);
  const reload = context(first.storage);
  assert.equal(trackCheckCompleted(reload.ctx, { ...subject, offer: 'eligible' }), false);
  assert.deepEqual(reload.pushed, []);
});

test('blocked or throwing storage still fires once (in-memory guard)', () => {
  const { ctx, pushed } = context(null);
  assert.equal(fireSiteBotEventOnce(ctx, 'k', { event: 'site_bot_paid_signup' }), true);
  assert.equal(fireSiteBotEventOnce(ctx, 'k', { event: 'site_bot_paid_signup' }), false);
  const throwing: SiteBotTrackingContext = {
    push: event => { pushed.push(event); },
    storage: { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('QuotaExceeded'); } },
    fired: new Set(),
  };
  assert.equal(fireSiteBotEventOnce(throwing, 'k2', { event: 'site_bot_interview_started' }), true);
  assert.equal(fireSiteBotEventOnce(throwing, 'k2', { event: 'site_bot_interview_started' }), false);
  assert.equal(pushed.length, 2);
});
