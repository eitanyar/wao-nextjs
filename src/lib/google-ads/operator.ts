import fs from 'fs';
import path from 'path';
import type { WeeklyDigest } from '@/lib/crm/intelligence';

export type GoogleAdsOperatorRisk = 'low' | 'medium' | 'high';
export type GoogleAdsOperatorStatus = 'proposed' | 'approved' | 'queued' | 'executed' | 'failed';
export type GoogleAdsOperatorSource = 'alert' | 'next-action';

export interface GoogleAdsOperatorTask {
  taskId: string;
  clientId: string;
  kind:
    | 'tracking_audit'
    | 'conversion_review'
    | 'search_term_cleanup'
    | 'budget_tune'
    | 'lead_followup'
    | 'general_review';
  title: string;
  whyNeeded: string;
  recommendedAction: string;
  risk: GoogleAdsOperatorRisk;
  source: GoogleAdsOperatorSource;
  order: number;
}

export interface GoogleAdsOperatorApproval {
  taskId: string;
  clientId: string;
  kind: GoogleAdsOperatorTask['kind'];
  title: string;
  whyNeeded: string;
  recommendedAction: string;
  risk: GoogleAdsOperatorRisk;
  source: GoogleAdsOperatorSource;
  status: GoogleAdsOperatorStatus;
  approvedBy: string;
  approvedAt: string;
  queuedAt: string;
  executedAt?: string;
  error?: string;
  digestWindowEnd: string;
}

function taskDir(clientId: string): string {
  return path.join(process.cwd(), 'data', 'clients', clientId, 'tasks', 'google-ads');
}

function approvalsPath(clientId: string): string {
  return path.join(taskDir(clientId), 'approvals.jsonl');
}

function ensureTaskDir(clientId: string): void {
  fs.mkdirSync(taskDir(clientId), { recursive: true });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'task';
}

function uniqueId(clientId: string, kind: string, text: string, digestSeed: string): string {
  return `${clientId}-${kind}-${slugify(text)}-${slugify(digestSeed)}`;
}

