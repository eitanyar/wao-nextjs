import fs from 'fs';
import path from 'path';
import type { WeeklyDigest, CampaignConfig } from '../crm/intelligence';
import type { CampaignAgeEvaluation, CampaignLifecyclePhase } from './campaignAge';
import {
  campaignType,
  resolveCplCeilingIls,
  isCplCeilingBreached,
  evaluateBrandCplBaselineWatch,
  BRAND_BASELINE_DEGRADATION_MULTIPLIER,
} from './cpl-ceiling';

export type GoogleAdsOperatorRisk = 'low' | 'medium' | 'high';
/**
 * 'rejected' and 'auto-approved' added per
 * docs/specs/adam-recommendation-audit-interaction-model.md §2.1/§2.3:
 *  - 'rejected'      — explicit human decline (distinct from 'failed', which means the
 *                       mutation was attempted and errored out).
 *  - 'auto-approved' — 72h silent timeout on a low-risk task. Does NOT advance the trust
 *                       clock (see computeTrustClock below) — only an explicit Approve
 *                       click counts as a clock-advancing decision.
 */
export type GoogleAdsOperatorStatus =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'auto-approved'
  | 'queued'
  | 'executed'
  | 'failed';
export type GoogleAdsOperatorSource = 'alert' | 'next-action';

/** A decision status is one that resolves a task out of the open review state. */
const DECISION_STATUSES: ReadonlySet<GoogleAdsOperatorStatus> = new Set([
  'approved',
  'rejected',
  'auto-approved',
  'executed',
  'failed',
]);

/**
 * A "qualifying" decision for the trust clock (spec §3.1) — Approve or Reject or
 * auto-approved all count as decided; a proposed-but-still-open task does not.
 */
const CLOCK_QUALIFYING_STATUSES: ReadonlySet<GoogleAdsOperatorStatus> = new Set([
  'approved',
  'rejected',
  'auto-approved',
]);

/**
 * Today only one stage-gate exists in the codebase (proxy-signal / "ליד מאומת"), per
 * interaction-model spec §3.2. Approval records omitting `stageGate` (all pre-existing
 * log lines) are treated as belonging to this default so the clock read-model works over
 * history that predates this field.
 */
export const DEFAULT_STAGE_GATE = 'proxy-signal';

/**
 * Display labels for known stage-gates, quoting VISION.md Gate 2 / interaction-model spec
 * §3.2 verbatim ("ליד מאומת" → "עסקה סגורה") — not authored copy, just naming the two sides
 * of the one transition the spec names concretely. Only 'proxy-signal' exists in the
 * codebase today; 'crm-revenue' is named here so the read-model has a key to key off of
 * once Gate 2 actually fires for a client — no new fields needed at that point (§3.2).
 */
export const STAGE_GATE_LABELS: Record<string, string> = {
  'proxy-signal': 'ליד מאומת',
  'crm-revenue': 'עסקה סגורה',
};

export interface GoogleAdsOperatorTask {
  taskId: string;
  clientId: string;
  /**
   * The live Google Ads campaign this task was generated for, per
   * docs/specs/priority-3-search-term-cleanup-scoring.md §8.3's enumerate-and-iterate fix —
   * a client can now have multiple bound campaigns in play at once, so callers merging task
   * lists across campaigns (`operator-task/route.ts`, `admin/review/[clientId]/page.tsx`)
   * need to know which campaign a specific task/approval targets rather than assuming
   * `index.primaryCampaignId`. Optional for backward compatibility with any pre-existing
   * approval-log record written before this field existed.
   */
  campaignId?: string;
  /** Campaign lifecycle evidence captured when this task was generated. */
  campaignPhase: CampaignLifecyclePhase;
  /** Null means campaign age could not be established safely. */
  campaignAgeDays: number | null;
  kind:
    | 'tracking_audit'
    | 'conversion_review'
    | 'search_term_cleanup'
    | 'search_term_harvest'
    | 'budget_tune'
    | 'lead_followup'
    | 'general_review'
    /**
     * §4A.0.2/§4A.4 — informational-only signal for a brand campaign whose CPL has
     * degraded past its own trailing baseline, or a non-brand ad-group-scope ceiling
     * breach with no per-term mutation to attach it to. Never auto-executes; Eitan
     * investigates and decides manually (per docs/specs/priority-3-search-term-cleanup-
     * scoring.md §4A.0.2's explicit "never feeds a negative-keyword mutation" rule).
     */
    | 'cpl_ceiling_review';
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
  /** See `GoogleAdsOperatorTask.campaignId`'s doc comment — threaded through from the task
   * this approval was decided for, per §8.3's multi-campaign fix. */
  campaignId?: string;
  /** Lifecycle evidence copied from the generated task for audit replay. */
  campaignPhase?: CampaignLifecyclePhase;
  campaignAgeDays?: number | null;
  kind: GoogleAdsOperatorTask['kind'];
  title: string;
  whyNeeded: string;
  recommendedAction: string;
  risk: GoogleAdsOperatorRisk;
  source: GoogleAdsOperatorSource;
  status: GoogleAdsOperatorStatus;
  /** For 'rejected' records — the reviewer's required reason (Maya's spec §4, DecisionRow). */
  correctionNote?: string;
  /**
   * Stage-gate this decision belongs to (interaction-model spec §3.2). Defaults to
   * DEFAULT_STAGE_GATE for records written before this field existed.
   */
  stageGate?: string;
  approvedBy: string;
  approvedAt: string;
  queuedAt: string;
  executedAt?: string;
  error?: string;
  digestWindowEnd: string;
}

