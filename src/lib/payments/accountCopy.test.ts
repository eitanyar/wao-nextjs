// Account page + client billing emails: the Hebrew copy is exactly the approved sources (waocopy JSON + Noa's byte-exact
// fixes), the three DERIVED values are pure deletions, formatting is he-IL, and the four client emails render an escaped
// RTL HTML part. HEBREW-SAFETY: zero Hebrew bytes. Every Hebrew expectation is read from docs/copy at runtime.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  ACCOUNT_PAGE_COPY,
  ACCOUNT_STATUS_LABEL,
  ACCOUNT_TITLE_SUFFIX,
  BILLING_EMAIL_COPY,
  CANCEL_BUTTON_COPY,
  CARD_UPDATE_BUTTON_COPY,
  MAGIC_LINK_REQUEST_COPY,
  REQUEST_LINK_COPY,
  fillTemplate,
  formatAccountDate,
  formatAccountPrice,
} from './accountCopy';
import {
  buildCardExpiringSoonEmail,
  buildCardUpdateNeededEmail,
  buildMagicLinkEmail,
  buildRenewalChargeEmail,
  renderClientEmail,
} from './email';
import { SITE_BOT_CLIENT_MESSAGE_COPY } from '../site-bot/clientMessageCopy';

const repo = process.cwd();
const base = JSON.parse(fs.readFileSync(path.join(repo, 'docs/copy/site-bot-account-page-hebrew-2026-11-14.waocopy.json'), 'utf8')) as {
  strings: Record<string, string>;
  new: Record<string, string>;
};
const review = fs.readFileSync(path.join(repo, 'docs/copy/reviews/noa-site-bot-account-page-2026-11-14.md'), 'utf8');
const fixesSection = review.split('## Fixes (byte-exact)')[1].split('\n## ')[0];
const spans = (s: string) => [...s.matchAll(/`([^`]*)`/g)].map((m) => m[1]);

const groups = { ACCOUNT_PAGE_COPY, ACCOUNT_STATUS_LABEL, CANCEL_BUTTON_COPY, CARD_UPDATE_BUTTON_COPY, REQUEST_LINK_COPY, MAGIC_LINK_REQUEST_COPY, BILLING_EMAIL_COPY };
const DERIVED: Array<[string, string]> = [
  [CANCEL_BUTTON_COPY.confirmQuestionNoDate, CANCEL_BUTTON_COPY.confirmQuestion],
  [BILLING_EMAIL_COPY.magicLinkBody, BILLING_EMAIL_COPY.magicLinkBodyWithSupport],
];
const derivedValues = new Set([...DERIVED.map(([d]) => d), MAGIC_LINK_REQUEST_COPY.success]);
const allValues = Object.values(groups).flatMap((g) => Object.values(g) as string[]);

const approved = new Set<string>([...Object.values(base.strings), ...Object.values(base.new), ...spans(fixesSection)]);

function isSingleDeletion(derived: string, full: string): boolean {
  if (derived.length >= full.length) return false;
  let i = 0;
  while (i < derived.length && derived[i] === full[i]) i++;
  return full.endsWith(derived.slice(i)) && full.length - (derived.length - i) >= i;
}

test('every non-derived account copy value is an approved string, verbatim', () => {
  for (const value of allValues) {
    if (derivedValues.has(value)) continue;
    assert.ok(approved.has(value), `not in the approved sources: ${JSON.stringify(value)}`);
  }
});

test("Noa's fixes are applied: no replaced value survives, each new value is used (cancel line uses the variant)", () => {
  const used = new Set(allValues);
  let checked = 0;
  for (const line of fixesSection.split('\n')) {
    if (!line.startsWith('- `') || !line.includes(' \u2192 ') || line.includes('same old')) continue;
    const [left, right] = line.split(' \u2192 ');
    const key = spans(line)[0];
    const old = spans(left).at(-1) as string;
    const next = spans(right)[0];
    assert.ok(!used.has(old), `${key}: replaced value still used`);
    if (key === 'email.ts:renewal.cancelLine') {
      assert.ok(!used.has(next), 'cancel line: Adam decision 1 uses the variant, not the "only" version');
    } else if (key === 'route.ts:success.message') {
      assert.ok(!used.has(next), 'success reply: Adam decision 2 ships the derived form without the support clause');
    } else {
      assert.ok(used.has(next), `${key}: fixed value not used`);
    }
    checked++;
  }
  assert.equal(checked, 16);
  const variant = spans(fixesSection.split('\n').find((l) => l.startsWith('  - Variant')) as string)[0];
  assert.equal(BILLING_EMAIL_COPY.renewalCancelLine, variant);
  const noBox = spans(fixesSection.split('\n').find((l) => l.startsWith('- NEW `error.genericNoBox`')) as string).at(-1);
  assert.equal(CANCEL_BUTTON_COPY.errorGenericNoBox, noBox);
  assert.equal(CARD_UPDATE_BUTTON_COPY.errorGenericNoBox, noBox);
});

