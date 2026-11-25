// Noa 2026-11-26 (live preview round 2): the page-wide repeated-word lint and its one repair round, and the interview
// writing rules reaching every narrative field (the Noa edit stage and the about field job).
// HEBREW-SAFETY: zero Hebrew bytes. The Hebrew words are read at runtime from existing generation-data lists.
import assert from 'node:assert/strict';
import test from 'node:test';

import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from '../lp/lpCopyPrompt';
import { ARRIVE_LOCATE_NEXT_WORD_EXCLUSIONS, SERVICES_HEADLINE_OPTIONS, STICKY_PROBLEM_WORDS } from '../lp/generationData';
import {
  buildNoaQaMessage, buildResearchCopyRulesV2, INTERVIEW_BRIEF_MARKER_ID, INTERVIEW_WRITING_RULES, interviewEditorNote,
} from '../lp/researchPageCopy';
import { compilePageBrief, type PageBrief, type PageBriefInput } from './research/pageBrief';
import {
  gatePageRepeatWords, PAGE_REPEAT_REPAIR_SYSTEM, pageRepeatHits, pageRepeatRepairPrompt, repeatAnchors, repeatRepairFields,
} from './pageRepeatWords';

const WORK = ARRIVE_LOCATE_NEXT_WORD_EXCLUSIONS[3];
const THE_WORK = ARRIVE_LOCATE_NEXT_WORD_EXCLUSIONS[2];
const BUILDING = ARRIVE_LOCATE_NEXT_WORD_EXCLUSIONS[1];
const HANDLES = SERVICES_HEADLINE_OPTIONS[0].split(' ')[2];
const FAULT = STICKY_PROBLEM_WORDS.plumbing[0];
const VAV = '\u05D5';

const data: CollectedData = { businessName: 'TEST Biz', businessNiche: 'plumber', targetLocation: 'Holon', specificCities: 'Holon', phone: '050-0000000' };

function homeBrief(interview = true): PageBrief {
  const approved = (id: string, value: string) => ({ id, value, status: 'approved' as const });
  return compilePageBrief({
    page: { id: 'home', targetPath: '/', pageClass: 'homepage' },
    persona: approved('persona', 'A local customer in Holon'),
    waoOffer: approved('offer', 'TEST Biz'),
    targetQueries: [approved('query-1', 'plumber Holon')],
    entityAnchors: [approved('entity-1', 'plumber')],
    firstPartyProof: [], localFacts: [approved('local-area', 'Service area (owner-stated): Holon')],
    customerDecisions: [], constraints: interview ? [approved(INTERVIEW_BRIEF_MARKER_ID, 'Do not link a fact to a USP or tool claim unless the fact itself states it.')] : [],
    informationGainGaps: [], prohibitedClaims: [], faqCandidates: [], links: [],
    site: { pageName: 'plumber', relevanceTerm: 'plumber', city: 'Holon', serviceArea: ['Holon'], serviceLabels: ['leak detection', 'drain unclogging'], businessName: 'TEST Biz', soloOperator: true, ownerIntroPage: true },
  } as PageBriefInput);
}

function copy(over: Partial<Record<string, unknown>> = {}): SiteCopy {
  return {
    heroHeadline: 'Plumber in Holon', heroSubheadline: 'Subheadline text here', heroCta: 'Call', trustBarItems: [],
    aboutBlurb: '', servicesHeadline: 'Services', serviceItems: ['leak detection', 'drain unclogging'], faqHeadline: '', faqItems: [], guaranteeBlock: null,
    reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: '',
    aboutPageHeadline: 'About page', aboutPageBody: 'About body one. About body two. About body three.',
    serviceDetails: [
      { name: 'leak detection', description: 'I follow the line and find where the water goes.' },
      { name: 'drain unclogging', description: 'I clear the drain and run the water to check it.' },
    ],
    storyHeadline: 'Story heading', storyBody: 'Story one. Story two. Story three.',
    ...over,
  } as unknown as SiteCopy;
}

const anchors = (value: SiteCopy) => repeatAnchors(homeBrief(), data, value);

test('a content word in two sections is a hit; the later field is the repair target', () => {
  const value = copy({ storyBody: `Story ${WORK} one. Story two. Story three.`, aboutPageBody: `About ${WORK} one. About two. About three.` });
  const hits = pageRepeatHits(value, anchors(value));
  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0].sections, ['story', 'about']);
  assert.deepEqual(hits[0].laterFields, ['aboutPageBody']);
  assert.deepEqual(repeatRepairFields(value, hits), ['aboutPageBody']);
});

test('prefixed forms meet the bare form; cards, story heading and subheadline are sections too', () => {
  const value = copy({
    heroSubheadline: `Sub ${HANDLES} text`,
    storyHeadline: `Heading ${VAV}${HANDLES}`,
    serviceDetails: [{ name: 'leak detection', description: `I follow the line ${THE_WORK} and find the water.` }, { name: 'drain unclogging', description: `I clear it, ${WORK} and run the water.` }],
  });
  const hits = pageRepeatHits(value, anchors(value));
  const handles = hits.find(hit => hit.sections.includes('hero'));
  assert.ok(handles, 'subheadline word repeated in the story heading (with a vav prefix)');
  assert.deepEqual(handles!.laterFields, ['storyHeadline']);
  // The word twice inside one section (two cards) is not a page-wide repeat.
  assert.ok(!hits.some(hit => hit.sections.length === 1));
  assert.equal(hits.filter(hit => hit.sections.includes('cards')).length, 0);
});

