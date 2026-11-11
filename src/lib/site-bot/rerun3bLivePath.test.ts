// Rerun-3b bug A: Q&A was null on every service page live, though an offline replay built code-built items. The live path
// is reproduced here end to end: runResearchToSite with NO runResearch override, so research runs on defaultProviders()
// from the same env the eval sets (SITE_BOT_RESEARCH_PROVIDERS=fixture + SITE_BOT_FIXTURE_QUESTIONS_FILE), then the real
// briefs and the real generateResearchPageCopy. Two root causes:
//   (1) harness: rerun 3b reused the rerun-3a dossiers (an existing dossier is never re-run), written before the questions
//       file existed, so the briefs saw only the synthetic pool (no code-owned topic -> no code-built item);
//   (2) code: the depth filter's "unoffered service" check compared each question's vertical with the free-text niche only,
//       so a Latin / unmapped niche (the skilled-trades fallback) rejected every question naming the page's OWN service
//       (pool 0 -> blocksEnabled.qa false -> no Q&A block planned at all on leak-detection and on every electrician page).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes (Hebrew comes from the recorded NeuronWriter response at runtime).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from '../lp/lpCopyPrompt';
import { OWNER_FACT_TEMPLATES } from '../lp/ownerFactCopy';
import { questionTopic } from '../lp/qaCodeOwned';
import { codeOwnedQa, codeQaItemCount, generateResearchPageCopy, ungeneratedFieldsFor } from '../lp/researchPageCopy';
import { detectVertical, matchedVertical } from '../lp/verticalDetect';
import type { PageBrief } from './research/pageBrief';
import { readResearchDossier } from './research/researchStore';
import { offeredVerticalsFor, runResearchToSite } from './researchToSite';

const recorded = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/site-bot/research/testdata/neuronwriter-get-query-he.json'), 'utf8')) as { keyword: string; ideas: { topic_matrix: Record<string, unknown>; content_questions: Array<{ q: string }> } };
// "<trade> b<city>": the trade word names a vertical; the city is the keyword's second word without its prefix letter.
const [TRADE, CITY_WITH_PREFIX] = recorded.keyword.split(' ');
const CITY = CITY_WITH_PREFIX.slice(1);
const REAL = [...Object.keys(recorded.ideas.topic_matrix), ...recorded.ideas.content_questions.map(item => item.q)];
const PRICE_Q = REAL.find(question => questionTopic(question, OWNER_FACT_TEMPLATES) === 'price') as string;
const MODEL_QS = REAL.filter(question => questionTopic(question, OWNER_FACT_TEMPLATES) === null && question.includes(CITY)).slice(0, 2);

const data: CollectedData = {
  businessName: 'TEST Live Path',
  // Latin free-text niche: detectVertical falls back to skilled-trades, while the owner's own service names another vertical.
  businessNiche: 'plumber',
  primaryService: TRADE,
  priorityServices: [TRADE],
  serviceModel: 'field',
  targetLocation: CITY,
  specificCities: CITY,
  travelBoundary: '15 km',
  yearsInField: '12',
  phone: '050-0000000',
  startingPrices: [{ job: TRADE, from: 350 }],
};

const modelCopy: SiteCopy = {
  heroHeadline: 'Headline', heroSubheadline: 'Subheadline', heroCta: 'Call', trustBarItems: ['Proof'], aboutBlurb: 'About',
  servicesHeadline: 'Services', serviceItems: ['Alpha'], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: 'Guarantee',
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: 'Sticky',
  aboutPageHeadline: 'About page', aboutPageBody: 'About page body', serviceDetails: [{ name: 'Alpha', description: 'Description' }],
};

