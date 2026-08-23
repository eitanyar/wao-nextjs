import test from 'node:test';
import assert from 'node:assert/strict';
import { checkNearDuplicates, trigramJaccardSimilarity } from './duplicateCheck';
import type { DuplicateCheckPage } from './duplicateCheck';

function page(overrides: Partial<DuplicateCheckPage> & { id: string }): DuplicateCheckPage {
  return {
    narrative: 'default narrative text long enough to trigram',
    faqItems: [{ q: 'default question', a: 'default answer' }],
    metaDescription: 'default meta description text',
    ...overrides,
  };
}

test('empty array -> []', () => {
  assert.deepEqual(checkNearDuplicates([]), []);
});

test('single-page array -> []', () => {
  assert.deepEqual(checkNearDuplicates([page({ id: 'a' })]), []);
});

test('identical narrative text -> one finding, field narrative, score >= 0.99', () => {
  const narrative =
    'אנחנו מספקים שירותי אינסטלציה מעולים לכל בית ועסק עם צוות מקצועי וזמין לאורך כל היום';
  const pages = [
    page({ id: 'a', narrative }),
    page({ id: 'b', narrative }),
  ];
  const findings = checkNearDuplicates(pages);
  const narrativeFindings = findings.filter((f) => f.field === 'narrative');
  assert.equal(narrativeFindings.length, 1);
  assert.ok(narrativeFindings[0].score >= 0.99, `expected score >= 0.99, got ${narrativeFindings[0].score}`);
});

test('completely unrelated narrative text -> no finding for that field', () => {
  const pages = [
    page({
      id: 'a',
      narrative: 'אנחנו מספקים שירותי אינסטלציה מעולים לכל בית ועסק עם צוות מקצועי וזמין',
    }),
    page({
      id: 'b',
      narrative: 'המסעדה שלנו מגישה מנות איטלקיות טריות עם יין משובח בכל ערב בשבוע',
    }),
  ];
  const findings = checkNearDuplicates(pages);
  assert.equal(findings.filter((f) => f.field === 'narrative').length, 0);
});

test('city-swap doorway-page pattern -> flagged as narrative finding above threshold', () => {
  const narrativeA = 'אנחנו מספקים שירותי אינסטלציה מעולים בתל אביב עם צוות מקצועי וזמין לאורך כל היום';
  const narrativeB = 'אנחנו מספקים שירותי אינסטלציה מעולים בחיפה עם צוות מקצועי וזמין לאורך כל היום';

  const score = trigramJaccardSimilarity(narrativeA, narrativeB);
  assert.ok(score >= 0.6, `expected city-swap score >= 0.6 threshold, got ${score}`);

  const pages = [page({ id: 'a', narrative: narrativeA }), page({ id: 'b', narrative: narrativeB })];
  const findings = checkNearDuplicates(pages);
  const narrativeFindings = findings.filter((f) => f.field === 'narrative');
  assert.equal(narrativeFindings.length, 1);
  assert.equal(narrativeFindings[0].aId, 'a');
  assert.equal(narrativeFindings[0].bId, 'b');
});

test('faqItems near-duplicate triggers its own finding type, independent of narrative', () => {
  const faqItems = [
    { q: 'כמה זמן לוקח הטיפול?', a: 'בדרך כלל בין שעה לשעתיים בהתאם למורכבות' },
    { q: 'האם יש אחריות?', a: 'כן, אנחנו נותנים אחריות מלאה על כל עבודה' },
  ];
  const pages = [
    page({
      id: 'a',
      narrative: 'טקסט נרטיב ראשון שלא דומה בכלל לטקסט השני מבחינת תוכן ונושא',
      faqItems,
    }),
    page({
      id: 'b',
      narrative: 'משהו שונה לחלוטין על נושא אחר עם מילים אחרות ומבנה שונה לגמרי',
      faqItems,
    }),
  ];
  const findings = checkNearDuplicates(pages);
  assert.equal(findings.filter((f) => f.field === 'narrative').length, 0);
  const faqFindings = findings.filter((f) => f.field === 'faq');
  assert.equal(faqFindings.length, 1);
  assert.ok(faqFindings[0].score >= 0.99);
});

