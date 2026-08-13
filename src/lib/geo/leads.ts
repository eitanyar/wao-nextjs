import fs   from 'fs';
import path from 'path';
import type { GeoCollectedData } from '@/lib/geo/prompts';
import type { GeoClientRecord } from '@/lib/geo/client';

export interface GeoLead {
  leadId: string;
  createdAt: string;               // ISO
  raw: GeoCollectedData;           // everything the bot collected, nothing dropped
  clientRecordDraft: GeoClientRecord; // ready to copy into data/clients/{id}/client.json on promotion
  estimatedCostUsd: number; // NEW — real Gemini + DataForSEO usage cost for this conversation
}

const LEADS_DIR = path.join(process.cwd(), 'data', 'geo-leads');

function leadFile(leadId: string): string {
  return path.join(LEADS_DIR, `${leadId}.json`);
}

export function writeGeoLead(lead: GeoLead): void {
  const dir = path.join(LEADS_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(leadFile(lead.leadId), JSON.stringify(lead, null, 2), 'utf8');
}

export function readGeoLead(leadId: string): GeoLead | null {
  const fp = leadFile(leadId);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8')) as GeoLead;
}

export function geoLeadExists(leadId: string): boolean {
  return fs.existsSync(leadFile(leadId));
}

export function mapCollectedToClientDraft(data: GeoCollectedData, leadId: string): GeoClientRecord {
  return {
    clientId: leadId,
    siteUrl: data.siteUrl || '',
    cmsType: data.cmsType || 'unknown',
    businessNiche: data.businessNiche,
    topService: data.topService || data.businessNiche,
    targetLocation: data.targetLocation || 'unknown — to be assessed',
    usp: data.usp || '',
    clientQuestions: data.clientQuestions || '',
    exclusions: data.exclusions || '',
    approvalContact: data.approvalContact || '',
    approvalWhatsapp: data.approvalWhatsapp || '',
    tone: 'unknown — to be assessed',
    entitlements: [],
    wpConnected: false,
    platform: null,
    gscConnected: false,
  };
}
