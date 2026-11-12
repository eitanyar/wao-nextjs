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

export interface LeadsStoreOptions {
  filePath?: string;
  baseDir?: string;
}

export interface LeadsStore {
  readLeads(): Promise<LeadRecord[]>;
  writeLeads(leads: LeadRecord[]): Promise<void>;
  updateLeads<T>(update: (leads: LeadRecord[]) => Promise<{ leads: LeadRecord[]; result: T }> | { leads: LeadRecord[]; result: T }): Promise<T>;
  /**
   * Merges `patch` into one lead under the file lock, re-reading the file first so a concurrent
   * write isn't clobbered. Used to persist offline-upload outcomes (ads-bot-phase2 spec §3 0c)
   * after the CRM mark itself was already written. No-op when the lead no longer exists.
   */
  patchLead(leadId: number, patch: Partial<LeadRecord>): Promise<void>;
}

function resolveLeadsFilePath(options: LeadsStoreOptions): string {
  return options.filePath ?? process.env.WAO_LEADS_FILE_PATH ?? path.join(options.baseDir ?? process.cwd(), 'src', 'data', 'leads.json');
}

export function createLeadsStore(options: LeadsStoreOptions = {}): LeadsStore {
  const filePath = resolveLeadsFilePath(options);
  const lockPath = `${filePath}.lock`;

  async function readFromDisk(): Promise<LeadRecord[]> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? (parsed as LeadRecord[]) : [];
    } catch {
      return [];
    }
  }

  async function withLock<T>(operation: () => Promise<T>): Promise<T> {
    const deadline = Date.now() + 10_000;
    while (true) {
      try {
        await fs.mkdir(path.dirname(lockPath), { recursive: true });
        const lock = await fs.open(lockPath, 'wx');
        try {
          return await operation();
        } finally {
          await lock.close();
          await fs.rm(lockPath, { force: true });
        }
      } catch (error: unknown) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')) throw error;
        if (Date.now() >= deadline) throw new Error('Timed out waiting to update leads');
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  async function updateLeads<T>(update: (leads: LeadRecord[]) => Promise<{ leads: LeadRecord[]; result: T }> | { leads: LeadRecord[]; result: T }): Promise<T> {
    return withLock(async () => {
      const outcome = await update(await readFromDisk());
      await fs.writeFile(filePath, JSON.stringify(outcome.leads, null, 2), 'utf-8');
      return outcome.result;
    });
  }

  return {
    readLeads: readFromDisk,
    async writeLeads(leads: LeadRecord[]): Promise<void> {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(leads, null, 2), 'utf-8');
    },
    updateLeads,
    async patchLead(leadId: number, patch: Partial<LeadRecord>): Promise<void> {
      await updateLeads((leads) => ({
        leads: leads.map((lead) => (lead.id === leadId ? { ...lead, ...patch } : lead)),
        result: undefined,
      }));
    },
  };
}

const defaultLeadsStore = createLeadsStore();

export const readLeads = defaultLeadsStore.readLeads;
export const writeLeads = defaultLeadsStore.writeLeads;
export const patchLead = (leadId: number, patch: Partial<LeadRecord>) => defaultLeadsStore.patchLead(leadId, patch);

export function findLeadById(leads: LeadRecord[], id: number): LeadRecord | undefined {
  return leads.find((lead) => lead.id === id);
}
