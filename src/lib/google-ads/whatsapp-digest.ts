/**
 * Ads Bot weekly digest, client WhatsApp message (2026-11-12): the three hub numbers.
 *
 * Every line comes from the Noa-gated template (docs/copy/ads-bot-weekly-digest-whatsapp-final-2026-11-12.json,
 * generated into weeklyDigestCopy.generated.ts). This module only decides which lines show and fills the
 * placeholders; it never carries copy of its own. Alerts and next actions are English staff text and are NOT
 * rendered here (they stay on the internal staff page); the all-clear line shows only with no open alerts.
 * Staff send the message by hand through the wa.me link; nothing is sent automatically.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import { buildWaLink, SITE_URL } from '../geo/whatsapp';
import type { ClientWeekNumbers, WeeklyDigest } from '../crm/intelligence';
import { WEEKLY_DIGEST_TEMPLATE_LINES } from './weeklyDigestCopy.generated';

export type WeeklyDigestLineId = (typeof WEEKLY_DIGEST_TEMPLATE_LINES)[number]['id'];

export interface WeeklyDigestMessageInput {
  contactName: string;
  campaignName: string;
  /** This week's owner-facing numbers (buildClientWeekNumbers). */
  week: Pick<ClientWeekNumbers, 'leadsIn' | 'markedReal' | 'unmarked' | 'closedDeals'>;
  /** Google-reported spend for the same week (ILS). Undefined -> the cost line is hidden, never estimated. */
  weekSpendIls?: number;
  /** Count of open alerts. Only decides the all-clear line; alerts themselves are never shown to the client. */
  openAlerts: number;
  /** Absolute URL of the client's leads page. */
  leadsLink: string;
}

/** The client's leads page, absolute (same base as the other client-facing WhatsApp links). */
export const CLIENT_LEADS_URL = `${SITE_URL}/client/leads`;

function line(id: WeeklyDigestLineId): string {
  const found = WEEKLY_DIGEST_TEMPLATE_LINES.find((l) => l.id === id);
  if (!found) throw new Error(`weekly digest template line missing: ${id}`);
  return found.text;
}

/** Whole shekels with a comma thousands separator (deterministic, no locale data needed). */
export function formatWholeShekels(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Which template lines show, in template order, per each line's `when` rule. */
export function selectWeeklyDigestLines(input: Pick<WeeklyDigestMessageInput, 'week' | 'weekSpendIls' | 'openAlerts'>): WeeklyDigestLineId[] {
  const { leadsIn, markedReal, unmarked, closedDeals } = input.week;
  const hasSpend = typeof input.weekSpendIls === 'number' && Number.isFinite(input.weekSpendIls);
  const show: Record<WeeklyDigestLineId, boolean> = {
    greeting: true,
    week_frame: true,
    leads_in: true,
    marked_real: true,
    // markedReal > 0; also needs a real weekly spend figure (hidden rather than faked).
    cost_per_real: markedReal > 0 && hasSpend,
    // markedReal == 0 replaces the cost line; hidden too when nothing came in.
    mark_nudge_zero: markedReal === 0 && leadsIn > 0,
    unmarked_reminder: unmarked >= 2 && markedReal > 0,
    unmarked_reminder_one: unmarked === 1 && markedReal > 0,
    closed_deals_extra: closedDeals >= 2,
    closed_deals_one: closedDeals === 1,
    alerts_all_clear: input.openAlerts === 0,
    support_close: true,
  };
  return WEEKLY_DIGEST_TEMPLATE_LINES.map((l) => l.id).filter((id) => show[id]);
}

/** Blank-line groups: greeting / the numbers / status / sign-off. */
const GROUP_OF: Record<WeeklyDigestLineId, number> = {
  greeting: 0,
  week_frame: 1,
  leads_in: 1,
  marked_real: 1,
  cost_per_real: 1,
  mark_nudge_zero: 1,
  unmarked_reminder: 1,
  unmarked_reminder_one: 1,
  closed_deals_extra: 1,
  closed_deals_one: 1,
  alerts_all_clear: 2,
  support_close: 3,
};

export function composeWeeklyDigestWhatsAppMessage(input: WeeklyDigestMessageInput): string {
  const ownerName = input.contactName.trim();
  const campaignName = input.campaignName.trim();
  const { leadsIn, markedReal, unmarked, closedDeals } = input.week;
  const values: Record<string, string> = {
    ownerName,
    campaignName,
    leadsIn: String(leadsIn),
    markedReal: String(markedReal),
    unmarked: String(unmarked),
    closedDeals: String(closedDeals),
    leadsLink: input.leadsLink,
    costPerReal: markedReal > 0 && typeof input.weekSpendIls === 'number' ? formatWholeShekels(input.weekSpendIls / markedReal) : '',
  };

  const out: string[] = [];
  let group = -1;
  for (const id of selectWeeklyDigestLines(input)) {
    let text = line(id);
    // Empty name: drop the placeholder with its leading space (no double space).
    if (!ownerName) text = text.replace(' {ownerName}', '');
    text = text.replace(/\{([A-Za-z]+)\}/g, (_, key: string) => {
      if (!(key in values)) throw new Error(`weekly digest: unknown placeholder ${key}`);
      return values[key];
    });
    if (group !== -1 && GROUP_OF[id] !== group) out.push('');
    group = GROUP_OF[id];
    out.push(text);
  }
  return out.join('\n');
}

export interface WeeklyDigestLinkParams {
  contactPhone: string;
  contactName: string;
  campaignName: string;
  digest: WeeklyDigest;
  week: ClientWeekNumbers;
  /** Google-reported spend for the week (readWeeklySpendIls). Wins over the digest's own spend. */
  weekSpendIls?: number;
  leadsLink?: string;
}

/**
 * The staff "send digest" wa.me link. `week` is the owner-facing numbers; `digest` supplies the open-alert count
 * and, only when no explicit `weekSpendIls` is given and its window is the same 7 days, the weekly spend.
 */
export function buildWeeklyDigestWhatsAppLink(params: WeeklyDigestLinkParams): string {
  const { digest, week } = params;
  const sameWeek = digest.windowDays === week.windowDays;
  const weekSpendIls = params.weekSpendIls ?? (sameWeek ? digest.totals.spendIls : undefined);
  const message = composeWeeklyDigestWhatsAppMessage({
    contactName: params.contactName,
    campaignName: params.campaignName,
    week,
    weekSpendIls,
    openAlerts: digest.alerts.length,
    leadsLink: params.leadsLink ?? CLIENT_LEADS_URL,
  });
  return buildWaLink(params.contactPhone, message);
}

/** Staff-only note (internal page, English) when the client digest is not offered. */
export const DIGEST_DISABLED_EXTERNAL_LEADS_NOTE = "Digest disabled: this client's enquiries are not captured in the WAO lead list.";

export type WeeklyDigestSendState = { enabled: true; waLink: string } | { enabled: false; note: string };

/**
 * Whether the staff page offers the client digest. Clients whose enquiries are not captured in WAO's lead list
 * (own-domain / founder-managed) would get false zeros, so no link is built for them at all.
 */
export function weeklyDigestSendState(params: WeeklyDigestLinkParams & { leadCapture: 'wao' | 'external' | undefined }): WeeklyDigestSendState {
  if (params.leadCapture !== 'wao') return { enabled: false, note: DIGEST_DISABLED_EXTERNAL_LEADS_NOTE };
  return { enabled: true, waLink: buildWeeklyDigestWhatsAppLink(params) };
}
