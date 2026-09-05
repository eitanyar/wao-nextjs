import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeIsraeliPhone, sendWhatsAppTemplate } from './whatsapp-cloud';

test('normalizes valid Israeli mobile numbers and rejects invalid lengths', () => {
  assert.equal(normalizeIsraeliPhone('050-123-4567'), '972501234567');
  assert.equal(normalizeIsraeliPhone('+972 50 123 4567'), '972501234567');
  assert.equal(normalizeIsraeliPhone('050123456'), null);
  assert.equal(normalizeIsraeliPhone('0201234567'), null);
});

test('sends a configured approved template through an injected HTTP client', async () => {
  const seen: Array<{ url: string; init?: RequestInit }> = [];
  const result = await sendWhatsAppTemplate({
    to: '972501234567',
    templateName: 'lead_first_response',
    templateLanguage: 'en',
    httpClient: async (url, init) => {
      seen.push({ url, init });
      return new Response(JSON.stringify({ messages: [{ id: 'provider-message-id' }] }), { status: 200 });
    },
    config: { accessToken: 'test-token', phoneNumberId: 'phone-number-id', apiVersion: 'v22.0' },
  });

  assert.equal(result.messageId, 'provider-message-id');
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, 'https://graph.facebook.com/v22.0/phone-number-id/messages');
  assert.equal(seen[0].init?.method, 'POST');
  assert.equal(seen[0].init?.headers && (seen[0].init.headers as Record<string, string>).authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(String(seen[0].init?.body)), {
    messaging_product: 'whatsapp',
    to: '972501234567',
    type: 'template',
    template: { name: 'lead_first_response', language: { code: 'en' } },
  });
});

test('does not expose a provider response body when the template request fails', async () => {
  await assert.rejects(
    () => sendWhatsAppTemplate({
      to: '972501234567',
      templateName: 'lead_first_response',
      templateLanguage: 'en',
      httpClient: async () => new Response('sensitive provider response', { status: 500 }),
      config: { accessToken: 'test-token', phoneNumberId: 'phone-number-id', apiVersion: 'v22.0' },
    }),
    /WhatsApp provider request failed with status 500/,
  );
});
