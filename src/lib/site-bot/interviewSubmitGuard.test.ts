// Site Bot step 2b: the same-tick double click (verifier FAIL 2026-11-25). Two FACTS_DONE clicks in one tick sent two POSTs;
// the second met 409 out_of_order {phase: facts_confirmed} and its error handler replaced the success with the error
// screen. These tests fire each guarded handler twice in the same tick against a fake server with the real route
// semantics, and check the StartPaidFlow handlers all go through the guard.
// HEBREW-SAFETY: zero Hebrew bytes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  reachedPhase, requestFactReview, requestFactsDone, requestFactsReturn, runExclusive, stepReachedPhase,
  type InFlightFlag, type InterviewJsonPost, type InterviewJsonReply,
} from './interviewSubmitGuard';

/** A fake interview-facts route: phase facts until 'done' (or 'return') moves it, then 409 out_of_order like the real one. */
function fakeFactsServer() {
  let phase = 'facts';
  const calls: Record<string, unknown>[] = [];
  const post: InterviewJsonPost = async (_url, body) => {
    calls.push(body);
    await new Promise(resolve => setTimeout(resolve, 5));
    if (phase !== 'facts') return { ok: false, status: 409, json: { error: 'out_of_order', phase } };
    if (body.action === 'done') { phase = 'facts_confirmed'; return { ok: true, status: 200, json: { phase } }; }
    if (body.action === 'return') { phase = 'questions'; return { ok: true, status: 200, json: { phase } }; }
    if (body.action === 'review') return { ok: true, status: 200, json: { facts: [{ id: body.factId, status: body.decision }], empty: false } };
    return { ok: false, status: 400, json: { error: 'invalid_input' } };
  };
  return { post, calls };
}

/** The component's handler shape: guard -> request -> success sets the phase, any throw sets 'error'. */
function screen(post: InterviewJsonPost, flag: InFlightFlag = { current: false }) {
  const state = { phase: 'facts', busy: [] as boolean[], reviewed: 0 };
  const settle = () => new Promise(resolve => setTimeout(resolve, 30));
  const fail = () => { state.phase = 'error'; };
  return {
    state, settle,
    finishFacts: () => runExclusive(flag, busy => state.busy.push(busy), () => requestFactsDone(post).then(() => { state.phase = 'facts_confirmed'; }).catch(fail)),
    returnToQuestions: () => runExclusive(flag, busy => state.busy.push(busy), () => requestFactsReturn(post).then(() => { state.phase = 'questions'; }).catch(fail)),
    review: (factId: string) => runExclusive(flag, busy => state.busy.push(busy), () => requestFactReview(post, factId, 'confirm').then(() => { state.reviewed += 1; }).catch(fail)),
  };
}

test('FACTS_DONE fired twice in the same tick: one POST, ends on facts_confirmed (never error)', async () => {
  const server = fakeFactsServer();
  const ui = screen(server.post);
  assert.equal(ui.finishFacts(), true);
  assert.equal(ui.finishFacts(), false, 'the second same-tick call is dropped by the ref flag');
  await ui.settle();
  assert.equal(server.calls.length, 1);
  assert.equal(ui.state.phase, 'facts_confirmed');
  assert.deepEqual(ui.state.busy, [true, false]);
  // Once settled, the flag is clear again.
  assert.equal(ui.finishFacts(), true);
  await ui.settle();
});

test('FACTS_DONE from two tabs (no shared flag): the 409 out_of_order at facts_confirmed counts as success', async () => {
  const server = fakeFactsServer();
  const tabA = screen(server.post);
  const tabB = screen(server.post);
  tabA.finishFacts();
  tabB.finishFacts();
  await tabA.settle();
  assert.equal(server.calls.length, 2);
  assert.equal(tabA.state.phase, 'facts_confirmed');
  assert.equal(tabB.state.phase, 'facts_confirmed');
});

