// Operator follow-up state for Site-Bot help requests.
// v1 intake records are never modified: follow-up status lives in a separate
// private directory as one small JSON file per request id.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { UUID, isHelpRequestRecord } from './helpRequest';
import type { HelpRequestRecord } from './helpRequest';
import { isValidHelpRequestRoot } from './helpRequestStore';

export const FOLLOW_UP_STATUSES = ['handling', 'done'] as const;
export type FollowUpStatus = typeof FOLLOW_UP_STATUSES[number];
export interface FollowUpRecord {
  schemaVersion: 1; requestId: string; status: FollowUpStatus; updatedAt: string; updatedBy: 'admin';
}
export interface InboxEntry {
  record: HelpRequestRecord;
  followUp: FollowUpRecord | null;
}
export interface InboxSnapshot { entries: InboxEntry[]; skipped: number }

const MAX_ENTRIES = 1000;
const MAX_BYTES = 65536;
const RECORD_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/;
const STAGING_NAME = /^\.[0-9a-f-]{36}\.[0-9a-f-]{36}\.tmp$/;

export function isFollowUpStatus(value: unknown): value is FollowUpStatus {
  return typeof value === 'string' && (FOLLOW_UP_STATUSES as readonly string[]).includes(value);
}
function isIso(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}
export function isFollowUpRecord(value: unknown): value is FollowUpRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).length === 5 && v.schemaVersion === 1 && typeof v.requestId === 'string' && UUID.test(v.requestId) &&
    v.requestId === v.requestId.toLowerCase() && isFollowUpStatus(v.status) && isIso(v.updatedAt) && v.updatedBy === 'admin';
}

// Reads one private, regular, singly-linked file owned by this user. Throws on anything else.
function readPrivateJson(file: string): unknown {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const info = fs.fstatSync(fd);
    if (!info.isFile() || info.uid !== process.getuid!() || (info.mode & 0o077) || info.nlink !== 1 || info.size > MAX_BYTES) throw new Error('invalid_file');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(fd));
    return JSON.parse(text) as unknown;
  } finally { fs.closeSync(fd); }
}

function listNames(root: string): string[] {
  return fs.readdirSync(root).sort();
}

function validRoots(requestRoot: string, followUpRoot: string): void {
  if (!isValidHelpRequestRoot(requestRoot) || !isValidHelpRequestRoot(followUpRoot) || requestRoot === followUpRoot) throw new Error('invalid_root');
}

// Both the intake gate and both private directories are required; otherwise throws 'disabled'.
export function createHelpInboxStoreFromEnv(env: Record<string, string | undefined>) {
  const requestRoot = env.SITE_BOT_HELP_REQUEST_DIR;
  const followUpRoot = env.SITE_BOT_HELP_FOLLOWUP_DIR;
  if (env.SITE_BOT_HELP_INTAKE_ENABLED !== 'true' || !requestRoot || !followUpRoot) throw new Error('disabled');
  return createHelpInboxStore(requestRoot, followUpRoot);
}

export function createHelpInboxStore(requestRoot: string, followUpRoot: string) {
  validRoots(requestRoot, followUpRoot);

  function readFollowUps(): { map: Map<string, FollowUpRecord>; skipped: number } {
    const map = new Map<string, FollowUpRecord>();
    let skipped = 0;
    for (const name of listNames(followUpRoot)) {
      if (STAGING_NAME.test(name)) continue;
      if (!RECORD_NAME.test(name) || map.size >= MAX_ENTRIES) { skipped++; continue; }
      try {
        const value = readPrivateJson(path.join(followUpRoot, name));
        if (!isFollowUpRecord(value) || `${value.requestId}.json` !== name) throw new Error('invalid_follow_up');
        map.set(value.requestId, value);
      } catch { skipped++; }
    }
    return { map, skipped };
  }

  function readRequest(requestId: string): HelpRequestRecord {
    const value = readPrivateJson(path.join(requestRoot, `${requestId}.json`));
    if (!isHelpRequestRecord(value) || value.requestId !== requestId) throw new Error('invalid_record');
    return value;
  }

  return {
    // A single unreadable or unexpected file is skipped and counted, never fatal.
    async list(): Promise<InboxSnapshot> {
      validRoots(requestRoot, followUpRoot);
      const followUps = readFollowUps();
      const entries: InboxEntry[] = [];
      let skipped = followUps.skipped;
      for (const name of listNames(requestRoot)) {
        // Intake staging files are in-flight writes, not records.
        if (STAGING_NAME.test(name)) continue;
        if (!RECORD_NAME.test(name) || entries.length >= MAX_ENTRIES) { skipped++; continue; }
        const requestId = name.slice(0, -5);
        try { entries.push({ record: readRequest(requestId), followUp: followUps.map.get(requestId) ?? null }); }
        catch { skipped++; }
      }
      return { entries, skipped };
    },

    // Returns null when no valid v1 request exists for the id.
    async setStatus(requestId: string, status: FollowUpStatus, now: Date): Promise<FollowUpRecord | null> {
      if (typeof requestId !== 'string' || !UUID.test(requestId) || requestId !== requestId.toLowerCase() || !isFollowUpStatus(status)) throw new Error('invalid_input');
      validRoots(requestRoot, followUpRoot);
      try { readRequest(requestId); }
      catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
        throw error;
      }
      const record: FollowUpRecord = { schemaVersion: 1, requestId, status, updatedAt: now.toISOString(), updatedBy: 'admin' };
      const temporary = path.join(followUpRoot, `.${requestId}.${randomUUID()}.tmp`);
      const fd = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
      let renamed = false;
      try {
        try {
          fs.writeFileSync(fd, JSON.stringify(record), 'utf8');
          fs.fsyncSync(fd);
        } finally { fs.closeSync(fd); }
        fs.renameSync(temporary, path.join(followUpRoot, `${requestId}.json`));
        renamed = true;
      } finally {
        if (!renamed) { try { fs.unlinkSync(temporary); } catch { /* already gone */ } }
      }
      return record;
    },
  };
}
