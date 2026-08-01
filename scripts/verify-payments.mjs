import http from 'http';
import https from 'https';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';

const BASE_URL = process.env.VERIFY_BASE_URL || 'http://localhost:3012';
const DB_PATH = process.env.VERIFY_DB_PATH || '/tmp/verify-cardupdate-billing.db';
const CRON_SECRET = process.env.VERIFY_CRON_SECRET || 'test-secret-12345';
const EMAIL_OUTBOX = '/home/eitanya/wao/data/payments/email-outbox.jsonl';

let testsSummary = {
  passed: [],
  failed: [],
};

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const method = options.method || (options.body ? 'POST' : 'GET');
    
    const reqOptions = {
      method,
      headers: options.headers || {},
    };
    
    if (options.body && typeof options.body === 'object') {
      reqOptions.headers['Content-Type'] = 'application/json';
    }
    
    if (options.followRedirects === false) {
      reqOptions.redirect = 'manual';
    }
    
    const req = proto.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function log(msg) {
  console.log(`[VERIFIER] ${msg}`);
}

function pass(testName) {
  testsSummary.passed.push(testName);
  log(`✓ PASS: ${testName}`);
}

function fail(testName, reason) {
  testsSummary.failed.push({ test: testName, reason });
  log(`✗ FAIL: ${testName} - ${reason}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function parseTokenFromEmail(emailText) {
  // More robust parsing: look for token=<hex string>
  const match = emailText.match(/token=([a-zA-Z0-9._\-]+)/);
  if (match) {
    return match[1];
  }
  // Fallback: look for subscription\?token=
  const match2 = emailText.match(/subscription\?token=([^&\s]+)/);
  if (match2) {
    return match2[1];
  }
  return null;
}

async function test1_CardUpdateHealthySubscription() {
  log('\n=== TEST 1: Card-update flow with healthy subscription ===');
  
  try {
    // Step 1a: Create subscription
    log('Step 1a: Create subscription');
    const createResp = await httpRequest(`${BASE_URL}/api/subscriptions/create`, {
      method: 'POST',
      body: {
        email: 'test-healthy@example.com',
        trialAmount: 100,
        recurringAmount: 200,
        currency: 'ILS',
      },
    });
    
    if (createResp.status !== 200) {
      fail('1-create-subscription', `HTTP ${createResp.status}`);
      return;
    }
    
    const createBody = JSON.parse(createResp.body);
    const subId = createBody.subscriptionId;
    log(`Created subscription: ${subId}`);
    
    // Step 1b: Simulate callback
    log('Step 1b: Simulate signup callback');
    const callbackResp = await httpRequest(
      `${BASE_URL}/api/subscriptions/callback?subscriptionId=${subId}&provider=mock&token=tok_mock_healthy_card&cardLast4=4242&cardExpiry=12/30`,
      { followRedirects: false }
    );
    
    if (![301, 302, 303, 307, 308].includes(callbackResp.status)) {
      fail('1-callback', `Expected redirect, got HTTP ${callbackResp.status}`);
      return;
    }
    log(`Callback redirected with HTTP ${callbackResp.status}`);
    
    await sleep(2000);
    
    // Verify subscription is active
    const db = new Database(DB_PATH);
    const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subId);
    db.close();
    
    if (!row) {
      fail('1-verify-subscription-exists', 'Subscription not found in DB');
      return;
    }
    
    if (row.status !== 'active' && row.status !== 'trialing') {
      fail('1-verify-subscription-active', `Status is ${row.status}, expected active/trialing`);
      return;
    }
    
    log(`Subscription status: ${row.status}`);
    pass('1-subscription-created-and-active');
    
    // Step 1c: Request magic link
    log('Step 1c: Request magic link');
    const magicLinkResp = await httpRequest(`${BASE_URL}/api/subscriptions/magic-link/request`, {
      method: 'POST',
      body: { email: 'test-healthy@example.com' },
    });
    
    if (magicLinkResp.status !== 200) {
      fail('1-magic-link-request', `HTTP ${magicLinkResp.status}`);
      return;
    }
    
    await sleep(1000);
    
    // Extract token from email outbox
    log('Step 1d: Extract magic link from email outbox');
    if (!fs.existsSync(EMAIL_OUTBOX)) {
      fail('1-email-outbox', 'Email outbox file not found');
      return;
    }
    
    const emailLines = fs.readFileSync(EMAIL_OUTBOX, 'utf-8').trim().split('\n');
    const lastEmail = JSON.parse(emailLines[emailLines.length - 1]);
    const magicToken = parseTokenFromEmail(lastEmail.text);
    
    if (!magicToken) {
      fail('1-extract-magic-token', 'Could not parse token from email');
      log(`Email text: ${lastEmail.text}`);
      return;
    }
    
    log(`Extracted magic token: ${magicToken.substring(0, 20)}...`);
    pass('1-magic-link-extracted');
    
    // Step 1e: Create card-update session
    log('Step 1e: Create card-update session');
    const cardUpdateCreateResp = await httpRequest(`${BASE_URL}/api/subscriptions/card-update/create`, {
      method: 'POST',
      body: { token: magicToken },
    });
    
    if (cardUpdateCreateResp.status !== 200) {
      fail('1-card-update-create', `HTTP ${cardUpdateCreateResp.status}`);
      return;
    }
    
    const cardUpdateCreateBody = JSON.parse(cardUpdateCreateResp.body);
    if (!cardUpdateCreateBody.success) {
      fail('1-card-update-create', `Response: ${cardUpdateCreateBody.error}`);
      return;
    }
    
    log(`Card-update session created`);
    pass('1-card-update-session-created');
    
    // Step 1f: Simulate card-update callback
    log('Step 1f: Simulate card-update callback');
    const cardUpdateCallbackUrl = `${BASE_URL}/api/subscriptions/card-update/callback?subscriptionId=${subId}&mlt=${magicToken}&token=tok_mock_new_card_healthy&cardLast4=9999&cardExpiry=11/31`;
    const cardUpdateCallbackResp = await httpRequest(cardUpdateCallbackUrl, {
      followRedirects: false,
    });
    
    if (![301, 302, 303, 307, 308].includes(cardUpdateCallbackResp.status)) {
      fail('1-card-update-callback', `Expected redirect, got HTTP ${cardUpdateCallbackResp.status}`);
      return;
    }
    
    log(`Card-update callback redirected with HTTP ${cardUpdateCallbackResp.status}`);
    
    await sleep(1000);
    
    // Step 1g: Verify card was updated
    log('Step 1g: Verify card was updated');
    const db2 = new Database(DB_PATH);
    const updatedRow = db2.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subId);
    db2.close();
    
    if (updatedRow.card_last4 !== '9999') {
      fail('1-card-updated', `card_last4 is ${updatedRow.card_last4}, expected 9999`);
      return;
    }
    
    if (updatedRow.card_expiry !== '11/31') {
      fail('1-card-expiry-updated', `card_expiry is ${updatedRow.card_expiry}, expected 11/31`);
      return;
    }
    
    log(`Card updated: last4=${updatedRow.card_last4}, expiry=${updatedRow.card_expiry}`);
    pass('1-card-update-successful');
    
    // Step 1h: Verify magic link token is consumed
    log('Step 1h: Verify magic link is consumed (reuse should fail)');
    const reuseResp = await httpRequest(`${BASE_URL}/api/subscriptions/card-update/create`, {
      method: 'POST',
      body: { token: magicToken },
    });
    
    const reuseBody = JSON.parse(reuseResp.body);
    if (reuseBody.success) {
      fail('1-magic-link-consumed', 'Magic link should have been consumed but was reusable');
      return;
    }
    
    log(`Reuse attempt correctly rejected: ${reuseBody.error}`);
    pass('1-magic-link-consumed');
    
    // Step 1i: Verify card_updated event exists
    log('Step 1i: Verify card_updated event in DB');
    const db3 = new Database(DB_PATH);
    const event = db3.prepare(
      `SELECT event_type FROM subscription_events WHERE subscription_id = ? AND event_type = 'card_updated'`
    ).get(subId);
    db3.close();
    
    if (!event) {
      fail('1-card-updated-event', 'No card_updated event found');
      return;
    }
    
    pass('1-card-updated-event');
    log('✓ TEST 1 COMPLETE: All checks passed');
    
  } catch (err) {
    fail('1-unexpected-error', err.message);
  }
}

async function test2_CardUpdatePastDueRecharge() {
  log('\n=== TEST 2: Card-update flow with past_due subscription (immediate recharge) ===');
  
  try {
    const subId = crypto.randomUUID();
    const db = new Database(DB_PATH);
    
    // Create a past_due subscription manually
    log('Step 2a: Create past_due subscription in DB');
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO subscriptions (
        id, user_id, status, provider, provider_token, card_last4, card_expiry,
        trial_amount, recurring_amount, currency, next_charge_at, canceled_at,
        cancel_reason, failed_attempts, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      subId,
      'test-pastdue@example.com',
      'past_due',
      'mock',
      Buffer.from('tok_mock_decline_old_card:00000000000000000000000000000000'),
      '4242',
      '12/30',
      100,
      200,
      'ILS',
      null,
      null,
      null,
      0,
      now,
      now
    );
    
    db.prepare(`
      INSERT INTO subscription_events (id, subscription_id, event_type, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      subId,
      'created',
      JSON.stringify({ email: 'test-pastdue@example.com' }),
      now
    );
    
    db.close();
    log(`Created past_due subscription: ${subId}`);
    pass('2-past-due-subscription-created');
    
    // Generate magic link
    log('Step 2b: Generate magic link for card update');
    const magicLinkResp = await httpRequest(`${BASE_URL}/api/subscriptions/magic-link/request`, {
      method: 'POST',
      body: { email: 'test-pastdue@example.com' },
    });
    
    await sleep(1000);
    
    // Extract token from email outbox
    const emailLines = fs.readFileSync(EMAIL_OUTBOX, 'utf-8').trim().split('\n');
    const lastEmail = JSON.parse(emailLines[emailLines.length - 1]);
    const magicToken = parseTokenFromEmail(lastEmail.text);
    
    if (!magicToken) {
      fail('2-extract-magic-token', 'Could not parse token from email');
      log(`Email text: ${lastEmail.text}`);
      return;
    }
    
    log(`Magic token: ${magicToken.substring(0, 20)}...`);
    
    // Create card-update session
    log('Step 2c: Create card-update session');
    const cardUpdateCreateResp = await httpRequest(`${BASE_URL}/api/subscriptions/card-update/create`, {
      method: 'POST',
      body: { token: magicToken },
    });
    
    if (cardUpdateCreateResp.status !== 200) {
      fail('2-card-update-create', `HTTP ${cardUpdateCreateResp.status}`);
      return;
    }
    
    pass('2-card-update-session-created');
    
    // Simulate card-update callback with GOOD card (should charge)
    log('Step 2d: Simulate card-update callback with good card');
    const cardUpdateCallbackUrl = `${BASE_URL}/api/subscriptions/card-update/callback?subscriptionId=${subId}&mlt=${magicToken}&token=tok_mock_good_new_card&cardLast4=1111&cardExpiry=10/29`;
    const cardUpdateCallbackResp = await httpRequest(cardUpdateCallbackUrl, {
      followRedirects: false,
    });
    
    if (![301, 302, 303, 307, 308].includes(cardUpdateCallbackResp.status)) {
      fail('2-card-update-callback', `Expected redirect, got HTTP ${cardUpdateCallbackResp.status}`);
      return;
    }
    
    await sleep(1000);
    
    // Verify subscription is now active and has a fresh next_charge_at
    log('Step 2e: Verify subscription is recharged and active');
    const db2 = new Database(DB_PATH);
    const updatedRow = db2.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subId);
    db2.close();
    
    if (updatedRow.status !== 'active') {
      fail('2-recharge-status', `Status is ${updatedRow.status}, expected active`);
      return;
    }
    
    if (!updatedRow.next_charge_at) {
      fail('2-recharge-next-charge', 'next_charge_at is NULL, expected a future date');
      return;
    }
    
    log(`Subscription recharged: status=${updatedRow.status}, next_charge_at=${updatedRow.next_charge_at}`);
    pass('2-recharge-successful');
    
    // Verify a charge row exists
    log('Step 2f: Verify charge row exists');
    const db3 = new Database(DB_PATH);
    const charge = db3.prepare(
      `SELECT * FROM charges WHERE subscription_id = ? AND status = 'succeeded'`
    ).get(subId);
    db3.close();
    
    if (!charge) {
      fail('2-charge-row', 'No succeeded charge found');
      return;
    }
    
    log(`Charge found: ${charge.id}, amount=${charge.amount}`);
    pass('2-charge-row-created');
    
    // Verify renewed event exists
    log('Step 2g: Verify renewed event');
    const db4 = new Database(DB_PATH);
    const renewedEvent = db4.prepare(
      `SELECT * FROM subscription_events WHERE subscription_id = ? AND event_type = 'renewed'`
    ).get(subId);
    db4.close();
    
    if (!renewedEvent) {
      fail('2-renewed-event', 'No renewed event found');
      return;
    }
    
    pass('2-renewed-event');
    log('✓ TEST 2 COMPLETE: past_due recharge successful');
    
  } catch (err) {
    fail('2-unexpected-error', err.message);
  }
}

