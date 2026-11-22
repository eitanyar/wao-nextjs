'use server';

import fs   from 'fs';
import path from 'path';
import { clientsDir } from '@/lib/dataRoots';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { pollClientOwnership } from '@/lib/google-ads/ownership';
import {
  ADMIN_SAVE_KEYS,
  READINESS_KEYS,
  mergeReadinessPatch,
  parseAdminSaveSubmission,
  parseLiveReadinessSubmission,
  type LiveReadinessRecord,
} from './shared';

const CLIENTS_DIR = clientsDir();

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

async function requireAdmin(): Promise<void> {
  const jar = await cookies();
  const adminToken = jar.get(ADMIN_COOKIE_NAME)?.value ?? '';
  const isAdmin = await verifyAdminToken(adminToken);
  if (!isAdmin) {
    redirect('/admin/login?error=1&next=%2Fadmin%2Flive-readiness');
  }
}

/**
 * Writes `keys` of `patch` onto the client's record (every other key is kept), atomically, with one audit line.
 * Callers have already passed the admin gate and validated the submission.
 */
function writeKeys(clientId: string, keys: readonly string[], patch: Record<string, unknown>, source: string): void {
  const clientDir = path.join(CLIENTS_DIR, clientId);

  if (!fs.existsSync(clientDir) || !fs.statSync(clientDir).isDirectory()) {
    redirect('/admin/live-readiness?error=unknown-client');
  }

  const recordPath = path.join(clientDir, 'live-readiness.json');
  const existing = loadRecord(recordPath) as Record<string, unknown>;
  const { next: nextRecord, changes } = mergeReadinessPatch(existing, patch, keys);

  atomicWriteJson(recordPath, nextRecord);

  if (changes.length > 0) {
    appendAuditEntry(clientDir, {
      timestamp: new Date().toISOString(),
      source,
      clientId,
      changes,
    });
  }
}

/**
 * Admin-gated live-readiness attestation update. SECURITY CRITICAL:
 * verifies the caller holds a valid wao-admin session BEFORE ever reading or
 * writing a client's live-readiness record — a client must never be able to
 * attest their own live-readiness. This is the only thing standing between
 * this route and a self-service consent-laundering backdoor.
 *
 * The normal save writes the admin-owned keys ONLY (ADMIN_SAVE_KEYS): polled keys come from the ownership poll job,
 * system keys from billing, so a save never clobbers them. Overriding those is the separate
 * overrideLiveReadinessAction below.
 *
 * This action records attestations ONLY. It never touches
 * GOOGLE_ADS_ENABLE_LIVE_MODE, never flips a live-execution flag, and never
 * calls any mutation/executor route — see spec §1.2.
 */
export async function updateLiveReadinessAction(formData: FormData) {
  await requireAdmin();

  const parsed = parseAdminSaveSubmission(formData);
  if (!parsed.ok) {
    redirect('/admin/live-readiness?error=invalid-client');
  }

  writeKeys(parsed.clientId, ADMIN_SAVE_KEYS, parsed.patch as Record<string, unknown>, 'admin-ui');
  redirect(`/admin/live-readiness?success=${encodeURIComponent(parsed.clientId)}`);
}

/**
 * Manual override (admin-gated): sets EVERY readiness key from the override form, audit source
 * 'admin-manual-override'. For when the poll job cannot see something staff verified by hand. The next poll may set
 * the polled keys again from Google.
 */
export async function overrideLiveReadinessAction(formData: FormData) {
  await requireAdmin();

  const parsed = parseLiveReadinessSubmission(formData);
  if (!parsed.ok) {
    if (parsed.error === 'invalid-verification-status' || parsed.error === 'invalid-terms-consent') {
      redirect(
        `/admin/live-readiness?error=${parsed.error}&clientId=${encodeURIComponent(parsed.clientId)}`,
      );
    }
    redirect('/admin/live-readiness?error=invalid-client');
  }

  writeKeys(parsed.clientId, READINESS_KEYS, parsed.patch as Record<string, unknown>, 'admin-manual-override');
  redirect(`/admin/live-readiness?success=${encodeURIComponent(parsed.clientId)}`);
}

/** "Poll now" (admin-gated): runs the ownership poll for one client (Google reads only, no mutation). */
export async function pollNowAction(formData: FormData) {
  await requireAdmin();

  const parsed = parseAdminSaveSubmission(formData);
  if (!parsed.ok) {
    redirect('/admin/live-readiness?error=invalid-client');
  }

  const result = await pollClientOwnership(parsed.clientId, { forceVerification: true });
  redirect(`/admin/live-readiness?${result.ok ? 'polled' : 'error'}=${encodeURIComponent(result.ok ? parsed.clientId : result.error)}&clientId=${encodeURIComponent(parsed.clientId)}`);
}
