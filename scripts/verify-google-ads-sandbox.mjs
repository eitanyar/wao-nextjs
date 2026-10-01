#!/usr/bin/env node
/**
 * Production sandbox smoke check. Run after loading .env.production:
 *   set -a && source .env.production && set +a
 *   node scripts/verify-google-ads-sandbox.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function mintSandboxSessionToken({ clientId, sessionVersion, secret, expiry }) {
  const claim = { clientId, sessionVersion, expiry, scope: 'full' };
  const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

async function main() {
  const baseUrl = process.env.WAO_APP_URL || 'https://www.wao.co.il';
  const clientId = process.env.GOOGLE_ADS_SANDBOX_CLIENT_ID || 'google-ads-sandbox';
  const secret = process.env.CLIENT_PORTAL_SECRET;
  if (!secret) {
    console.error('CLIENT_PORTAL_SECRET is required for the sandbox smoke check.');
    process.exit(1);
  }
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(clientId)) {
    console.error('invalid_client_id');
    process.exit(1);
  }
  const runtimePath = path.join(process.env.WAO_RUNTIME_DATA_DIR || '/home/wao/wao-runtime-data', 'clients', clientId, 'client-auth.json');
  const localPath = path.join(process.cwd(), 'data', 'clients', clientId, 'client-auth.json');
  const authPath = [runtimePath, localPath].find(file => fs.existsSync(file));
  if (!authPath) {
    console.error(`Client auth record not found; probed ${runtimePath} and ${localPath}`);
    process.exit(1);
  }
  let sessionVersion;
  try {
    sessionVersion = JSON.parse(fs.readFileSync(authPath, 'utf8')).sessionVersion;
  } catch {
    console.error(`Cannot read client auth record: ${authPath}`);
    process.exit(1);
  }
  if (!Number.isInteger(sessionVersion) || sessionVersion <= 0) {
    console.error(`Invalid sessionVersion in client auth record: ${authPath}`);
    process.exit(1);
  }

  const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const token = mintSandboxSessionToken({ clientId, sessionVersion, secret, expiry });
  let response;
  let result;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      response = await fetch(`${baseUrl}/api/google-ads/sandbox-verify`, {
        headers: { Cookie: `wao-client=${token}` },
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
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
