/**
 * Audit log for the four "direct management" Google Ads routes — actions the
 * client triggers themselves with no AI recommendation/approval step
 * (pause/resume, budget, negative keywords, campaign creation). Path B
 * (agent-recommended actions) already writes an approval record via
 * `appendGoogleAdsApproval` in `operator.ts`; this is the equivalent for
 * Path A, so both paths are auditable.
 *
 * True append-only JSONL (unlike `operator.ts`'s approvals file, which does
 * read-all/rewrite-all on status update) — a direct action has exactly one
 * outcome (success or failure), so there's no "update later" step needed.
 */
import fs from 'fs';
import path from 'path';

export type GoogleAdsDirectActionType =
  | 'pause_resume'
  | 'budget_change'
  | 'negative_keywords'
  | 'campaign_creation';

export interface GoogleAdsDirectActionAudit {
  clientId: string;
  actionType: GoogleAdsDirectActionType;
  actorClientId: string;
  campaignId?: string;
  status: 'success' | 'failed';
  error?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function taskDir(clientId: string): string {
  return path.join(process.cwd(), 'data', 'clients', clientId, 'tasks', 'google-ads');
}

function directActionsPath(clientId: string): string {
  return path.join(taskDir(clientId), 'direct-actions.jsonl');
}

/** Appends one immutable audit record for a direct-action route. Best-effort:
 * logs and swallows filesystem errors rather than throwing, since a logging
 * failure must never block the underlying Google Ads mutation response. */
export function appendGoogleAdsDirectActionAudit(entry: GoogleAdsDirectActionAudit): void {
  try {
    fs.mkdirSync(taskDir(entry.clientId), { recursive: true });
    fs.appendFileSync(directActionsPath(entry.clientId), JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('[google-ads/direct-action-audit] Failed to write audit record:', err);
  }
}

/** Reads all direct-action audit records for a client, newest first. */
export function readGoogleAdsDirectActionAudit(clientId: string): GoogleAdsDirectActionAudit[] {
  try {
    const raw = fs.readFileSync(directActionsPath(clientId), 'utf-8');
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as GoogleAdsDirectActionAudit)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}
