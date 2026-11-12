// Site Bot launch step 2 ("site truth"): B3 price table per service, B4 staff-checked licence / free-text warranty claims,
// capability 9 the visible Google-profile link. HEBREW-SAFETY: this file contains ZERO Hebrew bytes; every Hebrew string is
// read at runtime from the live templates and labels.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { CollectedData } from '../bot/prompts';
import type { SiteCopy } from './lpCopyPrompt';
import { renderResearchedSitePages, researchedProfileLink, type ProfileLinkCopy, type ResearchedSitePage } from './researchedSite';
import { HE_TODO_PREFIX, RESEARCHED_PROFILE_LINK_LABELS, RESEARCHED_PROFILE_LINK_LABELS_PENDING_COPY, RESEARCHED_SITE_LABELS } from './researchedSiteLabels';
import { VERTICAL_ASSETS } from './verticalAssets';
import { VERTICAL_THEMES } from './verticalThemes';
import { formatShekels } from './researchedPricing';
import { OWNER_FACT_TEMPLATES, ownerFacts, proofText, trustText } from './ownerFactCopy';
import {
  claimsNeedingCheck, isStaffClaimCheck, parseClaimVerification, researchedClaimBlockers, unverifiedClaims, UnverifiedClaimError, warrantyFromFixedChip,
} from './claimVerification';
import { WARRANTY_PICKER_VALUES } from '../site-bot/credentialsCopy';

const T = OWNER_FACT_TEMPLATES;
const HE_CITY = RESEARCHED_SITE_LABELS.serviceAreasHeading;

const baseCopy = (headline: string): SiteCopy => ({
  heroHeadline: headline, heroSubheadline: `${headline} sub`, heroCta: 'Call', trustBarItems: [], aboutBlurb: '',
  servicesHeadline: 'Services', serviceItems: [], faqHeadline: '', faqItems: [], guaranteeBlock: null,
  reviewFeatured: null, reviewContext: null, responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: '',
  aboutPageHeadline: 'About page', aboutPageBody: 'I work alone. I clean up after every job.', serviceDetails: [],
});
const seo = (name: string) => ({ name, city: HE_CITY, serviceArea: [HE_CITY] });

function render(pages: ResearchedSitePage[], data: CollectedData, extra: Record<string, unknown> = {}) {
  return renderResearchedSitePages({
    theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], data, heroImageUrl: 'https://example.test/hero.jpg',
    slug: 'truth-test', siteUrl: 'https://truth.wao.co.il', pages, graphEdges: pages.slice(1).map(item => ({ fromId: 'home', toId: item.opportunityId })),
    ...extra,
  });
}

// ---- B3: a service page shows only its own price; a page with no own price has no table. ----

test('B3: two service pages each show only their own starting price; a third service with no price renders no table', () => {
  const data: CollectedData = {
    businessName: 'TEST Biz', businessNiche: 'plumber', phone: '050-0000000', primaryService: 'leak repair', secondaryServices: 'heater install, drain',
    startingPrices: [{ job: 'leak repair', from: 350 }, { job: 'heater install', from: 2400 }],
  };
  const pages: ResearchedSitePage[] = [
    { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: baseCopy('plumber'), seo: seo('plumber') },
    { opportunityId: 'svc-leak', classification: 'money_service', targetPath: '/services/leak-repair', copy: baseCopy('leak repair'), seo: seo('leak repair') },
    { opportunityId: 'svc-heater', classification: 'money_service', targetPath: '/services/heater-install', copy: baseCopy('heater install'), seo: seo('heater install') },
    { opportunityId: 'svc-drain', classification: 'money_service', targetPath: '/services/drain', copy: baseCopy('drain'), seo: seo('drain') },
  ];
  const files = render(pages, data);
  const table = (file: string) => files[file].match(/<table[\s\S]*?<\/table>/)?.[0] ?? '';
  assert.ok(table('services/leak-repair.html').includes(formatShekels(350)) && !table('services/leak-repair.html').includes(formatShekels(2400)));
  assert.ok(table('services/heater-install.html').includes(formatShekels(2400)) && !table('services/heater-install.html').includes(formatShekels(350)));
  assert.equal(table('services/drain.html'), '', 'no own price: no table');
  for (const amount of [350, 2400]) assert.ok(!files['services/drain.html'].includes(formatShekels(amount)), 'another service price never shows');
  assert.ok(!files['index.html'].includes('data-section="prices"'), 'never on the homepage');
});

// ---- B4: licence and free-text warranty claims render only with a staff check. ----

