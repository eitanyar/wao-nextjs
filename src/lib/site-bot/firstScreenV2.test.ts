/**
 * Site Bot step 2c, first-screen fact v2 (a)-(h) and the usedFactIds fix
 * (docs/missions/site-bot-step2-interview-preview-2026-11-25.md). Pure rules, the quote line's markup, the meta rule and
 * the rendered-fact list.
 * The Hebrew strings are the 2026-11-25 synthetic plumber's facts (step2cFactRules.test.ts), copied byte-exact as \u
 * escapes; every other Hebrew value is built from them or read from the waocopy module at runtime. Test-only letter runs
 * that are deliberately not words (gibberish) are escapes too.
 * HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  afterOpeningTimePhrase, cleanQuote, containsTimePhrase, FIRST_SCREEN_PRIORITY, FIRST_SCREEN_TIME_PHRASES, firstScreenCheck, firstScreenChecks,
  firstScreenMissingLine, isGibberish, ownerQuoteLine, quoteName, renderedFactIds, selectFirstScreen, withoutTrustBarFallback,
  type FirstScreenContext,
} from './firstScreenFact';
import type { InterviewFact, InterviewFactSet } from './interviewFacts';
import { ISRAELI_LOCALITIES } from './israeliLocalities';
import { SITE_BOT_OWNER_QUOTE_COPY as COPY } from './ownerQuoteCopy.generated';
import { homepageMetaDescription, ownerQuoteCss, ownerQuoteHtml, pageNameWithCity } from '../lp/researchedSite';
import { firstScreenRule, interviewWritingRules, INTERVIEW_WRITING_RULES } from '../lp/researchPageCopy';
import { firstScreenConstraint, INTERVIEW_WRITER_CONSTRAINTS } from './interviewGeneration';

const RAANANA = ISRAELI_LOCALITIES.find(item => item.slug === 'raanana')!.he_name;
// Synthetic plumber 2026-11-25: a1-1 (retyped local), a1-2 (refusal opening with a time phrase), a1-4 (local).
const LAST_WEEK_IN_KFAR_SABA = '\u05E9\u05D1\u05D5\u05E2 \u05E9\u05E2\u05D1\u05E8 \u05D1\u05DB\u05E4\u05E8 \u05E1\u05D1\u05D0';
const REFUSAL = '\u05DC\u05E4\u05E0\u05D9 \u05D7\u05D5\u05D3\u05E9 \u05DE\u05D9\u05E9\u05D4\u05D5 \u05E8\u05E6\u05D4 \u05E9\u05D0\u05D7\u05D1\u05E8 \u05DC\u05D5 \u05D0\u05EA \u05D4\u05DE\u05D8\u05D1\u05D7 \u05D4\u05D7\u05D3\u05E9 \u05D1\u05DC\u05D9 \u05D1\u05E8\u05D6 \u05E0\u05D9\u05EA\u05D5\u05E7';
const MOST_WORK_LOCAL = '\u05E8\u05D5\u05D1 \u05D4\u05E2\u05D1\u05D5\u05D3\u05D4 \u05E9\u05DC\u05D9 \u05D1\u05E8\u05E2\u05E0\u05E0\u05D4 \u05D5\u05D1\u05DB\u05E4\u05E8 \u05E1\u05D1\u05D0';
const REFUSAL_WORDS = REFUSAL.split(' ');
/** a1-2 after its opening time phrase (two words) is cut. */
const REFUSAL_CUT = REFUSAL_WORDS.slice(2).join(' ');
const MARK = '\u05F4';

function fact(id: string, type: InterviewFact['type'], quote: string, extra: Partial<InterviewFact> = {}): InterviewFact {
  const questionKey = type === 'refusal' ? 'turnedDown' : type === 'local' ? 'areaPattern' : 'recentJob';
  return { id, type, quote, status: 'confirmed', source: { kind: 'answer', questionKey, part: 'answer' }, ...extra };
}

