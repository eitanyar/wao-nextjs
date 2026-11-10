// Rerun-3 bug 2: Q&A was deleted live (restatement_drop_depth_block / budget_drop_depth_block qaItems:2->0) although code-built
// items are never dropped. Root cause: the fixture NeuronWriter pool is synthetic ("<keyword> paa question?" ...), which names
// no code-owned fact topic, so planQa built ZERO code-built items and every item was model-written (and droppable). Fix: an
// eval can supply realistic pool questions (SITE_BOT_FIXTURE_QUESTIONS_FILE). Hebrew comes from the recorded real NeuronWriter
// response (testdata), read at runtime. HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OWNER_FACT_TEMPLATES } from '../../lp/ownerFactCopy';
import { qaQuestionDisposition, questionTopic } from '../../lp/qaCodeOwned';
import { fixtureNeuronReadyPayload, fixtureQuestionsFromEnv, fixtureResearchProviders, parseFixtureQuestions } from './fixtureProviders';

const recorded = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../src/lib/site-bot/research/testdata/neuronwriter-get-query-he.json'), 'utf8')) as { keyword: string; ideas: { topic_matrix: Record<string, unknown>; content_questions: Array<{ q: string }> } };
const KEYWORD = recorded.keyword;
const REAL = [...Object.keys(recorded.ideas.topic_matrix), ...recorded.ideas.content_questions.map(item => item.q)];

function syntheticQuestions(payload: Record<string, unknown>): string[] {
  const ideas = payload.ideas as { suggest_questions: Array<{ q: string }>; people_also_ask: Array<{ q: string }>; topic_matrix: Record<string, unknown>; content_questions: Array<{ q: string }> };
  return [...ideas.people_also_ask, ...ideas.suggest_questions, ...ideas.content_questions].map(item => item.q).concat(Object.keys(ideas.topic_matrix));
}

test('root cause: the synthetic fixture pool names no code-owned topic, so no code-built Q&A item can exist', () => {
  const questions = syntheticQuestions(fixtureNeuronReadyPayload('fixture-neuron-x', KEYWORD));
  assert.equal(questions.length, 4);
  for (const question of questions) {
    assert.equal(questionTopic(question, OWNER_FACT_TEMPLATES), null, question);
    assert.deepEqual(qaQuestionDisposition(question, OWNER_FACT_TEMPLATES), { kind: 'model' });
  }
  // A real NeuronWriter pool does name code-owned topics (the recorded response has a cost question).
  assert.ok(REAL.some(question => questionTopic(question, OWNER_FACT_TEMPLATES) !== null), 'recorded pool has a topic question');
});

test('fixture questions: an entry replaces the synthetic text per group; other keywords and groups keep the default', () => {
  const priced = REAL.find(question => questionTopic(question, OWNER_FACT_TEMPLATES) === 'price') as string;
  const questions = parseFixtureQuestions({ [KEYWORD]: { paa: priced, topic: REAL[0] } });
  const payload = fixtureNeuronReadyPayload('fixture-neuron-x', KEYWORD, questions) as { ideas: Record<string, unknown> };
  assert.deepEqual(payload.ideas.people_also_ask, [{ q: priced }]);
  assert.deepEqual(payload.ideas.topic_matrix, { [REAL[0]]: { importance: 8 } });
  assert.deepEqual(payload.ideas.suggest_questions, [{ q: `${KEYWORD} suggested question?` }]);
  assert.deepEqual(fixtureNeuronReadyPayload('q', 'other', questions), fixtureNeuronReadyPayload('q', 'other'));
});

test('fixture questions reach the parsed NeuronWriter query through the real adapter', async () => {
  const priced = REAL.find(question => questionTopic(question, OWNER_FACT_TEMPLATES) === 'price') as string;
  const providers = fixtureResearchProviders([], parseFixtureQuestions({ [KEYWORD]: { paa: priced } }));
  const input = { serviceKeyword: KEYWORD, intentCluster: 'service', pageClass: 'service' };
  const created = await providers.neuron.create(input);
  const query = await providers.neuron.get(created.id, input);
  assert.deepEqual(query.paaQuestions, [priced], 'the override question is in the parsed query');
  assert.deepEqual(query.suggestedQuestions, [`${KEYWORD} suggested question?`]);
});

test('fixture questions file: unset = none; a bad file fails closed', () => {
  assert.equal(fixtureQuestionsFromEnv({}), undefined);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixture-questions-'));
  try {
    const good = path.join(dir, 'good.json');
    fs.writeFileSync(good, JSON.stringify({ alpha: { paa: 'Alpha?' } }));
    assert.deepEqual(fixtureQuestionsFromEnv({ SITE_BOT_FIXTURE_QUESTIONS_FILE: good }), { alpha: { paa: 'Alpha?' } });
    const bad = path.join(dir, 'bad.json');
    fs.writeFileSync(bad, JSON.stringify({ alpha: { faq: 'Alpha?' } }));
    assert.throws(() => fixtureQuestionsFromEnv({ SITE_BOT_FIXTURE_QUESTIONS_FILE: bad }), /unknown group/);
    assert.throws(() => parseFixtureQuestions({ alpha: { paa: ' ' } }), /non-empty/);
    assert.throws(() => fixtureQuestionsFromEnv({ SITE_BOT_FIXTURE_QUESTIONS_FILE: path.join(dir, 'missing.json') }));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