async function test3_ForgedCallback() {
  log('\n=== TEST 3: Forged card-update callback (security check) ===');
  
  try {
    const subId = crypto.randomUUID();
    const db = new Database(DB_PATH);
    
    // Create a subscription
    log('Step 3a: Create test subscription');
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO subscriptions (
        id, user_id, status, provider, provider_token, card_last4, card_expiry,
        trial_amount, recurring_amount, currency, next_charge_at, canceled_at,
        cancel_reason, failed_attempts, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      subId,
      'test-forged@example.com',
      'active',
      'mock',
      Buffer.from('tok_mock_original:00000000000000000000000000000000'),
      '4242',
      '12/30',
      100,
      200,
      'ILS',
      now,
      null,
      null,
      0,
      now,
      now
    );
    db.close();
    
    const originalCard = '4242';
    pass('3-test-subscription-created');
    
    // Hit callback with forged/invalid params
    log('Step 3b: Hit callback with invalid params (invalid mlt)');
    const forgedUrl = `${BASE_URL}/api/subscriptions/card-update/callback?subscriptionId=${subId}&mlt=invalid_token&token=tok_forged&cardLast4=9999&cardExpiry=09/99`;
    const forgedResp = await httpRequest(forgedUrl, {
      followRedirects: false,
    });
    
    if ([301, 302, 303, 307, 308].includes(forgedResp.status)) {
      log(`Forged callback redirected (expected)`);
    } else {
      log(`Forged callback HTTP ${forgedResp.status}`);
    }
    
    await sleep(500);
    
    // Verify subscription was NOT modified
    log('Step 3c: Verify subscription card was NOT modified');
    const db2 = new Database(DB_PATH);
    const untouchedRow = db2.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subId);
    db2.close();
    
    if (untouchedRow.card_last4 !== originalCard) {
      fail('3-forged-callback-protection', `Card was modified to ${untouchedRow.card_last4}`);
      return;
    }
    
    log(`Card unchanged: ${untouchedRow.card_last4}`);
    pass('3-forged-callback-protection');
    
    // Verify no card_updated event exists
    log('Step 3d: Verify no card_updated event was created');
    const db3 = new Database(DB_PATH);
    const events = db3.prepare(
      `SELECT COUNT(*) as cnt FROM subscription_events WHERE subscription_id = ? AND event_type = 'card_updated'`
    ).get(subId);
    db3.close();
    
    if (events.cnt > 0) {
      fail('3-no-event', `${events.cnt} card_updated events found, expected 0`);
      return;
    }
    
    pass('3-no-event-created');
    log('✓ TEST 3 COMPLETE: Forged callback properly rejected');
    
  } catch (err) {
    fail('3-unexpected-error', err.message);
  }
}