function dedupe(tasks: GoogleAdsOperatorTask[]): GoogleAdsOperatorTask[] {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    const key = `${task.kind}|${task.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildGoogleAdsOperatorTasks(params: {
  clientId: string;
  digest: WeeklyDigest;
}): GoogleAdsOperatorTask[] {
  const { clientId, digest } = params;
  const tasks: GoogleAdsOperatorTask[] = [];

  digest.alerts.forEach((alert, index) => {
    if (alert.type === 'no_leads') {
      tasks.push({
        taskId: uniqueId(clientId, 'tracking_audit', alert.title, `${digest.slug}-${digest.windowDays}`),
        clientId,
        kind: 'tracking_audit',
        title: 'Audit landing page and conversion tracking',
        whyNeeded: alert.message,
        recommendedAction: 'Check the landing page, Google Ads conversion setup, and form/phone tracking before spending more.',
        risk: 'medium',
        source: 'alert',
        order: index + 1,
      });
    }

    if (alert.type === 'no_conversions') {
      tasks.push({
        taskId: uniqueId(clientId, 'conversion_review', alert.title, `${digest.slug}-${digest.windowDays}`),
        clientId,
        kind: 'conversion_review',
        title: 'Review lead handling and offline conversion uploads',
        whyNeeded: alert.message,
        recommendedAction: 'Review the latest leads, mark good ones quickly, and verify the offline conversion upload flow.',
        risk: 'low',
        source: 'alert',
        order: index + 2,
      });
    }

    if (alert.type === 'budget_pacing') {
      const kind = digest.pacing.status === 'over' ? 'search_term_cleanup' : 'budget_tune';
      tasks.push({
        taskId: uniqueId(clientId, kind, alert.title, `${digest.slug}-${digest.windowDays}`),
        clientId,
        kind,
        title: digest.pacing.status === 'over' ? 'Tighten negatives and search terms' : 'Tune budget pacing',
        whyNeeded: alert.message,
        recommendedAction:
          digest.pacing.status === 'over'
            ? 'Review search terms, add negatives, and stop waste before scaling spend further.'
            : 'Consider broadening coverage or lifting budget if the economics still work.',
        risk: 'low',
        source: 'alert',
        order: index + 3,
      });
    }
  });

  digest.nextActions.forEach((action, index) => {
    const lower = action.toLowerCase();

    if (lower.includes('landing page') || lower.includes('conversion tracking')) {
      tasks.push({
        taskId: uniqueId(clientId, 'tracking_audit', action, `${digest.slug}-${digest.windowDays}`),
        clientId,
        kind: 'tracking_audit',
        title: 'Audit the landing page and conversion tracking',
        whyNeeded: action,
        recommendedAction: action,
        risk: 'medium',
        source: 'next-action',
        order: 20 + index,
      });
      return;
    }

    if (lower.includes('review the latest leads') || lower.includes('mark good ones')) {
      tasks.push({
        taskId: uniqueId(clientId, 'conversion_review', action, `${digest.slug}-${digest.windowDays}`),
        clientId,
        kind: 'conversion_review',
        title: 'Review the latest leads and mark the good ones',
        whyNeeded: action,
        recommendedAction: action,
        risk: 'low',
        source: 'next-action',
        order: 20 + index,
      });
      return;
    }

    if (lower.includes('follow-up speed') || lower.includes('offer clarity')) {
      tasks.push({
        taskId: uniqueId(clientId, 'lead_followup', action, `${digest.slug}-${digest.windowDays}`),
        clientId,
        kind: 'lead_followup',
        title: 'Tighten lead follow-up',
        whyNeeded: action,
        recommendedAction: action,
        risk: 'low',
        source: 'next-action',
        order: 20 + index,
      });
      return;
    }

    if (lower.includes('negatives') || lower.includes('search terms')) {
      tasks.push({
        taskId: uniqueId(clientId, 'search_term_cleanup', action, `${digest.slug}-${digest.windowDays}`),
        clientId,
        kind: 'search_term_cleanup',
        title: 'Tighten negatives and search-term waste',
        whyNeeded: action,
        recommendedAction: action,
        risk: 'low',
        source: 'next-action',
        order: 20 + index,
      });
      return;
    }

    if (lower.includes('budget')) {
      tasks.push({
        taskId: uniqueId(clientId, 'budget_tune', action, `${digest.slug}-${digest.windowDays}`),
        clientId,
        kind: 'budget_tune',
        title: 'Adjust budget pacing',
        whyNeeded: action,
        recommendedAction: action,
        risk: 'low',
        source: 'next-action',
        order: 20 + index,
      });
    }
  });

  if (!tasks.length) {
    tasks.push({
      taskId: uniqueId(clientId, 'general_review', digest.campaignName, `${digest.slug}-${digest.windowDays}`),
      clientId,
      kind: 'general_review',
      title: 'Review the current Google Ads setup',
      whyNeeded: 'The digest did not surface a more specific action, so the operator should keep watching the account.',
      recommendedAction: 'Keep the current setup and review the next 7-day window.',
      risk: 'low',
      source: 'next-action',
      order: 99,
    });
  }

  return dedupe(tasks).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function readGoogleAdsApprovals(clientId: string): GoogleAdsOperatorApproval[] {
  const file = approvalsPath(clientId);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as GoogleAdsOperatorApproval)
    .sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime());
}

export function appendGoogleAdsApproval(entry: GoogleAdsOperatorApproval): void {
  ensureTaskDir(entry.clientId);
  fs.appendFileSync(approvalsPath(entry.clientId), `${JSON.stringify(entry)}\n`, 'utf8');
}

export function updateGoogleAdsApproval(entry: GoogleAdsOperatorApproval): void {
  const file = approvalsPath(entry.clientId);
  const all = readGoogleAdsApprovals(entry.clientId);
  const next = all.map((existing) => (existing.taskId === entry.taskId ? entry : existing));
  ensureTaskDir(entry.clientId);
  fs.writeFileSync(file, next.map((r) => JSON.stringify(r)).join('\n') + (next.length ? '\n' : ''), 'utf8');
}

export function buildApprovalRecord(task: GoogleAdsOperatorTask, approvedBy: string, digestWindowEnd: string): GoogleAdsOperatorApproval {
  const now = new Date().toISOString();
  return {
    taskId: task.taskId,
    clientId: task.clientId,
    kind: task.kind,
    title: task.title,
    whyNeeded: task.whyNeeded,
    recommendedAction: task.recommendedAction,
    risk: task.risk,
    source: task.source,
    status: 'approved',
    approvedBy,
    approvedAt: now,
    queuedAt: now,
    digestWindowEnd,
  };
}
