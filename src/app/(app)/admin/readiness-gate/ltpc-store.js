/**
 * Pure LTPC submission logic, injectable-dependency style — mirrors
 * src/lib/crm/clientLeadsActions.js's pattern (a plain module the 'use
 * server' action wraps with real fs/cookies, and tests exercise directly
 * with mocked read/write/audit functions instead of source-text regex, per
 * this repo's own hard test-coverage rule).
 *
 * `action.ts` is the thin wrapper: admin-gate check -> real fs bindings for
 * loadRecord/writeRecord/appendAudit -> call applyLtpcSubmission -> redirect
 * based on the result.
 */

import { parseLtpcSubmission, computeOverallPass } from './ltpc-form.js';

/**
 * @param {{
 *   formData: FormData,
 *   clientExists: (clientId: string) => boolean,
 *   loadRecord: (clientId: string) => { botType?: string, items?: Array<{ id: string, status: string, checkedBy?: string, checkedAt?: string, evidence?: string }> } | null,
 *   writeRecord: (clientId: string, record: object) => void,
 *   appendAudit: (clientId: string, entry: object) => void,
 *   now?: () => string,
 * }} deps
 * @returns {Promise<
 *   | { ok: true, clientId: string, record: object }
 *   | { ok: false, error: string, clientId?: string, itemId?: string }
 * >}
 */
export async function applyLtpcSubmission({ formData, clientExists, loadRecord, writeRecord, appendAudit, now = () => new Date().toISOString() }) {
  const parsed = parseLtpcSubmission(formData);
  if (!parsed.ok) {
    return parsed;
  }

  const { clientId, botType, checkedBy, items } = parsed;

  if (!clientExists(clientId)) {
    return { ok: false, error: 'unknown-client', clientId };
  }

  const existing = loadRecord(clientId);
  const existingItemsById = new Map((existing?.items ?? []).map(i => [i.id, i]));

  const timestamp = now();
  const changes = [];

  const nextItems = items.map(({ id, status, evidence }) => {
    const before = existingItemsById.get(id);
    if ((before?.status ?? 'not-checked') !== status) {
      changes.push({ id, from: before?.status ?? 'not-checked', to: status });
    }
    if (status === 'pass') {
      return { id, status, checkedBy, checkedAt: timestamp, evidence };
    }
    return { id, status };
  });

  const nextRecord = {
    botType,
    items: nextItems,
    overallPass: computeOverallPass(nextItems, botType),
  };

  writeRecord(clientId, nextRecord);

  if (changes.length > 0 || existing?.botType !== botType) {
    appendAudit(clientId, {
      timestamp,
      source: 'admin-ui',
      clientId,
      botType,
      checkedBy,
      changes,
      overallPass: nextRecord.overallPass,
    });
  }

  return { ok: true, clientId, record: nextRecord };
}
