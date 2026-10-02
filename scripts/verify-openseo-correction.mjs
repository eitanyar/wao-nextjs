import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const runId = `${new Date().toISOString().replace(/[-:.]/g, '')}-${process.pid}`;
const evidence = path.join(root, 'artifacts', 'openseo-offline-harness-v2', runId);
const attemptId = `attempt-1-${process.pid}`;
const attempt = path.join(evidence, 'attempts', attemptId);
const scratch = path.join(root, 'node_modules', '.cache', `openseo-offline-harness-v2-${attemptId}`);
const guardPath = path.join(scratch, 'offline-network-guard.cjs');
const guardCopyPath = path.join(attempt, 'offline-network-guard.cjs');
const resultsPath = path.join(attempt, 'results.json');
const cleanupPath = path.join(attempt, 'cleanup.json');
const cleanupReportSelfTestsPath = path.join(attempt, 'cleanup-report-self-tests.json');
const ordinaryStageNames = ['preflight', 'syntax', 'cleanup-report-self-tests', 'guard-self-cjs', 'guard-self-esm', 'guard-self-worker', 'compile', 'adapter-tests', 'cli-default', 'cli-explicit', 'lint', 'scope-final'];
const protectedFiles = [
  'AGENTS.md', 'CLAUDE.md', 'CLAUDE_TO_HERMES_HANDOFF.md',
  'handoff/pending/2026-09-09_001_waoengineer_correct-openseo-offline-boundary.md',
  'handoff/pending/2026-09-09_002_waoengineer_replace-openseo-offline-harness.md',
  'scripts/expired-domain-openseo-preflight.mjs', 'src/lib/expired-domain-research/openSeoMcp.ts',
  'src/lib/expired-domain-research/openSeoMcp.test.ts', 'src/lib/expired-domain-research/types.ts',
  'src/lib/expired-domain-research/validation.ts', 'src/lib/expired-domain-research/store.ts',
  'tsconfig.openseo.test.json', 'tsconfig.test.json', 'tsconfig.json', 'package.json', 'package-lock.json',
  'eslint.config.mjs', 'docs/tools/expired-domain-openseo-local-setup.md',
  'fixtures/expired-domain-research/openseo/tool-list.json', 'fixtures/expired-domain-research/openseo/whoami.json',
  'fixtures/expired-domain-research/openseo/projects.json', 'fixtures/expired-domain-research/openseo/research-responses.json',
  'fixtures/expired-domain-research/openseo/error-responses.json',
];
const results = {
  runId, attemptId, focused_acceptance: 'FAIL', release_health: 'NOT_RUN', independent_verification: 'PENDING',
  successorTaskId: '2026-09-09_005', successorVersion: 4, acceptance_attempt_number: 1,
  correction_cycles_used: 0, predecessor_exhausted_attempts: 3, deterministic_redispatch_count: 0, evidence, attempt, scratch, stages: [],
};