const claimData: CollectedData = {
  businessName: 'TEST Biz', businessNiche: 'electrician', phone: '050-0000000', yearsInField: '12', license: 'No. 4821', guarantee: '3 years',
};
const facts = ownerFacts(claimData, { firstPartyProof: [] }, T);
const licenceChip = trustText(facts.license!, T)!;
const licenceProof = proofText(facts.license!, T)!;
const warrantyChip = trustText(facts.warranty!, T)!;
const warrantyProof = proofText(facts.warranty!, T)!;
const yearsChip = trustText(facts.years!, T)!;
const yearsProof = proofText(facts.years!, T)!;

function claimPages(): ResearchedSitePage[] {
  const home = baseCopy('electrician');
  home.trustBarItems = [yearsChip, licenceChip, warrantyChip];
  home.aboutPageBody = `I work alone. ${licenceProof} I clean up after every job.`;
  home.faqItems = [{ q: 'Do you have a licence?', a: licenceProof }, { q: 'Do you clean up?', a: 'Yes, every time.' }];
  const service = baseCopy('panel upgrade');
  service.trustBarItems = [yearsChip, licenceChip, warrantyChip];
  service.proofItems = [{ text: yearsProof, factIds: ['proof-yearsInField'] }, { text: licenceProof, factIds: ['proof-license'] }, { text: warrantyProof, factIds: ['proof-guarantee'] }];
  service.qaItems = [{ questionId: 'q1', q: 'Licence number?', a: 'Licence 4821.', factIds: [] }, { questionId: 'q2', q: 'How long does it take?', a: 'About two hours.', factIds: [] }];
  return [
    { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: home, seo: seo('electrician'), brief: { faqPolicy: 'optional', faqCandidates: home.faqItems.map(item => ({ question: item.q, answer: item.a })) as never } },
    { opportunityId: 'svc-panel', classification: 'money_service', targetPath: '/services/panel-upgrade', copy: service, seo: seo('panel upgrade') },
  ];
}

test('B4: which claims need a check (any licence answer; a warranty unless a fixed chip), and the check record is strict', () => {
  assert.deepEqual(claimsNeedingCheck(claimData), ['licence', 'warranty']);
  for (const chip of Object.values(WARRANTY_PICKER_VALUES)) {
    assert.equal(warrantyFromFixedChip(chip), true);
    assert.deepEqual(claimsNeedingCheck({ guarantee: chip }), [], `${chip}: the owner picked a fixed chip`);
  }
  assert.deepEqual(claimsNeedingCheck({ license: 'registered contractor' }), ['licence'], 'a registered contractor is a licence claim too');
  const check = { verifiedBy: 'Staff A', verifiedAt: '2026-11-12' };
  assert.equal(isStaffClaimCheck(check), true);
  for (const bad of [{ ...check, verifiedBy: ' ' }, { ...check, verifiedAt: '12/11/2026' }, { ...check, verifiedAt: '2999-01-01' }, { ...check, note: 'x' }, null]) {
    assert.equal(isStaffClaimCheck(bad), false, JSON.stringify(bad));
  }
  assert.deepEqual(unverifiedClaims(claimData, { licence: check }), ['warranty']);
  assert.deepEqual(unverifiedClaims(claimData, { licence: { verifiedBy: 'A' } }), ['licence', 'warranty'], 'an invalid record verifies nothing');
  assert.equal(parseClaimVerification({ insurance: check }), null);
});

test('B4: unverified, the licence and the free-text warranty leave the trust bar, the proof, the Q&A, the FAQ and the prose', () => {
  const files = render(claimPages(), claimData);
  const all = Object.values(files).join('\n');
  for (const claim of [licenceChip, licenceProof, warrantyChip, warrantyProof, '4821']) assert.ok(!all.includes(claim), `unverified claim rendered: ${claim}`);
  // Everything else stays, untouched.
  assert.ok(files['index.html'].includes(yearsChip) && files['services/panel-upgrade.html'].includes(yearsProof));
  assert.ok(files['index.html'].includes('I work alone. I clean up after every job.'), 'only the claim sentence left the prose');
  assert.ok(files['index.html'].includes('Yes, every time.') && files['services/panel-upgrade.html'].includes('About two hours.'));
});

test('B4: with staff checks the claims render; one check verifies only its own claim', () => {
  const check = { verifiedBy: 'Staff A', verifiedAt: '2026-11-12' };
  const both = Object.values(render(claimPages(), claimData, { claimVerification: { licence: check, warranty: check } })).join('\n');
  for (const claim of [licenceChip, licenceProof, warrantyChip, warrantyProof]) assert.ok(both.includes(claim), `verified claim missing: ${claim}`);
  const licenceOnly = Object.values(render(claimPages(), claimData, { claimVerification: { licence: check } })).join('\n');
  assert.ok(licenceOnly.includes(licenceChip) && !licenceOnly.includes(warrantyChip) && !licenceOnly.includes(warrantyProof));
  // A fixed-chip warranty needs no check.
  const chipData: CollectedData = { ...claimData, license: undefined, guarantee: WARRANTY_PICKER_VALUES.twoYears };
  const chip = trustText(ownerFacts(chipData, { firstPartyProof: [] }, T).warranty!, T)!;
  const pages = claimPages();
  pages[0].copy.trustBarItems = [yearsChip, chip];
  assert.ok(render(pages, chipData)['index.html'].includes(chip));
});

