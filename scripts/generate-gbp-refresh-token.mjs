#!/usr/bin/env node
/**
 * Generate a GBP refresh token interactively.
 *
 * Usage: node scripts/generate-gbp-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
 *
 * Flow:
 * 1. Prints an authorization URL
 * 2. You paste it in your browser
 * 3. You approve the permissions
 * 4. Browser redirects to localhost:3000 with a code
 * 5. This script exchanges the code for a refresh token
 * 6. Prints GBP_REFRESH_TOKEN value to add to .env.local
 */

import http from 'http';
import { URL } from 'url';

const [clientId, clientSecret] = process.argv.slice(2);

if (!clientId || !clientSecret) {
  console.error('Usage: node scripts/generate-gbp-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000/oauth-callback';
const SCOPE = 'https://www.googleapis.com/auth/business.manage';
const AUTH_URL = new URL('https://accounts.google.com/o/oauth2/v2/auth');

AUTH_URL.searchParams.set('client_id', clientId);
AUTH_URL.searchParams.set('redirect_uri', REDIRECT_URI);
AUTH_URL.searchParams.set('response_type', 'code');
AUTH_URL.searchParams.set('scope', SCOPE);
AUTH_URL.searchParams.set('access_type', 'offline');
AUTH_URL.searchParams.set('prompt', 'consent');

console.log('\n📋 Follow these steps:\n');
console.log('1. Open this URL in your browser:');
console.log(`   ${AUTH_URL.toString()}\n`);
console.log('2. Sign in and approve the permissions');
console.log('3. You\'ll be redirected to localhost:3000 — copy the "code" from the URL\n');
console.log('Waiting for authorization code...\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3000');
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Error</h1><p>${error}</p>`);
    console.error(`\n❌ Authorization failed: ${error}\n`);
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>No authorization code</h1>');
    console.error('\n❌ No authorization code received\n');
    process.exit(1);
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>✅ Authorization successful</h1><p>You can close this window and return to the terminal.</p>');

  console.log(`✅ Authorization code received.\n`);
  console.log(`🔄 Exchanging code for refresh token...\n`);

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    const json = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error(`❌ Token exchange failed: ${json.error} ${json.error_description}`);
      process.exit(1);
    }

    console.log('✅ Token exchange successful!\n');
    console.log('📝 Add these to your .env.local:\n');
    console.log(`GBP_CLIENT_ID=${clientId}`);
    console.log(`GBP_CLIENT_SECRET=${clientSecret}`);
    console.log(`GBP_REFRESH_TOKEN=${json.refresh_token}\n`);
    console.log('Then run: npm run dev (to start the app)\n');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error(`❌ Token exchange error: ${err.message}`);
    process.exit(1);
  }
});

server.listen(3000, () => {
  console.log('Listening on http://localhost:3000 for callback...\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n❌ Port 3000 is already in use. Stop the dev server and try again.\n');
  } else {
    console.error(`\n❌ Server error: ${err.message}\n`);
  }
  process.exit(1);
});
