import fs   from 'fs';
import path from 'path';

/**
 * GEO client record — read from data/clients/{clientId}/client.json.
 * `wpConnected` / `platform` are additive fields for the auto vs manual
 * publish decision on /geo/action/[actionId]; absent on existing client
 * files → treated as not connected / unknown platform.
 */
export interface GeoClientRecord {
  clientId:         string;
  siteUrl:          string;
  cmsType?:         string;
  businessNiche?:   string;
  topService?:      string;
  targetLocation?:  string;
  usp?:             string;
  clientQuestions?: string;
  exclusions?:      string;
  approvalContact?: string;
  approvalWhatsapp?: string;
  tone?:            string;
  pin?:             string;
  entitlements?:    string[];
  wpConnected?:     boolean;
  platform?:        string | null;
  /** Self-serve GSC OAuth (docs/specs — VISION.md line 247). True once
   * data/clients/{clientId}/gsc-token.json holds a valid refresh token. */
  gscConnected?:    boolean;
  /** Site Bot deploy timestamp (ISO 8601) — stamped once, on first creation, never
   * overwritten by a redeploy. Starts the clock toward the month-4 GEO Bot upgrade
   * eligibility window (VISION.md's Phase 1 buyer-routing section). */
  siteBotLaunchedAt?: string;
  /** Timestamp (ISO 8601) of the GSC connection transitioning false->true. Stamped
   * by setClientGscConnected the first time it's called with connected=true; never
   * overwritten on subsequent calls (idempotent) so it stays the true "clock start"
   * even if the boolean gets toggled again later. */
  gscConnectedAt?:  string;
}

export interface GeoUpgradeEligibility {
  eligible: boolean;
  reason?: 'no_record' | 'already_entitled' | 'gsc_not_connected' | 'too_recent';
}

/**
 * Pure eligibility check for the month-4 self-serve GEO Bot upgrade
 * (docs/missions/site-bot-single-segment-pivot-2026-08-21.md, Spec B).
 * Takes a record (not a clientId) so callers do their own I/O — see
 * getClientRecord above for loading a record from disk.
 */
export function checkGeoUpgradeEligibility(
  record: GeoClientRecord | null,
  now: Date = new Date()
): GeoUpgradeEligibility {
  if (!record) return { eligible: false, reason: 'no_record' };

  const entitlements = record.entitlements;
  if (entitlements && (entitlements.includes('geo') || entitlements.includes('geo:internal'))) {
    return { eligible: false, reason: 'already_entitled' };
  }

  if (record.gscConnected !== true || !record.gscConnectedAt) {
    return { eligible: false, reason: 'gsc_not_connected' };
  }

  const connectedAt = new Date(record.gscConnectedAt);
  const daysSince = (now.getTime() - connectedAt.getTime()) / 86_400_000;
  if (daysSince < 90) {
    return { eligible: false, reason: 'too_recent' };
  }

  return { eligible: true };
}

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

function clientFile(clientId: string): string {
  return path.join(CLIENTS_DIR, clientId, 'client.json');
}

export function getClientRecord(clientId: string): GeoClientRecord | null {
  const fp = clientFile(clientId);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8')) as GeoClientRecord;
}

export function setClientPlatform(clientId: string, platform: string): boolean {
  const fp = clientFile(clientId);
  if (!fs.existsSync(fp)) return false;
  const record = JSON.parse(fs.readFileSync(fp, 'utf8')) as GeoClientRecord;
  record.platform = platform;
  fs.writeFileSync(fp, JSON.stringify(record, null, 2), 'utf8');
  return true;
}

export function setClientWpConnected(clientId: string, connected: boolean): boolean {
  const fp = clientFile(clientId);
  if (!fs.existsSync(fp)) return false;
  const record = JSON.parse(fs.readFileSync(fp, 'utf8')) as GeoClientRecord;
  record.wpConnected = connected;
  fs.writeFileSync(fp, JSON.stringify(record, null, 2), 'utf8');
  return true;
}

