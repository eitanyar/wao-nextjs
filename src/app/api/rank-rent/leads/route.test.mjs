import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/rank-rent/leads/route.ts'), 'utf8');

test('lead route remains a narrow exact-origin adapter', () => {
  assert.match(route, /export async function POST/);
  assert.match(route, /export async function OPTIONS/);
  assert.match(route, /handlePortfolioLeadRequest/);
  assert.match(route, /exactOrigin/);
  assert.equal((route.match(/RANK_RENT_[A-Z_]+/g) ?? []).sort().join(','), 'RANK_RENT_AUTHORIZATION_DATA_DIR,RANK_RENT_DATA_DIR,RANK_RENT_LEADS_DATA_DIR');
  for (const token of ['data/clients', 'sendLeadNotification', 'whatsapp', 'google-ads', 'deploy.sh', 'Access-Control-Allow-Origin.*']) assert.equal(route.includes(token), false);
});