test('metaDescription near-duplicate triggers its own finding type, independent of narrative/faq', () => {
  const metaDescription = 'שירותי אינסטלציה מקצועיים ואמינים לכל בית ועסק, זמינות מיידית';
  const pages = [
    page({
      id: 'a',
      narrative: 'טקסט נרטיב ראשון שלא דומה בכלל לטקסט השני מבחינת תוכן ונושא',
      faqItems: [{ q: 'שאלה א', a: 'תשובה א' }],
      metaDescription,
    }),
    page({
      id: 'b',
      narrative: 'משהו שונה לחלוטין על נושא אחר עם מילים אחרות ומבנה שונה לגמרי',
      faqItems: [{ q: 'שאלה שונה לגמרי', a: 'תשובה שונה לגמרי ובלתי קשורה' }],
      metaDescription,
    }),
  ];
  const findings = checkNearDuplicates(pages);
  assert.equal(findings.filter((f) => f.field === 'narrative').length, 0);
  assert.equal(findings.filter((f) => f.field === 'faq').length, 0);
  const metaFindings = findings.filter((f) => f.field === 'metaDescription');
  assert.equal(metaFindings.length, 1);
  assert.ok(metaFindings[0].score >= 0.99);
});

test('3-page input: only pages 0 and 2 near-duplicate -> exactly one finding with correct pair', () => {
  const sharedNarrative =
    'אנחנו מספקים שירותי אינסטלציה מעולים בתל אביב עם צוות מקצועי וזמין לאורך כל היום';
  const pages = [
    page({ id: 'p0', narrative: sharedNarrative }),
    page({ id: 'p1', narrative: 'המסעדה שלנו מגישה מנות איטלקיות טריות עם יין משובח בכל ערב בשבוע' }),
    page({ id: 'p2', narrative: sharedNarrative }),
  ];
  const findings = checkNearDuplicates(pages);
  const narrativeFindings = findings.filter((f) => f.field === 'narrative');
  assert.equal(narrativeFindings.length, 1);
  assert.equal(narrativeFindings[0].aId, 'p0');
  assert.equal(narrativeFindings[0].bId, 'p2');
});

test('findings sorted descending by score when multiple findings exist', () => {
  const narrativeShared =
    'אנחנו מספקים שירותי אינסטלציה מעולים לכל בית ועסק עם צוות מקצועי וזמין לאורך כל היום';
  const pages = [
    page({
      id: 'a',
      narrative: narrativeShared,
      metaDescription: 'שירותי אינסטלציה מקצועיים ואמינים לכל בית ועסק, זמינות מיידית',
    }),
    page({
      id: 'b',
      narrative: narrativeShared,
      // slightly different meta so its similarity score is lower than the identical narrative
      metaDescription: 'שירותי חשמל מקצועיים ואמינים לכל בית ועסק, זמינות בשעות היום',
    }),
  ];
  const findings = checkNearDuplicates(pages, { threshold: 0.3 });
  assert.ok(findings.length >= 2, `expected at least 2 findings, got ${findings.length}`);
  for (let i = 1; i < findings.length; i++) {
    assert.ok(findings[i - 1].score >= findings[i].score, 'findings not sorted descending by score');
  }
});

test('trigramJaccardSimilarity: string under 3 chars normalized -> 0, no divide-by-zero', () => {
  assert.equal(trigramJaccardSimilarity('אב', 'אב'), 0);
  assert.equal(trigramJaccardSimilarity('', ''), 0);
  assert.equal(trigramJaccardSimilarity('ab', 'abcdef'), 0);
});

test('threshold is configurable via opts', () => {
  const narrativeA = 'אנחנו מספקים שירותי אינסטלציה מעולים בתל אביב עם צוות מקצועי וזמין לאורך כל היום';
  const narrativeB = 'אנחנו מספקים שירותי אינסטלציה מעולים בחיפה עם צוות מקצועי וזמין לאורך כל היום';
  const pages = [page({ id: 'a', narrative: narrativeA }), page({ id: 'b', narrative: narrativeB })];

  const strictFindings = checkNearDuplicates(pages, { threshold: 0.999 });
  assert.equal(strictFindings.filter((f) => f.field === 'narrative').length, 0);

  const looseFindings = checkNearDuplicates(pages, { threshold: 0.1 });
  assert.equal(looseFindings.filter((f) => f.field === 'narrative').length, 1);
});
