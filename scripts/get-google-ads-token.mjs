/**
 * One-time script to generate a Google Ads API refresh token.
 * Run: node scripts/get-google-ads-token.mjs
 * Authorize with eitan@wao.co.il when the browser opens.
 */

import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import fs from 'fs';
import path from 'path';

// Load .env.local manually
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn('Failed to load .env.local:', e.message);
}

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GOOGLE_ADS_CLIENT_ID or GOOGLE_ADS_CLIENT_SECRET in .env.local');
  process.exit(1);
}

const REDIRECT_PORT = 4242;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;
const SCOPE = 'https://www.googleapis.com/auth/adwords';

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log('\n=== Google Ads OAuth2 Token Generator ===\n');
console.log('Opening browser for authorization...');
console.log('If the browser does not open, visit this URL manually:\n');
console.log(authUrl, '\n');

// Try to open browser (Linux/WSL)
exec(`explorer.exe "${authUrl}" 2>/dev/null || xdg-open "${authUrl}" 2>/dev/null || open "${authUrl}" 2>/dev/null`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<h2>Authorization denied: ${error}</h2><p>You can close this tab.</p>`);
    server.close();
    console.error('Authorization denied:', error);
    process.exit(1);
  }

  if (!code) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Waiting...');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h2>✅ Authorization successful!</h2><p>You can close this tab and check your terminal.</p>');
  server.close();

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();

  if (tokens.error) {
    console.error('\n❌ Token exchange failed:', tokens.error, tokens.error_description);
    process.exit(1);
  }

  console.log('\n✅ Success! Add these to your .env file:\n');
  console.log(`GOOGLE_ADS_DEVELOPER_TOKEN=DCM-gQoNu6zU-rohLiWY8Q`);
  console.log(`GOOGLE_ADS_CLIENT_ID=${CLIENT_ID}`);
  console.log(`GOOGLE_ADS_CLIENT_SECRET=${CLIENT_SECRET}`);
  console.log(`GOOGLE_ADS_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`GOOGLE_ADS_MCC_CUSTOMER_ID=4155893363`);
  console.log('\nRefresh token (copy this):\n');
  console.log(tokens.refresh_token);
});

server.listen(REDIRECT_PORT, () => {
  console.log(`Listening for OAuth callback on http://localhost:${REDIRECT_PORT} ...`);
});
