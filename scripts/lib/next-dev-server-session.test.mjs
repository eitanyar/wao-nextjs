import assert from 'node:assert/strict';
import test from 'node:test';

import {
  acquireNextDevServer,
  inspectNextDevProcess,
  parseNextDevConflict,
  releaseNextDevServer,
} from './next-dev-server-session.mjs';

const conflict = [
  'Another next dev server is already running.',
  '  - Local: http://localhost:3000',
  '  - PID: 5141',
  '  - Dir: /repo',
].join('\n');

const processAdapters = ({ cwd = '/repo', cmdline = '/usr/bin/node\0/repo/node_modules/next/dist/bin/next\0dev\0', stale = false } = {}) => ({
  readlink: async path => {
    assert.equal(path, '/proc/5141/cwd');
    if (stale) throw new Error('gone');
    return cwd;
  },
  readFile: async path => {
    assert.equal(path, '/proc/5141/cmdline');
    if (stale) throw new Error('gone');
    return cmdline;
  },
  realpath: async path => path,
});

const baseOptions = ({ child, probe = async () => ({ status: 200 }), attempts = 80, adapters = processAdapters() } = {}) => {
  const calls = { spawn: 0, probe: 0, sleep: 0 };
  return {
    calls,
    options: {
      repoRoot: '/repo',
      requestedOrigin: 'http://127.0.0.1:4021',
      spawnDevServer: async () => { calls.spawn += 1; return child; },
      probe: async url => { calls.probe += 1; return probe(url); },
      sleep: async () => { calls.sleep += 1; },
      now: () => 1000,
      attempts,
      delayMs: 0,
      ...adapters,
    },
  };
};

test('parses the exact observed Next conflict only', () => {
  assert.deepEqual(parseNextDevConflict(conflict), { origin: 'http://localhost:3000', pid: 5141, dir: '/repo' });
  assert.equal(Object.isFrozen(parseNextDevConflict(conflict)), true);
});

test('rejects malformed, duplicate, and non-loopback conflict fields', () => {
  assert.equal(parseNextDevConflict('Another next dev server is already running.\nLocal: http://localhost:3000\nPID: 1'), null);
  assert.equal(parseNextDevConflict(`${conflict}\nPID: 2`), null);
  assert.equal(parseNextDevConflict(conflict.replace('http://localhost:3000', 'https://localhost:3000')), null);
  assert.equal(parseNextDevConflict(conflict.replace('http://localhost:3000', 'http://example.test:3000')), null);
  assert.equal(parseNextDevConflict(42), null);
});

test('proves a same-repository Next dev process identity', async () => {
  const identity = await inspectNextDevProcess({ pid: 5141, dir: '/repo', repoRoot: '/repo', ...processAdapters() });
  assert.deepEqual(identity, { pid: 5141, dir: '/repo', originVerified: true, command: 'next dev' });
  assert.equal(Object.isFrozen(identity), true);
});

test('rejects foreign directories, stale PIDs, and non-Next cmdlines', async () => {
  await assert.rejects(
    inspectNextDevProcess({ pid: 5141, dir: '/repo', repoRoot: '/repo', ...processAdapters({ cwd: '/foreign' }) }),
    { message: 'IDENTITY_PATH_MISMATCH' },
  );
  await assert.rejects(
    inspectNextDevProcess({ pid: 5141, dir: '/repo', repoRoot: '/repo', ...processAdapters({ stale: true }) }),
    { message: 'IDENTITY_PROCESS_STALE' },
  );
  await assert.rejects(
    inspectNextDevProcess({ pid: 5141, dir: '/repo', repoRoot: '/repo', ...processAdapters({ cmdline: '/usr/bin/node\0server\0' }) }),
    { message: 'IDENTITY_CMDLINE_INVALID' },
  );
});

test('acquires a ready owned child without inspecting any other process', async () => {
  const child = { isAlive: () => true, stderr: '' };
  const { calls, options } = baseOptions({ child });
  const session = await acquireNextDevServer(options);
  assert.equal(session.mode, 'owned-child');
  assert.equal(session.owned, true);
  assert.equal(session.child, child);
  assert.equal(Object.isFrozen(session), true);
  assert.deepEqual(calls, { spawn: 1, probe: 1, sleep: 0 });
});

test('reuses only an observed, verified conflict after exactly one spawn', async () => {
  const child = { isAlive: () => false, stderr: conflict };
  const { calls, options } = baseOptions({ child });
  const session = await acquireNextDevServer(options);
  assert.deepEqual(session, { mode: 'reused-existing', owned: false, origin: 'http://localhost:3000', pid: 5141, startedAt: 1000 });
  assert.equal(Object.isFrozen(session), true);
  assert.equal(calls.spawn, 1);
  assert.equal(calls.probe, 1);
});

test('bounds owned-child readiness and never spawns a second child', async () => {
  const child = { isAlive: () => true, stderr: '' };
  const { calls, options } = baseOptions({ child, probe: async () => ({ status: 0 }), attempts: 3 });
  await assert.rejects(acquireNextDevServer(options), { message: 'CHILD_NOT_READY_WITHIN_WINDOW' });
  assert.deepEqual(calls, { spawn: 1, probe: 3, sleep: 2 });
});

test('fails closed when a verified reused server never becomes healthy', async () => {
  const child = { isAlive: () => false, stderr: conflict };
  const { calls, options } = baseOptions({ child, probe: async () => ({ status: 0 }), attempts: 3 });
  await assert.rejects(acquireNextDevServer(options), { message: 'REUSED_SERVER_NOT_READY' });
  assert.deepEqual(calls, { spawn: 1, probe: 3, sleep: 2 });
});

test('stops an owned child exactly once and requires its port to be released', async () => {
  const child = { id: 'owned' };
  const calls = { stop: [], ports: 0 };
  const result = await releaseNextDevServer(
    { mode: 'owned-child', owned: true, origin: 'http://127.0.0.1:4021', child },
    {
      stopProcessGroup: async handle => { calls.stop.push(handle); return true; },
      probePortReleased: async origin => { calls.ports += 1; return origin === 'http://127.0.0.1:4021'; },
    },
  );
  assert.deepEqual(result, { stoppedOwnedChild: true, preservedReusedServer: false });
  assert.deepEqual(calls.stop, [child]);
  assert.equal(calls.ports, 1);
});

test('preserves a reused PID with strict zero cleanup calls', async () => {
  const calls = { stop: [], ports: 0 };
  const result = await releaseNextDevServer(
    { mode: 'reused-existing', owned: false, origin: 'http://localhost:3000', pid: 5141 },
    {
      stopProcessGroup: async pid => { calls.stop.push(pid); return true; },
      probePortReleased: async () => { calls.ports += 1; return true; },
    },
  );
  assert.deepEqual(result, { stoppedOwnedChild: false, preservedReusedServer: true });
  assert.deepEqual(calls, { stop: [], ports: 0 });
});
