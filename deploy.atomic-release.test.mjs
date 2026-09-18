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
  fs.mkdirSync(bin, { recursive: true });
  fs.mkdirSync(repo, { recursive: true });
  fs.mkdirSync(releases, { recursive: true });
  fs.mkdirSync(runtime, { recursive: true });
  fs.writeFileSync(path.join(repo, '.env.production'), 'CLIENT_PORTAL_SECRET=synthetic\n');
  fs.mkdirSync(path.join(repo, 'public'));
  fs.writeFileSync(path.join(repo, 'public', 'asset.txt'), 'public');
  fs.mkdirSync(path.join(repo, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'scripts', 'verify-google-ads-sandbox.mjs'), 'process.exit(0)');

  const previous = path.join(releases, 'release-previous');
  fs.mkdirSync(path.join(previous, '.next', 'standalone', 'data'), { recursive: true });
  fs.writeFileSync(path.join(previous, '.next', 'standalone', 'server.js'), 'previous');
  fs.symlinkSync(previous, path.join(releases, 'current'));

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
printf 'npm %s\\n' "$*" >> "$WAO_TEST_LOG"
[ "$1" = ci ] && exit 0
[ "$1" = run ] && [ "$2" = build ] || exit 90
[ "${failure}" = build ] && exit 7
base="$WAO_DEPLOY_DIST_DIR"
mkdir -p "$base/standalone/.next/static/chunks" "$base/server/app" "$base/static/chunks"
printf 'build-id' > "$base/BUILD_ID"
printf 'server' > "$base/standalone/server.js"
printf 'chunk' > "$base/server/app/chunk.js"
printf 'chunk' > "$base/static/chunks/app.js"
printf '{"pages":{"/client/login":["static/chunks/app.js"]}}' > "$base/build-manifest.json"
printf '{"/client/login":"app/chunk.js"}' > "$base/server/app-paths-manifest.json"
exit 0
`);
  writeExecutable(path.join(bin, 'pm2'), `#!/bin/sh
printf 'pm2 %s\\n' "$*" >> "$WAO_TEST_LOG"
case "$1" in
  describe) exit 0 ;;
  stop) [ "${failure}" = stop ] && exit 8; exit 0 ;;
  start) [ "${failure}" = start ] && exit 8; exit 0 ;;
  delete) exit 0 ;;
esac
exit 90
`);
  writeExecutable(path.join(bin, 'curl'), `#!/bin/sh
printf 'curl %s\\n' "$*" >> "$WAO_TEST_LOG"
[ "${failure}" = health ] && exit 7
printf 200
`);
  writeExecutable(path.join(bin, 'node'), `#!/bin/sh
if [ "$1" = -e ] || [ "$1" = - ]; then exec "$WAO_REAL_NODE" "$@"; fi
printf 'node %s\\n' "$*" >> "$WAO_TEST_LOG"
[ "${failure}" = verifier ] && exit 7
exit 0
`);

  return { root, repo, releases, runtime, log, bin };
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
      WAO_REAL_NODE: process.execPath,
      CLIENT_PORTAL_SECRET: 'synthetic',
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
      ...envExtra,
    },
  });
  const log = fs.existsSync(f.log) ? fs.readFileSync(f.log, 'utf8') : '';
  return { ...f, result, log };
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test('rejects missing or malformed Server Action keys before external commands', () => {
  for (const key of ['', 'not-base64', Buffer.alloc(15, 1).toString('base64')]) {
    const f = runFixture({}, { NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: key });
    try {
      assert.notEqual(f.result.status, 0);
      assert.equal(f.log, '');
      assert.equal(fs.readlinkSync(path.join(f.releases, 'current')), path.join(f.releases, 'release-previous'));
    } finally {
      cleanup(f.root);
    }
  }
});

test('builds an inactive complete release then activates only wao with exact runtime link', () => {
  const f = runFixture();
  try {
    assert.equal(f.result.status, 0, f.result.stderr);
    const active = fs.realpathSync(path.join(f.releases, 'current'));
    assert.match(path.basename(active), /^release-deadbeefdead-/);
    assert.equal(fs.readlinkSync(path.join(active, '.next', 'standalone', 'data')), f.runtime);
    assert.equal(fs.readFileSync(path.join(active, '.next', 'standalone', 'package.json'), 'utf8'), '{"type":"commonjs"}\n');
    assert.match(f.log, /npm ci[\s\S]*npm run build[\s\S]*pm2 stop wao[\s\S]*pm2 start .*server\.js --name wao --update-env/);
    assert.doesNotMatch(f.log, /wao-app/);
  } finally {
    cleanup(f.root);
  }
});

test('pre-activation failure preserves the previous current release and never stops wao', () => {
  const f = runFixture({ failure: 'build' });
  try {
    assert.notEqual(f.result.status, 0);
    assert.equal(fs.readlinkSync(path.join(f.releases, 'current')), path.join(f.releases, 'release-previous'));
    assert.doesNotMatch(f.log, /pm2 stop/);
  } finally {
    cleanup(f.root);
  }
});

test('post-stop health failure rolls back to the previous release and restarts wao', () => {
  const f = runFixture({ failure: 'health' });
  try {
    assert.notEqual(f.result.status, 0);
    assert.equal(fs.readlinkSync(path.join(f.releases, 'current')), path.join(f.releases, 'release-previous'));
    assert.match(f.log, /pm2 stop wao[\s\S]*pm2 start .*release-previous\/\.next\/standalone\/server\.js --name wao --update-env/);
  } finally {
    cleanup(f.root);
  }
});
