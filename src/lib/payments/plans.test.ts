// Site-Bot plan config (one plan, one price), the "no other hard-coded Site-Bot price" guard, the pay-page copy guard and
// the mock-card prefill rule. HEBREW-SAFETY: zero Hebrew bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { SITE_BOT_PLAN, getBillingPlan, planChargeAmount, planSummary, planVatAmount, formatShekels } from './plans';
import { paymentProviderKind } from './get-provider';
import { HE_TODO_PREFIX } from '../lp/researchedSiteLabels';
import { SITE_BOT_CHECKOUT_COPY, SITE_BOT_CHECKOUT_COPY_PENDING, SITE_BOT_TERMS_PATH, siteBotCheckoutText, siteBotTermsConsentParts } from '../site-bot/checkout/checkoutCopy';
import { cardFieldDefaults } from '../site-bot/checkout/mockCard';
import { ACCOUNT_PAGE_PATH, SITE_BOT_ACCOUNT_COPY, SITE_BOT_ACCOUNT_COPY_PENDING, accountLinkHref, customerVisibleLabel } from '../site-bot/checkout/accountCopy';

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
  // Not Site-Bot: the Google Ads onboarding bot has its own 9.9 activation price.
  'src/components/OnboardingSidebar.tsx': 'Google Ads bot',
  'src/app/api/bot/route.ts': 'Google Ads bot',
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

/**
 * JSON content files under src/ (copy that components import). Content prose carries no version numbers, so here any
 * bare 9.9 / 9.90 counts, with or without the shekel sign. Allowed only at these JSON key paths, each with a reason.
 */
const RETIRED_PRICE_JSON = /(?<![\d.])9\.90?(?![\d.])/;
const RETIRED_PRICE_JSON_ALLOWED: Readonly<Record<string, string>> = {
  'src/content/astra-homepage-copy.json#metadata.truth_constraints.1': 'internal note (metadata, never rendered): Google Ads bot pricing',
  'src/content/astra-homepage-copy.json#metadata.truth_constraints.2': 'internal note (metadata, never rendered): history of the retired Site-Bot trial',
  'src/content/astra-homepage-copy.json#paths.path_ads.pricing_guidance': 'internal guidance (never rendered): Google Ads bot pricing',
  // PENDING COPY (Tamar -> Noa): advertises the retired Site-Bot trial. Stored, not rendered today (pinned below).
  'src/content/astra-homepage-copy.json#paths.path_local.trial_line': 'pending copy: retired Site-Bot trial line (Tamar), not rendered',
};

function jsonFiles(dir: string): string[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(entry => {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) return jsonFiles(rel);
    return entry.name.endsWith('.json') ? [rel] : [];
  });
}

/** Every string leaf of a parsed JSON value, with its dotted key path. */
function jsonStrings(value: unknown, at: string[] = []): Array<{ key: string; text: string }> {
  if (typeof value === 'string') return [{ key: at.join('.'), text: value }];
  if (Array.isArray(value)) return value.flatMap((item, i) => jsonStrings(item, [...at, String(i)]));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => jsonStrings(v, [...at, k]));
  return [];
}