export function setClientGscConnected(clientId: string, connected: boolean): boolean {
  const fp = clientFile(clientId);
  if (!fs.existsSync(fp)) return false;
  const record = JSON.parse(fs.readFileSync(fp, 'utf8')) as GeoClientRecord;
  record.gscConnected = connected;
  // One-time "first connected" marker — never overwritten once stamped, and
  // never touched on a disconnect (connected === false).
  if (connected && !record.gscConnectedAt) {
    record.gscConnectedAt = new Date().toISOString();
  }
  fs.writeFileSync(fp, JSON.stringify(record, null, 2), 'utf8');
  return true;
}

export interface ReviewerNote {
  note:         string;
  reviewerName: string;
  addedAt:      string;
}

function reviewerNotesFile(clientId: string): string {
  return path.join(CLIENTS_DIR, clientId, 'geo-reviewer-notes.json');
}

/**
 * Standing style/content conditions a human reviewer noticed during
 * approval (review queue, 2026-08-17) — e.g. "position כשר differently in
 * catering copy." Distinct from client.json's `tone`/`usp` (set once at
 * intake): these accumulate over time from actual reviewed output, and get
 * threaded into every future generation prompt for this client (see
 * scripts/geo-generate-content.mjs) so the same correction doesn't have to
 * be made by hand on every batch.
 */
export function getReviewerNotes(clientId: string): ReviewerNote[] {
  const fp = reviewerNotesFile(clientId);
  if (!fs.existsSync(fp)) return [];
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8')) as ReviewerNote[];
  } catch {
    return [];
  }
}

export function appendReviewerNote(clientId: string, note: string, reviewerName: string): boolean {
  if (!clientRecordExists(clientId)) return false;
  const notes = getReviewerNotes(clientId);
  notes.push({ note, reviewerName, addedAt: new Date().toISOString() });
  fs.writeFileSync(reviewerNotesFile(clientId), JSON.stringify(notes, null, 2), 'utf8');
  return true;
}

export function ensureClientsDir(): string {
  fs.mkdirSync(CLIENTS_DIR, { recursive: true });
  return CLIENTS_DIR;
}

export function clientRecordExists(clientId: string): boolean {
  return fs.existsSync(clientFile(clientId));
}

export function writeClientRecord(record: GeoClientRecord): void {
  const dir = path.join(CLIENTS_DIR, record.clientId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(clientFile(record.clientId), JSON.stringify(record, null, 2), 'utf8');
}

/**
 * Site Bot -> client-dashboard bridge (docs/specs — month-4 GEO Bot upgrade
 * prerequisite). Site Bot's deploy route only ever writes data/sites/{slug}.json;
 * without this, a Site Bot client has no data/clients/{clientId}/client.json and
 * therefore no /client/dashboard account at all. This function only ever CREATES —
 * a redeploy of an existing slug must never reset siteBotLaunchedAt or clobber
 * dashboard state (pin, entitlements, gscConnected) accumulated since first deploy.
 * `entitlements` is intentionally `[]`, not `['geo']` — GEO access is a separate,
 * later upgrade this task does not grant.
 */
export function ensureSiteBotClientRecord(params: {
  clientId: string; // the Site Bot slug
  siteUrl: string;
  businessNiche: string;
  topService?: string;
  targetLocation?: string;
  usp?: string;
  approvalContact?: string;   // owner name or similar
  approvalWhatsapp?: string;  // phone/whatsapp, digits only, matching the convention already used elsewhere in this file
}): void {
  if (clientRecordExists(params.clientId)) return;

  // Same 4-digit PIN generation as geo/signup/init/route.ts, so a Site Bot
  // client authenticates through the identical /client/login pin-based flow.
  const pin = String(Math.floor(1000 + Math.random() * 9000));

  const record: GeoClientRecord = {
    clientId: params.clientId,
    siteUrl: params.siteUrl,
    businessNiche: params.businessNiche,
    topService: params.topService,
    targetLocation: params.targetLocation,
    usp: params.usp,
    approvalContact: params.approvalContact,
    approvalWhatsapp: params.approvalWhatsapp,
    pin,
    entitlements: [],
    wpConnected: false,
    platform: null,
    gscConnected: false,
    siteBotLaunchedAt: new Date().toISOString(),
  };
  writeClientRecord(record);
}
