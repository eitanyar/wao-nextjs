import fs from 'fs/promises';
import path from 'path';
import type { LeadRecord } from '@/lib/crm/intelligence';

/**
 * Shared read/write/lookup over `src/data/leads.json`, extracted from the
 * duplicated implementations previously in `api/leads/route.ts` and
 * `api/google-ads/import-conversion/route.ts` so every caller (existing
 * routes + the two new ones from Priority 3) reads/writes through one code
 * path instead of three independent `fs` implementations.
 * See docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §2.1.
 */

const LEADS_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'leads.json');

export async function readLeads(): Promise<LeadRecord[]> {
  try {
    const data = await fs.readFile(LEADS_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? (parsed as LeadRecord[]) : [];
  } catch {
    return [];
  }
}

export async function writeLeads(leads: LeadRecord[]): Promise<void> {
  await fs.writeFile(LEADS_FILE_PATH, JSON.stringify(leads, null, 2), 'utf-8');
}

export function findLeadById(leads: LeadRecord[], id: number): LeadRecord | undefined {
  return leads.find((lead) => lead.id === id);
}