const PLUMBER: InterviewFact[] = [
  fact('a1-1', 'local', LAST_WEEK_IN_KFAR_SABA, { source: { kind: 'answer', questionKey: 'recentJob', part: 'answer' } }),
  fact('a1-2', 'refusal', REFUSAL),
  fact('a1-4', 'local', MOST_WORK_LOCAL),
  { id: 'cred-years', type: 'credential', quote: '15', status: 'confirmed', source: { kind: 'credential', field: 'yearsInField' } },
];
const set = (facts: InterviewFact[]): InterviewFactSet => ({ version: 1, answersVersion: 1, extractedAt: '2026-11-25T00:00:00Z', extraction: 'model', facts });

function context(over: Partial<FirstScreenContext> = {}): FirstScreenContext {
  return {
    homeServiceIds: ['owner-service:a'], localities: ISRAELI_LOCALITIES, trustBarNumbers: ['15'], trustBarCredentialIds: ['cred-years'],
    answers: [
      { key: 'recentJob', part: 'answer', text: `${LAST_WEEK_IN_KFAR_SABA}, ${REFUSAL}` },
      { key: 'turnedDown', part: 'answer', text: `${REFUSAL}, ${MOST_WORK_LOCAL}.` },
      { key: 'areaPattern', part: 'answer', text: MOST_WORK_LOCAL },
    ],
    ...over,
  };
}
const credentialItems = [{ factId: 'cred-years', item: '15 years' }];

test('synthetic plumber: a1-2 in the refusal frame after its opening time phrase is cut; a1-1, a1-4 and cred-years rejected', () => {
  const outcome = selectFirstScreen(set(PLUMBER), context(), { copy: COPY, credentialItems });
  assert.equal(outcome.firstScreenFactId, 'a1-2');
  assert.equal(outcome.source, 'quote_line');
  assert.equal(outcome.missing, false);
  assert.deepEqual(outcome.quoteLine, { frame: COPY.QUOTE_FRAME_REFUSAL.replace('{name}', COPY.QUOTE_NAME_FALLBACK), quote: REFUSAL_CUT });
  assert.deepEqual(outcome.candidates, [
    { id: 'a1-2', type: 'refusal', reason: null },
    { id: 'cred-years', type: 'credential', reason: 'trust_bar_duplicate' },
    { id: 'a1-1', type: 'local', reason: 'local_not_first_screen' },
    { id: 'a1-4', type: 'local', reason: 'local_not_first_screen' },
  ]);
  // As a job (its extraction type before C3 retyping), a1-1 is still never eligible.
  assert.equal(firstScreenCheck(fact('a1-1', 'job', LAST_WEEK_IN_KFAR_SABA), context()).reason, 'job_without_work');
});

test('(b) frames and the name: his first name when all Hebrew letters and 2-15 long, else the waocopy fallback', () => {
  assert.equal(quoteName(`${RAANANA} Cohen`, COPY), RAANANA);
  assert.equal(quoteName('Yossi', COPY), COPY.QUOTE_NAME_FALLBACK);
  assert.equal(quoteName(`${RAANANA}'`, COPY), COPY.QUOTE_NAME_FALLBACK, 'a geresh is not a letter');
  assert.equal(quoteName(RAANANA.repeat(4), COPY), COPY.QUOTE_NAME_FALLBACK, 'over 15');
  assert.equal(quoteName(RAANANA[0], COPY), COPY.QUOTE_NAME_FALLBACK, 'one letter');
  assert.equal(quoteName(undefined, COPY), COPY.QUOTE_NAME_FALLBACK);
  const frames = {
    refusal: COPY.QUOTE_FRAME_REFUSAL, job: COPY.QUOTE_FRAME_JOB, tool: COPY.QUOTE_FRAME_JOB, number: COPY.QUOTE_FRAME_NUMBER,
    credential: COPY.QUOTE_FRAME_CREDENTIAL, price_rule: COPY.QUOTE_FRAME_PRICE_RULE,
  } as const;
  for (const [type, frame] of Object.entries(frames)) {
    assert.deepEqual(ownerQuoteLine(type as InterviewFact['type'], 'q', RAANANA, COPY), { frame: frame.replace('{name}', RAANANA), quote: 'q' }, type);
  }
  assert.equal(ownerQuoteLine('local', 'q', RAANANA, COPY), null);
  const named = selectFirstScreen(set(PLUMBER), context(), { ownerName: RAANANA, copy: COPY, credentialItems });
  assert.equal(named.quoteLine?.frame, COPY.QUOTE_FRAME_REFUSAL.replace('{name}', RAANANA));
});

