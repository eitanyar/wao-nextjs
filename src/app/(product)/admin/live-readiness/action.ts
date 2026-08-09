'use server';

import fs   from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { READINESS_KEYS, parseLiveReadinessSubmission, type ReadinessKey, type LiveReadinessRecord } from './shared';

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

function loadRecord(recordPath: string): LiveReadinessRecord {
  try {
    return JSON.parse(fs.readFileSync(recordPath, 'utf8')) as LiveReadinessRecord;
  } catch {
    return {};
  }
}

/** Atomic write: temp file + rename, so a crash can't leave a half-written consent record. */
function atomicWriteJson(filePath: string, data: unknown): void {
  const tmpPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  fs.writeFileSync(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function appendAuditEntry(clientDir: string, entry: Record<string, unknown>): void {
  const auditPath = path.join(clientDir, 'live-readiness.audit.jsonl');
  fs.appendFileSync(auditPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

/**
 * Admin-gated live-readiness attestation update. SECURITY CRITICAL:
 * verifies the caller holds a valid wao-admin session BEFORE ever reading or
 * writing a client's live-readiness record — a client must never be able to
 * attest their own live-readiness. This is the only thing standing between
 * this route and a self-service consent-laundering backdoor.
 *
 * This action records attestations ONLY. It never touches
 * GOOGLE_ADS_ENABLE_LIVE_MODE, never flips a live-execution flag, and never
 * calls any mutation/executor route — see spec §1.2.
 */
export async function updateLiveReadinessAction(formData: FormData) {
  const jar = await cookies();

  const adminToken = jar.get(ADMIN_COOKIE_NAME)?.value ?? '';
  const isAdmin = await verifyAdminToken(adminToken);
  if (!isAdmin) {
    redirect('/admin/login?error=1&next=%2Fadmin%2Flive-readiness');
  }

  const parsed = parseLiveReadinessSubmission(formData);
  if (!parsed.ok) {
    if (parsed.error === 'missing-consent-evidence') {
      redirect(
        `/admin/live-readiness?error=missing-consent-evidence&clientId=${encodeURIComponent(parsed.clientId)}`,
      );
    }
    redirect('/admin/live-readiness?error=invalid-client');
  }

  const { clientId, patch, evidenceNote } = parsed;
  const clientDir = path.join(CLIENTS_DIR, clientId);

  if (!fs.existsSync(clientDir) || !fs.statSync(clientDir).isDirectory()) {
    redirect('/admin/live-readiness?error=unknown-client');
  }

  const recordPath = path.join(clientDir, 'live-readiness.json');
  const existing = loadRecord(recordPath);

  const nextRecord: LiveReadinessRecord = { ...existing };
  const changes: Array<{ key: ReadinessKey; from: boolean; to: boolean }> = [];

  for (const key of READINESS_KEYS) {
    const before = existing[key] === true;
    const after = patch[key] === true;
    if (before !== after) {
      changes.push({ key, from: before, to: after });
    }
    nextRecord[key] = after;
  }

  const evidenceChanged = patch.liveConsentRecorded && evidenceNote !== (existing.liveConsentEvidence ?? '');
  if (patch.liveConsentRecorded) {
    nextRecord.liveConsentEvidence = evidenceNote;
  }

  atomicWriteJson(recordPath, nextRecord);

  if (changes.length > 0 || evidenceChanged) {
    appendAuditEntry(clientDir, {
      timestamp: new Date().toISOString(),
      source: 'admin-ui',
      clientId,
      changes,
      ...(patch.liveConsentRecorded ? { liveConsentEvidence: evidenceNote } : {}),
    });
  }

  redirect(`/admin/live-readiness?success=${encodeURIComponent(clientId)}`);
}