async function withEnv<R>(env: Record<string, string>, fn: () => Promise<R>): Promise<R> {
  const saved = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  try { return await fn(); } finally {
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}

test('preconditions: the fixture reproduces the live mismatch (niche vertical != the page service vertical)', () => {
  assert.ok(PRICE_Q && MODEL_QS.length === 2, 'recorded pool has a price question and two non-topic questions');
  assert.equal(detectVertical(data.businessNiche ?? ''), 'skilled-trades');
  assert.ok(matchedVertical(TRADE) !== null && matchedVertical(TRADE) !== 'skilled-trades');
  assert.deepEqual(offeredVerticalsFor([TRADE, 'Alpha', '']), [matchedVertical(TRADE)]);
});

test('live path: fixture questions from the env reach the service brief, the Q&A block is planned, code-built items lead qaItems', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rerun3b-live-'));
  const questionsFile = path.join(root, 'questions.json');
  fs.writeFileSync(questionsFile, JSON.stringify({ [TRADE]: { paa: PRICE_Q, topic: MODEL_QS[0], content: MODEL_QS[1] } }));
  const briefs: PageBrief[] = [];
  const records: Array<{ brief: PageBrief; copy: SiteCopy }> = [];
  try {
    const outcome = await withEnv({ SITE_BOT_RESEARCH_PROVIDERS: 'fixture', SITE_BOT_FIXTURE_QUESTIONS_FILE: questionsFile }, () => runResearchToSite(
      { slug: 'rerun3b-live-path', researchId: 'rerun3b-live-a', collectedData: data },
      {
        researchBaseDir: path.join(root, 'site-research'), sitesRoot: path.join(root, 'sites'), now: () => new Date('2026-11-11T00:00:00.000Z'),
        generateCopy: async (brief, d) => {
          briefs.push(brief);
          const answer: Record<string, unknown> = Object.fromEntries(Object.entries(modelCopy).filter(([key]) => !ungeneratedFieldsFor(brief).includes(key)));
          const plan = codeOwnedQa(brief, d);
          // The model answers one non-topic pool question (the code builds the price item itself).
          if (plan) answer.qaItems = [{ questionId: plan.plan.modelPool[0].id, q: plan.plan.modelPool[0].question, a: 'Answer.', factIds: ['proof-yearsInField'] }];
          const copy = await generateResearchPageCopy(brief, d, {
            gates: false,
            callJson: async (system, user) => JSON.stringify(/^You are Noa/.test(system) ? JSON.parse(user.slice(0, user.indexOf('\n\nHARD LIMITS'))) : answer),
          });
          records.push({ brief, copy });
          return copy;
        },
      },
    ));
    assert.equal(outcome.status, 'generated', JSON.stringify(outcome));
    // (1) the questions reached the stored dossier through defaultProviders (not the synthetic pool).
    const dossier = await readResearchDossier('rerun3b-live-a', path.join(root, 'site-research'));
    const stored = Object.values(dossier?.neuronQueries ?? {}).find(item => item.keyword === TRADE);
    assert.ok(stored?.questions.some(item => item.question === PRICE_Q), 'fixture price question in the dossier');
    // (2) the page's own-service questions survive the depth filters: pool >= 3, Q&A enabled.
    const service = briefs.find(brief => brief.page.pageClass !== 'homepage') as PageBrief;
    assert.ok(service, 'a service page');
    const pool = service.questionPool?.map(item => item.question) ?? [];
    for (const question of [PRICE_Q, ...MODEL_QS]) assert.ok(pool.includes(question), `in the pool: ${question}`);
    assert.equal(service.blocksEnabled?.qa, true);
    // (3) the plan builds the price item in code; the generated copy carries it first, then the model's item.
    const plan = codeOwnedQa(service, data);
    assert.equal(plan?.plan.codeItems.length, 1);
    assert.equal(plan?.plan.codeItems[0].q, PRICE_Q);
    const generated = records.find(item => item.brief.page.id === service.page.id)?.copy as unknown as Record<string, unknown>;
    const qa = generated.qaItems as Array<{ q: string }>;
    assert.equal(qa.length, 2, JSON.stringify(qa));
    assert.equal(qa[0].q, PRICE_Q);
    assert.equal(codeQaItemCount(generated, service, data), 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
