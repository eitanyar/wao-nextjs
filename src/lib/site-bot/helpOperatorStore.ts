import fs from 'node:fs';
import path from 'node:path';
import { UUID, isHelpRequestRecord } from './helpRequest';
import type { HelpRequestRecord } from './helpRequest';
import { isValidHelpRequestRoot } from './helpRequestStore';

const MAX_ENTRIES = 1000;
const MAX_BYTES = 65536;
const MAX_ATTEMPTS = 50;

function temporaryName(name: string): boolean {
  const parts = name.split('.');
  return parts.length === 4 && parts[0] === '' && parts[3] === 'tmp' &&
    UUID.test(parts[1]) && UUID.test(parts[2]) && name === name.toLowerCase();
}
function privateFile(info: fs.Stats): void {
  if (!info.isFile() || info.uid !== process.getuid!() || (info.mode & 0o077) || info.size > MAX_BYTES) throw new Error('invalid_record_file');
}
function privateRoot(info: fs.Stats): void {
  if (!info.isDirectory() || info.uid !== process.getuid!() || (info.mode & 0o077)) throw new Error('invalid_root');
}
// O_NOFOLLOW only protects the last path component. Walk from an open parent
// descriptor so that an ancestor swapped for a symlink cannot redirect a read.
function openRoot(root: string): number {
  const flags = fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW;
  let fd = fs.openSync('/', flags);
  try {
    for (const part of root.split('/').filter(Boolean)) {
      const next = fs.openSync(`/proc/self/fd/${fd}/${part}`, flags);
      try { fs.closeSync(fd); } catch (error) { fs.closeSync(next); throw error; }
      fd = next;
    }
    return fd;
  } catch (error) { fs.closeSync(fd); throw error; }
}

function readEntries(root: string): string[] {
  const entries: string[] = [];
  const dir = fs.opendirSync(root);
  try {
    let entry: fs.Dirent | null;
    while ((entry = dir.readSync()) !== null) {
      // Count staging entries too: ignored temporary files cannot bypass the cap.
      if (entries.length >= MAX_ENTRIES) throw new Error('too_many_records');
      const id = entry.name.slice(0, -5);
      if (!temporaryName(entry.name) && (!entry.name.endsWith('.json') || !UUID.test(id) || id !== id.toLowerCase())) throw new Error('invalid_entry');
      entries.push(entry.name);
    }
  } finally { dir.closeSync(); }
  return entries.sort();
}

// null means a link/unlink promotion is still in progress. No bytes from a
// multiply-linked file are read or returned. Retry the whole bounded snapshot.
function readSnapshot(root: string): HelpRequestRecord[] | null {
  const records: HelpRequestRecord[] = [];
  for (const name of readEntries(root)) {
    const temporary = temporaryName(name);
    let file: number;
    try { file = fs.openSync(path.join(root, name), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK); }
    catch (error) {
      // Only staging files may legitimately disappear during normal intake.
      if (temporary && error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') continue;
      throw error;
    }
    try {
      const info = fs.fstatSync(file);
      privateFile(info);
      if (info.nlink === 2) return null;
      if (temporary && info.nlink === 0) continue;
      if (info.nlink !== 1) throw new Error('invalid_record_file');
      // Staging content may be incomplete, and is never an inbox record.
      if (temporary) continue;
      const bytes = Buffer.alloc(MAX_BYTES + 1);
      let used = 0;
      while (used < bytes.length) {
        const count = fs.readSync(file, bytes, used, bytes.length - used, null);
        if (!count) break;
        used += count;
      }
      if (used > MAX_BYTES) throw new Error('invalid_record_file');
      const after = fs.fstatSync(file);
      privateFile(after);
      if (after.nlink === 2) return null;
      if (after.nlink !== 1 || used !== info.size || after.size !== info.size || after.mtimeMs !== info.mtimeMs || after.ctimeMs !== info.ctimeMs) throw new Error('changed_record');
      const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, used)));
      if (!isHelpRequestRecord(value) || value.requestId !== name.slice(0, -5)) throw new Error('invalid_record');
      records.push(value);
    } finally { fs.closeSync(file); }
  }
  return records;
}

export function createHelpOperatorStore(requestRoot: string) {
  return {
    async list(): Promise<HelpRequestRecord[]> {
      if (!isValidHelpRequestRoot(requestRoot)) throw new Error('invalid_root');
      const before = fs.lstatSync(requestRoot);
      const fd = openRoot(requestRoot);
      try {
        const stat = fs.fstatSync(fd);
        privateRoot(stat);
        if (stat.dev !== before.dev || stat.ino !== before.ino) throw new Error('invalid_root');
        const root = `/proc/self/fd/${fd}`;
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          privateRoot(fs.fstatSync(fd));
          const records = readSnapshot(root);
          privateRoot(fs.fstatSync(fd));
          if (records !== null) return records;
          if (attempt + 1 < MAX_ATTEMPTS) await new Promise<void>(resolve => setTimeout(resolve, 1));
        }
        throw new Error('linked_record');
      } finally { fs.closeSync(fd); }
    },
  };
}