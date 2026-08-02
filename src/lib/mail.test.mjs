import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// mail.ts is TypeScript and this test suite runs under plain `node --test`
// (no TS loader registered — see route.test.mjs / other src/**/*.test.mjs for
// the same constraint), so we can't `import` it directly. Instead we extract
// the real `sendLeadNotificationEmail` function body from the source text,
// strip the (few, erasable) type annotations, and re-execute it as plain JS
// with a mocked `sendResendEmail` — this exercises the actual branching logic
// rather than a hand-duplicated copy of it.

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const mailPath = path.join(baseDir, 'mail.ts');
const mailCode = fs.readFileSync(mailPath, 'utf8');

function extractSendLeadNotificationEmail() {
  const startMarker = 'export async function sendLeadNotificationEmail(lead: any) {';
  const start = mailCode.indexOf(startMarker);
  assert.ok(start !== -1, 'sendLeadNotificationEmail should exist in mail.ts');
  const rest = mailCode.slice(start + startMarker.length);

  // Brace-count to the function's own closing '}' (not a fixed marker) so we
  // don't accidentally swallow it into our re-wrapped function below.
  let depth = 1;
  let i = 0;
  for (; i < rest.length && depth > 0; i++) {
    if (rest[i] === '{') depth += 1;
    else if (rest[i] === '}') depth -= 1;
  }
  assert.ok(depth === 0, 'should find the matching closing brace');
  let body = rest.slice(0, i - 1); // exclude the closing '}' itself

  // Strip the handful of erasable type annotations so this runs as plain JS.
  body = body.replace(/let (\w+): string;/g, 'let $1;');

  // eslint-disable-next-line no-new-func
  const factory = new Function('sendResendEmail', `
    return (async function (lead) {
      ${body}
    });
  `);
  return factory;
}

function makeMockSendResendEmail() {
  const calls = [];
  const fn = async (params) => { calls.push(params); };
  fn.calls = () => calls;
  return fn;
}

test('sendLeadNotificationEmail: type "phone-click" — no name/phone framing, click-specific heading/subject', async () => {
  const mockSend = makeMockSendResendEmail();
  const sendLeadNotificationEmail = extractSendLeadNotificationEmail()(mockSend);

  await sendLeadNotificationEmail({ type: 'phone-click', businessNiche: 'שרברב תל אביב', date: '2026-08-02 10:00' });

  assert.equal(mockSend.calls().length, 1);
  const { subject, html } = mockSend.calls()[0];
  assert.match(html, /מישהו לחץ להתקשר מדף הנחיתה/);
  assert.doesNotMatch(html, /לא הוזן/); // no "not entered" framing for a click-stub
  assert.doesNotMatch(html, /שם מלא/);
  assert.doesNotMatch(html, /טלפון:/);
  assert.match(subject, /לחיצה על טלפון/);
});

test('sendLeadNotificationEmail: type "whatsapp-click" — no name/phone framing, click-specific heading/subject', async () => {
  const mockSend = makeMockSendResendEmail();
  const sendLeadNotificationEmail = extractSendLeadNotificationEmail()(mockSend);

  await sendLeadNotificationEmail({ type: 'whatsapp-click', businessNiche: 'שרברב תל אביב', date: '2026-08-02 10:00' });

  assert.equal(mockSend.calls().length, 1);
  const { subject, html } = mockSend.calls()[0];
  assert.match(html, /מישהו לחץ על וואטסאפ מדף הנחיתה/);
  assert.doesNotMatch(html, /לא הוזן/);
  assert.doesNotMatch(html, /שם מלא/);
  assert.doesNotMatch(html, /טלפון:/);
  assert.match(subject, /לחיצה על וואטסאפ/);
});

test('sendLeadNotificationEmail: type "form" (and unset, for backward compat) keep the original name/phone template unchanged', async () => {
  for (const type of ['form', undefined]) {
    const mockSend = makeMockSendResendEmail();
    const sendLeadNotificationEmail = extractSendLeadNotificationEmail()(mockSend);

    await sendLeadNotificationEmail({ type, name: 'דני כהן', phone: '050-1234567', businessNiche: 'שרברב תל אביב', date: '2026-08-02 10:00' });

    assert.equal(mockSend.calls().length, 1);
    const { subject, html } = mockSend.calls()[0];
    assert.match(html, /ליד חדש נכנס! 🚀/);
    assert.match(html, /שם מלא:<\/strong> דני כהן/);
    assert.match(html, /טלפון:<\/strong> <a href="tel:050-1234567">050-1234567<\/a>/);
    assert.match(subject, /ליד חדש התקבל: דני כהן/);
  }
});

test('sendLeadNotificationEmail: form lead with no name/phone falls back to "לא הוזן" (unchanged pre-existing behavior)', async () => {
  const mockSend = makeMockSendResendEmail();
  const sendLeadNotificationEmail = extractSendLeadNotificationEmail()(mockSend);

  await sendLeadNotificationEmail({ type: 'form', date: '2026-08-02 10:00' });

  const { subject, html } = mockSend.calls()[0];
  assert.match(html, /שם מלא:<\/strong> לא הוזן/);
  assert.match(html, /טלפון:<\/strong> <a href="tel:undefined">לא הוזן<\/a>/);
  assert.match(subject, /לקוח פוטנציאלי/);
});

test('the three lead-type branches produce meaningfully different HTML from each other', async () => {
  const lead = { name: 'דני כהן', phone: '050-1234567', businessNiche: 'שרברב תל אביב', date: '2026-08-02 10:00' };
  const htmls = {};
  for (const type of ['form', 'phone-click', 'whatsapp-click']) {
    const mockSend = makeMockSendResendEmail();
    const sendLeadNotificationEmail = extractSendLeadNotificationEmail()(mockSend);
    await sendLeadNotificationEmail({ ...lead, type });
    htmls[type] = mockSend.calls()[0].html;
  }
  assert.notEqual(htmls['form'], htmls['phone-click']);
  assert.notEqual(htmls['form'], htmls['whatsapp-click']);
  assert.notEqual(htmls['phone-click'], htmls['whatsapp-click']);
});
