/**
 * One-time script to generate a Data Manager API refresh token, using the
 * separate GOOGLE_DATAMANAGER_CLIENT_ID/_SECRET (Testing-status OAuth client,
 * project wao-datamanager-api) — deliberately not the same client as
 * GOOGLE_ADS_CLIENT_ID, per docs/specs/priority-4-data-manager-api-migration.md §2.
 * Run: node scripts/get-datamanager-token.mjs
 * Authorize with eitan@wao.co.il (must be added as a Test user on the
 * OAuth consent screen) when the browser opens.
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

const CLIENT_ID = process.env.GOOGLE_DATAMANAGER_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DATAMANAGER_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GOOGLE_DATAMANAGER_CLIENT_ID or GOOGLE_DATAMANAGER_CLIENT_SECRET in .env.local');
  process.exit(1);
}

const REDIRECT_PORT = 3000;
const REDIRECT_PATH = '/callback';
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`;
const SCOPE = 'https://www.googleapis.com/auth/datamanager';

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log('\n=== Data Manager API OAuth2 Token Generator ===\n');
console.log('IMPORTANT: this listens on port 3000, same as `npm run dev` — stop the dev server first.\n');
console.log('Opening browser for authorization...');
console.log('If the browser does not open, visit this URL manually:\n');
console.log(authUrl, '\n');

exec(`explorer.exe "${authUrl}" 2>/dev/null || xdg-open "${authUrl}" 2>/dev/null || open "${authUrl}" 2>/dev/null`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
  if (url.pathname !== REDIRECT_PATH) {
    res.writeHead(404);
    res.end();
    return;
  }

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
  res.end('<h2>Authorization successful!</h2><p>You can close this tab and check your terminal.</p>');
  server.close();

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
    console.error('\nToken exchange failed:', tokens.error, tokens.error_description);
    process.exit(1);
  }

  console.log('\nSuccess! Add this to .env.local:\n');
  console.log(`GOOGLE_DATAMANAGER_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log('\nRefresh token (copy this):\n');
  console.log(tokens.refresh_token);
});

server.listen(REDIRECT_PORT, () => {
  console.log(`Listening for OAuth callback on http://localhost:${REDIRECT_PORT}${REDIRECT_PATH} ...`);
});
