/**
 * Site-bot audit store adapter.
 * Handles minimized audit records and optional GBP location bindings.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. All strings are ASCII.
 */

import fs from 'fs';
import path from 'path';

export interface AuditLocationBinding {
  gbpAccountId: string;
  gbpLocationId: string;
  connectedAt: string;
  connectedByEmail?: string;
  connectionMethod: 'oauth_direct' | 'manager_invite' | 'manual_override';
}

export interface AuditCandidateSnapshot {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  types: string[];
  hasRegularOpeningHours: boolean;
  hasSpecialOpeningHours: boolean;
  hasPhone: boolean;
  hasWebsite: boolean;
  photosFetched: boolean;
  photoCount: number;
  hasRating: boolean;
  userRatingCount?: number;
  hasEditorialSummary: boolean;
}

export interface AuditRecord {
  auditId: string;
  query: { businessName: string };
  fetchedAt: string;
  expiresAt: string;
  candidates: AuditCandidateSnapshot[];
  gbpAccountId?: string;
  gbpLocationId?: string;
  connection?: AuditLocationBinding;
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const AUDITS_BASE_DIR = path.join('data', 'audits');
export const AUDIT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function getBaseDir(customBaseDir?: string): string {
  return customBaseDir ? path.resolve(customBaseDir) : path.resolve(process.cwd(), AUDITS_BASE_DIR);
}

export function resolveAuditPath(auditId: string, customBaseDir?: string): string | null {
  if (!auditId || typeof auditId !== 'string' || !UUID_REGEX.test(auditId)) return null;
  const baseDir = getBaseDir(customBaseDir);
  const resolved = path.resolve(baseDir, `${auditId}.json`);
  return path.dirname(resolved) === baseDir ? resolved : null;
}

function isRegularFile(filePath: string): boolean {
  try {
    return fs.lstatSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isAuditRecord(value: unknown): value is AuditRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Partial<AuditRecord>;
  return typeof record.auditId === 'string' && typeof record.fetchedAt === 'string' &&
    typeof record.expiresAt === 'string' && Array.isArray(record.candidates) &&
    !!record.query && typeof record.query.businessName === 'string';
}

export function isAuditExpired(record: Pick<AuditRecord, 'expiresAt'>, now = new Date()): boolean {
  const expiresAt = Date.parse(record.expiresAt);
  return !Number.isFinite(expiresAt) || expiresAt <= now.getTime();
}

export async function deleteAuditRecord(auditId: string, customBaseDir?: string): Promise<boolean> {
  const filePath = resolveAuditPath(auditId, customBaseDir);
  if (!filePath || !isRegularFile(filePath)) return false;
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function purgeExpiredAuditRecords(customBaseDir?: string, now = new Date()): Promise<number> {
  const baseDir = getBaseDir(customBaseDir);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return 0;
  }

  let deleted = 0;
  for (const entry of entries) {
    const auditId = entry.name.endsWith('.json') ? entry.name.slice(0, -5) : '';
    if (!entry.isFile() || !UUID_REGEX.test(auditId)) continue;
    const record = await readAuditRecord(auditId, baseDir, now, false);
    if (record === null) {
      const filePath = resolveAuditPath(auditId, baseDir);
      if (filePath && isRegularFile(filePath)) {
        try {
          fs.unlinkSync(filePath);
          deleted++;
        } catch {
          // Continue purging remaining files.
        }
      }
    }
  }
  return deleted;
}

export async function readAuditRecord(
  auditId: string,
  customBaseDir?: string,
  now = new Date(),
  deleteExpired = true
): Promise<AuditRecord | null> {
  const filePath = resolveAuditPath(auditId, customBaseDir);
  if (!filePath || !isRegularFile(filePath)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!isAuditRecord(parsed)) return null;
    if (isAuditExpired(parsed, now)) {
      if (deleteExpired) await deleteAuditRecord(auditId, customBaseDir);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeAuditRecord(
  auditId: string,
  data: Record<string, unknown>,
  customBaseDir?: string,
  now = new Date()
): Promise<boolean> {
  const filePath = resolveAuditPath(auditId, customBaseDir);
  if (!filePath) return false;
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const record = {
      ...data,
      auditId,
      expiresAt: typeof data.expiresAt === 'string'
        ? data.expiresAt
        : new Date(now.getTime() + AUDIT_RETENTION_MS).toISOString(),
    } as AuditRecord;
    const tmpFile = path.join(dir, `.${auditId}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    fs.writeFileSync(tmpFile, JSON.stringify(record, null, 2), 'utf8');
    fs.renameSync(tmpFile, filePath);
    return true;
  } catch {
    return false;
  }
}

export async function bindAuditLocation(
  auditId: string,
  binding: AuditLocationBinding,
  customBaseDir?: string
): Promise<boolean> {
  const existing = await readAuditRecord(auditId, customBaseDir);
  if (!existing) return false;
  return writeAuditRecord(auditId, {
    ...existing,
    gbpAccountId: binding.gbpAccountId,
    gbpLocationId: binding.gbpLocationId,
    connection: {
      gbpAccountId: binding.gbpAccountId,
      gbpLocationId: binding.gbpLocationId,
      connectedAt: binding.connectedAt,
      ...(binding.connectedByEmail ? { connectedByEmail: binding.connectedByEmail } : {}),
      connectionMethod: binding.connectionMethod,
    },
  }, customBaseDir);
}
