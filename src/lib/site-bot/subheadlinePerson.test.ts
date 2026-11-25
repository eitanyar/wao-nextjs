/**
 * First-screen fact v2 rule (a): the subheadline person gate (subheadlinePerson.ts).
 * The Hebrew strings are copied byte-exact as \u escapes: LIVE_SUB is the 2026-11-25 live Gemini preview's subheadline
 * (the verifier's FAIL), LIVE_H1 its H1, REFUSAL the synthetic plumber's refusal fact (firstScreenV2.test.ts). Every other
 * Hebrew value is cut from them or read from the gate's own lists at runtime.
 * HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { PLURAL_ADDRESS_TOKENS, WE_FORM_TOKENS } from '../lp/copyGates.config';
import { SUBJECT_CARRY_TOKENS } from '../lp/generationData';
import {
  FIRST_PERSON_SINGULAR_FORMS, FORMS_MISSING_FROM_REPO, personExemptNames, SECOND_PERSON_SINGULAR_FORMS, subheadlinePersonHits,
} from './subheadlinePerson';

const LIVE_SUB = '\u05D0\u05E0\u05D9 \u05DE\u05D0\u05EA\u05E8 \u05D0\u05EA \u05DE\u05E7\u05D5\u05E8 \u05D4\u05E8\u05D8\u05D9\u05D1\u05D5\u05EA \u05D1\u05D7\u05D9\u05D1\u05D5\u05E8\u05D9 \u05D4\u05E6\u05E0\u05E8\u05EA \u05D5\u05DE\u05E9\u05D0\u05D9\u05E8 \u05D1\u05D9\u05EA \u05D9\u05D1\u05E9 \u05D5\u05EA\u05E7\u05D9\u05DF';
const LIVE_H1 = '\u05D0\u05D9\u05E0\u05E1\u05D8\u05DC\u05D8\u05D5\u05E8 \u05D1\u05E8\u05E2\u05E0\u05E0\u05D4 \u05E9\u05D1\u05D5\u05D3\u05E7 \u05D5\u05DE\u05E1\u05D3\u05E8 \u05D0\u05EA \u05D4\u05E6\u05E0\u05E8\u05EA \u05D1\u05D1\u05D9\u05EA';
const REFUSAL = '\u05DC\u05E4\u05E0\u05D9 \u05D7\u05D5\u05D3\u05E9 \u05DE\u05D9\u05E9\u05D4\u05D5 \u05E8\u05E6\u05D4 \u05E9\u05D0\u05D7\u05D1\u05E8 \u05DC\u05D5 \u05D0\u05EA \u05D4\u05DE\u05D8\u05D1\u05D7 \u05D4\u05D7\u05D3\u05E9 \u05D1\u05DC\u05D9 \u05D1\u05E8\u05D6 \u05E0\u05D9\u05EA\u05D5\u05E7';
/** The live subheadline without its first word (the subject pronoun): a person-neutral present-tense sentence. */
const LIVE_SUB_NEUTRAL = LIVE_SUB.split(' ').slice(1).join(' ');
const VAV = '\u05D5';
const SHIN = '\u05E9';

test('the live FAIL is caught: the first-person subject pronoun opens the 2026-11-25 subheadline', () => {
  const hits = subheadlinePersonHits(LIVE_SUB);
  assert.deepEqual(hits, [{ token: SUBJECT_CARRY_TOKENS[0], person: 'first' }]);
  assert.deepEqual(subheadlinePersonHits(LIVE_SUB_NEUTRAL), [], 'the same sentence without the pronoun passes');
  assert.deepEqual(subheadlinePersonHits(LIVE_H1), [], 'the third-person H1 passes');
  assert.deepEqual(subheadlinePersonHits(REFUSAL.split(' ').slice(2).join(' ')), [], 'a third-person object form is not first or second person');
  assert.deepEqual(subheadlinePersonHits(''), []);
});

test('every list is matched: singular forms with a vav / shin prefix, the we-forms and the plural address as their gates match them', () => {
  const words = LIVE_SUB_NEUTRAL.split(' ');
  const inSentence = (token: string) => `${words.slice(0, 3).join(' ')} ${token} ${words.slice(3).join(' ')}`;
  for (const token of FIRST_PERSON_SINGULAR_FORMS) {
    assert.ok(subheadlinePersonHits(inSentence(token)).some(hit => hit.token === token && hit.person === 'first'), token);
    assert.ok(subheadlinePersonHits(inSentence(`${VAV}${token}`)).length > 0, `vav + ${token}`);
  }
  for (const token of SECOND_PERSON_SINGULAR_FORMS) {
    assert.ok(subheadlinePersonHits(inSentence(token)).some(hit => hit.token === token && hit.person === 'second'), token);
    assert.ok(subheadlinePersonHits(inSentence(`${SHIN}${token}`)).length > 0, `shin + ${token}`);
  }
  for (const entry of WE_FORM_TOKENS) assert.ok(subheadlinePersonHits(inSentence(entry.token)).some(hit => hit.person === 'first'), entry.token);
  for (const entry of PLURAL_ADDRESS_TOKENS) assert.ok(subheadlinePersonHits(inSentence(entry.token)).some(hit => hit.person === 'second'), entry.token);
  // Both first-person object forms cut from the sticky actions are present.
  assert.equal(FIRST_PERSON_SINGULAR_FORMS.length, new Set(FIRST_PERSON_SINGULAR_FORMS).size + 1, 'one duplicate (the "to me" form twice), harmless');
  assert.ok(FIRST_PERSON_SINGULAR_FORMS.length >= 11);
});

test('a form inside a longer word never counts; a short form is never matched under a he / bet / lamed / mem / kaf prefix', () => {
  // The two-letter second-person form under he is a past-tense verb ("walked"); under kaf the first-person one is a noun.
  const lecha = SECOND_PERSON_SINGULAR_FORMS[1];
  const li = FIRST_PERSON_SINGULAR_FORMS.find(token => token.length === 2)!;
  assert.equal(lecha.length, 2);
  assert.deepEqual(subheadlinePersonHits(`${LIVE_SUB_NEUTRAL} \u05D4${lecha}`), []);
  assert.deepEqual(subheadlinePersonHits(`${LIVE_SUB_NEUTRAL} \u05DB${li}`), []);
  assert.deepEqual(subheadlinePersonHits(LIVE_SUB_NEUTRAL.replace(' ', `${lecha}${lecha} `)), [], 'inside a longer word');
});

test('names are exempt: a pronoun-shaped owner first name or business-name word never counts', () => {
  const name = FIRST_PERSON_SINGULAR_FORMS[3];
  const sentence = `${LIVE_SUB_NEUTRAL} ${name}`;
  assert.equal(subheadlinePersonHits(sentence).length, 1);
  assert.deepEqual(subheadlinePersonHits(sentence, personExemptNames(name, 'Fixture Plumbing')), []);
  assert.deepEqual(personExemptNames(undefined, 'A B'), ['A', 'B']);
});

test('the forms no repo string carries are listed for Adam, in English', () => {
  assert.equal(FORMS_MISSING_FROM_REPO.length, 1);
  assert.doesNotMatch(FORMS_MISSING_FROM_REPO.join(' '), /[\u0590-\u05FF]/);
});