test('(c1)-(c2) status, his exact words, and the cleanup that never changes a word', () => {
  const ctx = context();
  assert.equal(firstScreenCheck({ ...fact('p', 'refusal', REFUSAL), status: 'pending' }, ctx).reason, 'status_pending');
  assert.equal(firstScreenCheck({ ...fact('r', 'refusal', REFUSAL), status: 'removed' }, ctx).reason, 'status_removed');
  // Edited: his ownerText is the text (no answer needed).
  const edited = firstScreenCheck({ ...fact('e', 'refusal', 'x'), status: 'edited', ownerText: ` ${REFUSAL_CUT}.` }, context({ answers: [] }));
  assert.deepEqual([edited.reason, edited.quote], [null, REFUSAL_CUT]);
  // Not in his answer, or no answers at all: never eligible.
  assert.equal(firstScreenCheck(fact('n', 'refusal', REFUSAL), context({ answers: [{ key: 'turnedDown', part: 'answer', text: MOST_WORK_LOCAL }] })).reason, 'not_in_answer');
  assert.equal(firstScreenCheck(fact('n', 'refusal', REFUSAL), context({ answers: null })).reason, 'answer_unavailable');
  // Cleanup: whitespace, trailing marks and ASCII quotes only.
  assert.equal(cleanQuote(`  ${REFUSAL_WORDS[2]}  "${REFUSAL_WORDS[3]}" ${REFUSAL_WORDS[4]}!?. `), `${REFUSAL_WORDS[2]} ${REFUSAL_WORDS[3]} ${REFUSAL_WORDS[4]}`);
  const messy = `${REFUSAL_WORDS.slice(2, 6).join('  ')} "${REFUSAL_WORDS[6]}";`;
  const cleaned = firstScreenCheck(fact('m', 'refusal', messy), context({ answers: [{ key: 'turnedDown', part: 'answer', text: messy }] }));
  assert.deepEqual([cleaned.reason, cleaned.quote], [null, REFUSAL_WORDS.slice(2, 7).join(' ')]);
});

test('(c3) the closed time list: an opening phrase is cut (then every check re-runs), anywhere else rejects', () => {
  assert.equal(FIRST_SCREEN_TIME_PHRASES.length, 13);
  assert.equal(afterOpeningTimePhrase(REFUSAL), REFUSAL_CUT);
  assert.equal(afterOpeningTimePhrase(`${REFUSAL_WORDS[0]} ${REFUSAL_WORDS[1]}, ${REFUSAL_CUT}`), REFUSAL_CUT, 'and a following comma');
  assert.equal(afterOpeningTimePhrase(REFUSAL_CUT), null);
  for (const phrase of FIRST_SCREEN_TIME_PHRASES) assert.ok(containsTimePhrase(`${REFUSAL_CUT} ${phrase}`), phrase);
  // A one-letter prefix (bet) on the phrase's first word is the same phrase.
  assert.ok(containsTimePhrase(`${REFUSAL_CUT} \u05D1${FIRST_SCREEN_TIME_PHRASES[4]}`));
  const middle = `${REFUSAL_WORDS.slice(2, 5).join(' ')} ${FIRST_SCREEN_TIME_PHRASES[6]} ${REFUSAL_WORDS.slice(5).join(' ')}`;
  assert.equal(firstScreenCheck(fact('t', 'refusal', middle), context({ answers: [{ key: 'turnedDown', part: 'answer', text: middle }] })).reason, 'time_word');
  // a1-1: cut "last week", left with a place only: too short (as a refusal, to pass the type gate).
  assert.equal(firstScreenCheck(fact('a', 'refusal', LAST_WEEK_IN_KFAR_SABA), context({ answers: [{ key: 'turnedDown', part: 'answer', text: LAST_WEEK_IN_KFAR_SABA }] })).reason, 'too_short');
  // The cut text is re-checked: a second opening phrase is cut too.
  const twice = `${FIRST_SCREEN_TIME_PHRASES[6]} ${REFUSAL}`;
  assert.equal(firstScreenCheck(fact('b', 'refusal', twice), context({ answers: [{ key: 'turnedDown', part: 'answer', text: twice }] })).quote, REFUSAL_CUT);
});