test('a fact review fired twice in the same tick: one POST, applied once', async () => {
  const server = fakeFactsServer();
  const ui = screen(server.post);
  ui.review('fact-1');
  ui.review('fact-1');
  await ui.settle();
  assert.equal(server.calls.length, 1);
  assert.equal(ui.state.reviewed, 1);
  assert.equal(ui.state.phase, 'facts');
});

test('the FACTS_EMPTY return fired twice in the same tick: one POST, ends on questions; an out_of_order at questions is success', async () => {
  const server = fakeFactsServer();
  const ui = screen(server.post);
  ui.returnToQuestions();
  ui.returnToQuestions();
  await ui.settle();
  assert.equal(server.calls.length, 1);
  assert.equal(ui.state.phase, 'questions');
  const other = screen(server.post);
  other.returnToQuestions();
  await other.settle();
  assert.equal(other.state.phase, 'questions');
});

test('one screen, one flag: a review in flight drops FACTS_DONE fired in the same tick', async () => {
  const server = fakeFactsServer();
  const ui = screen(server.post);
  ui.review('fact-1');
  assert.equal(ui.finishFacts(), false);
  await ui.settle();
  assert.equal(server.calls.length, 1);
});

test('a failing task clears the flag (the next click works) and a sync throw does not leave it stuck', async () => {
  const flag = { current: false };
  const busy: boolean[] = [];
  runExclusive(flag, value => busy.push(value), () => Promise.reject(new Error('x')));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(flag.current, false);
  runExclusive(flag, value => busy.push(value), () => { throw new Error('sync'); });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(flag.current, false);
  assert.deepEqual(busy, [true, false, true, false]);
});

test('reachedPhase / stepReachedPhase: only the target phase turns an out_of_order into success', () => {
  const reply = (ok: boolean, status: number, json: Record<string, unknown>): InterviewJsonReply => ({ ok, status, json });
  assert.equal(reachedPhase(reply(true, 200, { phase: 'facts_confirmed' }), 'facts_confirmed'), true);
  assert.equal(reachedPhase(reply(false, 409, { error: 'out_of_order', phase: 'facts_confirmed' }), 'facts_confirmed'), true);
  assert.equal(reachedPhase(reply(false, 409, { error: 'out_of_order', phase: 'questions' }), 'facts_confirmed'), false);
  assert.equal(reachedPhase(reply(false, 409, { error: 'facts_pending' }), 'facts_confirmed'), false);
  assert.equal(reachedPhase(reply(false, 500, { error: 'out_of_order', phase: 'facts_confirmed' }), 'facts_confirmed'), false);
  const view = (phase: string) => ({ phase });
  assert.deepEqual(stepReachedPhase({ ok: true, session: view('questions') }, 'questions'), view('questions'));
  assert.deepEqual(stepReachedPhase({ ok: false, error: 'out_of_order', session: view('questions') }, 'questions'), view('questions'));
  assert.equal(stepReachedPhase({ ok: false, error: 'out_of_order', session: view('gates') }, 'questions'), null);
  assert.equal(stepReachedPhase({ ok: false, error: 'session_closed', session: view('questions') }, 'questions'), null);
  assert.equal(stepReachedPhase({ ok: true, session: null }, 'questions'), null);
});

test('StartPaidFlow: every step-2b submitting handler goes through runExclusive; none guards on the stale submitting state', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/app/(app)/site-bot/start/StartPaidFlow.tsx'), 'utf8');
  for (const name of ['beginQuestions', 'submitAnswer', 'submitGate', 'reviewFactItem', 'finishFacts', 'returnToQuestions']) {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, name);
    const body = source.slice(start, source.indexOf('\n  }\n', start));
    assert.match(body, /runExclusive\(interviewInFlightRef, setSubmitting,/, name);
    assert.doesNotMatch(body, /\|\| submitting\)/, name);
  }
  // Only the handlers' runExclusive and the intake steps before 2b may still read `submitting` in a guard.
  assert.doesNotMatch(source, /phase !== "(holding|questions|gates|facts)"[^\n]*submitting\) return/);
});
