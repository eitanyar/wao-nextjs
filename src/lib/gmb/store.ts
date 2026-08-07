/**
 * GMB Bot fs-based store — mirrors GEO Bot's per-client file pattern
 * (src/lib/geo/actions.ts, src/lib/geo/client.ts) but under a dedicated `gmb/`
 * subdirectory of each client folder, so it never collides with GEO's files.
 */

import fs   from 'fs';
import path from 'path';
import type {
  GmbConnection, GmbQueueItem, NapScanResult, CompletenessScore,
} from './types';

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

function gmbDir(clientId: string): string {
  return path.join(CLIENTS_DIR, clientId, 'gmb');
}
function connectionFile(clientId: string): string {
  return path.join(gmbDir(clientId), 'connection.json');
}
function queueDir(clientId: string): string {
  return path.join(gmbDir(clientId), 'queue');
}
function napFile(clientId: string): string {
  return path.join(gmbDir(clientId), 'nap-scan.json');
}
function completenessFile(clientId: string): string {
  return path.join(gmbDir(clientId), 'completeness.json');
}

// ── Connection ────────────────────────────────────────────────────────────────
export function getConnection(clientId: string): GmbConnection | null {
  const fp = connectionFile(clientId);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

export function saveConnection(conn: GmbConnection): void {
  fs.mkdirSync(gmbDir(conn.clientId), { recursive: true });
  fs.writeFileSync(connectionFile(conn.clientId), JSON.stringify(conn, null, 2), 'utf8');
}

export function initConnection(clientId: string): GmbConnection {
  const existing = getConnection(clientId);
  if (existing) return existing;
  const conn: GmbConnection = {
    clientId,
    locationId: null,
    connected: false,
    scopesGranted: [],
    cadence: { pullDay: 'monday', postCadenceDays: 14 },
  };
  saveConnection(conn);
  return conn;
}

// ── Pending-approval queue ───────────────────────────────────────────────────
export function getQueue(clientId: string): GmbQueueItem[] {
  const dir = queueDir(clientId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as GmbQueueItem)
    .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
}

export function getPendingQueue(clientId: string): GmbQueueItem[] {
  return getQueue(clientId).filter(i => i.status === 'pending');
}

function queueItemFile(clientId: string, itemId: string): string {
  return path.join(queueDir(clientId), `${itemId}.json`);
}

export function saveQueueItem(item: GmbQueueItem): void {
  fs.mkdirSync(queueDir(item.clientId), { recursive: true });
  fs.writeFileSync(queueItemFile(item.clientId, item.itemId), JSON.stringify(item, null, 2), 'utf8');
}

/** Finds a queue item by itemId across all clients — mirrors geo/actions.ts findActionById. */
export function findQueueItemById(itemId: string): GmbQueueItem | null {
  const clients = fs.existsSync(CLIENTS_DIR)
    ? fs.readdirSync(CLIENTS_DIR).filter(d => fs.statSync(path.join(CLIENTS_DIR, d)).isDirectory())
    : [];
  for (const clientId of clients) {
    const dir = queueDir(clientId);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
      const item = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as GmbQueueItem;
      if (item.itemId === itemId) return item;
    }
  }
  return null;
}

export function updateQueueItem(itemId: string, patch: Partial<GmbQueueItem>): GmbQueueItem | null {
  const item = findQueueItemById(itemId);
  if (!item) return null;
  const updated = { ...item, ...patch };
  saveQueueItem(updated);
  return updated;
}

// ── NAP consistency scan (read-only diagnostic, no approval needed) ─────────
export function getNapScan(clientId: string): NapScanResult | null {
  const fp = napFile(clientId);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

export function saveNapScan(result: NapScanResult): void {
  fs.mkdirSync(gmbDir(result.clientId), { recursive: true });
  fs.writeFileSync(napFile(result.clientId), JSON.stringify(result, null, 2), 'utf8');
}

// ── Profile-completeness score (read-only diagnostic, no approval needed) ───
export function getCompletenessScore(clientId: string): CompletenessScore | null {
  const fp = completenessFile(clientId);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

export function saveCompletenessScore(result: CompletenessScore): void {
  fs.mkdirSync(gmbDir(result.clientId), { recursive: true });
  fs.writeFileSync(completenessFile(result.clientId), JSON.stringify(result, null, 2), 'utf8');
}
