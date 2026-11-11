// Site-Bot plan config (one plan, one price), the "no other hard-coded Site-Bot price" guard, the pay-page copy guard and
// the mock-card prefill rule. HEBREW-SAFETY: zero Hebrew bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { SITE_BOT_PLAN, getBillingPlan, planChargeAmount, planSummary, planVatAmount, formatShekels } from './plans';
import { paymentProviderKind } from './get-provider';
import { HE_TODO_PREFIX } from '../lp/researchedSiteLabels';
import { SITE_BOT_CHECKOUT_COPY, SITE_BOT_CHECKOUT_COPY_PENDING, siteBotCheckoutText } from '../site-bot/checkout/checkoutCopy';
import { cardFieldDefaults } from '../site-bot/checkout/mockCard';

const root = process.cwd();

test('SITE_BOT_PLAN: the approved terms (2026-11-07 / 2026-11-11), one plan', () => {
  assert.equal(SITE_BOT_PLAN.id, 'site-bot');
  assert.equal(SITE_BOT_PLAN.netAmount, 199);
  assert.equal(SITE_BOT_PLAN.currency, 'ILS');
  assert.deepEqual({ ...SITE_BOT_PLAN.vat }, { mode: 'added', rate: 0.18 });
  assert.equal(SITE_BOT_PLAN.interval, 'month');
  assert.equal(SITE_BOT_PLAN.intervalCount, 1);
  assert.equal(SITE_BOT_PLAN.billingAnchor, 'signup_date');
  assert.equal(SITE_BOT_PLAN.trialDays, 0);
  assert.equal(SITE_BOT_PLAN.minimumCommitmentMonths, 0);
  assert.equal(SITE_BOT_PLAN.cancellationEffective, 'end_of_period');
  assert.deepEqual([...SITE_BOT_PLAN.dunning.retryOffsetsDays], [2, 4, 7], '3 retries over 7 days');
  assert.equal(SITE_BOT_PLAN.dunning.whenExhausted, 'pause');
  assert.ok(Object.isFrozen(SITE_BOT_PLAN) && Object.isFrozen(SITE_BOT_PLAN.vat) && Object.isFrozen(SITE_BOT_PLAN.dunning.retryOffsetsDays));
  assert.equal(getBillingPlan('site-bot'), SITE_BOT_PLAN);
  assert.equal(getBillingPlan('other'), null);
  assert.equal(getBillingPlan(null), null);
  assert.equal(getBillingPlan('toString'), null);
});

test('VAT handling: the price is quoted before VAT, the charge adds it (rounded to agorot)', () => {
  assert.equal(planVatAmount(SITE_BOT_PLAN), 35.82);
  assert.equal(planChargeAmount(SITE_BOT_PLAN), 234.82);
  const summary = planSummary(SITE_BOT_PLAN);
  assert.equal(summary.netAmount, 199);
  assert.equal(summary.chargeAmount, 234.82);
  assert.equal(summary.vatMode, 'added');
  assert.equal(summary.interval, 'month');
  assert.equal(formatShekels(199), '₪199');
  assert.equal(formatShekels(234.82), '₪234.82');
  assert.equal(formatShekels(9.9), '₪9.90');
});

// ---------------------------------------------------------------------------------------------------------------------
// One config source: any Site-Bot price literal outside plans.ts fails this test.
// ---------------------------------------------------------------------------------------------------------------------

/** Every non-test source file of the Site-Bot surfaces: checkout routes, pages, components, libraries, the engine. */
const SITE_BOT_SURFACES = [
  'src/app/api/site-bot',
  'src/app/(product)/site-bot',
  'src/app/(app)/site-bot',
  'src/components/site-bot',
  'src/lib/site-bot',
  'src/lib/payments',
];
const PLAN_SOURCE = 'src/lib/payments/plans.ts';
/** The old one-time price, the plan's net / VAT-inclusive numbers, and the retired constant name. */
const PRICE_LITERAL = /SITE_BOT_PRICE|(?<![\d.])(?:9\.90?|199|234\.82)(?![\d.])/;

/**
 * Outside the Site-Bot surfaces, the retired one-time Site-Bot price (9.9 / 9.90 shekels) may appear only in these
 * files. Anything else quoting it fails. Entries must still match (fix one -> remove it here).
 */
const RETIRED_PRICE_ALLOWED: Readonly<Record<string, string>> = {
  // Stale Site-Bot marketing copy (Hebrew; the engineer cannot change it): Tamar keys, see the checkout hand-off.
  'src/components/Hero.tsx': 'stale Site-Bot copy (Tamar)',
  'src/components/Services.tsx': 'stale Site-Bot copy (Tamar)',
  // Not Site-Bot: the Google Ads onboarding bot has its own 9.9 activation price.
  'src/components/OnboardingSidebar.tsx': 'Google Ads bot',
  'src/app/api/bot/route.ts': 'Google Ads bot',
  'src/lib/bot/prompts.ts': 'Google Ads bot',
};
/** A shekel price of 9.9 / 9.90, either side of the sign. */
const RETIRED_SHEKEL_PRICE = /\u20AA\s?9\.90?(?!\d|\.\d)|(?<![\d.])9\.90?\s?\u20AA/;

