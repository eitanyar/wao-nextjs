/**
 * Site Bot step 2c fix (Yonatan sign-off 2026-11-25, C3 + first-screen check): a job needs the work in it, a callerQuestion
 * answer is never a job, and place / time words never count as carrying a fact.
 * (v2: the carry check is now only the rule (a) watch; the first-screen eligibility is firstScreenFact.ts firstScreenCheck.)
 * The Hebrew strings are the real-run facts and subheadline of the 2026-11-25 live run, copied byte-exact as \u escapes.
 * HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { retypeModelFacts } from './factRetype';
import {
  firstScreenCheck, hasWorkContent, isTimeWord, subheadlineCarriesFact, type FirstScreenContext,
} from './firstScreenFact';
import type { InterviewFact } from './interviewFacts';
import { ISRAELI_LOCALITIES } from './israeliLocalities';

const RAANANA = ISRAELI_LOCALITIES.find(item => item.slug === 'raanana')!.he_name;
const KFAR_SABA = ISRAELI_LOCALITIES.find(item => item.slug === 'kfar-saba')!.he_name;

// Real run 2026-11-25 (scratch dossier s2c/real), fact a1-1 (typed job by the extraction): place + time words only.
const LAST_WEEK_IN_KFAR_SABA = '\u05E9\u05D1\u05D5\u05E2 \u05E9\u05E2\u05D1\u05E8 \u05D1\u05DB\u05E4\u05E8 \u05E1\u05D1\u05D0';
// Fact a1-3: the callerQuestion answer (typed job by the extraction).
const CALLER_QUESTION = '\u05DB\u05D5\u05DC\u05DD \u05E9\u05D5\u05D0\u05DC\u05D9\u05DD \u05F4\u05D0\u05EA\u05D4 \u05D9\u05DB\u05D5\u05DC \u05DC\u05D4\u05D2\u05D9\u05E2 \u05D4\u05D9\u05D5\u05DD?';
// Fact a1-4: a local fact with content words.
const MOST_WORK_LOCAL = '\u05E8\u05D5\u05D1 \u05D4\u05E2\u05D1\u05D5\u05D3\u05D4 \u05E9\u05DC\u05D9 \u05D1\u05E8\u05E2\u05E0\u05E0\u05D4 \u05D5\u05D1\u05DB\u05E4\u05E8 \u05E1\u05D1\u05D0';
// Fact a1-2 (a refusal with work in it).
const REFUSAL = '\u05DC\u05E4\u05E0\u05D9 \u05D7\u05D5\u05D3\u05E9 \u05DE\u05D9\u05E9\u05D4\u05D5 \u05E8\u05E6\u05D4 \u05E9\u05D0\u05D7\u05D1\u05E8 \u05DC\u05D5 \u05D0\u05EA \u05D4\u05DE\u05D8\u05D1\u05D7 \u05D4\u05D7\u05D3\u05E9 \u05D1\u05DC\u05D9 \u05D1\u05E8\u05D6 \u05E0\u05D9\u05EA\u05D5\u05E7';
// The live subheadline of that run: it "carried" a1-1 only through the time words and the town.
const REAL_SUBHEADLINE = '\u05EA\u05E8\u05D0\u05D4 \u05D1\u05E6\u05D2 \u05DE\u05D4 \u05E4\u05D5\u05D2\u05E2 \u05D1\u05E6\u05D9\u05E0\u05D5\u05E8, \u05D1\u05D3\u05D9\u05D5\u05E7 \u05DB\u05DE\u05D5 \u05D1\u05E9\u05D1\u05D5\u05E2 \u05E9\u05E2\u05D1\u05E8 \u05D1\u05DB\u05E4\u05E8 \u05E1\u05D1\u05D0';

const CONTEXT: FirstScreenContext = {
  homeServiceIds: [], localities: ISRAELI_LOCALITIES, trustBarNumbers: ['15'], trustBarCredentialIds: [],
  answers: [
    { key: 'recentJob', part: 'answer', text: LAST_WEEK_IN_KFAR_SABA },
    { key: 'callerQuestion', part: 'answer', text: CALLER_QUESTION },
    { key: 'areaPattern', part: 'answer', text: MOST_WORK_LOCAL },
    { key: 'turnedDown', part: 'answer', text: REFUSAL },
  ],
};

function modelFact(id: string, type: InterviewFact['type'], quote: string, questionKey: 'recentJob' | 'callerQuestion' | 'areaPattern' | 'turnedDown'): InterviewFact {
  return { id, type, quote, status: 'pending', source: { kind: 'answer', questionKey, part: 'answer' } };
}

const REAL_FACTS: InterviewFact[] = [
  modelFact('a1-1', 'job', LAST_WEEK_IN_KFAR_SABA, 'recentJob'),
  modelFact('a1-2', 'refusal', REFUSAL, 'turnedDown'),
  modelFact('a1-3', 'job', CALLER_QUESTION, 'callerQuestion'),
  modelFact('a1-4', 'local', MOST_WORK_LOCAL, 'areaPattern'),
];

test('work content: place + time words alone are not work; the real local fact and refusal have content', () => {
  assert.equal(hasWorkContent(LAST_WEEK_IN_KFAR_SABA, ISRAELI_LOCALITIES), false);
  assert.equal(hasWorkContent(MOST_WORK_LOCAL, ISRAELI_LOCALITIES), true);
  assert.equal(hasWorkContent(REFUSAL, ISRAELI_LOCALITIES), true);
  assert.equal(hasWorkContent('replaced a burst pipe'), true);
  assert.equal(hasWorkContent(`${KFAR_SABA} 2024`, ISRAELI_LOCALITIES), false, 'digits and a place are not work');
});

test('C3 (i)+(ii) at extraction: the place+time job becomes local (its town is a service area); the caller question is never a job', () => {
  const areas = { localities: ISRAELI_LOCALITIES, serviceAreaTexts: [RAANANA, `${RAANANA}, ${KFAR_SABA}`] };
  const out = retypeModelFacts(REAL_FACTS, areas);
  assert.deepEqual(out.map(fact => `${fact.id}:${fact.type}`), ['a1-1:local', 'a1-2:refusal', 'a1-4:local'], 'the caller question names no place: dropped');
  assert.ok(!out.some(fact => fact.source.kind === 'answer' && fact.source.questionKey === 'callerQuestion' && fact.type === 'job'));
  // Its town outside the service areas: dropped, never a job.
  assert.deepEqual(retypeModelFacts(REAL_FACTS, { localities: ISRAELI_LOCALITIES, serviceAreaTexts: [RAANANA] }).map(fact => fact.id), ['a1-2', 'a1-4']);
  // A caller question that names only service-area towns becomes local.
  const asked = modelFact('a1-9', 'job', `${CALLER_QUESTION} ${KFAR_SABA}`, 'callerQuestion');
  assert.deepEqual(retypeModelFacts([asked], areas).map(fact => fact.type), ['local']);
  // A job with work in it stays a job (quote and id unchanged).
  const work = modelFact('a1-5', 'job', `${REFUSAL}`, 'recentJob');
  assert.deepEqual(retypeModelFacts([work], areas), [work]);
  // A retype that duplicates an existing local (same quote) is dropped.
  assert.equal(retypeModelFacts([modelFact('a1-6', 'local', LAST_WEEK_IN_KFAR_SABA, 'areaPattern'), REAL_FACTS[0]], areas).length, 1);
});

test('first screen: the real place+time job is no longer an eligible job; a callerQuestion answer is never a job', () => {
  const confirmed = REAL_FACTS.map(fact => ({ ...fact, status: 'confirmed' as const }));
  const reason = (id: string) => firstScreenCheck(confirmed.find(fact => fact.id === id)!, CONTEXT).reason;
  assert.equal(reason('a1-1'), 'job_without_work');
  assert.equal(reason('a1-3'), 'job_caller_question');
  const callerJob: InterviewFact = { ...modelFact('x', 'job', CALLER_QUESTION, 'callerQuestion'), status: 'confirmed' };
  assert.equal(firstScreenCheck(callerJob, CONTEXT).reason, 'job_caller_question', 'even with work in it');
  // v2: a local fact is never a first-screen fact (it belongs to the service-area section).
  assert.equal(reason('a1-4'), 'local_not_first_screen');
  assert.equal(firstScreenCheck({ ...modelFact('y', 'local', LAST_WEEK_IN_KFAR_SABA, 'areaPattern'), status: 'confirmed' }, CONTEXT).reason, 'local_not_first_screen');
  // Fable 5.2 2026-11-26: the real refusal a1-2 is never the owner quote in v1 (it needs its reason first).
  assert.equal(reason('a1-2'), 'refusal_no_reason');
});

test('carry check: an overlap on place or time words alone never counts as carrying the fact', () => {
  const fact = { text: LAST_WEEK_IN_KFAR_SABA };
  assert.equal(subheadlineCarriesFact(REAL_SUBHEADLINE, fact, new Set(), ISRAELI_LOCALITIES), false, 'the real run');
  // A fact with content: the place words do not count toward the needed matches, the content words do.
  assert.equal(subheadlineCarriesFact(`${KFAR_SABA} ${RAANANA}`, { text: MOST_WORK_LOCAL }, new Set(), ISRAELI_LOCALITIES), false);
  assert.equal(subheadlineCarriesFact(MOST_WORK_LOCAL, { text: MOST_WORK_LOCAL }, new Set(), ISRAELI_LOCALITIES), true);
  assert.equal(subheadlineCarriesFact('I replaced a burst pipe', { text: 'replaced a burst pipe' }, new Set(), ISRAELI_LOCALITIES), true);
});

test('time words: the real fact words are time words; a work word that only folds onto one is not', () => {
  const [week, passed] = LAST_WEEK_IN_KFAR_SABA.split(' ');
  assert.equal(isTimeWord(week), true);
  assert.equal(isTimeWord(passed), true);
  // The live run 2026-11-25 aboutPageBody word "the passage" (he + mem + "passed" minus its shin): not a time word.
  assert.equal(isTimeWord('\u05D4\u05DE\u05E2\u05D1\u05E8'), false);
});
