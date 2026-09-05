import fs from 'fs';
import path from 'path';
import type { HybridDecision, HybridSnapshot } from './types';

const CLIENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function clientsDir(baseDir?: string): string {
  return path.resolve(baseDir ?? path.join(process.cwd(), 'data', 'clients'));
}

function clientHybridDir(clientId: string, baseDir?: string): string | null {
  if (!CLIENT_ID_PATTERN.test(clientId)) return null;
  const root = clientsDir(baseDir);
  const resolved = path.resolve(root, clientId, 'hybrid');
  return resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

function filePath(clientId: string, name: 'snapshots.jsonl' | 'decisions.jsonl', baseDir?: string): string | null {
  const directory = clientHybridDir(clientId, baseDir);
  return directory ? path.join(directory, name) : null;
}

function append(clientId: string, name: 'snapshots.jsonl' | 'decisions.jsonl', value: unknown, baseDir?: string): boolean {
  const target = filePath(clientId, name, baseDir);
  if (!target) return false;
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.appendFileSync(target, `${JSON.stringify(value)}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function read<T>(clientId: string, name: 'snapshots.jsonl' | 'decisions.jsonl', baseDir?: string): T[] {
  const target = filePath(clientId, name, baseDir);
  if (!target || !fs.existsSync(target)) return [];
  try {
    return fs.readFileSync(target, 'utf8')
      .split('\n')
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as T];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

export function appendHybridSnapshot(snapshot: HybridSnapshot, baseDir?: string): boolean {
  return append(snapshot.clientId, 'snapshots.jsonl', snapshot, baseDir);
}

export function appendHybridDecision(decision: HybridDecision, baseDir?: string): boolean {
  return append(decision.clientId, 'decisions.jsonl', decision, baseDir);
}

export function readHybridSnapshots(clientId: string, baseDir?: string): HybridSnapshot[] {
  return read<HybridSnapshot>(clientId, 'snapshots.jsonl', baseDir);
}

export function readHybridDecisions(clientId: string, baseDir?: string): HybridDecision[] {
  return read<HybridDecision>(clientId, 'decisions.jsonl', baseDir);
}