function sourceFiles(dir: string): string[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(entry => {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(rel);
    return /\.(ts|tsx|mjs|js)$/.test(entry.name) && !/\.test\.(ts|tsx|mjs|js)$|\.testkit\./.test(entry.name) ? [rel] : [];
  });
}

test('one config source: no Site-Bot price literal on any Site-Bot surface outside plans.ts', () => {
  const files = SITE_BOT_SURFACES.flatMap(sourceFiles);
  assert.ok(files.includes(PLAN_SOURCE) && files.includes('src/app/api/site-bot/checkout/init/paid.ts') && files.length > 50, `scan found ${files.length} files`);
  const offenders = files
    .filter(file => file !== PLAN_SOURCE)
    .flatMap(file => fs.readFileSync(path.join(root, file), 'utf8').split('\n')
      .map((line, i) => ({ file, line: i + 1, text: line }))
      .filter(({ text }) => PRICE_LITERAL.test(text)))
    .map(({ file, line, text }) => `${file}:${line}: ${text.trim().slice(0, 120)}`);
  assert.deepEqual(offenders, [], 'hard-coded Site-Bot price: read it from SITE_BOT_PLAN (src/lib/payments/plans.ts)');
  assert.match(fs.readFileSync(path.join(root, PLAN_SOURCE), 'utf8'), /netAmount: 199,/);
});

test('one config source: outside the Site-Bot surfaces, the retired 9.90 price appears only in the known files', () => {
  const files = sourceFiles('src').filter(file => !SITE_BOT_SURFACES.some(dir => file.startsWith(`${dir}/`)));
  const quoting = files.filter(file => fs.readFileSync(path.join(root, file), 'utf8').split('\n').some(line => RETIRED_SHEKEL_PRICE.test(line)));
  assert.deepEqual(quoting.sort(), Object.keys(RETIRED_PRICE_ALLOWED).sort());
});

// ---------------------------------------------------------------------------------------------------------------------
// Pay-page copy (pending Tamar -> Noa) and the mock card.
// ---------------------------------------------------------------------------------------------------------------------

test('checkout copy: the pending flag matches the placeholders; the numbers come from the plan', () => {
  const pending = Object.values(SITE_BOT_CHECKOUT_COPY).some(value => value.includes(HE_TODO_PREFIX));
  assert.equal(SITE_BOT_CHECKOUT_COPY_PENDING, pending);
  assert.deepEqual(Object.keys(SITE_BOT_CHECKOUT_COPY).sort(),
    ['pageSubheading', 'payButton', 'priceSuffix', 'priceTotalLine', 'termsCancelOnline', 'termsNoCommitment']);
  for (const [key, value] of Object.entries(SITE_BOT_CHECKOUT_COPY)) {
    assert.doesNotMatch(value, /\d/, `${key}: no number typed into the copy (use {net} / {total} / {vatPercent})`);
    assert.doesNotMatch(value, /[\u0590-\u05FF]/, `${key}: Hebrew arrives only as a Tamar -> Noa patch`);
  }
  assert.ok(siteBotCheckoutText('priceTotalLine', SITE_BOT_PLAN).includes('₪234.82 (18%)'));
  assert.ok(siteBotCheckoutText('payButton', SITE_BOT_PLAN).endsWith('₪234.82'));
});

test('mock card: the test card is pre-filled only on a dev server with the mock provider', () => {
  assert.equal(paymentProviderKind({}), 'mock');
  assert.equal(paymentProviderKind({ PAYMENT_PROVIDER: 'takbull' }), 'takbull');
  assert.equal(cardFieldDefaults({ NODE_ENV: 'development' }).number, '4242 4242 4242 4242');
  for (const env of [
    { NODE_ENV: 'production' },
    { NODE_ENV: 'test' },
    {},
    { NODE_ENV: 'development', PAYMENT_PROVIDER: 'takbull' },
    { NODE_ENV: 'production', PAYMENT_PROVIDER: 'mock' },
  ]) {
    assert.deepEqual({ ...cardFieldDefaults(env) }, { number: '', expiry: '', cvc: '' }, JSON.stringify(env));
  }
});

test('TAKBULL SWAP POINT: exactly one, in the plan activation; takbull.ts stays a stub', () => {
  const marker = 'TAKBULL SWAP POINT (the only one)';
  const hits = sourceFiles('src').filter(file => fs.readFileSync(path.join(root, file), 'utf8').includes(marker));
  assert.deepEqual(hits, ['src/lib/payments/subscriptions.ts']);
  const engine = fs.readFileSync(path.join(root, 'src/lib/payments/subscriptions.ts'), 'utf8');
  assert.equal(engine.split(marker).length - 1, 1);
  assert.ok(engine.indexOf(marker) > engine.indexOf('export async function activatePlanSubscription('));
  assert.match(fs.readFileSync(path.join(root, 'src/lib/payments/providers/takbull.ts'), 'utf8'), /throw new TakbullNotConfiguredError\(/);
});