test('(c4)-(c7) length, script, gibberish and condition; never cut to fit', () => {
  const check = (text: string, extra: Partial<InterviewFact> = {}) => firstScreenCheck(fact('x', 'refusal', text, extra), context({ answers: [{ key: 'turnedDown', part: 'answer', text }] })).reason;
  assert.equal(check(REFUSAL_WORDS.slice(2, 5).join(' ')), 'too_short', '3 words');
  assert.equal(check(REFUSAL_WORDS.slice(2, 6).join(' ')), null, '4 words');
  assert.equal(check([...REFUSAL_WORDS.slice(2), ...REFUSAL_WORDS.slice(2, 6)].join(' ')), 'too_long', '13 words');
  const longWords = Array.from({ length: 7 }, () => REFUSAL_WORDS[6] + REFUSAL_WORDS[4] + REFUSAL_WORDS[11]).join(' ');
  assert.ok(longWords.length > 80);
  assert.equal(check(longWords), 'too_long', 'over 80 characters');
  assert.equal(check(`${REFUSAL_CUT} Grohe`), 'latin');
  assert.equal(check(`${REFUSAL_WORDS.slice(2, 6).join(' ')} 150\u20AA`), 'shekel_sign');
  assert.equal(check(`${REFUSAL_WORDS.slice(2, 6).join(' ')} 0521234567`), 'digits_7');
  assert.equal(check(`${REFUSAL_WORDS.slice(2, 6).join(' ')} 052-123`), null, 'digit groups under 7 are fine');
  assert.equal(check(`${REFUSAL_WORDS.slice(2, 6).join(' ')} @`), 'url');
  // Cyrillic letters push the Hebrew share under 85%.
  assert.equal(check(`${REFUSAL_WORDS.slice(2, 5).join(' ')} \u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043A\u043B`), 'hebrew_ratio');
  // Gibberish: a letter three times in a row; a vowel-less token with a final form mid-word (English on a Hebrew keyboard).
  assert.equal(check(`${REFUSAL_WORDS.slice(2, 5).join(' ')} \u05D1\u05D1\u05D1\u05E8`), 'gibberish');
  assert.equal(check(`${REFUSAL_WORDS.slice(2, 5).join(' ')} \u05D3\u05DD\u05D2`), 'gibberish');
  assert.equal(isGibberish(REFUSAL), false, 'real words without vowel letters stay (kitchen, tap)');
  // Yonatan 2026-11-25 (c6): no vowel-letter condition. English on a Hebrew keyboard with vowel letters is still caught.
  assert.equal(isGibberish('\u05D9\u05E7\u05DA\u05DA\u05DD'), true);
  assert.equal(isGibberish('\u05E4\u05DA\u05D5\u05E6\u05E0\u05DF\u05DE\u05E2'), true, 'a vowel letter no longer saves a mid-word final form');
  assert.equal(isGibberish('\u05E2\u05DD\u05DD\u05D2'), true);
  // Real 4-6 word plumber answers stay: kitchen + tap (the fixture's own words), and one with a gershayim abbreviation
  // (the VAT abbreviation, byte-exact from research/priceLexiconData.ts).
  const kitchenTap = REFUSAL_WORDS.slice(7, 12).join(' ');
  assert.equal(kitchenTap.split(' ').length, 5);
  assert.equal(isGibberish(kitchenTap), false);
  assert.equal(isGibberish(`${REFUSAL_WORDS.slice(8, 12).join(' ')} \u05DE\u05E2\u05F4\u05DE`), false);
  // A condition counts only inside the quote.
  assert.equal(check(REFUSAL_CUT, { condition: REFUSAL_WORDS.slice(9, 11).join(' ') }), null);
  assert.equal(check(REFUSAL_CUT, { condition: REFUSAL_WORDS.slice(0, 2).join(' ') }), 'condition_outside');
});