test('B4: a claim in a heading the renderer cannot drop blocks the render (fail closed), and the deploy pre-check names it', () => {
  const pages = claimPages();
  pages[0].copy.heroHeadline = 'electrician, licence 4821';
  assert.deepEqual(researchedClaimBlockers(pages, claimData, undefined), ['home:heroHeadline']);
  assert.throws(() => render(pages, claimData), (error: unknown) => error instanceof UnverifiedClaimError && error.blocked.includes('home:heroHeadline'));
  const check = { verifiedBy: 'Staff A', verifiedAt: '2026-11-12' };
  assert.deepEqual(researchedClaimBlockers(pages, claimData, { licence: check }), []);
  assert.ok(render(pages, claimData, { claimVerification: { licence: check } })['index.html'].includes('4821'));
});

// ---- Capability 9: the visible Google-profile link (homepage + footer), the same URL as the schema sameAs. ----

const MAPS = 'https://maps.app.goo.gl/AbCdEf123';
const standIn: ProfileLinkCopy = { label: 'PROFILE on Google', pending: false };

test('capability 9: the label is a pending placeholder; while pending no profile link renders (a placeholder never ships)', () => {
  const value = RESEARCHED_PROFILE_LINK_LABELS.googleProfileLink;
  assert.equal(RESEARCHED_PROFILE_LINK_LABELS_PENDING_COPY, value.startsWith(HE_TODO_PREFIX), 'flag and value agree');
  const data: CollectedData = { businessName: 'TEST Biz', businessNiche: 'plumber', phone: '050-0000000', googleMapsUrl: MAPS };
  const pages: ResearchedSitePage[] = [
    { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: baseCopy('plumber'), seo: seo('plumber') },
    { opportunityId: 'svc', classification: 'money_service', targetPath: '/services/leak-repair', copy: baseCopy('leak repair'), seo: seo('leak repair') },
  ];
  const files = render(pages, data);
  for (const [file, html] of Object.entries(files)) assert.ok(!html.includes(HE_TODO_PREFIX), `${file}: no placeholder in the HTML`);
  if (RESEARCHED_PROFILE_LINK_LABELS_PENDING_COPY) {
    assert.equal(researchedProfileLink(data), null);
    for (const html of Object.values(files)) assert.ok(!html.includes('data-google-profile') && !html.includes('data-footer-profile'));
  }
});

test('capability 9: with an approved label the homepage and every page footer link the owner profile, the schema sameAs URL', () => {
  const data: CollectedData = { businessName: 'TEST Biz', businessNiche: 'plumber', phone: '050-0000000', googleMapsUrl: MAPS };
  const pages: ResearchedSitePage[] = [
    { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: baseCopy('plumber'), seo: seo('plumber') },
    { opportunityId: 'svc', classification: 'money_service', targetPath: '/services/leak-repair', copy: baseCopy('leak repair'), seo: seo('leak repair') },
  ];
  const files = render(pages, data, { profileLinkCopy: standIn });
  const home = files['index.html'];
  assert.equal((home.match(/data-google-profile/g) ?? []).length, 1, 'one homepage link');
  assert.ok(home.includes(`<a href="${MAPS}" data-google-profile`));
  assert.ok(home.includes('PROFILE on <bdi>Google</bdi>') || home.includes('<bdi>PROFILE on Google</bdi>'), 'the Latin run is isolated');
  for (const file of ['index.html', 'services/leak-repair.html', 'contact.html']) {
    assert.ok(files[file].includes(`<div data-footer-profile`) && files[file].includes(`href="${MAPS}"`), `${file}: footer link`);
  }
  assert.ok(!files['services/leak-repair.html'].includes('data-google-profile'), 'the body link is on the homepage only');
  const sameAs = /"sameAs":\["([^"]+)"\]/.exec(home)?.[1];
  assert.equal(sameAs, MAPS, 'the same URL as the schema');
  // No URL, or a URL that is not a Google profile / Maps link: no link anywhere.
  for (const url of [undefined, 'https://example.com/maps/x', 'javascript:alert(1)']) {
    const out = render(pages, { ...data, googleMapsUrl: url }, { profileLinkCopy: standIn });
    for (const html of Object.values(out)) assert.ok(!html.includes('data-google-profile') && !html.includes('data-footer-profile'), String(url));
  }
});