test('one config source: JSON content under src/ quotes the retired 9.90 price only at the allowlisted keys', () => {
  const files = jsonFiles('src');
  assert.ok(files.includes('src/content/astra-homepage-copy.json'), `scan found ${files.length} JSON files`);
  const quoting = files.flatMap(file => jsonStrings(JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')))
    .filter(({ text }) => RETIRED_PRICE_JSON.test(text))
    .map(({ key }) => `${file}#${key}`));
  assert.deepEqual(quoting.sort(), Object.keys(RETIRED_PRICE_JSON_ALLOWED).sort());
});

test('pending copy: the homepage-copy trial_line stays unrendered until Tamar replaces it', () => {
  // The homepage JSON is read by property path only (AstraHome / Header / Footer / page.tsx). path_local is used only
  // for its details_link; nothing reads trial_line, and nothing iterates the copy objects wholesale.
  const offenders = sourceFiles('src').flatMap(file => {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    const problems: string[] = [];
    if (text.includes('trial_line')) problems.push(`${file}: reads trial_line`);
    if (text.includes('astra-homepage-copy.json')) {
      for (const m of text.matchAll(/path_local(\.[A-Za-z_]+)?/g)) if (m[1] !== '.details_link') problems.push(`${file}: path_local${m[1] ?? ''}`);
      if (/Object\.(values|entries|keys)\(\s*copy\b|\.\.\.\s*copy\b/.test(text)) problems.push(`${file}: iterates / spreads the homepage copy`);
    }
    return problems;
  });
  assert.deepEqual(offenders, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// Pay-page copy (pending Tamar -> Noa) and the mock card.
// ---------------------------------------------------------------------------------------------------------------------

/** The approved pay-page copy (waocopy -> Noa 2026-11-11). checkoutCopy.ts must match their union byte for byte. */
const CHECKOUT_COPY_SOURCES = ['docs/copy/site-bot-checkout-199-2026-11-11.json', 'docs/copy/site-bot-pay-terms-lines-2026-11-11.json'];
/** The 2026-11-12 terms section 6 + pay domain line (`key :: value` lines); its domainLine supersedes the JSON above. */
const DOMAIN_LINE_FINAL_SOURCE = 'docs/copy/site-bot-terms-s6-and-checkout-final-2026-11-12.txt';

function finalCopyFields(file: string): Record<string, string> {
  return Object.fromEntries(fs.readFileSync(path.join(root, file), 'utf8').split('\n').filter(Boolean).map(line => {
    const at = line.indexOf(' :: ');
    assert.ok(at > 0, line);
    return [line.slice(0, at), line.slice(at + 4)];
  }));
}
/** Keys that carry a non-number token, rendered as an element by the pay client (not by siteBotCheckoutText). */
const LINK_TOKEN_KEYS = ['termsConsent'];

test('checkout copy: byte-exact from the approved docs/copy source; the numbers come from the plan', () => {
  const approved: Record<string, string> = {};
  for (const file of CHECKOUT_COPY_SOURCES) {
    const checkout = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).checkout as Record<string, string>;
    for (const [key, value] of Object.entries(checkout)) {
      assert.ok(!(key in approved), `${key}: defined in two copy sources`);
      approved[key] = value;
    }
  }
  // domainLine: the 2026-11-12 final file supersedes the 2026-11-11 pay-terms-lines value (own domain first).
  approved.domainLine = finalCopyFields(DOMAIN_LINE_FINAL_SOURCE)['checkout.domainLine.new'];
  assert.deepEqual({ ...SITE_BOT_CHECKOUT_COPY }, approved);
  assert.deepEqual(Object.keys(SITE_BOT_CHECKOUT_COPY).sort(),
    ['domainLine', 'pageSubheading', 'payButton', 'priceSuffix', 'priceTotalLine', 'termsCancelOnline', 'termsConsent', 'termsLinkLabel', 'termsNoCommitment']);
  for (const [key, value] of Object.entries(SITE_BOT_CHECKOUT_COPY)) {
    assert.doesNotMatch(value, /\d/, `${key}: no number typed into the copy (use {net} / {total} / {vatPercent})`);
    assert.ok(!value.includes(HE_TODO_PREFIX), `${key}: placeholder`);
  }
  // Ship gate: the cancel-online promise is true in the product (plan-subscription.test.ts: end-of-period cancel).
  assert.equal(SITE_BOT_CHECKOUT_COPY_PENDING, false);
  assert.equal(SITE_BOT_PLAN.cancellationEffective, 'end_of_period');
  const total = siteBotCheckoutText('priceTotalLine', SITE_BOT_PLAN);
  assert.ok(total.startsWith('\u20AA234.82 ') && total.includes('(18%)'), total);
  assert.ok(siteBotCheckoutText('payButton', SITE_BOT_PLAN).includes(' \u20AA234.82 '));
  for (const key of Object.keys(SITE_BOT_CHECKOUT_COPY) as Array<keyof typeof SITE_BOT_CHECKOUT_COPY>) {
    if (LINK_TOKEN_KEYS.includes(key)) continue;
    assert.doesNotMatch(siteBotCheckoutText(key, SITE_BOT_PLAN), /\{/, `${key}: every token filled`);
  }
  // termsConsent: exactly one {termsLink}, nothing else; split into text + link label + text with nothing lost.
  assert.equal(SITE_BOT_CHECKOUT_COPY.termsConsent.match(/\{[^}]*\}/g)?.join(), '{termsLink}');
  const consent = siteBotTermsConsentParts();
  assert.equal(consent.before + '{termsLink}' + consent.after, SITE_BOT_CHECKOUT_COPY.termsConsent);
  assert.equal(consent.linkLabel, SITE_BOT_CHECKOUT_COPY.termsLinkLabel);
  assert.ok(consent.before.length > 0 && consent.linkLabel.length > 0);
  assert.equal(SITE_BOT_TERMS_PATH, '/site-bot/terms');
  assert.ok(fs.existsSync(path.join(root, 'src/app/(app)/site-bot/terms/page.tsx')), 'the terms route exists');
  // The pay client shows the domain line with the terms lines and links the consent to the terms page.
  const client = fs.readFileSync(path.join(root, 'src/components/site-bot/SiteBotPayClient.tsx'), 'utf8');
  assert.match(client, /siteBotCheckoutText\("domainLine", SITE_BOT_PLAN\)/);
  assert.match(client, /const termsConsent = siteBotTermsConsentParts\(\);/);
  assert.match(client, /href=\{SITE_BOT_TERMS_PATH\}/);
  assert.ok(client.indexOf('data-terms-consent') < client.indexOf('siteBotCheckoutText("payButton"'), 'consent sits above the pay button');
  // The consent link opens a new tab safely and marks it with an aria-hidden north-east arrow after the label.
  assert.match(client, /href=\{SITE_BOT_TERMS_PATH\} target="_blank" rel="noopener noreferrer"/);
  assert.match(client, /\{renderMixed\(termsConsent\.linkLabel\)\}\s*<span aria-hidden="true">\u2197<\/span>\s*<\/a>/);
  // Domain policy 2026-11-12 (own domain from the start, else a WAO address first): domainLine is the final file's
  // line, byte for byte, and neither earlier pay line (2026-11-11 client-buys patch old / new) survives.
  const domainPatch = JSON.parse(fs.readFileSync(path.join(root, 'docs/copy/site-bot-domain-client-buys-2026-11-11.json'), 'utf8'))
    .patches.find((p: { file: string }) => p.file === 'src/lib/site-bot/checkout/checkoutCopy.ts');
  assert.equal(SITE_BOT_CHECKOUT_COPY.domainLine, finalCopyFields(DOMAIN_LINE_FINAL_SOURCE)['checkout.domainLine.new']);
  assert.notEqual(SITE_BOT_CHECKOUT_COPY.domainLine, domainPatch.old);
  assert.notEqual(SITE_BOT_CHECKOUT_COPY.domainLine, domainPatch.new);
});

test('customer pages never render a __HE_TODO_ placeholder: customerVisibleLabel hides it; the pay client renders only through it', () => {
  assert.equal(customerVisibleLabel(`${HE_TODO_PREFIX}manageLink__`), null);
  assert.equal(customerVisibleLabel(`  ${HE_TODO_PREFIX}x__`), null);
  assert.equal(customerVisibleLabel(`label ${HE_TODO_PREFIX}x__`), null);
  for (const empty of ['', '   ', undefined, null]) assert.equal(customerVisibleLabel(empty), null);
  assert.equal(customerVisibleLabel('Manage'), 'Manage');
  for (const value of Object.values(SITE_BOT_ACCOUNT_COPY)) {
    assert.equal(customerVisibleLabel(value) === null, SITE_BOT_ACCOUNT_COPY_PENDING || value.trim() === '');
  }
  const client = fs.readFileSync(path.join(process.cwd(), 'src/components/site-bot/SiteBotPayClient.tsx'), 'utf8');
  assert.match(client, /const manageLinkLabel = customerVisibleLabel\(SITE_BOT_ACCOUNT_COPY\.manageLink\);/);
  assert.match(client, /\{manageLinkLabel && \(phase === /);
  assert.equal(client.split('SITE_BOT_ACCOUNT_COPY.').length - 1, 1, 'SITE_BOT_ACCOUNT_COPY is read only through customerVisibleLabel');
  assert.doesNotMatch(client, /HE_TODO/);
});

test('account link copy (Tamar -> Noa, applied 2026-11-11): the flag matches the placeholders; the href is only a same-origin token path', () => {
  const pending = Object.values(SITE_BOT_ACCOUNT_COPY).some(value => value.includes(HE_TODO_PREFIX));
  assert.equal(SITE_BOT_ACCOUNT_COPY_PENDING, pending);
  assert.deepEqual(Object.keys(SITE_BOT_ACCOUNT_COPY), ['manageLink']);
  const token = 'a'.repeat(64);
  assert.equal(accountLinkHref(`/account/subscription?token=${token}`), `/account/subscription?token=${token}`);
  for (const bad of [undefined, null, 42, '', 'https://evil.example/account/subscription?token=' + token, `//evil.example/account/subscription?token=${token}`,
    `/account/subscription?token=${token}&next=https://evil.example`, '/account/subscription?token=xyz', 'javascript:alert(1)']) {
    assert.equal(accountLinkHref(bad), ACCOUNT_PAGE_PATH, String(bad));
  }
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
