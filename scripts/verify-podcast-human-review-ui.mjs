import { createHmac, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { relative, resolve } from 'node:path';
import puppeteer from 'puppeteer';
import { acquireNextDevServer, releaseNextDevServer } from './lib/next-dev-server-session.mjs';

const ROOT = resolve(process.cwd());
const ORIGIN = 'http://127.0.0.1:4023';
const FIXTURE_URL = `${ORIGIN}/admin/podcast-titles?fixture=1`;
const VIEWPORT = { width: 1280, height: 900 };
const SCREENSHOT = '/tmp/wao-podcast-human-review-ui.png';
const TSCONFIG_PATH = resolve(ROOT, 'tsconfig.json');
const FIXTURE_DIST_DIR_PATTERN = /^\.next-podcast-fixture-[A-Za-z0-9_-]{1,64}$/;
const REVIEW_PANEL_TEST_ID = 'podcast-result-fixture-review';

const fail = code => { throw new Error(code); };
const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));
const isAcceptedFixtureDistDir = value => typeof value === 'string' && FIXTURE_DIST_DIR_PATTERN.test(value);
const isSafeFixtureDistPath = (dir, outputPath) => isAcceptedFixtureDistDir(dir)
  && resolve(ROOT, dir) === outputPath
  && relative(ROOT, outputPath) === dir;
const readAdminSecret = async () => {
  const source = await fs.readFile(resolve(ROOT, '.env.local'), 'utf8').catch(() => '');
  const match = source.match(/^ADMIN_SECRET=(.*)$/m);
  const secret = match?.[1]?.trim();
  if (!secret) fail('ADMIN_SECRET_UNAVAILABLE');
  return secret;
};
const request = async url => {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(1000) });
  return { status: response.status };
};
const spawnDevServer = async ({ origin, repoRoot }) => {
  const parsed = new URL(origin);
  let stderr = '';
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', parsed.hostname, '--port', parsed.port], {
    cwd: repoRoot,
    detached: true,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, WAO_PODCAST_FIXTURE_DIST_DIR: fixtureDistDir },
  });
  child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
  return { pid: child.pid, get exitCode() { return child.exitCode; }, get signalCode() { return child.signalCode; }, isAlive: () => child.exitCode === null && child.signalCode === null, getStderr: () => stderr };
};
const stopProcessGroup = async child => {
  if (!child?.pid) return false;
  try { process.kill(-child.pid, 'SIGTERM'); } catch { return false; }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null || child.signalCode !== null) return true;
    await sleep(100);
  }
  try { process.kill(-child.pid, 'SIGKILL'); } catch { return false; }
  return true;
};
const probePortReleased = async origin => {
  try { await request(origin); return false; } catch { return true; }
};
const testIdText = async (panel, id) => panel.$eval(`[data-testid="${id}"]`, element => element.textContent?.trim() ?? '');

