import assert from 'node:assert/strict';
import test from 'node:test';
import { sendResendTransactionalEmail } from './resend-transactional';

test('transactional email requires explicit configuration and returns only a validated message id', async () => {
  let calls = 0;
  const result = await sendResendTransactionalEmail({
    to: 'person@example.com',
    from: 'WAO <no-reply@example.com>',
    subject: 'WAO recovery code',
    text: 'WAO recovery code: 48295173. Expires in 10 minutes.',
  }, {
    apiKey: 'synthetic-key',
    client: { emails: { send: async (input: unknown) => { calls += 1; assert.deepEqual(input, { to: 'person@example.com', from: 'WAO <no-reply@example.com>', subject: 'WAO recovery code', text: 'WAO recovery code: 48295173. Expires in 10 minutes.' }); return { data: { id: 'synthetic-message-id' }, error: null }; } } },
  });
  assert.deepEqual(result, { messageId: 'synthetic-message-id' });
  assert.equal(calls, 1);
  await assert.rejects(() => sendResendTransactionalEmail({ to: 'person@example.com', from: '', subject: 'x', text: 'x' }, { apiKey: 'synthetic-key' }));
});