function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function asciiOnly(value) { return /^[\x00-\x7f]*$/u.test(value); }
function safeError(error) { return error instanceof Error ? error.message.replace(/[^\x20-\x7e]/gu, '?') : 'unknown'; }
function recordResults() { writeJson(resultsPath, results); }
function stagePath(name, extension) { return path.join(attempt, 'stages', `${name}.${extension}`); }
function emptyStage(name, reason) { const value = { name, status: 'BLOCKED', executed: false, reason }; results.stages.push(value); recordResults(); return value; }
function finalizeCleanupReport({ stages, firstFailure, cleanup }) {
  const names = stages.map(stage => stage.name);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  const missing = ordinaryStageNames.filter(name => !stages.some(stage => stage.name === name && stage.executed));
  const failedOrdinary = ordinaryStageNames.some(name => stages.some(stage => stage.name === name && stage.executed && stage.status !== 'PASS'));
  const decision = { focused_acceptance: 'FAIL', firstFailure: firstFailure ?? null, reason: null, duplicateStages: [...new Set(duplicates)], missingOrdinaryStages: missing };
  if (duplicates.length) decision.reason = `duplicate_stage_names:${[...new Set(duplicates)].join(',')}`;
  else if (missing.length) { decision.focused_acceptance = 'BLOCKED'; decision.reason = `missing_required_stages:${missing.join(',')}`; }
  else if (firstFailure || failedOrdinary) decision.reason = firstFailure ?? 'ordinary_stage_failed';
  else if (cleanup.status !== 'PASS') decision.reason = `cleanup/report: ${cleanup.firstFailure ?? 'cleanup_failed'}`;
  else decision.focused_acceptance = 'PASS';
  return decision;
}
function persistCleanupReport(cleanup, write = writeJson) {
  const payload = { ...cleanup, evidencePath: cleanupPath };
  write(cleanupPath, payload);
  return payload;
}
function finalizePersistAndEmitResults({ result, stages, originalFirstFailure, cleanup, persistResults, emitSummary, emitStderr, resultsPath: outputPath, operation }) {
  const decision = finalizeCleanupReport({ stages, firstFailure: originalFirstFailure, cleanup });
  result.focused_acceptance = decision.focused_acceptance; result.cleanupReport = decision;
  if (!result.firstFailure && decision.firstFailure) result.firstFailure = decision.firstFailure;
  try { persistResults(); }
  catch (error) {
    const reportingError = safeError(error); result.focused_acceptance = 'FAIL'; result.reportingError = reportingError;
    if (!result.firstFailure) result.firstFailure = `${operation}: ${reportingError}`;
    const diagnostic = `reporting operation failed: ${operation}: ${String(outputPath).replace(/[^\x20-\x7e]/gu, '?').slice(0, 384)}\n`;
    emitStderr(diagnostic); return 1;
  }
  emitSummary(JSON.stringify({ focused_acceptance: result.focused_acceptance, release_health: result.release_health, independent_verification: result.independent_verification, evidence: result.evidence, attempt: result.attempt }));
  return result.focused_acceptance === 'PASS' ? 0 : 1;
}
function runCleanupReportSelfTests() {
  const cases = [];
  const ordinary = () => ordinaryStageNames.map(name => ({ name, status: 'PASS', executed: true }));
  const check = (name, fn) => { const observed = fn(); cases.push({ name, pass: true, ...(observed ?? {}) }); };
  check('success-single-cleanup', () => { const cleanup = { name: 'cleanup/report', status: 'PASS', executed: true }; const decision = finalizeCleanupReport({ stages: ordinary(), cleanup }); if (decision.focused_acceptance !== 'PASS') throw new Error('report_self_test_success'); });
  check('earlier-failure-cleanup-success', () => { const cleanup = { name: 'cleanup/report', status: 'PASS', executed: true }; const decision = finalizeCleanupReport({ stages: ordinary(), firstFailure: 'compile: process_exit:compile', cleanup }); if (decision.focused_acceptance !== 'FAIL' || decision.firstFailure !== 'compile: process_exit:compile') throw new Error('report_self_test_first_failure'); });
  check('cleanup-failure-only', () => { const cleanup = { name: 'cleanup/report', status: 'FAIL', executed: true, firstFailure: 'cleanup_failed' }; const decision = finalizeCleanupReport({ stages: ordinary(), cleanup }); if (decision.focused_acceptance !== 'FAIL' || !decision.reason.includes('cleanup_failed')) throw new Error('report_self_test_cleanup_failure'); });
  check('earlier-and-cleanup-failure-preserves-first', () => { const cleanup = { name: 'cleanup/report', status: 'FAIL', executed: true, firstFailure: 'cleanup_failed' }; const decision = finalizeCleanupReport({ stages: ordinary(), firstFailure: 'syntax: process_exit:syntax', cleanup }); if (decision.firstFailure !== 'syntax: process_exit:syntax') throw new Error('report_self_test_preserve_first'); });
  check('missing-ordinary-stage-blocks', () => { const cleanup = { name: 'cleanup/report', status: 'PASS', executed: true }; const decision = finalizeCleanupReport({ stages: ordinary().slice(1), cleanup }); if (decision.focused_acceptance !== 'BLOCKED') throw new Error('report_self_test_missing'); });
  check('duplicate-stage-rejected', () => { const cleanup = { name: 'cleanup/report', status: 'PASS', executed: true }; const stages = ordinary(); stages.push({ ...stages[0] }); const decision = finalizeCleanupReport({ stages, cleanup }); if (decision.focused_acceptance === 'PASS' || !decision.duplicateStages.includes('preflight')) throw new Error('report_self_test_duplicate'); });
  check('cleanup-json-write-failure', () => { let failed = false; try { persistCleanupReport({ name: 'cleanup/report', status: 'PASS', executed: true }, () => { throw new Error('write_failed'); }); } catch { failed = true; } if (!failed) throw new Error('report_self_test_cleanup_write'); });
  check('results-json-write-failure', () => {
    const sentinel = 'synthetic-earlier-failure'; const syntheticPath = '/synthetic/results.json'; const operation = 'synthetic-results-write';
    const syntheticResult = { focused_acceptance: 'PASS', release_health: 'NOT_RUN', independent_verification: 'PENDING', firstFailure: sentinel, evidence: '/synthetic/evidence', attempt: '/synthetic/attempt' };
    const cleanup = { name: 'cleanup/report', status: 'PASS', executed: true }; let persistenceCalls = 0; const stdout = []; const stderr = [];
    const exitCode = finalizePersistAndEmitResults({ result: syntheticResult, stages: [...ordinary(), cleanup], originalFirstFailure: sentinel, cleanup, persistResults: () => { persistenceCalls += 1; throw new Error('synthetic_results_write_failed'); }, emitSummary: value => stdout.push(value), emitStderr: value => stderr.push(value), resultsPath: syntheticPath, operation });
    const observed = { persistenceCallbackCalledOnce: persistenceCalls === 1, helperReturnsExitOne: exitCode === 1, focusedAcceptanceIsFail: syntheticResult.focused_acceptance === 'FAIL', earlierSentinelPreservedByteIdentical: syntheticResult.firstFailure === sentinel, reportingErrorExposesInjectedErrorSafely: syntheticResult.reportingError === 'synthetic_results_write_failed', stdoutCollectorEmpty: stdout.length === 0, stderrExactlyOneBoundedAsciiDiagnostic: stderr.length === 1 && stderr[0].length <= 512 && asciiOnly(stderr[0]) && stderr[0].includes(operation) && stderr[0].includes(syntheticPath) };
    if (Object.values(observed).some(value => !value)) throw new Error('report_self_test_results_write'); return observed;
  });
  writeJson(cleanupReportSelfTestsPath, { cases });
  const stage = { name: 'cleanup-report-self-tests', status: 'PASS', executed: true, evidencePath: cleanupReportSelfTestsPath, cases };
  results.stages.push(stage); recordResults(); return stage;
}
function scrubbedEnv(stage) {
  const home = path.join(scratch, 'home'); const tmp = path.join(scratch, 'tmp'); const guardDir = path.join(attempt, 'guard', stage);
  fs.mkdirSync(home, { recursive: true }); fs.mkdirSync(tmp, { recursive: true }); fs.mkdirSync(guardDir, { recursive: true });
  return { PATH: process.env.PATH ?? '', HOME: home, TMPDIR: tmp, TEMP: tmp, TMP: tmp, TZ: 'UTC', OPENSEO_GUARD_DIR: guardDir, OPENSEO_GUARD_STAGE: stage };
}
function runStage(name, command, args, { timeoutMs = 60000, guarded = false } = {}) {
  const stdoutPath = stagePath(name, 'stdout.log'); const stderrPath = stagePath(name, 'stderr.log');
  fs.mkdirSync(path.dirname(stdoutPath), { recursive: true });
  const argv = guarded ? ['--require', guardPath, ...args] : args;
  let output;
  try { output = spawnSync(command, argv, { cwd: root, env: scrubbedEnv(name), encoding: 'utf8', timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }); }
  catch (error) { output = { status: null, signal: null, error, stdout: '', stderr: '' }; }
  fs.writeFileSync(stdoutPath, output.stdout ?? ''); fs.writeFileSync(stderrPath, output.stderr ?? '');
  const value = {
    name, status: output.status === 0 ? 'PASS' : 'FAIL', executed: true, command, argv,
    exitCode: output.status, signal: output.signal ?? null, spawnError: output.error ? safeError(output.error) : null,
    timeoutMs, timedOut: output.error?.code === 'ETIMEDOUT', stdoutPath, stderrPath,
  };
  results.stages.push(value); recordResults(); return value;
}
function failStage(stage, message) { stage.status = 'FAIL'; stage.firstFailure = message; if (!results.firstFailure) results.firstFailure = `${stage.name}: ${message}`; recordResults(); }
function assertStageExit(stage) { if (stage.exitCode !== 0 || stage.timedOut || stage.spawnError) throw new Error(`process_exit:${stage.name}`); }

