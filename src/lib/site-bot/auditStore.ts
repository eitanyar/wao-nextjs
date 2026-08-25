/**
 * Site-bot audit store adapter.
 * Handles reading, writing, and binding Google Business Profile locations to audit records.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. All strings are ASCII.
 */

import fs from 'fs';
import path from 'path';

export interface AuditLocationBinding {
  gbpAccountId: string;
  gbpLocationId: string;
  connectedAt: string; // ISO 8601
  connectedByEmail?: string;
  connectionMethod: 'oauth_direct' | 'manager_invite' | 'manual_override';
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const AUDITS_BASE_DIR = path.join('data', 'audits');

export function resolveAuditPath(auditId: string, customBaseDir?: string): string | null {
  if (!auditId || typeof auditId !== 'string' || !UUID_REGEX.test(auditId)) {
    return null;
  }
  const baseDir = customBaseDir ? path.resolve(customBaseDir) : path.join(process.cwd(), AUDITS_BASE_DIR);
  const resolved = path.join(baseDir, `${auditId}.json`);
  if (!resolved.startsWith(baseDir)) {
    return null;
  }
  return resolved;
}

export async function readAuditRecord(
  auditId: string,
  customBaseDir?: string
): Promise<Record<string, unknown> | null> {
  const filePath = resolveAuditPath(auditId, customBaseDir);
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeAuditRecord(
  auditId: string,
  data: Record<string, unknown>,
  customBaseDir?: string
): Promise<boolean> {
  const filePath = resolveAuditPath(auditId, customBaseDir);
  if (!filePath) {
    return false;
  }
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmpFile = path.join(dir, `.${auditId}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
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
  const filePath = resolveAuditPath(auditId, customBaseDir);
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const existing = JSON.parse(raw);
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      return false;
    }

    const updated = {
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
    };

    const dir = path.dirname(filePath);
    const tmpFile = path.join(dir, `.${auditId}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    fs.writeFileSync(tmpFile, JSON.stringify(updated, null, 2), 'utf8');
    fs.renameSync(tmpFile, filePath);
    return true;
  } catch {
    return false;
  }
}
