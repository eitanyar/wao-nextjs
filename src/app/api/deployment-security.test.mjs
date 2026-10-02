import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(apiDir, '..', '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const cloudflareDeploy = read('src/app/api/cloudflare-pages/deploy/route.ts');
const siteBotDeploy = read('src/app/api/site-bot/deploy/route.ts');


function assertAuthorizationBeforeBodyAndSideEffects(source, routeName) {
  const authorizationIndex = source.indexOf("return NextResponse.json({ error: 'unauthorized' }, { status: 401 })");
  const bodyIndex = source.indexOf('await req.json()');
  const slugValidationIndex = source.indexOf('isSafeDeploymentSlug(slug)');
  assert.ok(authorizationIndex >= 0, `${routeName} has an explicit unauthenticated response`);
  assert.ok(bodyIndex >= 0 && authorizationIndex < bodyIndex, `${routeName} authorizes before parsing the request body`);
  assert.ok(slugValidationIndex > bodyIndex, `${routeName} validates the parsed slug`);

  for (const sideEffect of ['path.join(process.cwd()', 'readFileSync(', 'provisionFraudBlockerDomain(', 'mkdtempSync(', 'execFileSync(', 'await fetch(']) {
    const sideEffectIndex = source.indexOf(sideEffect, slugValidationIndex);
    assert.ok(sideEffectIndex < 0 || slugValidationIndex < sideEffectIndex, `${routeName} validates the slug before ${sideEffect}`);
  }
}

test('deployment routes authorize and validate before side effects', () => {
  assertAuthorizationBeforeBodyAndSideEffects(cloudflareDeploy, 'cloudflare-pages/deploy');
  assertAuthorizationBeforeBodyAndSideEffects(siteBotDeploy, 'site-bot/deploy');
  assert.match(cloudflareDeploy, /campaign\?\.clientId !== sessionClientId/);
  assert.match(cloudflareDeploy, /campaign\.customerId !== googleAdsCustomerId/);
  assert.ok(cloudflareDeploy.indexOf('loadCampaignConfigBySlug(slug)') < cloudflareDeploy.indexOf("path.join(process.cwd(), 'data', 'lps'"), 'LP client ownership is checked before LP filesystem access');
  assert.match(siteBotDeploy, /const adminAuthorized = await verifyAdminToken\(authCookies\.get\(ADMIN_COOKIE_NAME\)\?\.value \?\? ''\);/);
  assert.doesNotMatch(siteBotDeploy, /WAO_DEPLOY_SECRET|verifyInternalDeployBearer|headers\.get\('authorization'\)/i, 'Site Bot deployment has no deploy-secret or bearer bypass');
  assert.doesNotMatch(cloudflareDeploy, /WAO_DEPLOY_SECRET|verifyInternalDeployBearer|headers\.get\('authorization'\)/i, 'LP deployment has no deploy-secret or bearer bypass');
});

test('deployment routes use safe temporary directories and argument-vector Wrangler calls', () => {
  for (const [routeName, source, temporaryPrefix] of [
    ['cloudflare-pages/deploy', cloudflareDeploy, 'wao-lp-'],
    ['site-bot/deploy', siteBotDeploy, 'wao-site-'],
  ]) {
    assert.match(source, new RegExp(`mkdtempSync\\(path\\.join\\(tmpdir\\(\\), '${temporaryPrefix}'\\)\\)`), `${routeName} uses a unique temporary directory`);
    assert.doesNotMatch(source, /execSync\s*\(/, `${routeName} does not invoke a shell`);
    assert.match(source, /execFileSync\('\.\/node_modules\/\.bin\/wrangler', \['pages', 'project', 'create', slug/, `${routeName} passes the project name as argv`);
    assert.match(source, /execFileSync\('\.\/node_modules\/\.bin\/wrangler', \['pages', 'deploy', tmpDir, '--project-name', slug/, `${routeName} passes deploy values as argv`);
    assert.match(source, /finally\s*\{\s*rmSync\(tmpDir, \{ recursive: true, force: true \}\);\s*\}/, `${routeName} cleans up the temporary directory`);
  }
});

test('Site Bot deployment stops when Fraud Blocker provision or tracker persistence fails', () => {
  assert.match(siteBotDeploy, /catch \(error\) \{\s*writeFraudBlockerState\([\s\S]*?\);\s*return NextResponse\.json\(\{ error: 'fraud_blocker_provisioning_required' \}, \{ status: 424 \}\);\s*\}/);
  assert.match(siteBotDeploy, /writeFraudBlockerState\(fraudBlockerFailureState\([\s\S]*?Tracker verification failed[\s\S]*?\)\);\s*return NextResponse\.json\(\{ error: 'fraud_blocker_tracker_verification_failed' \}, \{ status: 424 \}\);/);
});