function generateOfflineGuard() {
  const source = String.raw`'use strict';
const fs = require('node:fs');
const path = require('node:path');
const mod = require('node:module');
const http = require('node:http'); const https = require('node:https'); const net = require('node:net'); const tls = require('node:tls'); const dns = require('node:dns');
const version = 'openseo-offline-guard-v2';
const stage = process.env.OPENSEO_GUARD_STAGE; const dir = process.env.OPENSEO_GUARD_DIR;
if (!stage || !dir) throw new Error('OPENSEO_OFFLINE_GUARD_MISSING_EVIDENCE');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, process.pid + '.jsonl');
function append(record) { fs.appendFileSync(file, JSON.stringify(record) + '\n', { encoding: 'utf8', mode: 0o600 }); }
function blocked(name, promise) { append({ type: 'attempt', pid: process.pid, stage, guardVersion: version, entrypoint: name }); const error = new Error('OPENSEO_OFFLINE_NETWORK_BLOCKED'); error.code = 'OPENSEO_OFFLINE_NETWORK_BLOCKED'; if (promise) return Promise.reject(error); throw error; }
const installed = [];
function patch(object, key, name, promise) { if (!object || typeof object[key] !== 'function') throw new Error('OPENSEO_OFFLINE_GUARD_MISSING_API:' + name); object[key] = function offlineBlockedEntrypoint() { return blocked(name, promise); }; installed.push(name); }
patch(globalThis, 'fetch', 'globalThis.fetch', true);
for (const [object, prefix] of [[http, 'node:http'], [https, 'node:https']]) { patch(object, 'request', prefix + '.request', false); patch(object, 'get', prefix + '.get', false); }
patch(net, 'connect', 'node:net.connect', false); patch(net, 'createConnection', 'node:net.createConnection', false); patch(net.Socket.prototype, 'connect', 'node:net.Socket.prototype.connect', false); patch(tls, 'connect', 'node:tls.connect', false);
const dnsNames = Object.keys(dns).filter(name => name === 'lookup' || name === 'lookupService' || name === 'reverse' || name === 'resolve' || name.startsWith('resolve'));
for (const name of dnsNames) patch(dns, name, 'node:dns.' + name, false);
const dnsPromises = dns.promises || require('node:dns/promises');
const dnsPromiseNames = Object.keys(dnsPromises).filter(name => name === 'lookup' || name === 'lookupService' || name === 'reverse' || name === 'resolve' || name.startsWith('resolve'));
for (const name of dnsPromiseNames) patch(dnsPromises, name, 'node:dns/promises.' + name, true);
for (const [resolver, prefix, promise] of [[dns.Resolver, 'node:dns.Resolver.prototype', false], [dnsPromises.Resolver, 'node:dns/promises.Resolver.prototype', true]]) {
  if (!resolver || !resolver.prototype) throw new Error('OPENSEO_OFFLINE_GUARD_MISSING_RESOLVER');
  for (const name of ['resolve', 'reverse', ...dnsNames.filter(name => name.startsWith('resolve'))]) { if (typeof resolver.prototype[name] === 'function') patch(resolver.prototype, name, prefix + '.' + name, promise); }
}
mod.syncBuiltinESMExports();
const identity = { version, installed: [...installed].sort(), pid: process.pid, stage, file };
globalThis[Symbol.for('wao.openseo.offline.guard')] = identity;
append({ type: 'handshake', pid: process.pid, stage, guardVersion: version, entrypoint: 'guard.initialize', installed: identity.installed });
`;
  if (!asciiOnly(source)) throw new Error('guard_non_ascii');
  fs.mkdirSync(path.dirname(guardPath), { recursive: true }); fs.writeFileSync(guardPath, source, { mode: 0o600 });
  fs.mkdirSync(path.dirname(guardCopyPath), { recursive: true }); fs.copyFileSync(guardPath, guardCopyPath);
  return { version: 'openseo-offline-guard-v2', hash: sha(guardPath) };
}
function parseJsonLines(dir) {
  if (!fs.existsSync(dir)) throw new Error('guard_evidence_missing');
  const files = fs.readdirSync(dir).filter(name => name.endsWith('.jsonl'));
  if (!files.length) throw new Error('guard_records_missing');
  const records = [];
  for (const name of files) for (const line of fs.readFileSync(path.join(dir, name), 'utf8').trim().split('\n').filter(Boolean)) {
    try { const parsed = JSON.parse(line); if (!parsed || typeof parsed !== 'object') throw new Error('guard_record_invalid'); records.push(parsed); } catch { throw new Error('guard_record_malformed'); }
  }
  return records;
}
function assertGuardEvidence(stage, { requireTestWorker = false, expectedAttempts = 0 } = {}) {
  const records = parseJsonLines(path.join(attempt, 'guard', stage));
  const handshakes = records.filter(record => record.type === 'handshake'); const attempts = records.filter(record => record.type === 'attempt');
  if (!handshakes.length || handshakes.some(record => record.stage !== stage || !Array.isArray(record.installed) || !record.installed.length)) throw new Error('guard_handshake_invalid');
  if (requireTestWorker && handshakes.length < 2) throw new Error('guard_test_worker_handshake_missing');
  if (attempts.length !== expectedAttempts) throw new Error(`guard_attempt_count:${attempts.length}`);
  const value = { stage, handshakes, observedNetworkAttempts: attempts.length, attempts };
  writeJson(path.join(attempt, `guard-${stage}.json`), value); return value;
}
function discoverTests() {
  const file = path.join(root, 'src/lib/expired-domain-research/openSeoMcp.test.ts'); const source = fs.readFileSync(file, 'utf8'); const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const names = [];
  for (const statement of ast.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression) || !ts.isIdentifier(statement.expression.expression) || statement.expression.expression.text !== 'test') continue;
    const argument = statement.expression.arguments[0];
    if (!argument || !ts.isStringLiteral(argument)) throw new Error('unsupported_test_registration');
    names.push(argument.text);
  }
  if (!names.length || new Set(names).size !== names.length) throw new Error('test_registration_invalid');
  writeJson(path.join(attempt, 'discovered-tests.json'), { names }); return names;
}
function assertAdapterTap(stage, expectedNames) {
  const stdout = fs.readFileSync(stage.stdoutPath, 'utf8'); const stderr = fs.readFileSync(stage.stderrPath, 'utf8');
  if (stderr.trim()) throw new Error('adapter_stderr_not_empty');
  if (/Bail out!/u.test(stdout)) throw new Error('tap_bailout');
  const names = [...stdout.matchAll(/^ok \d+ - (.+?)(?: # .+)?$/gmu)].map(match => match[1]);
  const summary = Object.fromEntries([...stdout.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/gmu)].map(match => [match[1], Number(match[2])]));
  if (names.length !== expectedNames.length || new Set(names).size !== names.length || expectedNames.some(name => !names.includes(name))) throw new Error('tap_named_tests_mismatch');
  for (const key of ['fail', 'cancelled', 'skipped', 'todo']) if ((summary[key] ?? 0) !== 0) throw new Error(`tap_${key}`);
  if ((summary.tests ?? 0) !== expectedNames.length || (summary.pass ?? 0) !== expectedNames.length) throw new Error('tap_totals_mismatch');
  const value = { expectedNames, executedNames: names, summary }; writeJson(path.join(attempt, 'adapter-tap.json'), value); return value;
}
function expectedToolNames() { return JSON.parse(fs.readFileSync(path.join(root, 'fixtures/expired-domain-research/openseo/tool-list.json'), 'utf8')).tools.map(tool => tool.name).sort(); }
function assertOfflineCli(stage, parsedPath) {
  const stdout = fs.readFileSync(stage.stdoutPath, 'utf8').trim(); const stderr = fs.readFileSync(stage.stderrPath, 'utf8');
  if (stderr.trim()) throw new Error('cli_stderr_not_empty');
  let value; try { value = JSON.parse(stdout); } catch { throw new Error('cli_json_invalid'); }
  const tools = expectedToolNames(); const assertions = {
    status: value.status === 'PASS', mode: value.mode === 'offline_fixture', networkCalls: typeof value.networkCalls === 'number' && value.networkCalls === 0,
    meteredCalls: typeof value.meteredCalls === 'number' && value.meteredCalls === 0, serverOrigin: value.serverOrigin === 'http://127.0.0.1:3001',
    toolNames: Array.isArray(value.toolNames) && value.toolNames.every(name => typeof name === 'string') && new Set(value.toolNames).size === value.toolNames.length && JSON.stringify([...value.toolNames].sort()) === JSON.stringify(tools),
  };
  if (Object.values(assertions).some(value => !value)) throw new Error('cli_contract_invalid');
  writeJson(parsedPath, { parsed: value, assertions }); return { parsed: value, assertions };
}
function writeProbeFiles() {
  const probes = path.join(scratch, 'probes'); fs.mkdirSync(probes, { recursive: true }); fs.mkdirSync(path.join(attempt, 'probes'), { recursive: true });
  const body = String.raw`const g = globalThis[Symbol.for('wao.openseo.offline.guard')]; if (!g || !g.installed.includes('globalThis.fetch')) throw new Error('guard_identity_missing');
const http = require('node:http'); const https = require('node:https'); const net = require('node:net'); const tls = require('node:tls'); const dns = require('node:dns');
const calls = [() => fetch('http://reserved.invalid'), () => http.request({}), () => http.get({}), () => https.request({}), () => https.get({}), () => net.connect(1), () => net.createConnection(1), () => new net.Socket().connect(1), () => tls.connect(1), () => dns.lookup('reserved.invalid'), () => dns.lookupService('127.0.0.1', 1), () => dns.resolve('reserved.invalid'), () => dns.reverse('127.0.0.1')];
for (const call of calls) { try { const result = call(); if (result && typeof result.catch === 'function') result.catch(() => {}); } catch (error) { if (error.code !== 'OPENSEO_OFFLINE_NETWORK_BLOCKED') throw error; } }
`;
  const esm = String.raw`import http, { request as importedRequest } from 'node:http'; import * as dns from 'node:dns/promises';
const g = globalThis[Symbol.for('wao.openseo.offline.guard')]; if (!g || !g.installed.includes('node:http.request')) throw new Error('guard_identity_missing');
for (const call of [() => http.request({}), () => importedRequest({}), () => dns.lookup('reserved.invalid'), () => dns.resolve('reserved.invalid'), () => new dns.Resolver().resolve('reserved.invalid')]) { try { await call(); } catch (error) { if (error.code !== 'OPENSEO_OFFLINE_NETWORK_BLOCKED') throw error; } }
`;
  const worker = String.raw`const test = require('node:test'); test('guard reaches node test worker', () => { const guard = globalThis[Symbol.for('wao.openseo.offline.guard')]; if (!guard) throw new Error('guard_identity_missing'); });`;
  fs.writeFileSync(path.join(probes, 'guard-cjs.cjs'), body); fs.writeFileSync(path.join(probes, 'guard-esm.mjs'), esm); fs.writeFileSync(path.join(probes, 'guard-worker.test.cjs'), worker);
  fs.copyFileSync(path.join(probes, 'guard-cjs.cjs'), path.join(attempt, 'probes', 'guard-cjs.cjs')); fs.copyFileSync(path.join(probes, 'guard-esm.mjs'), path.join(attempt, 'probes', 'guard-esm.mjs')); fs.copyFileSync(path.join(probes, 'guard-worker.test.cjs'), path.join(attempt, 'probes', 'guard-worker.test.cjs'));
  return probes;
}
function runHarnessSelfTests() {
  const probes = writeProbeFiles(); const cases = [];
  for (const [name, args, expectedAttempts, requireTestWorker] of [
    ['guard-self-cjs', [path.join(probes, 'guard-cjs.cjs')], 13, false],
    ['guard-self-esm', [path.join(probes, 'guard-esm.mjs')], 5, false],
    ['guard-self-worker', ['--test', path.join(probes, 'guard-worker.test.cjs')], 0, true],
  ]) {
    const stage = runStage(name, process.execPath, args, { timeoutMs: 10000, guarded: true }); assertStageExit(stage); const guard = assertGuardEvidence(name, { expectedAttempts, requireTestWorker }); cases.push({ name, pass: true, observedNetworkAttempts: guard.observedNetworkAttempts });
  }
  const validCli = () => ({ status: 'PASS', mode: 'offline_fixture', networkCalls: 0, meteredCalls: 0, serverOrigin: 'http://127.0.0.1:3001', toolNames: expectedToolNames() });
  const rejectCli = (value, stderr = '') => {
    const stage = { stdoutPath: path.join(scratch, `bad-${crypto.randomUUID()}.stdout`), stderrPath: path.join(scratch, `bad-${crypto.randomUUID()}.stderr`) };
    fs.writeFileSync(stage.stdoutPath, typeof value === 'string' ? value : JSON.stringify(value)); fs.writeFileSync(stage.stderrPath, stderr); assertOfflineCli(stage, path.join(scratch, 'bad.json'));
  };
  const parserCases = [
    ['missing-evidence', () => parseJsonLines(path.join(attempt, 'missing'))],
    ['malformed-evidence', () => { const dir = path.join(scratch, 'malformed'); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'x.jsonl'), '{'); parseJsonLines(dir); }],
    ['caught-attempt-rejected', () => assertGuardEvidence('guard-self-cjs', { expectedAttempts: 0 })],
    ['cli-malformed-json', () => rejectCli('{')], ['cli-pass-on-stderr', () => rejectCli(validCli(), 'PASS')],
    ['cli-missing-field', () => { const value = validCli(); delete value.status; rejectCli(value); }],
    ['cli-wrong-mode', () => { const value = validCli(); value.mode = 'wrong'; rejectCli(value); }],
    ['cli-wrong-status', () => { const value = validCli(); value.status = 'FAIL'; rejectCli(value); }],
    ['cli-wrong-origin', () => { const value = validCli(); value.serverOrigin = 'wrong'; rejectCli(value); }],
    ['cli-missing-tool', () => { const value = validCli(); value.toolNames.pop(); rejectCli(value); }],
    ['cli-duplicate-tool', () => { const value = validCli(); value.toolNames.push(value.toolNames[0]); rejectCli(value); }],
    ['cli-extra-tool', () => { const value = validCli(); value.toolNames.push('extra'); rejectCli(value); }],
    ['cli-string-counter', () => { const value = validCli(); value.networkCalls = '0'; rejectCli(value); }],
    ['cli-nonzero-counter', () => { const value = validCli(); value.meteredCalls = 1; rejectCli(value); }],
    ['cli-extra-stdout', () => rejectCli(`${JSON.stringify(validCli())}\nextra`)],
  ];
  for (const [name, fn] of parserCases) { let rejected = false; try { fn(); } catch { rejected = true; } if (!rejected) throw new Error(`self_test_not_rejected:${name}`); cases.push({ name, pass: true }); }
  writeJson(path.join(attempt, 'self-tests.json'), { cases }); return cases;
}
function snapshotInputs() {
  const hashes = Object.fromEntries(protectedFiles.map(file => [file, sha(path.join(root, file))]));
  const config = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.openseo.test.json'), 'utf8'));
  if (config.compilerOptions?.noEmitOnError !== true || JSON.stringify(config.include) !== JSON.stringify(['src/lib/expired-domain-research/openSeoMcp.ts', 'src/lib/expired-domain-research/openSeoMcp.test.ts'])) throw new Error('focused_config_invalid');
  const sdk = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@modelcontextprotocol/sdk/package.json'), 'utf8')).version;
  if (sdk !== '1.30.0') throw new Error('sdk_version_invalid');
  const taskStart = { hashes, gitStatus: spawnSync('git', ['status', '--porcelain=v1', '-uall'], { cwd: root, encoding: 'utf8' }).stdout, sdk, node: process.version, executable: process.execPath, os: `${os.platform()}-${os.arch()}`, harnessHash: sha(path.join(root, 'scripts/verify-openseo-correction.mjs')) };
  writeJson(path.join(attempt, 'preflight.json'), taskStart); return taskStart;
}
function finalizeResults(start) {
  const current = Object.fromEntries(protectedFiles.map(file => [file, sha(path.join(root, file))]));
  const drift = Object.keys(start.hashes).filter(file => start.hashes[file] !== current[file]);
  const currentStatus = spawnSync('git', ['status', '--porcelain=v1', '-uall'], { cwd: root, encoding: 'utf8' }).stdout;
  const diff = spawnSync('git', ['diff', '--check', '--', 'scripts/verify-openseo-correction.mjs'], { cwd: root, encoding: 'utf8' });
  const harnessBytes = fs.readFileSync(path.join(root, 'scripts/verify-openseo-correction.mjs'));
  const value = { protectedDrift: drift, taskStartHarnessHash: start.harnessHash, finalHarnessHash: crypto.createHash('sha256').update(harnessBytes).digest('hex'), asciiOnly: asciiOnly(harnessBytes.toString('utf8')), gitDiffCheckExit: diff.status, gitDiffCheck: diff.stdout + diff.stderr, currentStatus };
  writeJson(path.join(attempt, 'scope-final.json'), value);
  if (drift.length || !value.asciiOnly || diff.status !== 0) throw new Error('scope_final_failed'); return value;
}

