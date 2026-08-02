import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.join(baseDir, 'route.ts');
const routeCode = fs.readFileSync(routePath, 'utf8');

const proxyPath = path.join(baseDir, '..', '..', '..', 'proxy.ts');
const proxyCode = fs.readFileSync(proxyPath, 'utf8');

test('GET /api/leads requires the admin cookie (matches /geo/dashboard convention)', () => {
  assert.match(routeCode, /verifyAdminToken/);
  assert.match(routeCode, /ADMIN_COOKIE_NAME/);
  assert.match(routeCode, /export async function GET\(\) \{\s*\n\s*if \(!\(await isAdminAuthorized\(\)\)\)/);
  assert.match(routeCode, /status: 401/);
});

test('POST /api/leads (public lead-capture form) is NOT gated by the admin check', () => {
  const postMatch = routeCode.match(/export async function POST\(req: Request\) \{[\s\S]*$/);
  assert.ok(postMatch, 'POST handler should exist');
  assert.doesNotMatch(postMatch[0], /isAdminAuthorized/);
});

test('proxy.ts protects the /leads admin page with the same admin-cookie gate as /geo/dashboard', () => {
  assert.match(proxyCode, /ADMIN_PROTECTED\s*=\s*\[[^\]]*'\/leads'/);
  assert.match(proxyCode, /matcher:\s*\[[^\]]*'\/leads\/:path\*'/);
});
