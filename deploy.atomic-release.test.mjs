import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const deployScript = path.join(repoRoot, 'deploy.sh');

function writeExecutable(file, source) {
  fs.writeFileSync(file, source, { mode: 0o755 });
}

function fixture({ failure = '' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-deploy-test-'));
  const bin = path.join(root, 'bin');
  const repo = path.join(root, 'repo');
  const releases = path.join(repo, 'releases');
  const runtime = path.join(root, 'runtime');
  const log = path.join(root, 'commands.log');
  const state = path.join(root, 'pm2-state');
  fs.mkdirSync(bin, { recursive: true });
  fs.mkdirSync(releases, { recursive: true });
  fs.mkdirSync(runtime, { recursive: true });
  fs.writeFileSync(path.join(repo, '.env.production'), 'CLIENT_PORTAL_SECRET=synthetic\n');
  fs.writeFileSync(path.join(repo, 'tsconfig.json'), '{"fixture":"original"}\n');
  fs.mkdirSync(path.join(repo, 'public'));
  fs.writeFileSync(path.join(repo, 'public', 'asset.txt'), 'public');
  fs.writeFileSync(path.join(repo, 'public', 'eitan-yariv.avif'), 'fixture');
  fs.mkdirSync(path.join(repo, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'scripts', 'verify-google-ads-sandbox.mjs'), 'process.exit(process.env.WAO_TEST_FAILURE === "verifier" ? 7 : 0)');

  const previous = path.join(releases, 'release-previous');
  fs.mkdirSync(path.join(previous, '.next', 'standalone', 'data'), { recursive: true });
  fs.writeFileSync(path.join(previous, '.next', 'standalone', 'server.js'), 'previous');
  fs.symlinkSync(previous, path.join(releases, 'current'));
  fs.writeFileSync(state, `${path.join(previous, '.next', 'standalone', 'server.js')}|${path.join(previous, '.next', 'standalone')}\n`);

  writeExecutable(path.join(bin, 'git'), `#!/bin/sh
printf 'git %s\\n' "$*" >> "$WAO_TEST_LOG"
case "$1 $2" in
  'status --porcelain') exit 0 ;;
  'fetch --all') exit 0 ;;
  'rev-parse --verify') printf '%s\\n' deadbeefdeadbeefdeadbeefdeadbeefdeadbeef; exit 0 ;;
  'checkout --detach') exit 0 ;;
  'rev-parse HEAD') printf '%s\\n' deadbeefdeadbeefdeadbeefdeadbeefdeadbeef; exit 0 ;;
esac
exit 90
`);
  writeExecutable(path.join(bin, 'npm'), `#!/bin/sh
printf 'npm %s NODE_OPTIONS=%s\\n' "$*" "$NODE_OPTIONS" >> "$WAO_TEST_LOG"
[ "$1" = ci ] && exit 0
[ "$1" = run ] && [ "$2" = build ] || exit 90
[ "$WAO_TEST_FAILURE" = build ] && exit 7
base="$WAO_DEPLOY_DIST_DIR"
printf '{"fixture":"mutated"}\\n' > tsconfig.json
mkdir -p "$base/standalone/.next/static/chunks" "$base/standalone/data" "$base/server/app" "$base/static/chunks"
printf 'build-id' > "$base/BUILD_ID"
printf 'server' > "$base/standalone/server.js"
printf 'chunk' > "$base/server/app/chunk.js"
printf 'chunk' > "$base/static/chunks/app.js"
printf '{"pages":{"/client/login":["static/chunks/app.js"]}}' > "$base/build-manifest.json"
printf '{"/client/login":"app/chunk.js"}' > "$base/server/app-paths-manifest.json"
[ "$WAO_TEST_FAILURE" = validation ] && rm -f "$base/static/chunks/app.js"
exit 0
`);
  writeExecutable(path.join(bin, 'pm2'), `#!/bin/sh
printf 'pm2 %s\\n' "$*" >> "$WAO_TEST_LOG"
case "$1" in
  delete) : > "$WAO_PM2_STATE"; exit 0 ;;
  start)
    [ "$WAO_TEST_FAILURE" = start ] && exit 8
    entry="$2"; shift 2
    cwd=""
    while [ "$#" -gt 0 ]; do [ "$1" = --cwd ] && { cwd="$2"; break; }; shift; done
    printf '%s|%s\\n' "$entry" "$cwd" > "$WAO_PM2_STATE"
    [ "$WAO_TEST_FAILURE" = duplicate ] && printf '%s' "$entry" | grep -q release-deadbeefdead && printf '%s|%s\\n' "$entry" "$cwd" >> "$WAO_PM2_STATE"
    exit 0 ;;
  jlist)
    "$WAO_REAL_NODE" -e 'const fs=require("node:fs"); const rows=fs.readFileSync(process.env.WAO_PM2_STATE,"utf8").trim().split("\\n").filter(Boolean); console.log(JSON.stringify(rows.map((row)=>{const [pm_exec_path,pm_cwd]=row.split("|"); return {name:"wao",pm2_env:{status:"online",pm_exec_path,pm_cwd}};})))'
    exit 0 ;;
esac
exit 90
`);
  writeExecutable(path.join(bin, 'curl'), `#!/bin/sh
printf 'curl %s\\n' "$*" >> "$WAO_TEST_LOG"
for last; do :; done
case "$last" in
  */client/login) [ "$WAO_TEST_FAILURE" = health ] && exit 7; printf 'ok'; exit 0 ;;
  */) [ "$WAO_TEST_FAILURE" = homepage ] && exit 7; printf '%s' '<link rel="stylesheet" href="/_next/static/app.css?v=1"><script src="/_next/static/app.js?v=2"></script>'; exit 0 ;;
  */_next/static/app.css?v=1)
    [ "$WAO_TEST_FAILURE" = asset-empty ] && { printf 'HTTP/1.1 200 OK\\r\\nContent-Type: text/css\\r\\n\\r\\n'; exit 0; }
    [ "$WAO_TEST_FAILURE" = asset-type ] && { printf 'HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\n\\r\\nbody{}'; exit 0; }
    printf 'HTTP/1.1 200 OK\\r\\nContent-Type: text/css; charset=utf-8\\r\\n\\r\\nbody{}'; exit 0 ;;
  */_next/static/app.js?v=2) printf 'HTTP/1.1 200 OK\\r\\nContent-Type: application/javascript\\r\\n\\r\\nconsole.log(1)'; exit 0 ;;
esac
exit 7
`);
  writeExecutable(path.join(bin, 'node'), `#!/bin/sh
if [ "$1" = -e ] || [ "$1" = - ]; then exec "$WAO_REAL_NODE" "$@"; fi
printf 'node %s\\n' "$*" >> "$WAO_TEST_LOG"
exec "$WAO_REAL_NODE" "$@"
`);

  return { root, repo, releases, runtime, log, state, bin };
}

function runFixture(options = {}, envExtra = {}) {
  const f = fixture(options);
  const result = spawnSync('bash', [deployScript, 'synthetic-target'], {
    cwd: f.repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${f.bin}:${process.env.PATH}`,
      WAO_DEPLOY_ROOT: f.repo,
      WAO_RELEASES_DIR: f.releases,
      WAO_RUNTIME_DATA_DIR: f.runtime,
      WAO_TEST_LOG: f.log,
      WAO_PM2_STATE: f.state,
      WAO_REAL_NODE: process.execPath,
      CLIENT_PORTAL_SECRET: 'synthetic',
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
      NODE_OPTIONS: '',
      WAO_TEST_FAILURE: options.failure ?? '',
      ...envExtra,
    },
  });
  return { ...f, result, log: fs.existsSync(f.log) ? fs.readFileSync(f.log, 'utf8') : '' };
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

function currentProcess(f) {
  return fs.readFileSync(f.state, 'utf8').trim().split('\n').filter(Boolean);
}

test('rejects missing or malformed Server Action keys before external commands', () => {
  for (const key of ['', 'not-base64', Buffer.alloc(15, 1).toString('base64')]) {
    const f = runFixture({}, { NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: key });
    try {
      assert.notEqual(f.result.status, 0);
      assert.equal(f.log, '');
    } finally { cleanup(f.root); }
  }
});

test('activates exactly one process with release-local entrypoint and cwd after homepage assets pass', () => {
  const f = runFixture();
  try {
    assert.equal(f.result.status, 0, f.result.stderr);
    const active = fs.realpathSync(path.join(f.releases, 'current'));
    const processes = currentProcess(f);
    assert.equal(processes.length, 1);
    const [entry, cwd] = processes[0].split('|');
    assert.equal(entry, path.join(active, '.next', 'standalone', 'server.js'));
    assert.equal(cwd, path.join(active, '.next', 'standalone'));
    assert.match(f.log, /pm2 delete wao[\s\S]*pm2 start .*server\.js --name wao --update-env --cwd .*standalone/);
    assert.match(f.log, /app\.css\?v=1[\s\S]*app\.js\?v=2[\s\S]*node scripts\/verify-google-ads-sandbox\.mjs/);
    assert.deepEqual(fs.readFileSync(path.join(f.repo, 'tsconfig.json')), Buffer.from('{"fixture":"original"}\n'));
  } finally { cleanup(f.root); }
});

test('duplicate PM2 entries fail activation then delete the candidate before starting one previous process', () => {
  const f = runFixture({ failure: 'duplicate' });
  try {
    assert.notEqual(f.result.status, 0);
    assert.equal(fs.realpathSync(path.join(f.releases, 'current')), path.join(f.releases, 'release-previous'));
    assert.deepEqual(currentProcess(f), [`${path.join(f.releases, 'release-previous', '.next', 'standalone', 'server.js')}|${path.join(f.releases, 'release-previous', '.next', 'standalone')}`]);
    assert.match(f.log, /pm2 delete wao[\s\S]*pm2 start .*release-deadbeefdead[\s\S]*pm2 delete wao[\s\S]*pm2 delete wao[\s\S]*pm2 start .*release-previous/);
  } finally { cleanup(f.root); }
});

test('homepage asset failures roll back and preserve query-string asset coverage', () => {
  for (const failure of ['asset-empty', 'asset-type']) {
    const f = runFixture({ failure });
    try {
      assert.notEqual(f.result.status, 0);
      assert.equal(fs.realpathSync(path.join(f.releases, 'current')), path.join(f.releases, 'release-previous'));
      assert.equal(currentProcess(f).length, 1);
      assert.match(f.log, /app\.css\?v=1/);
    } finally { cleanup(f.root); }
  }
});

test('post-switch health failure removes the candidate and restores exactly one previous process', () => {
  const f = runFixture({ failure: 'health' });
  try {
    assert.notEqual(f.result.status, 0);
    assert.equal(fs.realpathSync(path.join(f.releases, 'current')), path.join(f.releases, 'release-previous'));
    assert.deepEqual(currentProcess(f), [`${path.join(f.releases, 'release-previous', '.next', 'standalone', 'server.js')}|${path.join(f.releases, 'release-previous', '.next', 'standalone')}`]);
    assert.match(f.log, /client\/login[\s\S]*pm2 delete wao[\s\S]*pm2 start .*release-previous/);
  } finally { cleanup(f.root); }
});

test('verifier failure rolls back with one verified previous process and no candidate survivor', () => {
  const f = runFixture({ failure: 'verifier' });
  try {
    assert.notEqual(f.result.status, 0);
    assert.equal(fs.realpathSync(path.join(f.releases, 'current')), path.join(f.releases, 'release-previous'));
    assert.equal(currentProcess(f).length, 1);
    assert.doesNotMatch(currentProcess(f)[0], /release-deadbeefdead/);
    assert.match(f.log, /node scripts\/verify-google-ads-sandbox\.mjs[\s\S]*pm2 delete wao[\s\S]*pm2 start .*release-previous/);
  } finally { cleanup(f.root); }
});

test('preserves non-conflicting NODE_OPTIONS and applies a valid heap override', () => {
  const f = runFixture({}, { NODE_OPTIONS: '--trace-warnings', WAO_BUILD_MAX_OLD_SPACE_MB: '2048' });
  try {
    assert.equal(f.result.status, 0, f.result.stderr);
    assert.match(f.log, /npm run build -- --webpack NODE_OPTIONS=--trace-warnings --max-old-space-size=2048/);
  } finally { cleanup(f.root); }
});

test('rejects malformed heap overrides before package, build, or process commands', () => {
  for (const limit of ['511', '1536.0', 'zero', '3073']) {
    const f = runFixture({}, { WAO_BUILD_MAX_OLD_SPACE_MB: limit });
    try {
      assert.notEqual(f.result.status, 0);
      assert.equal(f.log, '');
    } finally { cleanup(f.root); }
  }
});

test('pre-switch build and validation failures retain the previous active process', () => {
  for (const failure of ['build', 'validation']) {
    const f = runFixture({ failure });
    try {
      assert.notEqual(f.result.status, 0);
      assert.equal(fs.realpathSync(path.join(f.releases, 'current')), path.join(f.releases, 'release-previous'));
      assert.deepEqual(currentProcess(f), [`${path.join(f.releases, 'release-previous', '.next', 'standalone', 'server.js')}|${path.join(f.releases, 'release-previous', '.next', 'standalone')}`]);
      assert.doesNotMatch(f.log, /pm2 delete wao/);
    } finally { cleanup(f.root); }
  }
});

test('public assets copy into an existing standalone public directory without nesting', () => {
  const script = fs.readFileSync(deployScript, 'utf8');
  const lines = script.split('\n');
  const copyLines = lines.filter((line) => /^cp -a public\b/.test(line));
  assert.equal(copyLines.length, 1, 'expected exactly one live public copy command');
  const copyIndex = lines.indexOf(copyLines[0]);
  const commands = [lines[copyIndex - 1], copyLines[0]];
  assert.match(script, /\[\[ -s "\$standalone\/public\/eitan-yariv\.avif" \]\] \|\| fail 'candidate standalone public assets are missing or nested\.'/);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-public-copy-test-'));
  try {
    const publicDir = path.join(root, 'public');
    const destination = path.join(root, '.next', 'standalone', 'public');
    fs.mkdirSync(path.join(publicDir, 'uploads'), { recursive: true });
    fs.writeFileSync(path.join(publicDir, 'eitan-yariv.avif'), 'fixture');
    fs.writeFileSync(path.join(publicDir, 'uploads', 'marker.txt'), 'new');
    fs.mkdirSync(path.join(destination, 'uploads'), { recursive: true });
    fs.writeFileSync(path.join(destination, 'uploads', 'old.txt'), 'old');

    const result = spawnSync('bash', ['-e', '-c', commands.join('\n')], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CANDIDATE: root },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.statSync(path.join(destination, 'eitan-yariv.avif')).isFile());
    assert.ok(fs.existsSync(path.join(destination, 'uploads', 'marker.txt')));
    assert.ok(fs.existsSync(path.join(destination, 'uploads', 'old.txt')));
    assert.equal(fs.existsSync(path.join(destination, 'public')), false);
  } finally {
    cleanup(root);
  }
});
