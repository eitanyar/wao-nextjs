import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { UUID, isHelpRequestRecord } from './helpRequest';
import type { HelpRequestRecord, RequestStore } from './helpRequest';

// Linux-only candidate: descriptor-relative procfs paths keep operations anchored
// to the validated directory even if an ancestor is renamed concurrently.
function rootInfo(root: string): fs.Stats {
  if (typeof root !== 'string' || !path.isAbsolute(root) || root.includes('\0') || path.normalize(root) !== root || root === '/') throw new Error('invalid_root');
  let current = '/';
  for (const part of root.split('/').filter(Boolean)) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('invalid_root');
  }
  const stat = fs.lstatSync(root);
  if ((stat.mode & 0o077) !== 0 || stat.uid !== process.getuid!()) throw new Error('insecure_root');
  return stat;
}
export function isValidHelpRequestRoot(root: unknown): root is string {
  try { if (typeof root !== 'string') return false; rootInfo(root); return true; } catch { return false; }
}
function idPath(id: string): string {
  if (typeof id !== 'string' || !UUID.test(id) || id !== id.toLowerCase()) throw new Error('invalid_id');
  return `${id}.json`;
}
function isCode(error: unknown, code: string): boolean {
  return !!error && typeof error === 'object' && 'code' in error && error.code === code;
}
export function createFileHelpRequestStore(absoluteRoot: string): RequestStore {
  const original = rootInfo(absoluteRoot);
  async function withRoot<T>(operation: (root: string, fd: number) => T | Promise<T>): Promise<T> {
    const current = rootInfo(absoluteRoot);
    if (current.dev !== original.dev || current.ino !== original.ino) throw new Error('changed_root');
    const fd = fs.openSync(absoluteRoot, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try {
      const stat = fs.fstatSync(fd);
      if (stat.dev !== original.dev || stat.ino !== original.ino || (stat.mode & 0o077) !== 0) throw new Error('changed_root');
      return await operation(`/proc/self/fd/${fd}`, fd);
    } finally { fs.closeSync(fd); }
  }
  async function readAt(root: string, id: string, durableDirectoryFd?: number): Promise<HelpRequestRecord | null> {
    const file = path.join(root, idPath(id));
    // A competing link/unlink promotion briefly has two links. Never accept a
    // linked record; allow the active promoter a bounded interval to finish.
    // An abandoned temporary link or arbitrary hardlink still fails closed.
    for (let attempt = 0; attempt < 50; attempt++) {
      let fd: number;
      try { fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK); }
      catch (error) { if (isCode(error, 'ENOENT')) return null; throw error; }
      let promoting = false;
      try {
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || (stat.mode & 0o077) !== 0 || stat.uid !== process.getuid!() || stat.size > 65536) throw new Error('invalid_record_file');
        promoting = stat.nlink === 2;
        if (!promoting) {
          if (stat.nlink !== 1) throw new Error('invalid_record_file');
          const value: unknown = JSON.parse(fs.readFileSync(fd, 'utf8'));
          if (!isHelpRequestRecord(value) || value.requestId !== id) throw new Error('invalid_record');
          if (durableDirectoryFd !== undefined) {
            fs.fsyncSync(fd);
            fs.fsyncSync(durableDirectoryFd);
          }
          return value;
        }
      } finally { fs.closeSync(fd); }
      if (promoting) await new Promise<void>(resolve => setTimeout(resolve, 1));
    }
    throw new Error('linked_record');
  }
  return {
    async read(id) { idPath(id); return withRoot(root => readAt(root, id)); },
    async readDurable(id) { idPath(id); return withRoot((root, fd) => readAt(root, id, fd)); },
    async createIfAbsent(record) {
      if (!isHelpRequestRecord(record)) throw new Error('invalid_record');
      const filename = idPath(record.requestId);
      // Snapshot before IO; caller mutation cannot alter the bytes being committed.
      const bytes = JSON.stringify(record);
      if (Buffer.byteLength(bytes) > 65536) throw new Error('record_too_large');
      return withRoot(async (root, directoryFd) => {
        const temporary = path.join(root, `.${record.requestId}.${randomUUID()}.tmp`);
        let owned = false;
        let fd: number | undefined;
        try {
          fd = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
          owned = true;
          fs.writeFileSync(fd, bytes, 'utf8');
          fs.fsyncSync(fd);
          fs.closeSync(fd); fd = undefined;
          try { fs.linkSync(temporary, path.join(root, filename)); }
          catch (error) { if (!isCode(error, 'EEXIST')) throw error; }
          fs.unlinkSync(temporary); owned = false;
          // Includes the EEXIST path: never acknowledge an unflushed concurrent winner.
          fs.fsyncSync(directoryFd);
          const winner = await readAt(root, record.requestId);
          if (!winner) throw new Error('missing_winner');
          return winner;
        } finally {
          try { if (fd !== undefined) fs.closeSync(fd); }
          finally { if (owned) fs.unlinkSync(temporary); }
        }
      });
    },
  };
}
