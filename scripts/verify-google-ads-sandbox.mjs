#!/usr/bin/env node
/**
 * Production sandbox smoke check. Run after loading .env.production:
 *   set -a && source .env.production && set +a
 *   node scripts/verify-google-ads-sandbox.mjs
 */
import crypto from 'node:crypto';

const baseUrl = process.env.WAO_APP_URL || 'https://www.wao.co.il';
const clientId = process.env.GOOGLE_ADS_SANDBOX_CLIENT_ID || 'google-ads-sandbox';
const secret = process.env.CLIENT_PORTAL_SECRET;

if (!secret) {
  console.error('CLIENT_PORTAL_SECRET is required for the sandbox smoke check.');
  process.exit(1);
}

const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
const payload = `${clientId}.${expiry}`;
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
let response;
let result;
for (let attempt = 1; attempt <= 10; attempt += 1) {
  try {
    response = await fetch(`${baseUrl}/api/google-ads/sandbox-verify`, {
      headers: { Cookie: `wao-client=${payload}.${signature}` },
    });
    result = await response.json().catch(() => null);
    if (response.ok && result?.success && result.mode === 'test') break;
  } catch {
    // PM2 may still be starting after a deployment.
  }
  await new Promise(resolve => setTimeout(resolve, 1000));
}

if (!response?.ok || !result?.success || result.mode !== 'test') {
  console.error('Google Ads sandbox verification failed:', result?.error || `HTTP ${response?.status ?? 'unreachable'}`);
  process.exit(1);
}

console.log(JSON.stringify({
  success: true,
  customer: result.customer?.name ?? null,
  campaign: result.campaign?.name ?? null,
  status: result.campaign?.status ?? null,
}, null, 2));