test('(c8) and (d): trust-bar duplicates, the type gate, priority refusal > job > tool > number > credential > price_rule, ties by answer order', () => {
  assert.deepEqual(FIRST_SCREEN_PRIORITY, ['refusal', 'job', 'tool', 'number', 'credential', 'price_rule']);
  const text = REFUSAL_CUT;
  const answers = [
    { key: 'recentJob' as const, part: 'answer' as const, text },
    { key: 'recentJob' as const, part: 'followUp' as const, text },
    { key: 'turnedDown' as const, part: 'answer' as const, text },
    { key: 'callerQuestion' as const, part: 'answer' as const, text: `${text} 40` },
  ];
  const ctx = context({ answers, trustBarNumbers: ['15', '40'] });
  const facts: InterviewFact[] = [
    { id: 'p1', type: 'price_rule', quote: text, status: 'confirmed', source: { kind: 'price_chip', chip: 'afterVisit' } },
    { id: 'p2', type: 'price_rule', quote: `${text} 150`, status: 'confirmed', source: { kind: 'price_chip', chip: 'afterVisit' } },
    { id: 'c1', type: 'credential', quote: text, status: 'confirmed', source: { kind: 'credential', field: 'license' } },
    fact('n1', 'number', `${text} 40`, { source: { kind: 'answer', questionKey: 'callerQuestion', part: 'answer' } }),
    fact('t1', 'tool', text),
    fact('j2', 'job', text, { source: { kind: 'answer', questionKey: 'recentJob', part: 'followUp' } }),
    fact('j1', 'job', text),
    fact('j3', 'job', text, { serviceId: 'owner-service:other' }),
    fact('r1', 'refusal', text),
    fact('l1', 'local', text),
  ];
  const checks = firstScreenChecks(set(facts), ctx);
  assert.deepEqual(checks.map(item => item.id), ['r1', 'j1', 'j3', 'j2', 't1', 'n1', 'c1', 'p1', 'p2', 'l1']);
  const reasons = Object.fromEntries(checks.map(item => [item.id, item.reason]));
  assert.deepEqual(reasons, {
    r1: null, j1: null, j2: null, j3: 'job_other_service', t1: null, n1: 'trust_bar_duplicate', c1: null, p1: null, p2: 'price_rule_money', l1: 'local_not_first_screen',
  });
  const pick = (ids: string[]) => selectFirstScreen(set(facts.filter(item => ids.includes(item.id))), ctx, { copy: COPY, credentialItems: [] });
  assert.equal(pick(['r1', 'j1', 't1', 'c1', 'p1']).firstScreenFactId, 'r1');
  assert.equal(pick(['j2', 'j1', 't1']).firstScreenFactId, 'j1', 'answer before follow-up');
  assert.equal(pick(['t1', 'c1', 'p1']).firstScreenFactId, 't1');
  assert.equal(pick(['t1', 'c1', 'p1']).quoteLine?.frame, COPY.QUOTE_FRAME_JOB.replace('{name}', COPY.QUOTE_NAME_FALLBACK), 'a tool takes the job frame');
  assert.equal(pick(['c1', 'p1']).firstScreenFactId, 'c1');
  assert.equal(pick(['p1']).quoteLine?.frame, COPY.QUOTE_FRAME_PRICE_RULE.replace('{name}', COPY.QUOTE_NAME_FALLBACK));
  // A number the trust bar does not show is eligible (with its own digits) in the number frame.
  const number = selectFirstScreen(set([fact('n2', 'number', `${text} 40`, { source: { kind: 'answer', questionKey: 'callerQuestion', part: 'answer' } })]), context({ answers }), { copy: COPY, credentialItems: [] });
  assert.deepEqual([number.firstScreenFactId, number.quoteLine?.quote], ['n2', `${text} 40`]);
  assert.equal(firstScreenCheck(fact('n3', 'number', text), ctx).reason, 'number_without_digits');
});

