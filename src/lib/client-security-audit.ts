import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type ClientSecurityAuditEvent = 'login-denied' | 'login-succeeded' | 'legacy-migrated' | 'admin-reset' | 'forced-change' | 'owner-change' | 'recovery-contact-request' | 'recovery-contact-delivery' | 'recovery-contact-verified' | 'recovery-contact-denied' | 'recovery-contact-reveal';

function pseudonymize(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function appendClientSecurityAudit(event: ClientSecurityAuditEvent, options: {
  root?: string;
  target?: string;
  source?: string;
  actorClass: 'client' | 'admin' | 'system';
  outcomeClass: 'allowed' | 'denied' | 'limited';
  sessionVersion?: number;
}): void {
  const root = path.resolve(options.root ?? path.join(process.cwd(), 'data', 'client-security-audit'));
  fs.mkdirSync(root, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    actorClass: options.actorClass,
    outcomeClass: options.outcomeClass,
    ...(options.target ? { targetRef: pseudonymize(options.target) } : {}),
    ...(options.source ? { sourceRef: pseudonymize(options.source) } : {}),
    ...(options.sessionVersion ? { sessionVersion: options.sessionVersion } : {}),
  };
  fs.appendFileSync(path.join(root, 'client-security.audit.jsonl'), `${JSON.stringify(entry)}\n`, 'utf8');
}