/**
 * A single "Why?" question-and-answer turn, per interaction-model spec §2.1/§2.2 — a
 * structurally separate log stream from approvals.jsonl so it is not even queryable as a
 * decision. Adam answers inline from the task's existing whyNeeded/recommendedAction
 * context (§2.2); the answer text here is a functional placeholder, not final copy.
 */
export interface GoogleAdsOperatorInquiry {
  taskId: string;
  clientId: string;
  question: string;
  askedBy: string;
  askedAt: string;
  answeredBy: 'adam';
  answer: string;
  answeredAt: string;
}

function taskDir(clientId: string): string {
  return path.join(process.cwd(), 'data', 'clients', clientId, 'tasks', 'google-ads');
}

function approvalsPath(clientId: string): string {
  return path.join(taskDir(clientId), 'approvals.jsonl');
}

/**
 * Separate stream from approvals.jsonl, per interaction-model spec §2.1 — kept in its own
 * file specifically so nothing in the clock/decision read-model can accidentally treat a
 * "Why?" turn as a decision by scanning the wrong file.
 */
function inquiriesPath(clientId: string): string {
  return path.join(taskDir(clientId), 'inquiries.jsonl');
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

/**
 * §8.3's flag: with multiple campaigns per client now in play, verify `kind|title` still
 * produces distinct keys across campaigns with different names — it does when titles differ,
 * but several titles here are generic ("Tune budget pacing", "Review the current Google Ads
 * setup") and WOULD collide across two different campaigns of a client. Extend the key to
 * include `campaignId` when present so per-campaign tasks never dedupe each other away.
 */
function dedupe<T extends Pick<GoogleAdsOperatorTask, 'campaignId' | 'kind' | 'title'>>(tasks: T[]): T[] {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    const key = `${task.campaignId ?? ''}|${task.kind}|${task.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildGoogleAdsOperatorTasks(params: {
  clientId: string;
  digest: WeeklyDigest;
  /**
   * Optional — only needed to derive a generic CPL ceiling fallback for clients without a
   * named entry in `CPL_CEILING_ILS_BY_CLIENT_AND_TYPE` (see `cpl-ceiling.ts`). Retter/
   * AAAsada gate correctly off `clientId` alone even when this is omitted.
   */
  campaignConfig?: CampaignConfig;
  /**
   * Campaign maturity evaluated from the persisted CampaignConfig.createdAt by the caller.
   * When absent, task generation fails closed as unknown to prevent mutation proposals.
   */
  campaignAge?: CampaignAgeEvaluation;
  /**
   * The live Google Ads `campaign.id`/`campaign.name` this specific `digest` was computed
   * for — **not** `digest.campaignName` (which is `businessName || slug`, not the real Ads
   * campaign name and not reliably present). Required to classify brand-vs-non-brand per
   * §4A.0 and, for brand campaigns, to key the persisted baseline (§4A.0.2). When omitted,
   * the campaign is treated as unclassifiable and defaults to `'non-brand'` (the safe,
   * stricter path per §4A.0) with no baseline-watch persistence.
   *
   * **Single-campaign-per-call by design (§4A.0's "no blending" fix).** This function
   * scores exactly one campaign's digest at a time — it does not aggregate across a
   * client's campaigns into one blended number, which was the earlier draft's bug (a
   * client like AAAsada already has a brand + non-brand split; Retter likely does too).
   * A caller managing a client with multiple bound Search campaigns must call this once
   * per campaign (once per `(campaignId, digest-for-that-campaign)` pair) and merge the
   * resulting task lists, rather than passing one blended digest for the whole client.
   * Today's only caller (`operator-task/route.ts`) still resolves a single
   * `index.primaryCampaignId` per client — extending that to iterate every bound campaign
   * is a separate, still-open follow-up (tracked alongside the pre-existing Retter/AAAsada
   * onboarding gap, spec §6), not something this function can fix on its own since it has
   * no visibility into "how many campaigns does this client have" — that's the caller's job.
   */
  campaignId?: string;
  campaignName?: string;
  /**
   * Optional pre-computed search-term scoring summary, per
   * docs/specs/priority-3-search-term-cleanup-scoring.md §5's "whyNeeded ... should state
   * which flags fired and their raw numbers." This function stays synchronous (it's called
   * from several page-render paths) — it does not itself run the live GAQL scoring in
   * `search-term-scoring.ts`/`search-term-fetch.ts`. A caller that has already computed a
   * preview (e.g. from a cached/last-run digest) can pass it here to replace the generic
   * "Tighten negatives and search terms" copy with the real scored-term summary; omitting it
   * falls back to the pre-existing generic alert/next-action copy, unchanged.
   */
  searchTermCleanupPreview?: {
    cutCount: number;
    watchCount: number;
    wastedSpendIls: number;
  };
}): GoogleAdsOperatorTask[] {
  const { clientId, digest, campaignConfig, campaignId, campaignName, campaignAge, searchTermCleanupPreview } = params;
  const lifecycle = campaignAge ?? { ageDays: null, phase: 'unknown' as const };
  const tasks: Array<Omit<GoogleAdsOperatorTask, 'campaignPhase' | 'campaignAgeDays'>> = [];

  /**
   * §5's "12 search terms flagged for negative — ₪340 wasted spend, 0 conversions" style
   * summary — only used when a preview was supplied (see param doc above).
   */
  const composeSearchTermCleanupCopy = (fallbackWhyNeeded: string) => {
    if (!searchTermCleanupPreview || searchTermCleanupPreview.cutCount + searchTermCleanupPreview.watchCount === 0) {
      return { title: 'Tighten negatives and search terms', whyNeeded: fallbackWhyNeeded };
    }
    const { cutCount, watchCount, wastedSpendIls } = searchTermCleanupPreview;
    const parts = [
      cutCount > 0 ? `${cutCount} search term${cutCount === 1 ? '' : 's'} flagged to cut` : null,
      wastedSpendIls > 0 ? `₪${wastedSpendIls.toFixed(0)} wasted spend, 0 conversions` : null,
      watchCount > 0 ? `${watchCount} more on watch` : null,
    ].filter(Boolean);
    return {
      title: cutCount > 0 ? `${cutCount} search terms flagged for negative` : `${watchCount} search terms on watch`,
      whyNeeded: `${fallbackWhyNeeded} ${parts.join(' — ')}.`.trim(),
    };
  };

  // §4A.0/§8.2 — classify this campaign before any §4A/§8 flag is evaluated. Unclassifiable
  // (no campaignName) defaults to 'non-brand', the stricter path. campaignId now threaded
  // through classification too (§8.2's exact-match requirement for seasonal-remarketing).
  const type = campaignType(campaignName, clientId, campaignId);

  // §4A.5/§8.2 — a non-brand OR seasonal-remarketing campaign already converting at/over its
  // hard CPL ceiling must never be offered a budget increase, regardless of pacing status.
  // `resolveCplCeilingIls` already resolves the correct sub-ceiling for either type (§8.2);
  // brand campaigns never resolve here (always undefined). `digest.totals.cpl` is only
  // populated when live spend was pulled upstream (see intelligence.ts); when it's unknown,
  // `isCplCeilingBreached` safely returns false rather than blocking on missing data.
  const cplCeilingIls = type !== 'brand' ? resolveCplCeilingIls({ clientId, campaignConfig, type }) : undefined;
  const cplCeilingBreached = type !== 'brand' && isCplCeilingBreached(digest.totals.cpl, cplCeilingIls);
  // Human-readable label for the ceiling type, for whyNeeded copy below (§8.2 generalizes the
  // old "non-brand ₪X/lead ceiling" wording to also cover seasonal-remarketing campaigns).
  const ceilingTypeLabel = type === 'seasonal-remarketing' ? 'seasonal-remarketing' : 'non-brand';

  // §4A.0.2 — brand campaigns get no absolute ceiling; instead compare current CPL against
  // the campaign's own persisted trailing baseline. Only evaluable when a campaignId is
  // known (the baseline is keyed per campaign) — otherwise this safely no-ops (never true).
  const brandBaseline =
    type === 'brand' && campaignId
      ? evaluateBrandCplBaselineWatch({
          clientId,
          campaignId,
          campaignName: campaignName ?? digest.campaignName,
          currentCpl: digest.totals.cpl,
          conversions: digest.totals.verifiedLeads,
        })
      : undefined;
  const brandCplBaselineWatch = brandBaseline?.watch ?? false;

  // §4A.5 — brand campaigns block a budget increase only when the baseline-degradation
  // watch is currently true (no absolute-ceiling block exists for brand, per §4A.0.1).
  const budgetIncreaseBlocked = cplCeilingBreached || brandCplBaselineWatch;

  // §8.5 — seasonal-remarketing campaigns are pacing-exempt: no `budget_pacing` alert should
  // drive a task for them at all (neither `search_term_cleanup` nor `budget_tune`) until
  // there's a real basis for what "on pace" means for event-triggered traffic. The CPL-ceiling
  // gate above still applies to these campaigns (§8.1 point 3 — they CAN waste money and need
  // a real ceiling) — this exemption is specifically about the *pacing* alert/signal, not the
  // ceiling check.
  const pacingExempt = type === 'seasonal-remarketing';

  if (brandCplBaselineWatch && campaignId) {
    tasks.push({
      taskId: uniqueId(clientId, 'cpl_ceiling_review', `brand-baseline-${campaignId}`, `${digest.slug}-${digest.windowDays}`),
      clientId,
      campaignId,
      kind: 'cpl_ceiling_review',
      title: `Brand campaign CPL has drifted above its own baseline`,
      whyNeeded: `"${campaignName}" is a brand campaign — it's expected to stay cheap. Its trailing CPL (₪${digest.totals.cpl?.toFixed(0)}/lead) is now more than ${BRAND_BASELINE_DEGRADATION_MULTIPLIER}x its own recorded baseline (₪${brandBaseline?.baselineCpl?.toFixed(0)}/lead). This is informational only — it does not propose any negative-keyword or budget change automatically.`,
      recommendedAction: 'Investigate this brand campaign (competitor bidding on the name, Quality Score drift, a landing-page regression) before approving any further spend increase on it.',
      risk: 'low',
      source: 'alert',
      order: 0,
    });
  }

  digest.alerts.forEach((alert, index) => {
    if (alert.type === 'no_leads') {
      tasks.push({
        taskId: uniqueId(clientId, 'tracking_audit', alert.title, `${digest.slug}-${digest.windowDays}`),
        clientId,
        campaignId,
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
        campaignId,
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
      // §8.5 — seasonal-remarketing campaigns are pacing-EXEMPT, not ceiling-exempt (§8.1
      // point 3's explicit distinction). A pacing-exempt campaign's `digest.pacing.status`
      // must never itself trigger a task here — but `cplCeilingBreached` (§8.2's real,
      // enforceable seasonal-remarketing ceiling) must still be able to, "the same standing
      // as non-brand's CPL_CEILING_BREACH." `cplCeilingBreached` is already gated to
      // `type !== 'brand'` above, so it's correct for both non-brand and
      // seasonal-remarketing without an extra check here.
      const pacingSignalsOver = !pacingExempt && digest.pacing.status === 'over';
      const needsCleanup = pacingSignalsOver || cplCeilingBreached;
      if (needsCleanup) {
        const kind = 'search_term_cleanup' as const;
        const baseWhyNeeded = cplCeilingBreached && !pacingSignalsOver
          ? `${alert.message} Trailing CPL (₪${digest.totals.cpl?.toFixed(0)}/lead) is already at or above this account's ${ceilingTypeLabel} ₪${cplCeilingIls}/lead ceiling, so a budget increase is blocked until efficiency improves.`
          : alert.message;
        const copy = composeSearchTermCleanupCopy(baseWhyNeeded);
        tasks.push({
          taskId: uniqueId(clientId, kind, alert.title, `${digest.slug}-${digest.windowDays}`),
          clientId,
          campaignId,
          kind,
          title: copy.title,
          whyNeeded: copy.whyNeeded,
          recommendedAction: 'Review search terms, add negatives, and stop waste before scaling spend further.',
          risk: 'low',
          source: 'alert',
          order: index + 3,
        });
      } else if (budgetIncreaseBlocked) {
        // §4A.5 — brand campaign whose baseline-degradation watch is currently true: don't
        // offer `budget_tune` here. The investigation card was already pushed above (the
        // standalone `cpl_ceiling_review` task) — this alert simply contributes no
        // additional card rather than duplicating it or falling back to an unconditional
        // budget_tune.
      } else if (pacingExempt) {
        // §8.5 — under the ceiling AND pacing-exempt: no budget_pacing-driven task at all
        // (neither cleanup nor a budget_tune offer) — there's no "on pace" basis yet for
        // event-triggered traffic to justify either.
      } else {
        tasks.push({
          taskId: uniqueId(clientId, 'budget_tune', alert.title, `${digest.slug}-${digest.windowDays}`),
          clientId,
          campaignId,
          kind: 'budget_tune',
          title: 'Tune budget pacing',
          whyNeeded: alert.message,
          recommendedAction: 'Consider broadening coverage or lifting budget if the economics still work.',
          risk: 'low',
          source: 'alert',
          order: index + 3,
        });
      }
    }
  });

  digest.nextActions.forEach((action, index) => {
    const lower = action.toLowerCase();

    if (lower.includes('landing page') || lower.includes('conversion tracking')) {
      tasks.push({
        taskId: uniqueId(clientId, 'tracking_audit', action, `${digest.slug}-${digest.windowDays}`),
        clientId,
        campaignId,
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
        campaignId,
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
        campaignId,
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
      const copy = composeSearchTermCleanupCopy(action);
      tasks.push({
        taskId: uniqueId(clientId, 'search_term_cleanup', action, `${digest.slug}-${digest.windowDays}`),
        clientId,
        campaignId,
        kind: 'search_term_cleanup',
        title: copy.title === 'Tighten negatives and search terms' ? 'Tighten negatives and search-term waste' : copy.title,
        whyNeeded: copy.whyNeeded,
        recommendedAction: action,
        risk: 'low',
        source: 'next-action',
        order: 20 + index,
      });
      return;
    }

    if (lower.includes('budget')) {
      // §4A.5/§8.5 — same CPL-ceiling gate as the alert-driven branch above; a next-action
      // suggesting a budget lift must not surface as `budget_tune` if the non-brand/
      // seasonal-remarketing campaign is already at/over its ceiling, or if a brand
      // campaign's baseline-watch is currently true (already surfaced via the standalone
      // `cpl_ceiling_review` task above — skip re-offering `budget_tune` here rather than
      // duplicating it). `cplCeilingBreached` still applies to seasonal-remarketing (pacing-
      // exempt is NOT ceiling-exempt, §8.1 point 3) — only the plain `budget_tune` offer
      // below is suppressed for a pacing-exempt campaign, not the ceiling-driven cleanup.
      if (cplCeilingBreached) {
        const kind = 'search_term_cleanup' as const;
        tasks.push({
          taskId: uniqueId(clientId, kind, action, `${digest.slug}-${digest.windowDays}`),
          clientId,
          campaignId,
          kind,
          title: 'Tighten negatives and search terms',
          whyNeeded: `${action} Trailing CPL (₪${digest.totals.cpl?.toFixed(0)}/lead) is already at or above this account's ${ceilingTypeLabel} ₪${cplCeilingIls}/lead ceiling, so a budget increase is blocked until efficiency improves.`,
          recommendedAction: 'Review search terms, add negatives, and stop waste before scaling spend further.',
          risk: 'low',
          source: 'next-action',
          order: 20 + index,
        });
      } else if (!budgetIncreaseBlocked && !pacingExempt) {
        // §8.5 — seasonal-remarketing campaigns don't get a plain budget_tune next-action
        // either (no "on pace" basis yet for event-triggered traffic), but this is only
        // reached when `cplCeilingBreached` is already false, so nothing is silently lost.
        tasks.push({
          taskId: uniqueId(clientId, 'budget_tune', action, `${digest.slug}-${digest.windowDays}`),
          clientId,
          campaignId,
          kind: 'budget_tune',
          title: 'Adjust budget pacing',
          whyNeeded: action,
          recommendedAction: action,
          risk: 'low',
          source: 'next-action',
          order: 20 + index,
        });
      }
    }
  });

  if ((lifecycle.phase === 'growth' || lifecycle.phase === 'maturity') && cplCeilingIls !== undefined) {
    tasks.push({
      taskId: uniqueId(clientId, 'search_term_harvest', `campaign-${campaignId ?? digest.slug}`, `${digest.slug}-${digest.windowDays}`),
      clientId,
      campaignId,
      kind: 'search_term_harvest',
      title: 'Promote profitable search queries to keywords',
      whyNeeded: `The campaign has a resolved CPL ceiling of ₪${cplCeilingIls}; re-check recent search-term evidence before adding any exact or phrase keyword.`,
      recommendedAction: 'Promote only queries with at least two conversions, CPL at or below the client ceiling, no enabled duplicate, and no negative-keyword conflict.',
      risk: 'low',
      source: 'next-action',
      order: 40,
    });
  }

  if (!tasks.length) {
    tasks.push({
      taskId: uniqueId(clientId, 'general_review', digest.campaignName, `${digest.slug}-${digest.windowDays}`),
      clientId,
      campaignId,
      kind: 'general_review',
      title: 'Review the current Google Ads setup',
      whyNeeded: 'The digest did not surface a more specific action, so the operator should keep watching the account.',
      recommendedAction: 'Keep the current setup and review the next 7-day window.',
      risk: 'low',
      source: 'next-action',
      order: 99,
    });
  }

  const allowsTask = (kind: GoogleAdsOperatorTask['kind']): boolean => {
    if (lifecycle.phase === 'unknown') {
      return kind === 'tracking_audit' || kind === 'conversion_review' || kind === 'cpl_ceiling_review';
    }
    if (lifecycle.phase === 'launch') {
      return kind === 'tracking_audit'
        || kind === 'conversion_review'
        || kind === 'cpl_ceiling_review'
        || kind === 'search_term_cleanup';
    }
    return true;
  };

  return dedupe(tasks)
    .filter((task) => allowsTask(task.kind))
    .map((task) => ({ ...task, campaignPhase: lifecycle.phase, campaignAgeDays: lifecycle.ageDays }))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

const CLIENTS_ROOT = path.join(process.cwd(), 'data', 'clients');

/**
 * Scans every client's approval log for one taskId — backs the audit-trail deep link from
 * TrustClockLine's reset trace (visual-design spec §5.1), which only carries a taskId, not
 * a clientId. Read-only, used by the audit page only.
 */
export function findGoogleAdsApprovalAcrossClients(
  taskId: string
): { clientId: string; approvals: GoogleAdsOperatorApproval[]; match: GoogleAdsOperatorApproval } | null {
  if (!fs.existsSync(CLIENTS_ROOT)) return null;
  for (const dirent of fs.readdirSync(CLIENTS_ROOT, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const approvals = readGoogleAdsApprovals(dirent.name);
    const match = approvals.find((a) => a.taskId === taskId);
    if (match) return { clientId: dirent.name, approvals, match };
  }
  return null;
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

/**
 * Builds an approval-log record for an explicit reviewer decision.
 *
 * Per interaction-model spec §5/§6, this used to hardcode `status: 'approved'` — meaning
 * every task Adam proposed executed unseen. That hardcode is gone: `decision` is a
 * required parameter, so every call site must state what actually happened (an explicit
 * Approve click, an explicit Reject/Adjust, or a system-driven auto-approve timeout) —
 * there is no default that silently approves.
 */
export function buildApprovalRecord(
  task: GoogleAdsOperatorTask,
  approvedBy: string,
  digestWindowEnd: string,
  decision: 'approved' | 'rejected' | 'auto-approved',
  options?: { correctionNote?: string; stageGate?: string }
): GoogleAdsOperatorApproval {
  const now = new Date().toISOString();
  return {
    taskId: task.taskId,
    clientId: task.clientId,
    campaignId: task.campaignId,
    campaignPhase: task.campaignPhase,
    campaignAgeDays: task.campaignAgeDays,
    kind: task.kind,
    title: task.title,
    whyNeeded: task.whyNeeded,
    recommendedAction: task.recommendedAction,
    risk: task.risk,
    source: task.source,
    status: decision,
    correctionNote: decision === 'rejected' ? options?.correctionNote : undefined,
    stageGate: options?.stageGate ?? DEFAULT_STAGE_GATE,
    approvedBy,
    approvedAt: now,
    queuedAt: now,
    digestWindowEnd,
  };
}

// ---------------------------------------------------------------------------------------
// "Why?" inquiry log — read/write functions, structurally separate from approvals.jsonl.
// ---------------------------------------------------------------------------------------

export function readGoogleAdsOperatorInquiries(clientId: string, taskId?: string): GoogleAdsOperatorInquiry[] {
  const file = inquiriesPath(clientId);
  if (!fs.existsSync(file)) return [];
  const all = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as GoogleAdsOperatorInquiry)
    .sort((a, b) => new Date(a.askedAt).getTime() - new Date(b.askedAt).getTime());
  return taskId ? all.filter((entry) => entry.taskId === taskId) : all;
}

export function appendGoogleAdsOperatorInquiry(entry: GoogleAdsOperatorInquiry): void {
  ensureTaskDir(entry.clientId);
  fs.appendFileSync(inquiriesPath(entry.clientId), `${JSON.stringify(entry)}\n`, 'utf8');
}

/**
 * Adam's inline "why" answer, per interaction-model spec §2.2 — composed deterministically
 * from the task's existing whyNeeded/recommendedAction (the same digest data the task was
 * generated from), never a guess. This is a functional placeholder for the answer text
 * itself, not final copy — Tamar's pass covers wording, not this data-composition logic.
 */
export function answerGoogleAdsOperatorInquiry(task: GoogleAdsOperatorTask): string {
  return `${task.whyNeeded} ${task.recommendedAction}`.trim();
}

/**
 * Asks a "why" question and immediately logs Adam's inline answer. Per spec §2.1, this
 * never touches task status or the approval log — it is not a decision.
 */
export function askGoogleAdsOperatorInquiry(params: {
  task: GoogleAdsOperatorTask;
  question: string;
  askedBy: string;
}): GoogleAdsOperatorInquiry {
  const { task, question, askedBy } = params;
  const now = new Date().toISOString();
  const entry: GoogleAdsOperatorInquiry = {
    taskId: task.taskId,
    clientId: task.clientId,
    question,
    askedBy,
    askedAt: now,
    answeredBy: 'adam',
    answer: answerGoogleAdsOperatorInquiry(task),
    answeredAt: now,
  };
  appendGoogleAdsOperatorInquiry(entry);
  return entry;
}

// ---------------------------------------------------------------------------------------
// One-card selection (interaction-model spec §1.1) — highest risk first, then earliest
// `order`, excluding anything already decided.
// ---------------------------------------------------------------------------------------

const RISK_RANK: Record<GoogleAdsOperatorRisk, number> = { high: 0, medium: 1, low: 2 };

export function selectNextOperatorTask(
  tasks: GoogleAdsOperatorTask[],
  approvals: GoogleAdsOperatorApproval[]
): { current: GoogleAdsOperatorTask | null; queueDepth: number } {
  const decidedIds = new Set(
    approvals.filter((a) => DECISION_STATUSES.has(a.status)).map((a) => a.taskId)
  );
  const open = tasks
    .filter((task) => !decidedIds.has(task.taskId))
    .sort((a, b) => RISK_RANK[a.risk] - RISK_RANK[b.risk] || a.order - b.order);

  return {
    current: open[0] ?? null,
    // "N more waiting for this client" (Maya's spec §2.2) — everything beyond the one shown.
    queueDepth: Math.max(0, open.length - 1),
  };
}

// ---------------------------------------------------------------------------------------
// Trust clock — pure read-model over the approval log (interaction-model spec §3).
// Mirrors the existing buildWeeklyDigest "pure computation" convention: no side effects,
// no stored counter — every number here is re-derivable from approvals.jsonl.
// ---------------------------------------------------------------------------------------

export const TRUST_CLOCK_TARGET_WEEKS = 8;

export interface TrustClockState {
  clientId: string;
  stageGate: string;
  /** Consecutive qualifying weeks since the last Reject (or since the stage-gate began). */
  weeksClean: number;
  targetWeeks: number;
  /** Weeks skipped because zero recommendations crossed the materiality bar (paused, not reset). */
  pausedWeeks: number;
  complete: boolean;
  lastReset: { taskId: string; at: string } | null;
}

/** ISO-week bucket key, e.g. "2026-W05" — Monday-start weeks, locale-independent. */
function isoWeekKey(dateIso: string): string {
  const d = new Date(dateIso);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (utc.getUTCDay() + 6) % 7; // Monday = 0
  utc.setUTCDate(utc.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(utc.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round(((utc.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Computes the trust clock for one (clientId, stageGate) pair.
 *
 * Simplification, documented per spec §3.1's "silent week" rule: this read-model only has
 * the decided-approvals log to work from (no persisted per-week task-generation history).
 * Because the one-card model (§1.1) only ever surfaces one open card at a time and holds it
 * open until decided, every past week that isn't the current still-open card is, by
 * construction, either fully decided or had nothing materiality-crossing surface at all —
 * so "week with zero decided entries" is a faithful proxy for "silent week" here. The
 * currently-open (undecided) task, if any, must be excluded by the caller before computing
 * the clock — pass only `approvals`, not live `tasks`.
 */
export function computeTrustClock(params: {
  clientId: string;
  stageGate?: string;
  approvals: GoogleAdsOperatorApproval[];
}): TrustClockState {
  const stageGate = params.stageGate ?? DEFAULT_STAGE_GATE;
  const scoped = params.approvals
    .filter((a) => (a.stageGate ?? DEFAULT_STAGE_GATE) === stageGate)
    .filter((a) => a.clientId === params.clientId)
    .filter((a) => CLOCK_QUALIFYING_STATUSES.has(a.status))
    .sort((a, b) => new Date(a.approvedAt).getTime() - new Date(b.approvedAt).getTime());

  if (!scoped.length) {
    return {
      clientId: params.clientId,
      stageGate,
      weeksClean: 0,
      targetWeeks: TRUST_CLOCK_TARGET_WEEKS,
      pausedWeeks: 0,
      complete: false,
      lastReset: null,
    };
  }

  // Find the most recent Reject — everything at or before it is history, not current clock.
  let lastRejectIdx = -1;
  scoped.forEach((a, i) => {
    if (a.status === 'rejected') lastRejectIdx = i;
  });
  const lastReset =
    lastRejectIdx >= 0
      ? { taskId: scoped[lastRejectIdx].taskId, at: scoped[lastRejectIdx].approvedAt }
      : null;
  const since = scoped.slice(lastRejectIdx + 1);

  // Bucket into calendar weeks; a week "counts" if it has at least one qualifying decision.
  const weekKeys: string[] = [];
  const seen = new Set<string>();
  for (const approval of since) {
    const key = isoWeekKey(approval.approvedAt);
    if (!seen.has(key)) {
      seen.add(key);
      weekKeys.push(key);
    }
  }

  // Paused weeks = calendar weeks between the first and last qualifying week (inclusive)
  // that have no qualifying decision at all — i.e. materiality-bar silence, per §3.1.
  let pausedWeeks = 0;
  if (weekKeys.length > 1) {
    const first = weekKeys[0];
    const last = weekKeys[weekKeys.length - 1];
    const firstDate = new Date(since[0].approvedAt);
    const lastDate = new Date(since[since.length - 1].approvedAt);
    const totalCalendarWeeks =
      Math.round((lastDate.getTime() - firstDate.getTime()) / (7 * 86400000)) + 1;
    pausedWeeks = Math.max(0, totalCalendarWeeks - weekKeys.length);
    void first;
    void last;
  }

  const weeksClean = Math.min(weekKeys.length, TRUST_CLOCK_TARGET_WEEKS);

  return {
    clientId: params.clientId,
    stageGate,
    weeksClean,
    targetWeeks: TRUST_CLOCK_TARGET_WEEKS,
    pausedWeeks,
    complete: weeksClean >= TRUST_CLOCK_TARGET_WEEKS,
    lastReset,
  };
}

/**
 * Lists every stage-gate this client has decision history for, most-recently-active first.
 * Per spec §3.2, a stage-gate transition archives (never deletes) prior history — since
 * approval records already carry their own `stageGate`, "archiving" falls out naturally
 * from filtering the same append-only log rather than needing a separate archive store.
 */
export function listTrustClockHistory(
  clientId: string,
  approvals: GoogleAdsOperatorApproval[]
): TrustClockState[] {
  const stageGates: string[] = [];
  const seen = new Set<string>();
  // Most-recent-first pass so the active stage-gate sorts first.
  [...approvals]
    .filter((a) => a.clientId === clientId)
    .sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime())
    .forEach((a) => {
      const gate = a.stageGate ?? DEFAULT_STAGE_GATE;
      if (!seen.has(gate)) {
        seen.add(gate);
        stageGates.push(gate);
      }
    });
  return stageGates.map((stageGate) => computeTrustClock({ clientId, stageGate, approvals }));
}
