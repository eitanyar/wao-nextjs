import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { appendClientSecurityAudit } from './client-security-audit';

test('client security audit writes only allowlisted pseudonymous fields', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-client-audit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const rawTarget = 'raw-client-canary';
  const rawSource = 'raw-source-canary';
  appendClientSecurityAudit('admin-reset', { root, target: rawTarget, source: rawSource, actorClass: 'admin', outcomeClass: 'allowed', sessionVersion: 2 });
  const entry = JSON.parse(fs.readFileSync(path.join(root, 'client-security.audit.jsonl'), 'utf8')) as Record<string, unknown>;
  assert.deepEqual(Object.keys(entry).sort(), ['actorClass', 'event', 'outcomeClass', 'sessionVersion', 'sourceRef', 'targetRef', 'timestamp']);
  assert.equal(JSON.stringify(entry).includes(rawTarget), false);
  assert.equal(JSON.stringify(entry).includes(rawSource), false);
  assert.match(String(entry.targetRef), /^[a-f0-9]{64}$/);
  assert.match(String(entry.sourceRef), /^[a-f0-9]{64}$/);
});
