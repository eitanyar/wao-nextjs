import fs from "fs/promises";
import path from "path";

/**
 * Durable, zero-cost record of "reveal number" click-intent events —
 * mirrors `src/lib/crm/leadsStore.ts`'s file-backed read/write pattern so
 * there's a record of the click even before/without a Meta Pixel wired
 * into GTM. Not a CRM record (no name/phone captured) — just the
 * attribution context at the moment of intent.
 */

export interface PhoneRevealRecord {
  id: number;
  timestamp: string;
  source: string;
  ref?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  page?: string;
}

// WAO_PHONE_REVEALS_FILE_PATH in production (release folders are replaced on every deploy); in-tree default for dev.
const DEFAULT_PHONE_REVEALS_FILE_PATH = path.join(process.cwd(), "src", "data", "phone-reveals.json");
function phoneRevealsFilePath(): string {
  return process.env.WAO_PHONE_REVEALS_FILE_PATH?.trim() || DEFAULT_PHONE_REVEALS_FILE_PATH;
}

export async function readPhoneReveals(): Promise<PhoneRevealRecord[]> {
  try {
    const data = await fs.readFile(phoneRevealsFilePath(), "utf-8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? (parsed as PhoneRevealRecord[]) : [];
  } catch {
    return [];
  }
}

export async function appendPhoneReveal(
  record: Omit<PhoneRevealRecord, "id" | "timestamp">
): Promise<PhoneRevealRecord> {
  const reveals = await readPhoneReveals();
  const entry: PhoneRevealRecord = {
    id: reveals.length ? Math.max(...reveals.map((r) => r.id)) + 1 : 1,
    timestamp: new Date().toISOString(),
    ...record,
  };
  reveals.push(entry);
  await fs.writeFile(phoneRevealsFilePath(), JSON.stringify(reveals, null, 2), "utf-8");
  return entry;
}
