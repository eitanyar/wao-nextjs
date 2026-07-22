import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from './route.js';
import * as batchModule from '@/lib/google-ads/weekly-digest-batch';
import * as mailModule from '@/lib/mail';

test('weekly-digest-cron returns 401 when CRON_SECRET header is missing or incorrect', async () => {
  process.env.CRON_SECRET = 'secret-123';
  const req = new Request('http://localhost/api/google-ads/weekly-digest-cron', {
    method: 'POST',
    headers: { 'x-cron-secret': 'wrong' },
  });
  const res = await POST(req);
  assert.equal(res.status, 401);
});

test('weekly-digest-cron returns 401 when CRON_SECRET env is unset/empty (fail closed)', async () => {
  delete process.env.CRON_SECRET;
  const req = new Request('http://localhost/api/google-ads/weekly-digest-cron', {
    method: 'POST',
    headers: { 'x-cron-secret': '' },
  });
  const res = await POST(req);
  assert.equal(res.status, 401);
});

test('weekly-digest-cron processes valid digests and sends emails', async () => {
  process.env.CRON_SECRET = 'secret-123';
  const origBuild = batchModule.buildAllClientDigests;
  const origSend = mailModule.sendGoogleAdsWeeklyDigestEmail;

  let emailCalls = 0;
  batchModule.buildAllClientDigests = () => [
    {
      clientId: 'client-1',
      status: 'ok',
      campaign: { slug: 'test', businessName: 'Test Biz' },
      digest: { totals: { leads: 5, closedDeals: 1 }, pacing: { status: 'on_track' }, alerts: [] },
    },
  ];
  mailModule.sendGoogleAdsWeeklyDigestEmail = async () => {
    emailCalls++;
  };

  try {
    const req = new Request('http://localhost/api/google-ads/weekly-digest-cron', {
      method: 'POST',
      headers: { 'x-cron-secret': 'secret-123' },
    });
    const res = await POST(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.results.length, 1);
    assert.equal(data.results[0].status, 'sent');
    assert.equal(emailCalls, 1);
  } finally {
    batchModule.buildAllClientDigests = origBuild;
    mailModule.sendGoogleAdsWeeklyDigestEmail = origSend;
  }
});

test('weekly-digest-cron isolates unbound clients and skips email send for them', async () => {
  process.env.CRON_SECRET = 'secret-123';
  const origBuild = batchModule.buildAllClientDigests;
  const origSend = mailModule.sendGoogleAdsWeeklyDigestEmail;

  let emailCalls = 0;
  batchModule.buildAllClientDigests = () => [
    { clientId: 'client-unbound', status: 'unbound', error: 'Missing config' },
    {
      clientId: 'client-ok',
      status: 'ok',
      campaign: { slug: 'test', businessName: 'OK Biz' },
      digest: { totals: { leads: 2, closedDeals: 0 }, pacing: { status: 'on_track' }, alerts: [] },
    },
  ];
  mailModule.sendGoogleAdsWeeklyDigestEmail = async () => {
    emailCalls++;
  };

  try {
    const req = new Request('http://localhost/api/google-ads/weekly-digest-cron', {
      method: 'POST',
      headers: { 'x-cron-secret': 'secret-123' },
    });
    const res = await POST(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.results.length, 2);
    assert.equal(data.results[0].status, 'unbound');
    assert.equal(data.results[1].status, 'sent');
    assert.equal(emailCalls, 1);
  } finally {
    batchModule.buildAllClientDigests = origBuild;
    mailModule.sendGoogleAdsWeeklyDigestEmail = origSend;
  }
});

test('weekly-digest-cron records email_failed distinctly when email sending throws', async () => {
  process.env.CRON_SECRET = 'secret-123';
  const origBuild = batchModule.buildAllClientDigests;
  const origSend = mailModule.sendGoogleAdsWeeklyDigestEmail;

  batchModule.buildAllClientDigests = () => [
    {
      clientId: 'client-ok',
      status: 'ok',
      campaign: { slug: 'test', businessName: 'OK Biz' },
      digest: { totals: { leads: 2, closedDeals: 0 }, pacing: { status: 'on_track' }, alerts: [] },
    },
  ];
  mailModule.sendGoogleAdsWeeklyDigestEmail = async () => {
    throw new Error('Resend down');
  };

  try {
    const req = new Request('http://localhost/api/google-ads/weekly-digest-cron', {
      method: 'POST',
      headers: { 'x-cron-secret': 'secret-123' },
    });
    const res = await POST(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.results.length, 1);
    assert.equal(data.results[0].status, 'email_failed');
    assert.match(data.results[0].error, /Resend down/);
  } finally {
    batchModule.buildAllClientDigests = origBuild;
    mailModule.sendGoogleAdsWeeklyDigestEmail = origSend;
  }
});
