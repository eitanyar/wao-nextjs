'use server';

import fs   from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { applyLtpcSubmission } from './ltpc-store.js';

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

function clientExists(clientId: string): boolean {
  const dir = path.join(CLIENTS_DIR, clientId);
  return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
}

function loadRecord(clientId: string) {
  try {
    return JSON.parse(fs.readFileSync(path.join(CLIENTS_DIR, clientId, 'readiness-gate.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** Atomic write: temp file + rename, so a crash can't leave a half-written LTPC record. */
function writeRecord(clientId: string, record: unknown): void {
  const filePath = path.join(CLIENTS_DIR, clientId, 'readiness-gate.json');
  const tmpPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  fs.writeFileSync(tmpPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function appendAudit(clientId: string, entry: unknown): void {
  const auditPath = path.join(CLIENTS_DIR, clientId, 'readiness-gate.audit.jsonl');
  fs.appendFileSync(auditPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

/**
 * Admin-gated LTPC (Lead-Tracking Provability Checklist) update.
 * SECURITY CRITICAL: verifies the caller holds a valid wao-admin session
 * BEFORE ever reading or writing a client's readiness-gate record — this is
 * a **staff go/no-go gate**, not something a client can attest for
 * themselves. Same posture as admin/live-readiness/action.ts §1.1.
 *
 * All actual parsing/validation/persistence logic runs in
 * ./ltpc-store.js's `applyLtpcSubmission()` (plain, dependency-injected,
 * directly testable — see ./ltpc-store.test.mjs) — this file is the thin
 * fs/cookies/redirect wrapper around it, same split as
 * src/lib/crm/clientLeadsActions.js / src/app/api/client/leads/route.ts.
 *
 * v1 enforcement posture (readiness-gate.md §5.1, Lior's Q1 resolution):
 * this is a VISIBLE STAFF GATE, not a code-level block. This action does
 * not touch, and must never be wired to, any provisioning/billing/
 * `create-campaign` route — see the spec's own out-of-scope §9 and the
 * Q1-escalation-trigger section for the exact future condition that would
 * change this.
 */
export async function updateLtpcAction(formData: FormData) {
  const jar = await cookies();

  const adminToken = jar.get(ADMIN_COOKIE_NAME)?.value ?? '';
  const isAdmin = await verifyAdminToken(adminToken);
  if (!isAdmin) {
    redirect('/admin/login?error=1&next=%2Fadmin%2Freadiness-gate');
  }

  const result = await applyLtpcSubmission({ formData, clientExists, loadRecord, writeRecord, appendAudit });

  if (!result.ok) {
    if (result.error === 'missing-evidence') {
      redirect(`/admin/readiness-gate?error=missing-evidence&clientId=${encodeURIComponent(result.clientId!)}&itemId=${encodeURIComponent(result.itemId!)}`);
    }
    if (result.error === 'missing-checked-by') {
      redirect(`/admin/readiness-gate?error=missing-checked-by&clientId=${encodeURIComponent(result.clientId!)}`);
    }
    if (result.error === 'unknown-client') {
      redirect(`/admin/readiness-gate?error=unknown-client&clientId=${encodeURIComponent(result.clientId!)}`);
    }
    redirect('/admin/readiness-gate?error=invalid-submission');
  }

  redirect(`/admin/readiness-gate?success=${encodeURIComponent(result.clientId)}`);
}
