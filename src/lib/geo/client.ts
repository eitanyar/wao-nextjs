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