test('(e) no quote line: a shown credential satisfies the rule (trust_bar); else missing, logged with every candidate and reason', () => {
  const onlyLocals = set([PLUMBER[0], PLUMBER[2], PLUMBER[3]]);
  const viaBar = selectFirstScreen(onlyLocals, context(), { copy: COPY, credentialItems });
  assert.deepEqual([viaBar.firstScreenFactId, viaBar.source, viaBar.quoteLine, viaBar.missing], ['cred-years', 'trust_bar', null, false]);
  const notRendered = withoutTrustBarFallback(viaBar);
  assert.deepEqual([notRendered.firstScreenFactId, notRendered.source, notRendered.missing], [null, null, true]);
  const removed = set([PLUMBER[0], PLUMBER[2], { ...PLUMBER[3], status: 'removed' }]);
  const missing = selectFirstScreen(removed, context(), { copy: COPY, credentialItems });
  assert.equal(missing.missing, true);
  assert.equal(firstScreenMissingLine('s-1', 1, missing),
    '[site-bot preview] first_screen_fact_missing session=s-1 round=1 candidates=cred-years:status_removed,a1-1:local_not_first_screen,a1-4:local_not_first_screen');
  assert.equal(firstScreenMissingLine('s-1', 2, selectFirstScreen(set([]), context(), { copy: COPY, credentialItems: [] })),
    '[site-bot preview] first_screen_fact_missing session=s-1 round=2 candidates=none');
});

