import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { billingOutboxPath, sendMagicLinkCancelEmail } from './email';

// Step 2c fix (2026-11-25): the billing outbox follows SITE_BOT_EMAIL_OUTBOX_PATH, so a QA / mock-checkout run never
// appends under data/payments.
test('billing outbox: SITE_BOT_EMAIL_OUTBOX_PATH (absolute) wins; a relative or empty value keeps the data/ default', async () => {
  const saved = { outbox: process.env.SITE_BOT_EMAIL_OUTBOX_PATH, resend: process.env.RESEND_API_KEY };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-billing-outbox-'));
  try {
    delete process.env.RESEND_API_KEY;
    const file = path.join(dir, 'nested', 'outbox.jsonl');
    process.env.SITE_BOT_EMAIL_OUTBOX_PATH = file;
    assert.equal(billingOutboxPath(), file);
    await sendMagicLinkCancelEmail({ to: 'qa@example.com', cancelUrl: 'https://example.com/cancel' });
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).to, 'qa@example.com');
    process.env.SITE_BOT_EMAIL_OUTBOX_PATH = 'relative/outbox.jsonl';
    assert.equal(billingOutboxPath(), path.join(process.cwd(), 'data', 'payments', 'email-outbox.jsonl'));
    process.env.SITE_BOT_EMAIL_OUTBOX_PATH = '';
    assert.equal(billingOutboxPath(), path.join(process.cwd(), 'data', 'payments', 'email-outbox.jsonl'));
  } finally {
    if (saved.outbox === undefined) delete process.env.SITE_BOT_EMAIL_OUTBOX_PATH; else process.env.SITE_BOT_EMAIL_OUTBOX_PATH = saved.outbox;
    if (saved.resend !== undefined) process.env.RESEND_API_KEY = saved.resend;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
