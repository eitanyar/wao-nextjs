// Provider conformance suite on the mock (mission 2026-11-22 item 3). Zero Hebrew.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { MockPaymentProvider } from './mock';
import { paymentProviderConformanceChecks } from './conformance';
import { TAKBULL_FIELD_MAP, unconfirmedTakbullFields } from './takbull-fields';

for (const check of paymentProviderConformanceChecks(new MockPaymentProvider(), {
  validCallback: { sessionId: 'conformance' },
  invalidCallback: { simulateFailure: true },
  declineToken: MockPaymentProvider.DECLINE_TOKEN,
  retryableFailureToken: MockPaymentProvider.INSUFFICIENT_FUNDS_TOKEN,
  amount: 293.82,
})) {
  test(`mock conformance: ${check.name}`, check.run);
}

test('Takbull field mapping: one file, every field still null (nothing guessed), and takbull.ts stays a throwing stub', () => {
  const fields = unconfirmedTakbullFields();
  assert.ok(fields.length >= 20, 'every mapped field is listed');
  assert.ok(fields.includes('endpoints.chargeToken') && fields.includes('createDocumentRequest.amountIsGross'));
  assert.equal(JSON.stringify(TAKBULL_FIELD_MAP).match(/"[^"]+":"[^"]*"/g), null, 'no string value anywhere in the map');
  const stub = fs.readFileSync(path.join(process.cwd(), 'src/lib/payments/providers/takbull.ts'), 'utf8');
  assert.match(stub, /throw new TakbullNotConfiguredError\('chargeToken'\)/);
  assert.doesNotMatch(stub, /fetch\(/, 'no network call in the stub');
});