test('(b, g, h) the quote line markup: figure + figcaption + blockquote, U+05F4 marks, named by its frame, no microdata; empty without a line', () => {
  const line = { frame: COPY.QUOTE_FRAME_REFUSAL.replace('{name}', COPY.QUOTE_NAME_FALLBACK), quote: REFUSAL_CUT };
  const html = ownerQuoteHtml(line);
  // Maya / Noa 2026-11-26: aria-labelledby the visible frame (no aria-label, so the fallback name is heard once).
  assert.equal(html, `<figure class="owner-quote" data-section="owner-quote" aria-labelledby="owner-quote-frame"><figcaption id="owner-quote-frame">${line.frame}</figcaption>\u00A0<blockquote><p>${MARK}${REFUSAL_CUT}${MARK}</p></blockquote></figure>`);
  assert.doesNotMatch(html, /aria-label=/);
  assert.ok(!html.includes(COPY.OWNER_QUOTE_ARIA_LABEL));
  assert.doesNotMatch(html, /itemprop|itemscope|rating|\u2605|["\u00AB\u00BB\u201C\u201D](?![^<]*>)/u);
  assert.doesNotMatch(html, /\sdir=/, 'inherits rtl');
  assert.equal(ownerQuoteHtml(undefined), '');
  assert.equal(ownerQuoteHtml({ ...line, frame: ' ' }), '');
  assert.match(ownerQuoteCss(), /figcaption\{display:inline;white-space:nowrap;/);
  // Maya 2026-11-26: contrast over the hero photo.
  assert.ok(ownerQuoteCss().includes('.hero .owner-quote{margin:14px 0 0;max-width:46ch;color:#FFFFFF;font-size:1rem;line-height:1.6;text-shadow:0 1px 3px rgba(0,0,0,0.35);}'));
});

test('(h) Maya 2026-11-26: number ranges and phone-like numbers in the quote are ltr isolates that never wrap; brackets never', () => {
  const words = REFUSAL_WORDS.slice(2, 6).join(' ');
  const iso = (run: string) => `<bdi dir="ltr" style="white-space:nowrap">${run}</bdi>`;
  const html = ownerQuoteHtml({ frame: COPY.QUOTE_NAME_FALLBACK, quote: `${words} 2\u20133 (08:00-18:00) 03-555-0123 1.5-2,5` });
  assert.ok(html.includes(` ${iso('2\u20133')} (${iso('08:00-18:00')}) ${iso('03-555-0123')} ${iso('1.5-2,5')}${MARK}`), html);
  assert.doesNotMatch(html, /<bdi dir="ltr"[^>]*>\(/, 'a bracket is never inside an isolate');
  assert.equal((ownerQuoteHtml({ frame: COPY.QUOTE_NAME_FALLBACK, quote: `${words} 12` }).match(/<bdi/g) ?? []).length, 0, 'a lone number stays in the flow');
});

test('(f) the homepage meta description never includes the quote line', () => {
  const sub = 'A free third-person USP sentence';
  assert.equal(homepageMetaDescription('plumber', RAANANA, sub), `${pageNameWithCity('plumber', RAANANA)} \u2014 ${sub}`);
  assert.ok(!homepageMetaDescription('plumber', RAANANA, sub).includes(REFUSAL_CUT));
});

test('(a) prompt: the free-USP subheadline rule and Noa\'s two writing upgrades reach interview briefs only', () => {
  const home = { page: { pageClass: 'homepage' as const }, constraints: [firstScreenConstraint(), ...INTERVIEW_WRITER_CONSTRAINTS] };
  const rule = firstScreenRule(home as never) ?? '';
  assert.match(rule, /free USP sentence written in the same grammatical person as heroHeadline: the third person about the business, with no first-person and no second-person forms/);
  assert.match(rule, /At most 90 characters, one sentence built on a verb/);
  assert.match(rule, /Never name the page's service together with the city in heroSubheadline/);
  assert.match(rule, /Never quote or paraphrase an owner fact/);
  // 2026-11-26: the override names every first-person instruction, and no method beyond the verified services.
  assert.match(rule, /overrides every first-person instruction: the owner-voice rule, the pitch and the subject-pronoun pattern A/);
  assert.match(rule, /Never add a first-person subject pronoun to it/);
  assert.match(rule, /Never name a specific method, technique, tool or part of the work in heroSubheadline unless it is one of the owner's verified services\.$/);
  const labelled = firstScreenRule({ ...home, site: { serviceLabels: ['leak detection'] } } as never) ?? '';
  assert.ok(labelled.endsWith('verified services: ["leak detection"].'));
  assert.equal(INTERVIEW_WRITING_RULES.length, 8);
  for (const [index, head] of ['ONE SCENE (binding)', 'NO INVENTED METHOD (binding)', 'NO UNVERIFIABLE SENSATIONS (binding)', 'SIBLING CARDS', 'BODY WORDS', 'PLAIN VERBS'].entries()) {
    assert.ok(INTERVIEW_WRITING_RULES[index + 2].startsWith(`- ${head}: `), head);
  }
  assert.doesNotMatch(INTERVIEW_WRITING_RULES.join('\n'), /[\u0590-\u05FF]/, 'English only');
  assert.doesNotMatch(firstScreenConstraint().value, /interview-/, 'the constraint names no fact: the writer never picks it');
  assert.deepEqual(interviewWritingRules(home as never), [...INTERVIEW_WRITING_RULES]);
  assert.ok(INTERVIEW_WRITING_RULES[0].includes('Keep one grammatical person across the H1 and the subheadline. Never put first-person owner words inside a sentence written in the page\'s voice. Quotes stay allowed only when presented as quotes.'));
  assert.ok(INTERVIEW_WRITING_RULES[1].includes('Don\'t join a fact to a claim with \'when\', \'because\', \'just like\' or \'so\' unless the fact itself states that relationship. If you can\'t join them honestly, keep them in separate sentences.'));
  assert.deepEqual(interviewWritingRules({ constraints: [] } as never), []);
  assert.equal(firstScreenRule({ page: { pageClass: 'money_service' }, constraints: home.constraints } as never), null);
});

test('usedFactIds: only facts that truly appear in the rendered output (the quote line, a shown credential, a verbatim fact)', () => {
  const usable = [
    { id: 'a1-1', type: 'local' as const, text: LAST_WEEK_IN_KFAR_SABA },
    { id: 'a1-2', type: 'refusal' as const, text: REFUSAL },
    { id: 'a1-4', type: 'local' as const, text: MOST_WORK_LOCAL },
    { id: 'cred-years', type: 'credential' as const, text: '15' },
  ];
  const outcome = { firstScreenFactId: 'a1-2', source: 'quote_line' as const };
  // The 2026-11-25 bug: a1-1 was listed because the brief carried it; the output never showed it.
  assert.deepEqual(renderedFactIds(usable, `hero ${REFUSAL_CUT} about text`, outcome, []), ['a1-2']);
  assert.deepEqual(renderedFactIds(usable, `x ${MOST_WORK_LOCAL}  y`, outcome, ['cred-years']), ['a1-2', 'a1-4', 'cred-years']);
  assert.deepEqual(renderedFactIds(usable, 'nothing', { firstScreenFactId: null, source: null }, []), []);
});
