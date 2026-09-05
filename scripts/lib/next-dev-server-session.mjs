const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const fail = code => {
  throw new Error(code);
};

const asLoopbackHttpOrigin = value => {
  if (typeof value !== 'string' || value.length === 0) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname === '[::1]' ? '::1' : url.hostname;
    if (url.protocol !== 'http:' || !LOOPBACK_HOSTS.has(hostname)) return null;
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    return url.origin;
  } catch {
    return null;
  }
};

const fieldValues = (lines, name) => lines
  .map(line => line.match(new RegExp(`^\\s*(?:-\\s*)?${name}:\\s*(.*?)\\s*$`)))
  .filter(Boolean)
  .map(match => match[1]);

export const parseNextDevConflict = stderr => {
  if (typeof stderr !== 'string') return null;
  const lines = stderr.split(/\r?\n/);
  if (lines.filter(line => line.includes('Another next dev server is already running.')).length !== 1) return null;

  const [origin] = fieldValues(lines, 'Local');
  const [pidText] = fieldValues(lines, 'PID');
  const [dir] = fieldValues(lines, 'Dir');
  if (fieldValues(lines, 'Local').length !== 1 || fieldValues(lines, 'PID').length !== 1 || fieldValues(lines, 'Dir').length !== 1) return null;

  const safeOrigin = asLoopbackHttpOrigin(origin);
  const pid = /^(?:[1-9][0-9]*)$/.test(pidText ?? '') ? Number(pidText) : null;
  if (!safeOrigin || !Number.isSafeInteger(pid) || !dir || !dir.startsWith('/') || /[\0\r\n]/.test(dir)) return null;
  return Object.freeze({ origin: safeOrigin, pid, dir });
};

export const inspectNextDevProcess = async ({ pid, dir, repoRoot, readlink, readFile, realpath }) => {
  if (!Number.isSafeInteger(pid) || pid < 1 || typeof dir !== 'string' || typeof repoRoot !== 'string') fail('IDENTITY_INPUT_INVALID');
  if (typeof readlink !== 'function' || typeof readFile !== 'function' || typeof realpath !== 'function') fail('IDENTITY_ADAPTER_INVALID');

  let canonicalDir;
  let canonicalRepoRoot;
  let canonicalCwd;
  try {
    [canonicalDir, canonicalRepoRoot, canonicalCwd] = await Promise.all([
      realpath(dir),
      realpath(repoRoot),
      readlink(`/proc/${pid}/cwd`).then(realpath),
    ]);
  } catch {
    fail('IDENTITY_PROCESS_STALE');
  }
  if (![canonicalDir, canonicalRepoRoot, canonicalCwd].every(value => typeof value === 'string' && value.startsWith('/'))) fail('IDENTITY_PATH_INVALID');
  if (canonicalDir !== canonicalRepoRoot || canonicalDir !== canonicalCwd) fail('IDENTITY_PATH_MISMATCH');

  let cmdline;
  try {
    cmdline = await readFile(`/proc/${pid}/cmdline`);
  } catch {
    fail('IDENTITY_PROCESS_STALE');
  }
  const text = Buffer.isBuffer(cmdline) ? cmdline.toString('utf8') : typeof cmdline === 'string' ? cmdline : '';
  const argv = text.split('\0').filter(Boolean);
  const nextIndex = argv.findIndex(arg => /(?:^|\/)next(?:\.js)?$/.test(arg));
  const devIndex = argv.findIndex(arg => arg === 'dev');
  if (nextIndex < 0 || devIndex < 0 || nextIndex === devIndex) fail('IDENTITY_CMDLINE_INVALID');

  return Object.freeze({ pid, dir: canonicalDir, originVerified: true, command: 'next dev' });
};

const childAlive = child => {
  if (typeof child?.isAlive === 'function') return Boolean(child.isAlive());
  return child?.exitCode === null && child?.signalCode === null;
};

const childStderr = child => typeof child?.getStderr === 'function' ? child.getStderr() : child?.stderr;
const responseStatus = response => typeof response === 'number' ? response : response?.status;

export const acquireNextDevServer = async options => {
  const { repoRoot, requestedOrigin, spawnDevServer, probe, readlink, readFile, realpath, sleep, now } = options ?? {};
  const attempts = options?.attempts ?? 80;
  const delayMs = options?.delayMs ?? 500;
  if (typeof repoRoot !== 'string' || !asLoopbackHttpOrigin(requestedOrigin) || !Number.isInteger(attempts) || attempts < 1 || !Number.isFinite(delayMs) || delayMs < 0) fail('ACQUIRE_OPTIONS_INVALID');
  if (![spawnDevServer, probe, readlink, readFile, realpath, sleep, now].every(adapter => typeof adapter === 'function')) fail('ACQUIRE_ADAPTER_INVALID');

  const origin = asLoopbackHttpOrigin(requestedOrigin);
  const startedAt = now();
  const child = await spawnDevServer({ origin, repoRoot });
  if (!child) fail('CHILD_SPAWN_FAILED');

  let conflict = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (!childAlive(child)) {
      conflict = parseNextDevConflict(childStderr(child));
      if (!conflict) fail('CHILD_EXITED_WITHOUT_SAFE_CONFLICT');
      break;
    }
    try {
      if (responseStatus(await probe(`${origin}/`)) > 0 && childAlive(child)) {
        return Object.freeze({ mode: 'owned-child', owned: true, origin, child, startedAt });
      }
    } catch {}
    if (attempt + 1 < attempts) await sleep(delayMs);
  }

  if (!conflict) fail('CHILD_NOT_READY_WITHIN_WINDOW');
  const identity = await inspectNextDevProcess({ pid: conflict.pid, dir: conflict.dir, repoRoot, readlink, readFile, realpath });
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if (responseStatus(await probe(`${conflict.origin}/`)) > 0) {
        return Object.freeze({ mode: 'reused-existing', owned: false, origin: conflict.origin, pid: identity.pid, startedAt });
      }
    } catch {}
    if (attempt + 1 < attempts) await sleep(delayMs);
  }
  fail('REUSED_SERVER_NOT_READY');
};

export const releaseNextDevServer = async (session, { stopProcessGroup, probePortReleased } = {}) => {
  if (session?.mode === 'reused-existing' && session.owned === false) {
    return Object.freeze({ stoppedOwnedChild: false, preservedReusedServer: true });
  }
  if (session?.mode !== 'owned-child' || session.owned !== true || !session.child) fail('RELEASE_SESSION_INVALID');
  if (typeof stopProcessGroup !== 'function' || typeof probePortReleased !== 'function') fail('RELEASE_ADAPTER_INVALID');
  if (!await stopProcessGroup(session.child)) fail('OWNED_CHILD_STOP_FAILED');
  if (!await probePortReleased(session.origin)) fail('OWNED_CHILD_PORT_NOT_RELEASED');
  return Object.freeze({ stoppedOwnedChild: true, preservedReusedServer: false });
};
