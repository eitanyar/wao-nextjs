/**
 * One-time script to generate a Google Search Console API refresh token.
 * Run: node scripts/gsc-get-token.mjs
 * Authorize with eitan@wao.co.il when the browser opens.
 * Paste the resulting refresh token into .env.local as GSC_REFRESH_TOKEN.
 */

import http from 'http';
import { exec } from 'child_process';

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
const REDIRECT_URI  = `http://localhost:${REDIRECT_PORT}`;
const SCOPE         = 'https://www.googleapis.com/auth/webmasters.readonly';

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log('\n=== Google Search Console OAuth2 Token Generator ===\n');
console.log('Opening browser for authorization...\n');

exec(`explorer.exe "${authUrl}" 2>/dev/null || xdg-open "${authUrl}" 2>/dev/null || open "${authUrl}" 2>/dev/null`);
console.log('If browser did not open, visit:\n' + authUrl + '\n');

const server = http.createServer(async (req, res) => {
  const url   = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
  const code  = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<h2>Error: ${error ?? 'no code'}</h2>`);
    server.close();
    process.exit(1);
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h2>✅ Authorized — check your terminal.</h2>');
  server.close();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.refresh_token) {
    console.error('No refresh token received:', tokens);
    process.exit(1);
  }

  console.log('\n✅ Success!\n');
  console.log('Add this to .env.local:\n');
  console.log(`GSC_REFRESH_TOKEN="${tokens.refresh_token}"\n`);
});

server.listen(REDIRECT_PORT);