test('never a hit: the promise (heroHeadline), the service names, the trade fault words, short words', () => {
  const promise = copy({ heroHeadline: `Plumber in Holon ${BUILDING}`, storyBody: `Story ${BUILDING}. Two. Three.`, aboutPageBody: `About ${BUILDING}. Two. Three.` });
  assert.deepEqual(pageRepeatHits(promise, anchors(promise)), []);
  const fault = copy({ storyBody: `Story ${FAULT}. Two. Three.`, aboutPageBody: `About ${FAULT}. Two. Three.` });
  assert.deepEqual(pageRepeatHits(fault, anchors(fault)), []);
  const labelled = copy({ storyBody: `Story ${WORK}. Two. Three.`, aboutPageBody: `About ${WORK}. Two. Three.` });
  assert.deepEqual(pageRepeatHits(labelled, { ...anchors(labelled), serviceLabels: [WORK] }), []);
  const short = copy({ storyBody: `Story ${VAV}. Two. Three.`, aboutPageBody: `About ${VAV}. Two. Three.` });
  assert.deepEqual(pageRepeatHits(short, anchors(short)), []);
});

test('one repair round: a clean rewrite of the later field is kept; logs carry field names and counts, never text', async () => {
  const value = copy({ storyBody: `Story ${WORK} one. Story two. Story three.`, aboutPageBody: `About ${WORK} one. About two. About three.` });
  const calls: string[][] = [];
  const lines: string[] = [];
  const result = await gatePageRepeatWords(value, homeBrief(), data, {
    callJson: async (system, user) => { calls.push([system, user]); return JSON.stringify({ aboutPageBody: 'About body one. About two. About three.' }); },
    log: line => lines.push(line), sessionId: 's1', round: 1,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], PAGE_REPEAT_REPAIR_SYSTEM);
  assert.equal(calls[0][1], pageRepeatRepairPrompt(value, ['aboutPageBody'], pageRepeatHits(value, anchors(value))));
  assert.equal(result.outcome, 'repaired');
  assert.equal(result.copy.aboutPageBody, 'About body one. About two. About three.');
  assert.equal(result.copy.storyBody, value.storyBody, 'the earlier section is never rewritten');
  assert.deepEqual(result.before, { count: 1, fields: ['aboutPageBody'] });
  assert.deepEqual(result.after, { count: 0, fields: [] });
  assert.deepEqual(lines, ['[site-bot preview] page_repeat_words_found session=s1 round=1 count=1 fields=aboutPageBody', '[site-bot preview] page_repeat_words_repaired session=s1 round=1 count=1']);
  for (const line of lines) assert.doesNotMatch(line, /[\u0590-\u05FF]/);
});

test('a repair that keeps the word, breaks a limit or fails is dropped: logged as page_repeat_words and shipped', async () => {
  const value = copy({ storyBody: `Story ${WORK} one. Story two. Story three.`, aboutPageBody: `About ${WORK} one. About two. About three.` });
  for (const answer of [JSON.stringify({ aboutPageBody: value.aboutPageBody }), JSON.stringify({ aboutPageBody: 'x'.repeat(401) }), 'not json']) {
    const lines: string[] = [];
    const result = await gatePageRepeatWords(value, homeBrief(), data, { callJson: async () => answer, log: line => lines.push(line), sessionId: 's2', round: 2 });
    assert.equal(result.outcome, 'remaining');
    assert.equal(result.copy.aboutPageBody, value.aboutPageBody);
    assert.equal(lines.at(-1), '[site-bot preview] page_repeat_words session=s2 round=2 count=1 fields=aboutPageBody');
  }
  // A story rewrite that breaks the sentence count is dropped too.
  const story = copy({ heroSubheadline: `Sub ${WORK} text`, storyBody: `Story ${WORK} one. Story two. Story three.` });
  const kept = await gatePageRepeatWords(story, homeBrief(), data, { callJson: async () => JSON.stringify({ storyBody: 'One sentence only.' }), log: () => {}, sessionId: 's3', round: 1 });
  assert.equal(kept.copy.storyBody, story.storyBody);
  // Fixture mode: no model, lint only.
  const lines: string[] = [];
  const fixture = await gatePageRepeatWords(value, homeBrief(), data, { callJson: null, log: line => lines.push(line), sessionId: 's4', round: 1 });
  assert.equal(fixture.outcome, 'remaining');
  assert.equal(lines.length, 2);
  // A clean page makes no call and logs nothing.
  const clean = await gatePageRepeatWords(copy(), homeBrief(), data, { callJson: async () => { throw new Error('no call'); }, log: line => lines.push(line), sessionId: 's5', round: 1 });
  assert.equal(clean.outcome, 'clean');
  assert.equal(lines.length, 2);
});

test('the interview writing rules reach Noa\'s edit of every narrative field and replace the about scene job', () => {
  const interview = homeBrief(true);
  const plain = homeBrief(false);
  const note = interviewEditorNote(interview);
  assert.ok(note && INTERVIEW_WRITING_RULES.every(rule => note.includes(rule)));
  assert.equal(interviewEditorNote(plain), null);
  assert.ok(buildNoaQaMessage(copy(), interview).includes(note!));
  assert.ok(!buildNoaQaMessage(copy(), plain).includes('WRITING RULES FOR THIS OWNER'));
  const fieldJobs = (brief: PageBrief) => buildResearchCopyRulesV2(brief, data).find(section => section.heading === 'FIELD JOBS')!.rules.join('\n');
  assert.match(fieldJobs(interview), /aboutPageBody: 3 or 4 sentences built from the owner facts \(see ABOUT FROM OWNER FACTS\)/);
  assert.doesNotMatch(fieldJobs(interview), /one scene in the second person/);
  assert.match(fieldJobs(plain), /one scene in the second person and present tense of the problem itself/, 'other briefs are unchanged');
  assert.match(INTERVIEW_WRITING_RULES.join('\n'), /pitch, storyHeadline, storyBody, aboutPageHeadline, aboutPageBody and every serviceDetails description/);
});