let browser;
let session;
let cleanup = { stoppedOwnedChild: false, preservedReusedServer: false };
let fixtureDistCreated = false;
let fixtureDistCleanup = false;
let tsconfigSnapshot;
let tsconfigRestored = false;
let report;
const fixtureDistDir = `.next-podcast-fixture-${process.pid}-${randomBytes(12).toString('hex')}`;
if (!isAcceptedFixtureDistDir(fixtureDistDir)) fail('FIXTURE_DIST_DIR_INVALID');
const fixtureDistPath = resolve(ROOT, fixtureDistDir);
if (!isSafeFixtureDistPath(fixtureDistDir, fixtureDistPath)) fail('FIXTURE_DIST_DIR_PATH_INVALID');
try {
  tsconfigSnapshot = await fs.readFile(TSCONFIG_PATH);
  const secret = await readAdminSecret();
  await fs.mkdir(fixtureDistPath);
  fixtureDistCreated = true;
  session = await acquireNextDevServer({
    repoRoot: ROOT,
    requestedOrigin: ORIGIN,
    spawnDevServer,
    probe: request,
    readlink: fs.readlink,
    readFile: fs.readFile,
    realpath: fs.realpath,
    sleep,
    now: Date.now,
  });
  if (session.origin !== ORIGIN) fail('SESSION_ORIGIN_UNEXPECTED');
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  const payload = `${Date.now() + 30 * 24 * 60 * 60 * 1000}`;
  const token = `${payload}.${createHmac('sha256', secret).update(payload).digest('hex')}`;
  await page.setCookie({ name: 'wao-admin', value: token, url: ORIGIN, httpOnly: true, sameSite: 'Lax' });
  const response = await page.goto(FIXTURE_URL, { waitUntil: 'networkidle0', timeout: 45000 });
  if (response?.status() !== 200) fail('FIXTURE_STATUS_INVALID');
  const reviewPanel = await page.$(`[data-testid="${REVIEW_PANEL_TEST_ID}"]`);
  if (!reviewPanel) fail('FIXTURE_REVIEW_PANEL_ABSENT');
  const decisionExists = await reviewPanel.$('[data-testid="podcast-decision"]') !== null;
  const recommendationPhrase = await testIdText(reviewPanel, 'podcast-selected-phrase');
  const recommendationVolume = await testIdText(reviewPanel, 'podcast-selected-volume');
  const currentPhrase = await testIdText(reviewPanel, 'podcast-current-title-phrase');
  const currentVolume = await testIdText(reviewPanel, 'podcast-current-title-volume');
  const suggestionCount = (await Promise.all([0, 1, 2].map(index => testIdText(reviewPanel, `podcast-title-suggestion-${index}`)))).filter(Boolean).length;
  const checks = {
    decisionExists,
    recommendationEvidence: recommendationPhrase === 'fixture recommended phrase' && recommendationVolume === '0',
    currentTitleEvidence: currentPhrase === 'fixture old title phrase' && currentVolume === '37' && currentPhrase !== recommendationPhrase,
    suggestionCount,
  };
  if (!checks.decisionExists || !checks.recommendationEvidence || !checks.currentTitleEvidence || checks.suggestionCount !== 3) fail('FIXTURE_DOM_CONTRACT_INVALID');
  await page.screenshot({ path: SCREENSHOT, fullPage: true });
  report = `status=PASS decision=${checks.decisionExists} recommendation=${checks.recommendationEvidence} current=${checks.currentTitleEvidence} suggestions=${checks.suggestionCount} url=${FIXTURE_URL} viewport=${VIEWPORT.width}x${VIEWPORT.height} screenshot=${SCREENSHOT} ownership=${session.mode}`;
} finally {
  if (browser) await browser.close();
  if (session) cleanup = await releaseNextDevServer(session, { stopProcessGroup, probePortReleased });
  if (tsconfigSnapshot) {
    await fs.writeFile(TSCONFIG_PATH, tsconfigSnapshot);
    const restoredTsconfig = await fs.readFile(TSCONFIG_PATH);
    if (!restoredTsconfig.equals(tsconfigSnapshot)) fail('TSCONFIG_RESTORE_INVALID');
    tsconfigRestored = true;
  }
  if (fixtureDistCreated) {
    if (!isSafeFixtureDistPath(fixtureDistDir, fixtureDistPath)) fail('FIXTURE_DIST_DIR_PATH_INVALID');
    await fs.rm(fixtureDistPath, { recursive: true, force: false });
    fixtureDistCleanup = true;
  }
  if (report && fixtureDistCleanup) console.log(`${report} fixture_dist_cleanup=true`);
  console.log(`cleanup stopped_owned_child=${cleanup.stoppedOwnedChild} preserved_reused_server=${cleanup.preservedReusedServer} port_released=${cleanup.stoppedOwnedChild} fixture_dist_cleanup=${fixtureDistCleanup} tsconfig_restored=${tsconfigRestored}`);
}