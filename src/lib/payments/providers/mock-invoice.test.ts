import test from 'node:test';
import assert from 'node:assert';
import { MockInvoiceProvider } from './mock-invoice';

test('MockInvoiceProvider.createInvoice returns a usable invoiceId', async () => {
  const provider = new MockInvoiceProvider();
  const result = await provider.createInvoice({
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    amount: 100,
    description: 'WAO subscription charge',
    externalId: 'charge_1',
  });

  assert.ok(result.invoiceId.length > 0);
  assert.ok(result.pdfUrl?.includes(result.invoiceId));
});