let start;
try {
  fs.mkdirSync(attempt, { recursive: true }); fs.mkdirSync(scratch, { recursive: true });
  start = snapshotInputs(); const preflight = { name: 'preflight', status: 'PASS', executed: true, evidencePath: path.join(attempt, 'preflight.json') }; results.stages.push(preflight); recordResults();
  const guard = generateOfflineGuard(); writeJson(path.join(attempt, 'guard-manifest.json'), guard);
  const syntax = runStage('syntax', process.execPath, ['--check', path.join(root, 'scripts/verify-openseo-correction.mjs')], { timeoutMs: 30000 }); assertStageExit(syntax);
  runCleanupReportSelfTests();
  runHarnessSelfTests();
  const compile = runStage('compile', './node_modules/.bin/tsc', ['-p', 'tsconfig.openseo.test.json', '--outDir', path.join(scratch, 'dist'), '--incremental', 'false'], { timeoutMs: 60000 }); assertStageExit(compile);
  const emittedTest = path.join(scratch, 'dist', 'lib/expired-domain-research/openSeoMcp.test.js'); if (!fs.existsSync(emittedTest)) throw new Error('compiled_test_missing'); fs.writeFileSync(path.join(scratch, 'dist', 'package.json'), '{"type":"commonjs"}\n');
  const expectedNames = discoverTests();
  const adapter = runStage('adapter-tests', process.execPath, ['--test', '--test-reporter=tap', emittedTest], { timeoutMs: 60000, guarded: true }); assertStageExit(adapter); assertAdapterTap(adapter, expectedNames); assertGuardEvidence('adapter-tests', { expectedAttempts: 0, requireTestWorker: true });
  fs.mkdirSync(path.join(scratch, 'scripts'), { recursive: true }); const sourceCli = path.join(root, 'scripts/expired-domain-openseo-preflight.mjs'); const copiedCli = path.join(scratch, 'scripts/expired-domain-openseo-preflight.mjs'); fs.copyFileSync(sourceCli, copiedCli); if (sha(sourceCli) !== sha(copiedCli)) throw new Error('cli_copy_hash_mismatch');
  for (const [name, args, parsed] of [['cli-default', [], 'parsed-cli-default.json'], ['cli-explicit', ['--offline-fixture'], 'parsed-cli-explicit.json']]) { const stage = runStage(name, process.execPath, [copiedCli, ...args], { timeoutMs: 30000, guarded: true }); assertStageExit(stage); assertOfflineCli(stage, path.join(attempt, parsed)); assertGuardEvidence(name, { expectedAttempts: 0 }); }
  const lint = runStage('lint', './node_modules/.bin/eslint', ['scripts/verify-openseo-correction.mjs'], { timeoutMs: 60000 }); assertStageExit(lint);
  const scope = { name: 'scope-final', status: 'PASS', executed: true }; results.stages.push(scope); finalizeResults(start); recordResults();
} catch (error) {
  results.firstFailure ??= safeError(error);
  const stage = results.stages.at(-1); if (stage && stage.status === 'PASS') failStage(stage, results.firstFailure); else recordResults();
} finally {
  for (const name of ordinaryStageNames) if (!results.stages.some(stage => stage.name === name)) emptyStage(name, 'prevented_by_earlier_failure');
  const cleanup = { name: 'cleanup/report', status: 'PASS', executed: true, operation: 'owned-scratch-cleanup', command: null, argv: [], exitCode: null, scratch, removed: false, reason: 'in-process owned scratch cleanup' };
  try { const resolved = fs.realpathSync(scratch); const prefix = path.join(root, 'node_modules', '.cache', 'openseo-offline-harness-v2-'); if (!resolved.startsWith(prefix) || fs.lstatSync(scratch).isSymbolicLink()) throw new Error('unsafe_scratch'); fs.rmSync(scratch, { recursive: true, force: false }); cleanup.removed = true; } catch (error) { cleanup.status = 'FAIL'; cleanup.firstFailure = safeError(error); results.firstFailure ??= `cleanup/report: ${cleanup.firstFailure}`; }
  try { Object.assign(cleanup, persistCleanupReport(cleanup)); } catch (error) { cleanup.status = 'FAIL'; cleanup.reportingError = safeError(error); cleanup.firstFailure ??= cleanup.reportingError; results.firstFailure ??= `cleanup/report: ${cleanup.firstFailure}`; }
  results.stages.push(cleanup);
  process.exitCode = finalizePersistAndEmitResults({ result: results, stages: results.stages, originalFirstFailure: results.firstFailure, cleanup, persistResults: recordResults, emitSummary: console.log, emitStderr: value => process.stderr.write(value), resultsPath, operation: 'results-json-write' });
}