async function test4_CardExpiryNoticeCron() {
  log('\n=== TEST 4: Card-expiry-notice cron ===');
  
  try {
    const subId = crypto.randomUUID();
    const db = new Database(DB_PATH);
    
    // Create subscription with card expiring this month
    log('Step 4a: Create subscription with card expiring this month');
    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const year = String(now.getUTCFullYear() % 100).padStart(2, '0');
    const expiryThisMonth = `${month}/${year}`;
    
    const timestamp = now.toISOString();
    db.prepare(`
      INSERT INTO subscriptions (
        id, user_id, status, provider, provider_token, card_last4, card_expiry,
        trial_amount, recurring_amount, currency, next_charge_at, canceled_at,
        cancel_reason, failed_attempts, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      subId,
      'test-expiry@example.com',
      'active',
      'mock',
      Buffer.from('tok_mock_expiring:00000000000000000000000000000000'),
      '4242',
      expiryThisMonth,
      100,
      200,
      'ILS',
      timestamp,
      null,
      null,
      0,
      timestamp,
      timestamp
    );
    db.close();
    
    log(`Created subscription with expiry: ${expiryThisMonth}`);
    pass('4-subscription-with-expiry-created');
    
    // Clear email outbox to detect new email
    const emailOutboxBackup = `${EMAIL_OUTBOX}.backup`;
    if (fs.existsSync(EMAIL_OUTBOX)) {
      fs.copyFileSync(EMAIL_OUTBOX, emailOutboxBackup);
    }
    fs.writeFileSync(EMAIL_OUTBOX, '');
    
    // Run cron
    log('Step 4b: Run card-expiry-notice cron');
    const cronResp = await httpRequest(`${BASE_URL}/api/subscriptions/cron/card-expiry-notices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });
    
    if (cronResp.status !== 200) {
      fail('4-cron-execution', `HTTP ${cronResp.status}`);
      if (fs.existsSync(emailOutboxBackup)) {
        fs.writeFileSync(EMAIL_OUTBOX, fs.readFileSync(emailOutboxBackup, 'utf-8'));
      }
      return;
    }
    
    const cronBody = JSON.parse(cronResp.body);
    log(`Cron executed: sent=${cronBody.sent}, candidates=${cronBody.candidates}`);
    
    if (cronBody.sent < 1) {
      fail('4-cron-sent', `Expected at least 1 email sent, got ${cronBody.sent}`);
      if (fs.existsSync(emailOutboxBackup)) {
        fs.writeFileSync(EMAIL_OUTBOX, fs.readFileSync(emailOutboxBackup, 'utf-8'));
      }
      return;
    }
    
    pass('4-cron-sent-email');
    
    // Verify email was sent
    log('Step 4c: Verify email in outbox');
    await sleep(1000);
    const emailContent = fs.readFileSync(EMAIL_OUTBOX, 'utf-8').trim();
    if (!emailContent) {
      fail('4-email-in-outbox', 'No emails in outbox');
      if (fs.existsSync(emailOutboxBackup)) {
        fs.writeFileSync(EMAIL_OUTBOX, fs.readFileSync(emailOutboxBackup, 'utf-8'));
      }
      return;
    }
    
    const emailLines = emailContent.split('\n').filter(l => l);
    const lastEmail = JSON.parse(emailLines[emailLines.length - 1]);
    if (!lastEmail.subject || !lastEmail.subject.includes('expiring')) {
      fail('4-email-subject', `Subject doesn't mention expiring: ${lastEmail.subject}`);
      if (fs.existsSync(emailOutboxBackup)) {
        fs.writeFileSync(EMAIL_OUTBOX, fs.readFileSync(emailOutboxBackup, 'utf-8'));
      }
      return;
    }
    
    log(`Email sent: "${lastEmail.subject}"`);
    pass('4-email-sent-with-correct-subject');
    
    // Verify event was recorded
    log('Step 4d: Verify card_expiry_notice_sent event');
    const db2 = new Database(DB_PATH);
    const event = db2.prepare(
      `SELECT * FROM subscription_events WHERE subscription_id = ? AND event_type = 'card_expiry_notice_sent'`
    ).get(subId);
    db2.close();
    
    if (!event) {
      fail('4-event-recorded', 'No card_expiry_notice_sent event found');
      if (fs.existsSync(emailOutboxBackup)) {
        fs.writeFileSync(EMAIL_OUTBOX, fs.readFileSync(emailOutboxBackup, 'utf-8'));
      }
      return;
    }
    
    log(`Event recorded: ${event.event_type}`);
    pass('4-event-recorded');
    
    // Run cron again immediately - should skip
    log('Step 4e: Run cron again - should skip (already sent this month)');
    fs.writeFileSync(EMAIL_OUTBOX, '');
    const cronResp2 = await httpRequest(`${BASE_URL}/api/subscriptions/cron/card-expiry-notices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });
    
    const cronBody2 = JSON.parse(cronResp2.body);
    log(`Second run: sent=${cronBody2.sent}, skipped=${cronBody2.skippedAlreadySent}`);
    
    if (cronBody2.sent > 0) {
      fail('4-cron-idempotency', `Should have sent 0 emails on second run, got ${cronBody2.sent}`);
      if (fs.existsSync(emailOutboxBackup)) {
        fs.writeFileSync(EMAIL_OUTBOX, fs.readFileSync(emailOutboxBackup, 'utf-8'));
      }
      return;
    }
    
    pass('4-cron-idempotency');
    
    // Test auth
    log('Step 4f: Test cron auth rejection (no bearer token)');
    const noAuthResp = await httpRequest(`${BASE_URL}/api/subscriptions/cron/card-expiry-notices`, {
      method: 'POST',
    });
    
    if (noAuthResp.status !== 401) {
      fail('4-cron-auth', `Expected 401, got ${noAuthResp.status}`);
      if (fs.existsSync(emailOutboxBackup)) {
        fs.writeFileSync(EMAIL_OUTBOX, fs.readFileSync(emailOutboxBackup, 'utf-8'));
      }
      return;
    }
    
    pass('4-cron-auth-required');
    
    // Restore email outbox
    if (fs.existsSync(emailOutboxBackup)) {
      fs.writeFileSync(EMAIL_OUTBOX, fs.readFileSync(emailOutboxBackup, 'utf-8'));
      fs.unlinkSync(emailOutboxBackup);
    }
    
    log('✓ TEST 4 COMPLETE: Card-expiry cron working correctly');
    
  } catch (err) {
    fail('4-unexpected-error', err.message);
  }
}

async function test5_BuildSanity() {
  log('\n=== TEST 5: Build sanity check ===');
  
  try {
    log('Step 5a: Check that build completed successfully');
    
    const nextDir = '/home/eitanya/wao/.next';
    if (!fs.existsSync(nextDir)) {
      fail('5-build-output', '.next directory not found');
      return;
    }
    
    log('Build output (.next) directory exists');
    pass('5-build-completed');
    
    log('✓ TEST 5 COMPLETE: Build is functional');
    
  } catch (err) {
    fail('5-unexpected-error', err.message);
  }
}

async function main() {
  log('Starting comprehensive payment verification...\n');
  
  // Wait for server to be ready
  await sleep(2000);
  
  await test1_CardUpdateHealthySubscription();
  await test2_CardUpdatePastDueRecharge();
  await test3_ForgedCallback();
  await test4_CardExpiryNoticeCron();
  await test5_BuildSanity();
  
  // Summary
  log('\n' + '='.repeat(60));
  log('VERIFICATION SUMMARY');
  log('='.repeat(60));
  log(`Passed: ${testsSummary.passed.length}`);
  log(`Failed: ${testsSummary.failed.length}`);
  
  if (testsSummary.passed.length > 0) {
    log('\nPassed tests:');
    testsSummary.passed.forEach(t => log(`  ✓ ${t}`));
  }
  
  if (testsSummary.failed.length > 0) {
    log('\nFailed tests:');
    testsSummary.failed.forEach(t => log(`  ✗ ${t.test}: ${t.reason}`));
  }
  
  log('='.repeat(60));
  process.exit(testsSummary.failed.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