test('DERIVED values are one contiguous deletion of their approved source', () => {
  for (const [derived, full] of DERIVED) assert.ok(isSingleDeletion(derived, full), JSON.stringify(derived));
  const fullSuccess = spans(fixesSection.split('\n').find((l) => l.startsWith('- `route.ts:success.message`')) as string).at(-1) as string;
  assert.ok(isSingleDeletion(MAGIC_LINK_REQUEST_COPY.success, fullSuccess));
  // The same clause is removed from the API reply and from the email body.
  const removed = (d: string, f: string) => {
    let i = 0;
    while (d[i] === f[i]) i++;
    return f.slice(i, i + f.length - d.length);
  };
  assert.equal(removed(MAGIC_LINK_REQUEST_COPY.success, fullSuccess), removed(BILLING_EMAIL_COPY.magicLinkBody, BILLING_EMAIL_COPY.magicLinkBodyWithSupport));
  assert.ok(!CANCEL_BUTTON_COPY.confirmQuestionNoDate.includes('{date}'));
});

test('the box pointer names the real support box heading; no placeholder, no ASCII quotes', () => {
  const heading = SITE_BOT_CLIENT_MESSAGE_COPY.boxHeading;
  assert.ok(CANCEL_BUTTON_COPY.errorGeneric.includes(`\u05f4${heading}\u05f4`));
  assert.ok(CARD_UPDATE_BUTTON_COPY.errorGeneric.includes(`\u05f4${heading}\u05f4`));
  for (const value of allValues) {
    assert.ok(!value.includes('__HE_TODO_'), value);
    assert.ok(!/["']/.test(value), `ASCII quote in ${value}`);
  }
  assert.equal(ACCOUNT_TITLE_SUFFIX, '\u200f | WAO');
  assert.ok(/[\u0590-\u05ff]$/.test(ACCOUNT_PAGE_COPY.metadataTitle), 'title ends in Hebrew before the suffix');
});

test('he-IL formatting: VAT-inclusive price and Israeli calendar date', () => {
  const price = formatAccountPrice(234.82, 'ILS');
  assert.ok(price.includes('234.82') && price.includes('\u20aa'), price);
  assert.equal(formatAccountDate('2026-12-13T22:30:00.000Z'), '14.12.2026'); // UTC evening = next day in Israel
  assert.equal(fillTemplate('a {x} b', { x: '1' }), 'a 1 b');
  assert.throws(() => fillTemplate('a {x}', {}), /missing value/);
});

test('client emails: RTL HTML part, escaped and LTR-isolated values, URL on its own line', () => {
  const url = 'https://www.wao.co.il/account/subscription?token=ab&x=<1>';
  const renewal = buildRenewalChargeEmail({ amount: 234.82, currency: 'ILS', cardLast4: '4242', cancelUrl: url });
  assert.equal(renewal.subject, BILLING_EMAIL_COPY.renewalSubject);
  const price = formatAccountPrice(234.82, 'ILS');
  assert.ok(renewal.text.includes(fillTemplate(BILLING_EMAIL_COPY.renewalBody, { price, cardLast4: '4242' })));
  assert.deepEqual(renewal.text.split('\n').slice(-1), [url]);
  assert.ok(renewal.html.startsWith('<div dir="rtl" lang="he">') && renewal.html.endsWith('</div>'));
  assert.ok(renewal.html.includes('<span dir="ltr">4242</span>'));
  assert.ok(renewal.html.includes('token=ab&amp;x=&lt;1&gt;') && !renewal.html.includes('<1>'));
  assert.ok(!renewal.text.includes('{') && !renewal.html.includes('{'));

  const expiring = buildCardExpiringSoonEmail({ cardLast4: '<b>', cardExpiry: '12/26', updateCardUrl: url });
  assert.ok(expiring.html.includes('<span dir="ltr">&lt;b&gt;</span>') && expiring.html.includes('<span dir="ltr">12/26</span>'));
  assert.equal(expiring.subject, BILLING_EMAIL_COPY.cardExpiringSubject);

  const declined = buildCardUpdateNeededEmail({ manageUrl: url });
  assert.equal(declined.text, [BILLING_EMAIL_COPY.cardUpdateNeededBody1, BILLING_EMAIL_COPY.cardUpdateNeededBody2, url].join('\n'));

  assert.equal(renderClientEmail([{ blank: true }]).html, '<div dir="rtl" lang="he"></div>');
});

test('manage-link email mentions support only when the support box is shown', () => {
  const url = 'https://www.wao.co.il/account/subscription?token=1';
  const withBox = buildMagicLinkEmail({ cancelUrl: url, supportBoxShown: true });
  const noBox = buildMagicLinkEmail({ cancelUrl: url });
  assert.equal(withBox.text, `${BILLING_EMAIL_COPY.magicLinkBodyWithSupport}\n${url}`);
  assert.equal(noBox.text, `${BILLING_EMAIL_COPY.magicLinkBody}\n${url}`);
  assert.equal(noBox.subject, BILLING_EMAIL_COPY.magicLinkSubject);
});

test('legacy trial-engine emails stay English (out of the Hebrew pass)', () => {
  const src = fs.readFileSync(path.join(repo, 'src/lib/payments/email.ts'), 'utf8');
  for (const s of ['WAO — Trial charge confirmation', 'WAO — Your subscription trial is ending soon', 'WAO — Your subscription has been canceled']) {
    assert.ok(src.includes(s), s);
  }
  assert.ok(!/[\u0590-\u05ff]/.test(src), 'email.ts holds no Hebrew of its own');
});
